"""Protocol doubles test the client; they DO NOT qualify a live fastapispark deployment."""
import json
import os
from copy import deepcopy
import httpx
import pytest
from apps.api.datapass.guided_spark import GuidedSpark, compile_guard, valid_result, STARTER, PROBE, COLS, VERSION, SERVICE
from apps.api.datapass.local_jobs import CapabilityUnavailable


def payload(rows, columns=COLS, truncated=False):
    return dict(physical_engine='duckdb',execution_id='dps_'+'a'*16,columns=columns,rows=rows,truncated=truncated,metrics=dict(runtime_id='datapass-free',total_duration_ms=12,total_tasks=4,total_shuffle_bytes=0,total_spill_bytes=0,simulated_credits=0,disclaimer='Distributed metrics are simulations for learning.',stages=[dict(stage_id=0,tasks=4,duration_ms=12,shuffle_read_bytes=0,shuffle_write_bytes=0,spill_bytes=0)]))

class ServiceDouble:
    def __init__(self):self.calls=[];self.version=VERSION;self.drift=False;self.force_truncated=False
    def __call__(self, request):
        body=json.loads(request.content) if request.content else None
        self.calls.append((request.url.path,body))
        path=request.url.path
        if path=='/':value=dict(service=SERVICE,version=self.version,status='ok')
        elif path=='/health':value=dict(service=SERVICE,status='ok')
        elif path=='/v1/runtimes':value={'items':[{'id':'datapass-free'}]}
        elif path=='/v1/spark/compile':
            value=compile_guard(body['code'])[1]
            if self.drift:value['operations']=[]
        elif path=='/v1/spark/execute':
            rows=deepcopy(body['tables'][0]['rows']);cols=COLS[:]
            for op in body['operations']:
                if op['op']=='filter':rows=[r for r in rows if r.get('net_amount') is not None and r['net_amount']>0]
                elif op['op']=='select':cols=op['args']['columns'];rows=[{c:r[c] for c in cols} for r in rows]
                elif op['op']=='limit':rows=rows[:op['args']['count']]
                elif op['op']=='order_by':rows=sorted(rows,key=lambda r:r[op['args']['columns'][0]['column']])
            n=body['collect_limit'];value=payload(rows[:n],cols,len(rows)>n or self.force_truncated)
        else:raise AssertionError(path)
        return httpx.Response(200,json=value)

def setup_service():
    service=ServiceDouble();return GuidedSpark('https://explicit.test',transport=httpx.MockTransport(service)),service

def request(code=STARTER, mode='submit'):
    return dict(exercise_id='guided-retail-filter',exercise_version='1',language='sparklab',remote_consent=True,code=code,mode=mode,notebook_id='nb',cell_id='cell')

@pytest.mark.parametrize('source',[
    'import os\n'+STARTER, 'df = spark.table("orders").filter("net_amount > 0")',
    STARTER+'\ndf.show()',STARTER+'\nx = df.filter(__import__("os"))',
    STARTER+'\ndf = df.join("other")',STARTER+'\ndf = df.limit(True)',
    'df = spark.table("private")', 'spark = spark.table("orders")',
    STARTER+'\ndf = df.filter("net_amount > 0; DROP TABLE secret")',
    STARTER+'\ndf = df.filter("read_csv(1)")',STARTER+'\ndf = spark.select("order_id")',
])
def test_unsupported_syntax_is_rejected_without_evaluation(source):
    with pytest.raises(ValueError):compile_guard(source)

def test_guard_normalizes_and_compares_complete_plan():
    code,plan=compile_guard(STARTER.replace('df = df.filter','filtered = df.filter').replace('df = df.select','df = filtered.select'))
    assert plan['operations'][0]['op']=='filter' and len(plan['operations'])==2
    assert compile_guard(code)[1]==plan

def test_no_endpoint_no_implicit_connection():
    client=GuidedSpark('');assert not client.capabilities()['configured']
    with pytest.raises(CapabilityUnavailable):client.qualify(True)

@pytest.mark.parametrize('url',['http://remote.test','https://user:pass@host','https://host?token=x','https://host/#x'])
def test_bad_configuration(url):
    with pytest.raises(ValueError):GuidedSpark(url)

def test_explicit_consent_qualification_and_full_semantics():
    client,service=setup_service()
    assert not client.capabilities()['available'] and not service.calls
    with pytest.raises(ValueError):client.qualify(False)
    assert not service.calls
    assert client.qualify(True)['available']
    result=client.grade(request());assert result['status']=='passed'
    assert len(result['runs'])==1 and len(result['checks'])==4
    assert all('actual' not in c and 'expected' not in c for c in result['checks'] if c['visibility']!='visible')
    evidence=result['runs'][0]['guided_evidence'];assert evidence['physical_engine']=='duckdb' and 'simulated' in evidence['truth']
    assert all([t['name'] for t in b['tables']]==['orders'] for path,b in service.calls if path.endswith('/execute'))
    assert client.grade(request(STARTER+'\ndf = df.limit(1)'))['status']=='failed'

def test_compile_drift_blocks_execution():
    client,service=setup_service();service.drift=True
    with pytest.raises(CapabilityUnavailable):client.qualify(True)
    assert not any(p.endswith('/execute') for p,_ in service.calls)

def test_version_drift_and_consent_checked_each_run():
    client,service=setup_service();client.qualify(True);count=len(service.calls)
    with pytest.raises(ValueError):client.grade({**request(),'remote_consent':False})
    assert len(service.calls)==count
    service.version='0.2.0'
    with pytest.raises(CapabilityUnavailable):client.grade(request())
    assert not any(p.endswith('/execute') for p,_ in service.calls[count:])

def test_result_truncation_cannot_pass_and_expired_qualification_cannot_run():
    client,service=setup_service();client.qualify(True);service.force_truncated=True
    assert client.grade(request())['status']=='failed'
    client.qualified_until=0
    with pytest.raises(CapabilityUnavailable):client.grade(request())

@pytest.mark.parametrize('change',[
    {'physical_engine':'pyspark'}, {'execution_id':'invented'}, {'columns':['x','x']},
    {'truncated':'false'}, {'rows':[{'order_id':float('nan'),'customer_id':1,'net_amount':2}]},
    {'metrics':{}}, {'rows':[{'x':1}]},
])
def test_result_validation_rejects_wrong_truth_or_shapes(change):
    with pytest.raises(ValueError):valid_result({**payload(PROBE[:2]),**change})

def test_http_failure_and_wrong_json_shape_are_unavailable():
    for response in (httpx.Response(503),httpx.Response(200,json=[])):
        client=GuidedSpark('https://explicit.test',transport=httpx.MockTransport(lambda _:response))
        with pytest.raises(CapabilityUnavailable):client.qualify(True)

@pytest.mark.skipif(not os.getenv('DATAPASS_GUIDED_SPARK_QA_URL'), reason='No live endpoint supplied; mock conformance is not deployment certification.')
def test_real_guided_deployment_conformance():
    client=GuidedSpark(os.environ['DATAPASS_GUIDED_SPARK_QA_URL']);assert client.qualify(True)['available']
    assert client.grade(request())['status']=='passed'


def test_guided_api_records_one_server_owned_attempt_and_redacts_hidden_rows(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from apps.api.datapass import api as api_module
    client_adapter, service = setup_service()
    monkeypatch.setattr(api_module, 'GuidedSpark', lambda **kwargs: client_adapter)
    app = api_module.create_app(tmp_path, token='guided-api-test', mode='sqlite')
    with TestClient(app, base_url='http://localhost', headers={'Authorization':'Bearer guided-api-test'}) as client:
        w = client.post('/api/workspaces', json={'title':'Guided API proof'}).json()
        wid = w['id']
        notebook = {'id':'guided-nb','blocks':[{'id':'answer','type':'notebook-code','kernel':'sparklab'}], 'blockState':{'mosaic:v2:code:answer':STARTER}}
        saved = client.put(f'/api/workspaces/{wid}/notebook', json={'revision':w['revision'],'notebook':notebook}).json()
        body = {**request(), 'notebook_id':'guided-nb','cell_id':'answer','source_revision':saved['revision']}
        unavailable = client.post(f'/api/workspaces/{wid}/exercise', json={**body,'mode':'run'})
        assert unavailable.status_code == 200, unavailable.text
        assert unavailable.json()['status']=='error' and unavailable.json()['runs']==[]
        assert client.get(f'/api/workspaces/{wid}/attempts').json()==[]
        assert not service.calls
        assert client.post('/api/guided-spark/qualify', json={'consent':True}).json()['available']
        response = client.post(f'/api/workspaces/{wid}/exercise', json=body)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['status']=='passed' and len(result['runs'])==1
        assert result['runs'][0]['guided_evidence']['adapter']=='fastapispark-guided-v1'
        assert all('actual' not in check and 'expected' not in check for check in result['checks'] if check['visibility']!='visible')
        history=client.get(f'/api/workspaces/{wid}/attempts').json()
        assert len(history)==1 and history[0]['id']==result['attempt']['id']
        assert len(client.get(f'/api/workspaces/{wid}').json()['runs'])==1
        # A stale notebook checkpoint cannot create a second attempt.
        assert client.post(f'/api/workspaces/{wid}/exercise',json=body).status_code==409
        assert len(client.get(f'/api/workspaces/{wid}/attempts').json())==1


def test_user_selected_endpoint_can_be_overridden_or_disabled(monkeypatch):
    monkeypatch.delenv('DATAPASS_GUIDED_SPARK_URL', raising=False)
    client = GuidedSpark()
    assert client.url == 'https://fastapispark.fastapicloud.dev'
    assert client.capabilities()['configured'] and not client.capabilities()['available']
    monkeypatch.setenv('DATAPASS_GUIDED_SPARK_URL', 'https://chosen.example')
    assert GuidedSpark().url == 'https://chosen.example'
    monkeypatch.setenv('DATAPASS_GUIDED_SPARK_URL', '')
    assert not GuidedSpark().capabilities()['configured']
