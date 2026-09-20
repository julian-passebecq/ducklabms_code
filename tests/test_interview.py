"""Focused pass coverage. Broad regression and browser journeys run in external QA."""
import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from apps.api.datapass.api import create_app
from apps.api.datapass.documents import Documents, RevisionConflict
from apps.api.datapass.execution import Engine
from apps.api.datapass.exercises import definition, grade, solution
from apps.api.datapass.kernels import KernelTimeout


def request(code, mode='submit'):
    return dict(exercise_id='demo-sum',exercise_version='1',notebook_id='exercise-demo-sum-1',
                cell_id='answer',code=code,language='sql',source_revision=1,mode=mode)


@pytest.mark.parametrize('mode', ['sqlite','duckdb'])
def test_grading_executes_fixtures_not_constants_and_leaves_catalog_unchanged(tmp_path,mode):
    engine=Engine(tmp_path,mode=mode)
    try:
        before=engine.catalog.listing()
        good=grade(engine,request(solution('demo-sum')['source']))
        assert good['status']=='passed'
        assert [c['visibility'] for c in good['checks']]==['visible','hidden','edge']
        assert len(good['runs'])==1
        assert good['runtime']['engine']==mode
        assert good['runtime']['engine_version']
        assert all('actual' not in c and 'expected' not in c for c in good['checks'][1:])
        bad=grade(engine,request('SELECT 5 AS total'))
        assert bad['checks'][0]['passed'] and bad['status']=='failed'
        assert grade(engine,request('SELECT 5 AS total','run'))['status']=='passed'
        assert grade(engine,request('DELETE FROM source.orders'))['status']=='failed'
        assert engine.catalog.listing()==before
    finally:
        engine.catalog.close()


def test_practice_persistence_is_separate_from_case_and_revision(tmp_path):
    docs=Documents(tmp_path);w=docs.create(None)
    a={'id':'exercise-demo-sum-1','exercise':{'id':'demo-sum','version':'1'},'blockState':{'draft':'source A'}}
    b={'id':'exercise-demo-count-1','exercise':{'id':'demo-count','version':'1'},'blockState':{'draft':'source B'}}
    w=docs.save_notebook(w['id'],w['revision'],a)
    w=docs.save_notebook(w['id'],w['revision'],b)
    w=docs.save_notebook(w['id'],w['revision'],{'id':'case-notebook'})
    assert w['case_id'] is None and w['notebooks'][a['id']]==a
    assert w['practice_resume']=={'sql/aggregation':'demo-sum','sql/nulls':'demo-count'}
    with pytest.raises(RevisionConflict):docs.save_notebook(w['id'],0,{'id':'lost'})
    assert docs.get(w['id'])['notebooks'][a['id']]==a


def test_api_submit_checkpoint_redaction_attempts_and_timeout(tmp_path,monkeypatch):
    app=create_app(tmp_path,token='test',mode='duckdb')
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer test'}) as client:
        definitions=client.get('/api/exercises').json()
        demo=next(e for e in definitions if e['id']=='demo-sum')
        assert demo['origin']=='internal-demo'
        assert {e['pack']['id'] for e in definitions} >= {'internal-demo','sparklab-runtime'}
        assert 'solution' not in json.dumps(definitions)
        assert 'expected' not in json.dumps(definitions)
        w=client.post('/api/workspaces',json={}).json();base=f"/api/workspaces/{w['id']}"
        code=solution('demo-sum')['source']
        n={'id':'exercise-demo-sum-1','blocks':[{'id':'answer','type':'sql'}], 'blockState':{'mosaic:v2:code:answer':code}}
        w=client.put(base+'/notebook',json={'revision':0,'notebook':n}).json()
        body=request(code,'run');body['source_revision']=w['revision']
        run=client.post(base+'/exercise',json=body)
        assert run.status_code==200,run.text
        assert client.get(base+'/attempts').json()==[]
        body.update(mode='submit',source_revision=run.json()['workspace_revision'])
        response=client.post(base+'/exercise',json=body)
        assert response.status_code==200,response.text
        result=response.json();attempt=result['attempt']
        assert attempt['source_hash']==hashlib.sha256(code.encode()).hexdigest()
        assert attempt['source_revision']==body['source_revision']
        assert attempt['status']=='passed'
        assert all('expected' not in c and 'actual' not in c for c in attempt['checks'][1:])
        persisted=client.get(base).json()
        assert len(persisted['runs'])==2 and persisted['evidence']=={}
        assert client.get(base+'/attempts').json()[0]['id']==attempt['id']
        assert client.post(base+'/exercise',json=body).status_code==409
        body.update(source_revision=result['workspace_revision'],code='SELECT 5 AS total')
        assert client.post(base+'/exercise',json=body).status_code==422
        body['code']=code
        def timeout(*args):raise KernelTimeout('Worker terminated on timeout.')
        monkeypatch.setattr(app.state.manager,'call',timeout)
        failed=client.post(base+'/exercise',json=body).json()
        assert failed['attempt']['status']=='error' and failed['attempt']['error']['type']=='KernelTimeout'
        assert len(client.get(base+'/attempts').json())==2


def test_public_contract_has_no_grader_payload_and_openapi_is_current():
    spec=definition('demo-sum')
    assert spec['validation']['duplicate_sensitive']
    app=create_app()
    try:
        schema=app.openapi()
        from pathlib import Path
        saved=json.loads(Path('packages/contracts/openapi.json').read_text())
        assert saved==schema
        assert 'ExerciseAttempt' in schema['components']['schemas']
    finally:
        app.state.manager.close()
