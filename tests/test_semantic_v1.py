"""Shared-fixture parity, bounded dbt drills and preservation of legacy IDs."""
import json
import importlib.util
from pathlib import Path
import pytest
from apps.api.datapass.exercises import PACKS,definitions,definition,solution,grade,attempt
from apps.api.datapass.execution import Engine
from apps.api.datapass.dbt_drills import compile_fixture_sql
from apps.api.datapass.semantic_packs import expand_scenarios

@pytest.mark.parametrize('topic',['valid-orders','customer-revenue'])
def test_variants_share_exact_private_fixture_and_semantic_contract(topic):
    family='retail-'+topic;specs=[PACKS.get(family+'-'+lang) for lang in ('sql','python','polars','dbt','sparklab')]
    assert len({json.dumps(p.fixtures,default=lambda o:o.model_dump(),sort_keys=True) for _,p in specs})==1
    assert len({json.dumps(s.validation.model_dump(),sort_keys=True) for s,_ in specs})==1
    assert all(s.semantic.id==family and s.semantic.version=='1' and s.fixtures[0].version=='1' for s,_ in specs)
    assert all(len(s.semantic.variants)==5 for s,_ in specs)
    public=json.dumps(definitions());assert '"input_rows":' not in public and '"expected":' not in public and '"solutions":' not in public
    assert definition('demo-sum')['version']=='1'

@pytest.mark.parametrize('lang',['sql','python','dbt','sparklab'])
@pytest.mark.parametrize('topic',['valid-orders','customer-revenue'])
def test_real_compatibility_sql_cpython_and_bounded_spark_reference_results(tmp_path,lang,topic):
    engine=Engine(tmp_path,mode='sqlite',trusted_python=True)
    try:
        id='retail-'+topic+'-'+lang;spec=definition(id)
        request=dict(exercise_id=id,exercise_version='1',language=lang,code=solution(id)['source'],mode='submit',notebook_id='draft',cell_id='answer',source_revision=1)
        result=grade(engine,request)
        assert result['status']=='passed',result
        assert result['truth']==('semantic-emulation' if lang in ('dbt','sparklab') else 'real')
        assert len(result['checks'])==4 and len(result['runs'])==1
        assert not any('expected' in c or 'actual' in c for c in result['checks'][1:])
        assert not engine.parsers and not engine.python_namespaces
        saved=attempt(request,result);assert saved['fixtures']==spec['fixtures'] and saved['exercise_id']==id
        bad=grade(engine,{**request,'code':'SELECT 25 AS revenue' if lang in ('dbt','sql') else 'display([])' if lang=='python' else 'spark.table("input").limit(1)'})
        assert bad['status']!='passed'
    finally:engine.catalog.close()

@pytest.mark.skipif(importlib.util.find_spec('duckdb') is None or importlib.util.find_spec('polars') is None,reason='Native DuckDB/Polars packages not installed; no substitute certification')
@pytest.mark.parametrize('topic',['valid-orders','customer-revenue'])
def test_native_duckdb_polars_parity(tmp_path,topic):
    engine=Engine(tmp_path,mode='duckdb',trusted_python=True)
    try:
        for lang in ('sql','python','polars','dbt','sparklab'):
            id='retail-'+topic+'-'+lang
            assert grade(engine,dict(exercise_id=id,exercise_version='1',language=lang,code=solution(id)['source'],mode='submit',notebook_id='draft',cell_id='answer',source_revision=1))['status']=='passed'
    finally:engine.catalog.close()

@pytest.mark.parametrize('source',["SELECT * FROM {{ ref(var('x')) }}", "{% for x in range(9) %}SELECT 1{% endfor %}","SELECT * FROM {{ source('cloud','input') }}","SELECT * FROM {{ ref('input',version=2) }}","{{ __import__('os').system('echo bad') }}","DELETE FROM {{ ref('input') }}","SELECT * FROM {{ ref('other') }}"])
def test_dbt_drills_reject_dynamic_templates_unknown_refs_and_writes(source):
    with pytest.raises(ValueError):compile_fixture_sql(source)

def test_dbt_drills_only_replace_executable_literal_refs():
    assert compile_fixture_sql("SELECT * FROM {{ ref('input') }}")== 'SELECT * FROM input'
    assert compile_fixture_sql('SELECT * FROM {{ source("fixture", "input") }}')=='SELECT * FROM input'
    assert "'{{ ref(\"x\") }}'" in compile_fixture_sql('SELECT \'{{ ref("x") }}\' AS literal FROM {{ref("input")}} -- {{ref("bad")}}')

def test_semantic_pack_rejects_runtime_overrides_and_fixture_drift():
    p=Path('content/exercise-packs/unified-retail-v1');s=json.loads((p/'scenarios.json').read_text());g=json.loads((p/'grading.server.json').read_text())
    s[0]['common']['language']='sql'
    with pytest.raises(ValueError):expand_scenarios(s,g)
    del s[0]['common']['language'];s[0]['common']['fixtures'][0]['version']='2'
    with pytest.raises(ValueError):expand_scenarios(s,g)
