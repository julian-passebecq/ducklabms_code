"""Safe compiler and real local SQLite-compatibility orchestrator checks."""
from copy import deepcopy
import json
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from apps.api.datapass.api import create_app
from apps.api.datapass.analytics_contracts import PipelineIR
from apps.api.datapass.pipeline_compiler import compile_pipeline,compile_response,topological,CompileError,source_hash
from apps.api.datapass.local_jobs import TERMINAL

SOURCE='''pipeline("retail", schedule="@daily")
raw = sql("raw", "CREATE TABLE IF NOT EXISTS bronze.pipeline_orders AS SELECT * FROM source.orders")
check = quality("valid", "SELECT * FROM bronze.pipeline_orders WHERE order_id IS NULL")
gold = sql("gold", "DROP TABLE IF EXISTS gold.pipeline_total; CREATE TABLE gold.pipeline_total AS SELECT SUM(net_amount) AS total FROM bronze.pipeline_orders")
raw >> check >> gold
'''


def finish(jobs,wid,jid):
    for _ in range(700):
        result=jobs.get(wid,jid)
        if result['status'] in TERMINAL and result['finished_at']:return result
        time.sleep(.01)
    raise AssertionError('Pipeline did not terminate')


def save_pipeline(app,source=SOURCE,cache=True):
    docs=app.state.documents;w=docs.create(None)
    resource=dict(schema_version=1,id='pipeline-resource',revision=0,kind='pipeline',title='Retail pipeline',source=source)
    if cache:resource['last_valid_ir']=compile_pipeline(source)
    wb=dict(schema_version=1,resources=[resource],views=[],panes=[dict(id='p',view_ids=[],active_view_id=None,weight=1)],active_pane_id='p',persona='neutral',direction='horizontal')
    return docs.save_workbench(w['id'],w['revision'],wb)


def invoke(client,w):
    return client.post(f'/api/workspaces/{w["id"]}/pipelines/run',json=dict(resource_id='pipeline-resource',resource_revision=0,workspace_revision=w['revision']))


def test_compilation_produces_one_canonical_ir_and_schedule_metadata():
    ir=compile_pipeline(SOURCE)
    assert ir['id']=='retail' and ir['schedule']=='@daily'
    assert ir['source_hash']==source_hash(SOURCE)
    assert topological(ir)==['raw','valid','gold']
    assert ir['edges']==[{'source':'raw','target':'valid'},{'source':'valid','target':'gold'}]


def test_with_dag_context_and_group_dependencies():
    ir=compile_pipeline('''with DAG("example", schedule=None) as dag:
    a = sql("a", "select 1")
    b = quality("b", "select 1 where false")
    c = sql("c", "select 2", retries=2, retry_delay=0.1)
    d = sql("d", "select 3")
    a >> [b, c] >> d
''')
    assert len(ir['edges'])==4
    assert topological(ir)==['a','b','c','d']
    assert ir['tasks'][2]['retries']==2


@pytest.mark.parametrize('bad',[
    'import os\npipeline("x")',
    '__import__("os").system("id")',
    'with open("output", "w") as f:\n pass',
    'pipeline("x")\na=sql("a", "select 1")\na >> a',
    'pipeline("x")\na=sql("a", "select 1")\nb=sql("b", "select 1")\na >> b\nb >> a',
    'pipeline("x")\na=sql("a", "select 1")\na >> missing',
    'pipeline("x")\na=sql("a", "select 1")\nb=sql("a", "select 2")',
    'pipeline("x")\na=sql("a", "select 1")\na=sql("b", "select 2")',
    'pipeline("x")\na=sql("a", f"select {1}")',
    'pipeline("x")\na=sql("a", "select 1", retries=True)',
    'pipeline("x")\na=sql("a", "select 1", retries=4)',
    'pipeline("x")\na=sql("a", "select 1", retry_delay=10)',
    'pipeline("x")\na=sql("a", "select 1", **{})',
    'pipeline("x")\na=dbt("a", project="x", action="deps")',
    'pipeline("x")\na=dbt("a", project="../escape")',
    'pipeline("x")\na=sql("a", "select 1")\na << a',
    'pipeline("x")\na=sql("a", "select 1")\na >> [a for a in range(3)]',
    'pipeline("x")\na=sql("a", "select 1")\nfor i in []:\n pass',
    'pipeline("x")\ndef fn():\n return 3',
    'pipeline("x")\npipeline("y")\na=sql("a", "select 1")',
])
def test_unknown_and_executable_constructs_fail_closed(bad,tmp_path):
    before=set(tmp_path.iterdir())
    with pytest.raises(CompileError):compile_pipeline(bad)
    response=compile_response(bad)
    assert not response['valid'] and response['ir'] is None and response['diagnostics'][0]['line']>0
    assert set(tmp_path.iterdir())==before


def test_task_source_is_literal_data_until_explicit_trusted_execution():
    ir=compile_pipeline('pipeline("x")\na=python("a", "__import__(\'os\').getcwd()")')
    assert ir['tasks'][0]['source']=="__import__('os').getcwd()"


def test_ir_cannot_smuggle_cycles_or_wrong_task_fields():
    ir=compile_pipeline(SOURCE)
    bad=deepcopy(ir);bad['edges'].append({'source':'gold','target':'raw'})
    with pytest.raises(ValueError):PipelineIR.model_validate(bad)
    bad=deepcopy(ir);bad['tasks'][0]['action']='build'
    with pytest.raises(ValueError):PipelineIR.model_validate(bad)


def test_compiler_is_pure_route_and_last_valid_graph_survives_invalid_source(tmp_path):
    app=create_app(tmp_path,token='pipeline',mode='sqlite');w=save_pipeline(app)
    def forbidden(*_):raise AssertionError('Compile cannot start a worker')
    app.state.manager.call=forbidden
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer pipeline'}) as client:
        before=app.state.documents.get(w['id'])
        reply=client.post(f'/api/workspaces/{w["id"]}/pipelines/compile',json={'source':'import os'}).json()
        assert reply['valid'] is False
        assert app.state.documents.get(w['id'])==before
        wb=deepcopy(w['workbench']);wb['resources'][0]['source']='broken (';wb['resources'][0]['diagnostics']=['Expected closing parenthesis']
        w=app.state.documents.save_workbench(w['id'],w['revision'],wb)
        assert w['workbench']['resources'][0]['last_valid_ir']['source_hash']==source_hash(SOURCE)


def test_local_pipeline_writes_shared_catalog_and_records_each_task(tmp_path):
    app=create_app(tmp_path,token='pipeline',mode='sqlite');w=save_pipeline(app)
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer pipeline'}) as client:
        response=invoke(client,w);assert response.status_code==200,response.text
        result=finish(app.state.local_jobs,w['id'],response.json()['id'])
        assert result['status']=='success',result
        assert result['runtime']['engine']=='sqlite'  # Compatibility proof, not a DuckDB smoke.
        assert result['runtime']['scheduler'] is False and result['result']['schedule_metadata']=='@daily'
        assert [t['status'] for t in result['steps']]==['success']*3
        rows=app.state.manager.call(w['id'],app.state.documents.folder(w['id'])/'data',{'op':'read_query','query':'select * from gold.pipeline_total'})
        assert rows['result']['rows']==[{'total':4975.0}]
        assert app.state.documents.get(w['id'])['workbench']==w['workbench']


def test_retries_failed_propagation_and_independent_branch(tmp_path):
    source='''pipeline("failure")
a=quality("bad", "select 1 as failing", retries=2)
b=sql("dependent", "select 2 as value")
c=sql("independent", "select 3 as value")
a >> b
'''
    app=create_app(tmp_path,token='pipeline',mode='sqlite');w=save_pipeline(app,source)
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer pipeline'}) as client:
        result=finish(app.state.local_jobs,w['id'],invoke(client,w).json()['id'])
        assert result['status']=='failed'
        steps={r['id']:r for r in result['steps']}
        assert steps['bad']['status']=='failed' and len(steps['bad']['attempts'])==3
        assert steps['dependent']['status']=='skipped' and steps['dependent']['attempts']==[]
        assert steps['independent']['status']=='success'


@pytest.mark.parametrize('mutation',['missing','stale','tampered'])
def test_runner_refuses_uncompiled_stale_or_tampered_ir(tmp_path,mutation):
    app=create_app(tmp_path,token='pipeline',mode='sqlite');w=save_pipeline(app,cache=mutation!='missing')
    wb=deepcopy(w['workbench'])
    if mutation=='stale':wb['resources'][0]['source']+='\n# a different checkpoint\n'
    if mutation=='tampered':wb['resources'][0]['last_valid_ir']['tasks'][0]['source']='select 999'
    w=app.state.documents.save_workbench(w['id'],w['revision'],wb)
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer pipeline'}) as client:
        result=finish(app.state.local_jobs,w['id'],invoke(client,w).json()['id'])
        assert result['status']=='failed' and 'Compile and save' in result['error']
        assert not app.state.manager.workers


def test_python_capability_preflight_prevents_partial_pipeline_writes(tmp_path):
    source='pipeline("x")\na=sql("a", "create table bronze.do_not_create as select 1 as x")\nb=python("b", "print(1)")\na >> b'
    app=create_app(tmp_path,token='pipeline',mode='sqlite',trusted_python=False);w=save_pipeline(app,source)
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer pipeline'}) as client:
        result=finish(app.state.local_jobs,w['id'],invoke(client,w).json()['id'])
        assert result['status']=='unavailable'
        assets=app.state.manager.call(w['id'],app.state.documents.folder(w['id'])/'data',{'op':'catalog'})
        assert 'bronze.do_not_create' not in {a['name'] for a in assets}
