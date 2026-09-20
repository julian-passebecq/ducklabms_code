from pathlib import Path
import json
import time
import pytest
from fastapi.testclient import TestClient

from apps.api.datapass.catalog import Catalog, validate_sql
from apps.api.datapass.content import cases, get_case, topological_steps, compile_dbt
from apps.api.datapass.execution import Engine, compare_rows
from apps.api.datapass.documents import Documents, RevisionConflict
from apps.api.datapass.kernels import KernelManager, KernelTimeout
from apps.api.datapass.api import create_app


def request(code,language='sql',cell='cell',**kwargs):
    return dict(op='execute',notebook_id='notebook',cell_id=cell,language=language,code=code,case_id='retail-medallion',**kwargs)


@pytest.fixture(params=['sqlite', 'duckdb'])
def engine(tmp_path, request):
    value = Engine(tmp_path/'db',mode=request.param,trusted_python=True)
    yield value
    value.catalog.close()


@pytest.mark.parametrize('case_id',['retail-medallion','warehouse-sql','dbt-marts','airflow-batch','airflow-dbt','turbine-ml','spark-tuning'])
def test_complete_reference_workflows(engine,case_id):
    result=engine.workflow({'case_id':case_id,'notebook_id':'case-notebook'})
    assert result['status']=='success',json.dumps(result,indent=2)
    checks=engine.handle({'op':'check','case_id':case_id})
    assert all(check['passed'] is not False for check in checks.values())


def test_reference_values_and_shared_catalog(engine):
    engine.workflow({'case_id':'retail-medallion','notebook_id':'n'})
    result=engine.execute(request('SELECT SUM(revenue) AS amount FROM gold.customer_revenue'))
    assert result['result']['rows']==[{'amount':4985.0}]
    assert all(asset['fresh'] for asset in engine.catalog.listing())


def test_source_mutation_makes_downstream_stale_transitively(engine):
    engine.workflow({'case_id':'retail-medallion','notebook_id':'n'})
    assert engine.catalog.fresh('gold.customer_revenue')
    engine.execute(request('SELECT * FROM source.orders',output_asset='bronze.orders'))
    assert not engine.catalog.fresh('silver.orders')
    assert not engine.catalog.fresh('gold.customer_revenue')
    assert engine.handle({'op':'check','case_id':'retail-medallion'})['aggregate']['passed'] is False


def test_wrong_solution_not_accepted(engine):
    bad=engine.workflow({'case_id':'retail-medallion','notebook_id':'n','overrides':{'clean':'result = spark.table("bronze.orders")'}})
    assert bad['status']=='failed'
    assert bad['runs'][1]['check']['passed'] is False
    assert bad['runs'][2]['status']=='skipped'


def test_spark_symbols_persist_and_notebook_isolation(engine):
    one=engine.execute(request('df = spark.table("source.orders")','sparklab'))
    assert one['status']=='success'
    two=engine.execute(request('result = df.limit(2)','sparklab'))
    assert len(two['result']['rows'])==2
    other=request('result = df.limit(2)','sparklab');other['notebook_id']='other'
    assert engine.execute(other)['status']=='error'


def test_python_state_and_sql_interop(engine):
    assert engine.execute(request('answer = 40','python'))['status']=='success'
    result=engine.execute(request('display([{"answer": answer+2}])','python',output_asset='gold.answer'))
    assert result['result']['rows']==[{'answer':42}]
    assert engine.execute(request('SELECT * FROM gold.answer'))['result']['rows']==[{'answer':42}]


def test_python_disabled_by_default(tmp_path):
    e=Engine(tmp_path,mode='sqlite')
    try:
        result=e.execute(request('print(1)','python'))
        assert result['status']=='error' and 'disabled' in result['error']['message']
    finally:e.catalog.close()


@pytest.mark.parametrize('code',[
    'import os\nresult = spark.table("source.orders")',
    'result = spark.table("source.orders").__class__',
    'result = spark.table("source.orders").filter((F.col("net_amount") > 0) and (F.col("segment_id") > 0))',
    'while True:\n    pass',
])
def test_spark_fails_closed(engine,code):
    assert engine.execute(request(code,'sparklab'))['status']=='error'


@pytest.mark.parametrize('sql',[
    "ATTACH 'evil.db' AS secret",'INSTALL httpfs','LOAD httpfs',
    "SELECT * FROM read_csv('/etc/passwd')",'PRAGMA database_list',
    "SELECT load_extension('evil')",'COPY source.orders TO \'/tmp/data.csv\'',
])
def test_sql_rejects_external_operations(engine,sql):
    assert engine.execute(request(sql))['status']=='error'


def test_publish_atomic_on_failure(engine):
    engine.execute(request('SELECT 42 AS value',output_asset='gold.answer'))
    bad=engine.execute(request('SELECT nope FROM source.orders',output_asset='gold.answer'))
    assert bad['status']=='error'
    assert engine.catalog.query('SELECT * FROM gold.answer')['rows']==[{'value':42}]


def test_multiple_sql_statements_and_semicolon_in_string(engine):
    result=engine.execute(request("CREATE TABLE gold.x AS SELECT 'a;b' AS message; SELECT * FROM gold.x;"))
    assert result['status']=='success',result
    assert result['result']['rows']==[{'message':'a;b'}]


def test_failed_sql_transaction_preserves_previous_data(engine):
    result=engine.execute(request('CREATE TABLE gold.new_table AS SELECT 1 AS n; SELECT nope FROM source.orders;'))
    assert result['status']=='error'
    assert not engine.catalog.exists('gold.new_table')


def test_dbt_unknown_ref_and_arbitrary_jinja_rejected():
    case=get_case('dbt-marts')
    with pytest.raises(ValueError):compile_dbt("SELECT * FROM {{ ref('not_registered') }}",case)
    with pytest.raises(ValueError):compile_dbt("{% for i in things %}SELECT 1{% endfor %}",case)


def test_cycle_and_unknown_dependency_fail():
    with pytest.raises(ValueError):topological_steps([{'id':'a','depends_on':['b']},{'id':'b','depends_on':['a']}])
    with pytest.raises(ValueError):topological_steps([{'id':'a','depends_on':['missing']}])


def test_every_case_and_module_is_wired():
    modules=json.loads((Path(__file__).parents[1]/'content/modules.json').read_text())
    used=set()
    for case in cases():
        topological_steps(case['steps'])
        used.update(case['modules'])
        assert len({s['id'] for s in case['steps']})==len(case['steps'])
        assert all(s['language'] in {'sql','sparklab','python','polars','dbt'} for s in case['steps'])
    assert used=={m['id'] for m in modules}


def test_row_comparison_not_just_counts():
    assert compare_rows([{'n':1},{'n':2}],[{'n':2.0},{'n':1.0}])
    assert not compare_rows([{'n':1},{'n':1}],[{'n':1},{'n':2}])
    assert not compare_rows([{'wrong':1}],[{'n':1}])


def test_document_compare_and_swap(tmp_path):
    store=Documents(tmp_path)
    doc=store.create('warehouse-sql')
    saved=store.save_notebook(doc['id'],0,{'hello':'world'})
    assert saved['revision']==1
    with pytest.raises(RevisionConflict):store.save_notebook(doc['id'],0,{})
    assert store.get(doc['id'])['notebook']=={'hello':'world'}
    with pytest.raises(ValueError):store.get('../../secret')


@pytest.mark.parametrize('mode', ['sqlite', 'duckdb'])
def test_real_process_kernel_persistence_and_restart(tmp_path, mode):
    manager=KernelManager(mode=mode,trusted=True,timeout=10)
    try:
        manager.call('a',tmp_path/'a',request('x=123','python'))
        result=manager.call('a',tmp_path/'a',request('display(x)','python'))
        assert result['result']['rows']==[{'value':123}]
        manager.call('a',tmp_path/'a',request('SELECT 99 AS n',output_asset='gold.persisted'))
        manager.restart('a')
        assert manager.call('a',tmp_path/'a',request('SELECT * FROM gold.persisted'))['result']['rows']==[{'n':99}]
        assert manager.call('a',tmp_path/'a',request('display(x)','python'))['status']=='error'
    finally:manager.close()


@pytest.mark.parametrize('mode', ['sqlite', 'duckdb'])
def test_worker_timeout_terminates_and_recovers(tmp_path, mode):
    manager=KernelManager(mode=mode,trusted=True,timeout=10)
    try:
        manager.call('a',tmp_path,{'op':'capabilities'})
        manager.timeout=0.2
        with pytest.raises(KernelTimeout):manager.call('a',tmp_path,request('while True: pass','python'))
        manager.timeout=10
        result=manager.call('a',tmp_path,request('SELECT 1 AS n'))
        assert result['status']=='success'
    finally:manager.close()


def test_ducklake_maintenance_endpoint_is_authenticated_bounded_and_mode_explicit(tmp_path):
    app=create_app(tmp_path,'test-token',mode='sqlite',trusted_python=False)
    with TestClient(app,base_url='http://127.0.0.1') as client:
        path='/api/workspaces/missing/catalog/maintenance/compact-adjacent'
        assert client.post(path,json={'asset':'bronze.orders'}).status_code==401

        client.headers['Authorization']='Bearer test-token'
        workspace=client.post('/api/workspaces',json={}).json()
        path=f"/api/workspaces/{workspace['id']}/catalog/maintenance/compact-adjacent"
        assert client.post(path,json={'asset':'source.orders'}).status_code==422
        response=client.post(path,json={'asset':'bronze.orders'})
        assert response.status_code==503
        assert 'DuckLake adjacent-file compaction' in response.json()['detail']


@pytest.mark.parametrize('mode', ['sqlite', 'duckdb'])
def test_api_auth_origins_revision_and_real_workflow(tmp_path, mode):
    app=create_app(tmp_path,'test-token',mode=mode,trusted_python=False)
    with TestClient(app,base_url='http://127.0.0.1') as client:
        assert client.get('/api/health').status_code==200
        assert client.get('/api/cases').status_code==401
        client.headers['Authorization']='Bearer test-token'
        assert client.get('/api/cases',headers={'Origin':'https://evil.example'}).status_code==403
        assert len(client.get('/api/cases').json())==len(cases())
        response=client.post('/api/workspaces',json={'case_id':'retail-medallion'})
        assert response.status_code==201,response.text
        id=response.json()['id']
        result=client.post(f'/api/workspaces/{id}/workflow',json={})
        assert result.status_code==200,result.text
        assert result.json()['status']=='success',result.text
        current=client.get(f'/api/workspaces/{id}').json()
        assert current['revision']==4
        assert client.put(f'/api/workspaces/{id}/notebook',json={'revision':0,'notebook':{}}).status_code==409
        assert client.put(f'/api/workspaces/{id}/notebook',json={'revision':4,'notebook':{}}).status_code==200
        invalid=client.post(f'/api/workspaces/{id}/execute',json={'notebook_id':'n','cell_id':'c','language':'sql','code':'SELECT 1','check':{}})
        assert invalid.status_code==422


def test_duckdb_engine_when_installed(tmp_path):
    pytest.importorskip('duckdb',reason='DuckDB package unavailable in this environment; real-engine validation is a release gate.')
    engine=Engine(tmp_path,'duckdb')
    try:
        assert engine.workflow({'case_id':'retail-medallion','notebook_id':'n'})['status']=='success'
    finally:engine.catalog.close()


def test_real_polars_when_installed(tmp_path):
    pytest.importorskip('polars',reason='Polars package unavailable; no simulated replacement is counted as a pass.')
    engine=Engine(tmp_path,'sqlite',trusted_python=True)
    try:
        assert engine.workflow({'case_id':'polars-quality','notebook_id':'n'})['status']=='success'
    finally:engine.catalog.close()


def test_wrong_kpi_code_cannot_reuse_previous_catalog_acceptance(engine):
    engine.workflow({'case_id':'retail-medallion','notebook_id':'n'})
    step=get_case('retail-medallion')['steps'][-1]
    run=engine.execute(request('SELECT 1 AS total_revenue',check=step['check']))
    assert run['status']=='success' and run['check']['passed'] is False


def test_copy_check_is_full_row_not_row_count(engine):
    bad=engine.workflow({'case_id':'retail-medallion','notebook_id':'n','overrides':{'ingest':'SELECT order_id, customer_id, segment_id, 0 AS net_amount, loaded_at FROM source.orders'}})
    assert bad['status']=='failed' and bad['runs'][0]['check']['passed'] is False


def test_spark_simulation_withholds_mutated_fixture(engine):
    first=engine.workflow({'case_id':'spark-tuning','notebook_id':'n'})
    assert first['runs'][-1]['simulation']['status']=='modeled'
    engine.execute(request('UPDATE source.orders SET net_amount=999 WHERE order_id=\'O-001\''))
    changed=engine.workflow({'case_id':'spark-tuning','notebook_id':'n'})
    assert changed['runs'][-1]['simulation']['status']=='unavailable'


def test_unknown_workflow_override_rejected(engine):
    with pytest.raises(ValueError,match='Unknown workflow override'):
        engine.workflow({'case_id':'retail-medallion','notebook_id':'n','overrides':{'typo':'SELECT 1'}})


@pytest.mark.parametrize('mode', ['sqlite', 'duckdb'])
def test_workspace_concurrent_requests_serialized(tmp_path, mode):
    from concurrent.futures import ThreadPoolExecutor
    manager=KernelManager(mode,True,timeout=10,max_workers=2)
    try:
        with ThreadPoolExecutor(max_workers=3) as pool:
            results=list(pool.map(lambda i:manager.call('a',tmp_path/'a',request(f'SELECT {i} AS x')),range(6)))
        assert sorted(r['result']['rows'][0]['x'] for r in results)==list(range(6))
        assert len({r['session_generation'] for r in results})==1
    finally:manager.close()


def test_graded_step_requires_registered_asset(tmp_path):
    with TestClient(create_app(tmp_path,'token',mode='sqlite'),base_url='http://localhost',headers={'Authorization':'Bearer token'}) as client:
        id=client.post('/api/workspaces',json={'case_id':'retail-medallion'}).json()['id']
        r=client.post(f'/api/workspaces/{id}/execute',json={'notebook_id':'n','cell_id':'ingest','step_id':'ingest','language':'sql','code':'SELECT 1','output_asset':'gold.wrong'})
        assert r.status_code==422


def test_valid_pyspark_sql_filter_is_explicitly_unsupported_here(engine):
    run=engine.execute(request('result = spark.table("source.orders").filter("net_amount > 0")','sparklab'))
    assert run['status']=='error' and 'valid in real PySpark but unsupported here' in run['error']['message']


def test_python_reads_participate_in_lineage(engine):
    run=engine.execute(request('display(query("SELECT COUNT(*) AS n FROM source.orders"))','python',output_asset='gold.counts'))
    assert 'source.orders' in run['input_versions']
    assert engine.catalog.fresh('gold.counts')
    changed=engine.execute(request("UPDATE source.orders SET net_amount=1 WHERE order_id='O-001'"))
    assert changed['status']=='success'
    assert not engine.catalog.fresh('gold.counts')


def test_stale_recompute_and_incompatible_schema(engine):
    engine.workflow({'case_id':'retail-medallion','notebook_id':'n'})
    run = engine.execute(request('SELECT 1 AS incompatible', output_asset='bronze.orders'))
    assert run['status'] == 'success'
    assert not engine.catalog.fresh('gold.customer_revenue')
    bad = engine.execute(request('SELECT net_amount FROM bronze.orders'))
    assert bad['status'] == 'error'
    fixed = engine.workflow({'case_id':'retail-medallion','notebook_id':'n'})
    assert fixed['status'] == 'success'
    assert all(c['passed'] for c in engine.handle({'op':'check','case_id':'retail-medallion'}).values())


def test_duckdb_workspace_isolation(tmp_path):
    manager = KernelManager('duckdb', True, timeout=10)
    try:
        assert manager.call('a', tmp_path/'a', request('SELECT 42 AS n', output_asset='gold.private'))['status'] == 'success'
        assert manager.call('b', tmp_path/'b', request('SELECT * FROM gold.private'))['status'] == 'error'
        manager.call('a', tmp_path/'a', request('private_value=42', 'python'))
        assert manager.call('b', tmp_path/'b', request('display(private_value)', 'python'))['status'] == 'error'
        assert manager.call('a', tmp_path/'a', request('SELECT * FROM gold.private'))['result']['rows'] == [{'n':42}]
    finally:
        manager.close()


def test_atomic_replace_retries_windows_sharing_locks(tmp_path, monkeypatch):
    from types import SimpleNamespace
    from apps.api.datapass import atomic
    source, target = tmp_path/'new.tmp', tmp_path/'saved.json'
    source.write_text('new')
    target.write_text('previous')
    original = Path.replace
    attempts = []
    def locked_replace(self, destination):
        attempts.append(1)
        if len(attempts) < 3:
            assert target.read_text() == 'previous'
            raise PermissionError('temporary sharing lock')
        return original(self, destination)
    monkeypatch.setattr(atomic, 'os', SimpleNamespace(name='nt'))
    monkeypatch.setattr(atomic.time, 'sleep', lambda _: None)
    monkeypatch.setattr(Path, 'replace', locked_replace)
    atomic.replace_file(source, target)
    assert target.read_text() == 'new' and len(attempts) == 3

    source.write_text('unsaved')
    monkeypatch.setattr(Path, 'replace', lambda *_: (_ for _ in ()).throw(PermissionError('permanent lock')))
    with pytest.raises(PermissionError):
        atomic.replace_file(source, target)
    assert target.read_text() == 'new'
