"""Focused Pass 2 contracts; broad QA deliberately separate."""
from copy import deepcopy
import json
from pathlib import Path
import pytest
from apps.api.datapass.exercises import PACKS, grade, solution
from apps.api.datapass.exercise_packs import PackRegistry
from apps.api.datapass.exercise_contracts import RowValidation
from apps.api.datapass.exercise_validation import validate_result
from apps.api.datapass.execution import Engine
from apps.api.datapass.codedeleet_adapter import migrate_pack


def test_registry_atomic_validation_and_disable():
    registry = PackRegistry()
    path = Path('content/exercise-packs/internal-demo')
    registry.load(path)
    with pytest.raises(ValueError): registry.load(path)
    spec, private = registry.get('demo-sum')
    assert 'expected' not in json.dumps(registry.definitions())
    public = spec.model_dump(); public['id']='copy'
    broken = private.model_dump(); broken['fixtures'][0]['id']='missing'
    with pytest.raises(ValueError): registry.register(dict(id='other',version='1',title='Other'),[public],{'copy':broken})
    assert 'other' not in registry.packs
    registry.packs['internal-demo'].enabled=False
    assert registry.definitions()==[]
    with pytest.raises(KeyError):registry.get('demo-sum')


@pytest.mark.parametrize('id', ['demo-sum','demo-count','demo-python','demo-polars','demo-sparklab'])
def test_shared_grading_adapters(id,tmp_path):
    engine = Engine(tmp_path,mode='duckdb',trusted_python=True)
    try:
        spec,_=PACKS.get(id)
        request=dict(exercise_id=id,exercise_version=spec.version,language=spec.language,
                     code=solution(id)['source'],mode='submit',notebook_id='draft',cell_id='answer',source_revision=1)
        result=grade(engine,request)
        assert result['status']=='passed',result
        assert len(result['runs'])==1
        assert all('actual' not in c and 'expected' not in c for c in result['checks'][1:])
        assert not engine.python_namespaces and not engine.parsers
        if spec.language in {'python','polars'}:
            bad=grade(engine,{**request,'code':"display([{'value':1},{'value':2},{'value':2},{'value':None}], columns=['value'])"})
            assert bad['checks'][0]['passed'] and bad['status']=='failed'
        if spec.language=='sparklab':assert result['truth']=='semantic-emulation'
    finally:engine.catalog.close()


def test_validation_modes():
    def check(rows,expected,**kwargs):
        return validate_result(dict(rows=rows,columns=list(rows[0]) if rows else [],truncated=False),expected,RowValidation(**kwargs))
    a=[{'x':1},{'x':None},{'x':1}]
    assert check(a,list(reversed(a)))
    assert not check(a,[{'x':1},{'x':None}])
    assert check(a,[{'x':1},{'x':None}],duplicate_sensitive=False)
    assert not check(a,a,null_semantics='forbidden')
    assert not check([{'x':1},{'x':2}],[{'x':2},{'x':1}],ordered=True)
    assert check([{'x':1.01}],[{'x':1}],absolute_tolerance=.02)
    assert not check(a,a,required_columns=['missing'])
    assert not check(a,a,row_count=2)
    assert not check(a,a,exact_schema=['other'])
    assert check([{'x':1,'extra':2}],[{'x':1}],forbidden_extra_columns=False)
    assert check([{'x':1},{'x':2}],[{'x':3}],aggregates={'x':'sum'})


def test_adapter_reports_without_inventing_content():
    record=dict(id='legacy',title='Authored fixture',prompt='Actual supplied prompt',domain='sql',lab='aggregate',
                variants=[dict(language='sql',verified=True,starter='SELECT 0',solution='SELECT 1 AS x')],
                fixtures=[dict(id='example',visibility='visible',input_rows=[{'x':1}],expected=[{'x':1}])])
    output=migrate_pack({'exercises':[record]},'imported','1','test-source')
    assert output['report']['migrated']==['legacy/sql']
    assert output['manifest']['enabled'] is False
    record['variants'][0]['language']='pyspark'
    unsupported=migrate_pack({'exercises':[record]},'imported','1','test-source')
    assert unsupported['report']['unsupported'] and not unsupported['exercises']
