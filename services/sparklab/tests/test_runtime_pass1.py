"""Focused guardrails for the new semantics/model; broad QA runs separately."""
import json
from pathlib import Path
import pytest
from apps.api.datapass.execution import Engine, compare_rows
from apps.api.datapass.exercises import grade, solution

ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture
def engine(tmp_path):
    value = Engine(tmp_path, mode='duckdb')
    yield value
    value.catalog.db.close()


def execute(engine, source, **kwargs):
    return engine.execute(dict(notebook_id='test',cell_id='cell',language='sparklab',code=source,**kwargs))


def test_outer_semi_anti_nulls_and_duplicates(engine):
    engine.catalog.publish_rows('silver.l', [{'key':1,'a':10},{'key':None,'a':20},{'key':1,'a':30}], 'test', [])
    engine.catalog.publish_rows('silver.r', [{'key':1,'b':40},{'key':2,'b':50},{'key':None,'b':60}], 'test', [])
    prefix='left = spark.table("silver.l")\nright = spark.table("silver.r")\n'
    full=execute(engine,prefix+'result = left.join(right, "key", "full").sort("key")')
    assert full['status']=='success', full
    assert len(full['result']['rows'])==5
    assert any(row['key']==2 for row in full['result']['rows'])
    assert full['result']['rows'][0]['key'] is None
    assert len(execute(engine,prefix+'result = left.join(right,"key","semi")')['result']['rows'])==2
    assert execute(engine,prefix+'result = left.join(right,"key","anti")')['result']['rows']==[{'key':None,'a':20}]
    assert execute(engine,'result = spark.table("silver.l").filter(F.col("key").eqNullSafe(None))')['result']['rows']==[{'key':None,'a':20}]


@pytest.mark.parametrize('source', [
    'result = spark.table("source.orders").selectExpr("*")',
    'result = spark.table("source.orders").filter((F.col("segment_id") > 1) and (F.col("net_amount") > 0))',
    'result = spark.table("source.orders").limit(-1)',
    'result = spark.table("source.orders; DROP TABLE source.orders")',
    'result = spark.table("source.orders").select(F.col("net_amount").cast("decimal(2,9)"))',
    'import os\nresult = spark.table("source.orders")',
])
def test_unsupported_is_error(engine, source):
    assert execute(engine,source)['status']=='error'


def test_finance_pack_profile_invariance_counterexamples_and_mutation(engine):
    case=json.loads((ROOT/'content/cases/spark-window.json').read_text())
    pack=json.loads((ROOT/'services/sparklab/exercises/finance_account_window_03.json').read_text())
    engine.catalog.materialize('silver.transactions',case['steps'][0]['code'],'seed')
    source=pack['solution']
    first=execute(engine,source,truth_pack=pack['id'],profile='local_small',aqe=False)
    second=execute(engine,source,truth_pack=pack['id'],profile='generic_8x8',aqe=True)
    assert first['status']=='success',first
    assert first['simulation']['status']=='modeled',first['simulation']
    assert compare_rows(first['result']['rows'],pack['fixture_truth']['rows'])
    assert compare_rows(first['result']['rows'],second['result']['rows'])
    assert first['simulation']['datapass_credits']['total'] != second['simulation']['datapass_credits']['total']
    repeat=execute(engine,source,truth_pack=pack['id'],profile='local_small',aqe=False)
    assert repeat['simulation']==first['simulation']
    for counterexample in pack['counterexamples']:
        wrong=execute(engine,counterexample['source'],truth_pack=pack['id'])
        assert wrong['status']=='success', wrong
        assert wrong['simulation']['semantic_match'] is False
    engine.catalog.execute('UPDATE silver.transactions SET amount = 999 WHERE transaction_id = \'F-001\'', 'mutation')
    assert execute(engine,source,truth_pack=pack['id'])['simulation']['status']=='unavailable'


def test_shared_exercise_grades_semantics_and_keeps_hidden_rows_private(engine):
    request=dict(exercise_id='spark-account-window',exercise_version='1',language='sparklab',mode='submit',
                 code=solution('spark-account-window')['source'],notebook_id='practice',cell_id='solve',profile='local_small',aqe=True)
    result=grade(engine,request)
    assert result['status']=='passed',result
    assert result['truth']=='semantic-emulation'
    assert len(result['runs'])==1
    assert result['runs'][0]['simulation']['status']=='modeled'
    assert all('expected' not in check for check in result['checks'] if check['visibility']!='visible')
    request['code']='result = spark.table("input")'
    assert grade(engine,request)['status']=='failed'


def test_legacy_pack_and_empty_duplicate_subset(engine):
    run=engine.workflow(dict(case_id='spark-tuning',notebook_id='legacy'))
    assert run['status']=='success',run
    assert run['runs'][-1]['simulation']['status']=='modeled',run['runs'][-1]
    dedupe=execute(engine,'spark.table("source.orders").dropDuplicates([])')
    assert dedupe['status']=='success',dedupe
    assert len(dedupe['result']['rows'])==1
