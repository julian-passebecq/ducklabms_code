"""Runner contract tests. Fake dbt artifacts/processes are NOT a real dbt smoke."""
from __future__ import annotations
from contextlib import contextmanager
from copy import deepcopy
import json
from pathlib import Path
import sys
import threading
import time
import pytest
from fastapi.testclient import TestClient
from apps.api.datapass.api import create_app
from apps.api.datapass.documents import Documents, RevisionConflict
from apps.api.datapass.kernels import KernelManager
from apps.api.datapass.local_jobs import LocalJobs, JobContext, CapabilityUnavailable, TERMINAL
from apps.api.datapass.dbt_runner import project_profile, selector, write_sources, collect_artifacts, clean_environment


def resource(kind='dbt-project'):
    base=dict(schema_version=1,id='test-resource',kind=kind,title='Test resource',revision=0)
    if kind=='dbt-project':
        base['files']=[{'path':'dbt_project.yml','source':'name: test\nversion: "1.0"\nconfig-version: 2\n'},
                       {'path':'models/example.sql','source':'select 1 as id'}]
    else:
        base['board']=dict(title='Query',chartType='table',x='id',y='id',aggregation='count',query='select 1 as id',
                           snapshot=dict(label='Empty',columns=[],rows=[],origin='sample',query=''))
    return base


def saved(docs, kind='dbt-project'):
    w=docs.create(None)
    workbench=dict(schema_version=1,resources=[resource(kind)],views=[],panes=[dict(id='pane',view_ids=[],active_view_id=None,weight=1)],
                   active_pane_id='pane',persona='neutral',direction='horizontal')
    return docs.save_workbench(w['id'],w['revision'],workbench)


def finish(jobs,wid,jid,seconds=6):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        record=jobs.get(wid,jid)
        if record['status'] in TERMINAL and record['finished_at']:
            return record
        time.sleep(.01)
    raise AssertionError('Local test job did not terminate')


def start(jobs,w,op,kind='dbt'):
    return jobs.submit(w['id'],'test-resource',w['revision'],0,kind,'build' if kind=='dbt' else 'query',op)


def test_source_checkpoint_and_cas(tmp_path):
    docs=Documents(tmp_path);w=saved(docs);manager=KernelManager('sqlite');jobs=LocalJobs(docs,manager)
    job=start(jobs,w,lambda ctx,r,ws:{'source':r['files'][1]['source'],'checkpoint':ws['revision']})
    record=finish(jobs,w['id'],job['id'])
    assert record['result']=={'source':'select 1 as id','checkpoint':w['revision']}
    assert record['resource_id']=='test-resource'
    assert docs.get(w['id'])==w  # Runs do not mutate resource/notebook source revisions.
    with pytest.raises(RevisionConflict): jobs.submit(w['id'],'test-resource',999,0,'dbt','build',lambda *_:None)
    with pytest.raises(RevisionConflict): jobs.submit(w['id'],'test-resource',w['revision'],2,'dbt','build',lambda *_:None)
    jobs.close();manager.close()


def test_single_job_per_workspace_and_persistent_history(tmp_path):
    docs=Documents(tmp_path);w=saved(docs);manager=KernelManager('sqlite');jobs=LocalJobs(docs,manager)
    ready=threading.Event()
    def operation(job,*_):
        ready.set();job.wait(.15);return {'done':True}
    job=start(jobs,w,operation);assert ready.wait(2)
    with pytest.raises(RevisionConflict): start(jobs,w,operation)
    record=finish(jobs,w['id'],job['id'])
    assert record['status']=='success'
    restarted=LocalJobs(Documents(tmp_path),manager)
    assert restarted.get(w['id'],job['id'])==record
    assert restarted.list(w['id'],'missing')==[]
    assert restarted.list(w['id'],'test-resource')[0]['id']==job['id']
    other=docs.create(None)
    with pytest.raises(FileNotFoundError): jobs.get(other['id'],job['id'])
    jobs.close();restarted.close();manager.close()


def test_process_stdout_stderr_bounded_and_nonzero_recorded(tmp_path):
    docs=Documents(tmp_path);w=saved(docs);manager=KernelManager('sqlite');jobs=LocalJobs(docs,manager)
    def operation(job,*_):
        code=job.run_process([sys.executable,'-c','import sys; print("x"*70000); print("oops",file=sys.stderr); sys.exit(7)'],cwd=tmp_path,env={})
        job.update(result={'returncode':code})
        if code: raise RuntimeError('Expected test process failure')
    job=start(jobs,w,operation);record=finish(jobs,w['id'],job['id'])
    assert record['status']=='failed' and record['truth']=='real_local'
    assert record['result']['returncode']==7
    assert len(record['log'])<=64000 and record['log_truncated']
    assert '[stdout]' in record['log']
    jobs.close();manager.close()


@pytest.mark.parametrize('cancel',[True,False])
def test_process_cancellation_and_deadline(tmp_path,cancel):
    docs=Documents(tmp_path);w=saved(docs);manager=KernelManager('sqlite');jobs=LocalJobs(docs,manager,timeout=4 if cancel else .12)
    ready=threading.Event()
    def operation(job,*_):
        ready.set()
        return job.run_process([sys.executable,'-c','import time; time.sleep(10)'],cwd=tmp_path,env={})
    job=start(jobs,w,operation);assert ready.wait(2)
    if cancel: time.sleep(.04);jobs.cancel(w['id'],job['id'])
    record=finish(jobs,w['id'],job['id'])
    assert record['status']==('cancelled' if cancel else 'timed_out')
    assert w['id'] not in jobs.active
    jobs.close();manager.close()


def test_interrupted_jobs_never_replay(tmp_path):
    docs=Documents(tmp_path);w=saved(docs);manager=KernelManager('sqlite');jobs=LocalJobs(docs,manager)
    job=start(jobs,w,lambda *_:None);record=finish(jobs,w['id'],job['id'])
    record.update(status='running',finished_at=None);jobs.write(record)
    restarted=LocalJobs(docs,manager)
    assert restarted.get(w['id'],job['id'])['status']=='interrupted'
    assert not restarted.active
    jobs.close();restarted.close();manager.close()


def test_shared_workspace_lease_blocks_other_threads_and_is_reentrant(tmp_path):
    manager=KernelManager('sqlite');events=[];entered=threading.Event()
    def other():
        entered.set()
        with manager.workspace_lease('workspace'):
            events.append('other')
    with manager.workspace_lease('workspace'):
        with manager.workspace_lease('workspace'): events.append('nested')
        t=threading.Thread(target=other);t.start();assert entered.wait(2);time.sleep(.04)
        assert events==['nested']
    t.join(2);assert events==['nested','other'];manager.close()


@pytest.mark.parametrize('value',['--vars','a b','a;rm','$(x)','a\nb','`whoami`','--select=foo'])
def test_selector_injection_rejected(value):
    with pytest.raises(ValueError):selector(value)


def test_selector_and_server_owned_shared_profiles(tmp_path):
    assert selector('+fct_sales+')=='+fct_sales+'
    profile=project_profile(tmp_path,'ducklake')['datapass_local']['outputs']['local']
    assert profile['path']==str(tmp_path/'workspace.duckdb')
    assert profile['database']=='lake'
    assert profile['attach'][0]['path']=='ducklake:sqlite:'+str(tmp_path/'lake-metadata.sqlite')
    assert profile['attach'][0]['options']['DATA_INLINING_ROW_LIMIT']==0
    (tmp_path/'lake-catalog.ducklake').touch()
    assert project_profile(tmp_path,'ducklake')['datapass_local']['outputs']['local']['attach'][0]['path']=='ducklake:'+str(tmp_path/'lake-catalog.ducklake')
    assert 'attach' not in project_profile(tmp_path,'duckdb')['datapass_local']['outputs']['local']


def test_source_materialization_does_not_accept_profile_or_traversal(tmp_path):
    write_sources(resource(),tmp_path/'good')
    assert (tmp_path/'good/models/example.sql').read_text()=='select 1 as id'
    for i,path in enumerate(['../escape.sql','profiles.yml','models/../../escape.sql','models\\x.sql','models/CON.sql']):
        r=resource();r['files'][1]['path']=path
        with pytest.raises(ValueError):write_sources(r,tmp_path/f'bad{i}')
    assert not (tmp_path/'escape.sql').exists()


def make_artifacts(root,invocation='actual-invocation',results_invocation=None):
    root.mkdir(exist_ok=True)
    manifest={'metadata':{'invocation_id':invocation,'dbt_schema_version':'https://schemas.getdbt.com/dbt/manifest/v12.json','dbt_version':'test'},
              'nodes':{'model.project.x':{'resource_type':'model','name':'x'}},'sources':{}}
    results={'metadata':{'invocation_id':results_invocation or invocation,'dbt_schema_version':'https://schemas.getdbt.com/dbt/run-results/v6.json'},
             'results':[{'unique_id':'model.project.x','status':'success'}]}
    (root/'manifest.json').write_text(json.dumps(manifest));(root/'run_results.json').write_text(json.dumps(results))


def test_artifact_identity_checksum_mismatch_and_symlink(tmp_path):
    docs=Documents(tmp_path);w=saved(docs);manager=KernelManager('sqlite');jobs=LocalJobs(docs,manager)
    def operation(job,*_):
        target=job.directory/'target';target.mkdir(parents=True);make_artifacts(target)
        evidence=collect_artifacts(job,target);job.update(artifacts=evidence['files'])
        return {'invocation_id':evidence['invocation_id']}
    job=start(jobs,w,operation);record=finish(jobs,w['id'],job['id'])
    assert record['status']=='success'
    assert jobs.read_artifact(w['id'],job['id'],'manifest')['metadata']['invocation_id']=='actual-invocation'
    artifact=jobs.folder(w['id'])/job['id']/'manifest.json';artifact.write_text('{}')
    with pytest.raises(ValueError,match='checksum'):jobs.read_artifact(w['id'],job['id'],'manifest')
    def mismatched(ctx,*_):
        target=ctx.directory/'bad';target.mkdir(parents=True);make_artifacts(target,results_invocation='another-run')
        collect_artifacts(ctx,target)
    bad=start(jobs,w,mismatched);assert finish(jobs,w['id'],bad['id'])['status']=='failed'
    jobs.close();manager.close()


def test_environment_does_not_inherit_dbt_options_or_tokens(tmp_path,monkeypatch):
    monkeypatch.setenv('DBT_PROFILES_DIR','/unrelated');monkeypatch.setenv('AWS_SECRET_ACCESS_KEY','secret')
    monkeypatch.setenv('DATAPASS_TOKEN','secret');monkeypatch.setenv('DBT_ENV_SECRET_SOMETHING','secret')
    env=clean_environment(tmp_path,tmp_path/'target',tmp_path/'logs')
    assert env['DBT_PROFILES_DIR']==str(tmp_path)
    assert not {'DATAPASS_TOKEN','AWS_SECRET_ACCESS_KEY','DBT_ENV_SECRET_SOMETHING'} & env.keys()


def test_authenticated_routes_fail_closed_when_dbt_unavailable(tmp_path):
    app=create_app(tmp_path,token='test-token',mode='sqlite',trusted_dbt=False)
    w=saved(app.state.documents)
    with TestClient(app,base_url='http://localhost') as client:
        base=f'/api/workspaces/{w["id"]}'
        assert client.get(base+'/local/capabilities').status_code==401
        client.headers['Authorization']='Bearer test-token'
        caps=client.get(base+'/local/capabilities').json();assert caps['dbt']['available'] is False
        body=dict(resource_id='test-resource',workspace_revision=w['revision'],resource_revision=0,action='build')
        assert client.post(base+'/dbt/run',json={**body,'action':'deps'}).status_code==422
        assert client.post(base+'/dbt/run',json={**body,'select':'--vars evil'}).status_code==422
        response=client.post(base+'/dbt/run',json=body);assert response.status_code==200,response.text
        record=finish(app.state.local_jobs,w['id'],response.json()['id'])
        assert record['status']=='unavailable' and record['truth']=='unavailable'
        assert not app.state.manager.workers


def test_chart_query_real_sqlite_compatibility_and_readonly(tmp_path):
    app=create_app(tmp_path,token='test-token',mode='sqlite')
    w=saved(app.state.documents,'chart-board')
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer test-token'}) as client:
        base=f'/api/workspaces/{w["id"]}'
        body=dict(resource_id='test-resource',workspace_revision=w['revision'],resource_revision=0)
        response=client.post(base+'/charts/query',json=body);assert response.status_code==200,response.text
        record=finish(app.state.local_jobs,w['id'],response.json()['id'])
        assert record['status']=='success',record
        assert record['result']['engine']=='sqlite'  # Not a DuckDB qualification.
        assert record['result']['snapshot']['rows']==[{'id':1}]
        assert record['result']['snapshot']['origin']=='real_local'
        wb=deepcopy(w['workbench']);wb['resources'][0]['board']['query']='drop table source.orders'
        w=app.state.documents.save_workbench(w['id'],w['revision'],wb)
        bad=client.post(base+'/charts/query',json={**body,'workspace_revision':w['revision']}).json()
        assert finish(app.state.local_jobs,w['id'],bad['id'])['status']=='failed'


def test_local_chart_provenance_cannot_be_forged(tmp_path):
    app=create_app(tmp_path,token='test-token',mode='sqlite');docs=app.state.documents;w=saved(docs,'chart-board')
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer test-token'}) as client:
        response=client.post(f'/api/workspaces/{w["id"]}/charts/query',json=dict(resource_id='test-resource',workspace_revision=w['revision'],resource_revision=0))
        record=finish(app.state.local_jobs,w['id'],response.json()['id'])
        wb=deepcopy(w['workbench']);wb['resources'][0]['board']['snapshot']=record['result']['snapshot']
        w=docs.save_workbench(w['id'],w['revision'],wb)
        assert w['workbench']['resources'][0]['board']['snapshot']['origin']=='real_local'
        bad=deepcopy(wb);bad['resources'][0]['board']['snapshot']['rows'][0]['id']=999
        before=docs.get(w['id'])
        with pytest.raises(ValueError,match='differ'):docs.save_workbench(w['id'],w['revision'],bad)
        assert docs.get(w['id'])==before
        other=saved(docs,'chart-board')
        with pytest.raises(ValueError,match='unavailable'):docs.save_workbench(other['id'],other['revision'],wb)
