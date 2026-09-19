"""Narrow foundation checks; this is not the inherited full runtime/release suite."""
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from apps.api.datapass.foundation import RootWorkbench, validate_workspace_references
from apps.api.datapass.documents import Documents, RevisionConflict
from apps.api.datapass.api import create_app


def fixture():
    return json.loads((Path(__file__).parent/'fixtures'/'foundation.json').read_text())


def prepared(tmp_path):
    docs = Documents(tmp_path)
    workspace = docs.create(None)
    workspace = docs.save_notebook(workspace['id'], workspace['revision'], {'id':'fixture-notebook','title':'Original source','blocks':[], 'private_note':'retained'})
    return docs, workspace


def test_shared_contract_fixture_and_json_schema():
    value = RootWorkbench.model_validate(fixture())
    assert value.model_dump(mode='json') == fixture()
    assert RootWorkbench.model_json_schema()['$defs']['WorkflowResource']['properties']['kind']['const'] == 'workflow'


@pytest.mark.parametrize('fault', ['duplicate_node','missing_endpoint','workflow_cycle','lineage_cycle','missing_column','extra_source','duplicate_tab','missing_resource','missing_task_notebook','bad_position','bad_selection','unknown_runtime','wrong_mode','nonfinite','bad_revision','duplicate_notebook'])
def test_invalid_designs_fail_closed(fault):
    x = fixture()
    workflow, lineage, model = x['resources'][:3]
    if fault == 'duplicate_node': workflow['tasks'].append(deepcopy(workflow['tasks'][0]))
    elif fault == 'missing_endpoint': workflow['dependencies'][0]['source']='absent'
    elif fault == 'workflow_cycle': workflow['dependencies'].append(dict(id='back',source='transform',target='ingest',condition='success'))
    elif fault == 'lineage_cycle': lineage['derivations'].append(dict(id='back',source='gold',target='bronze',note='invalid same-version loop'))
    elif fault == 'missing_column': model['relationships'][0]['source_column']='absent'
    elif fault == 'extra_source': workflow['tasks'][0]['code']='run_untrusted_code()'
    elif fault == 'duplicate_tab': x['panes'][0]['view_ids'].append(x['views'][0]['id'])
    elif fault == 'missing_resource': x['views'][0]['resource_id']='absent'
    elif fault == 'missing_task_notebook': workflow['tasks'][0]['notebook_resource_id']='lineage-fixture'
    elif fault == 'bad_position': x['views'][0]['positions']['absent']={'x':1,'y':2}
    elif fault == 'bad_selection': x['views'][0]['selected_node']='absent'
    elif fault == 'unknown_runtime': workflow['tasks'][0]['runtime']='invented-cloud'
    elif fault == 'wrong_mode': x['views'][0]['mode']='execute'
    elif fault == 'nonfinite': x['panes'][0]['weight']=float('nan')
    elif fault == 'bad_revision': workflow['revision']=True
    elif fault == 'duplicate_notebook': x['resources'].append({**x['resources'][3],'id':'second-ref'})
    with pytest.raises(ValueError): RootWorkbench.model_validate(x)


def test_relationship_cycle_is_not_dependency_cycle():
    x=fixture();x['resources'][2]['relationships'].append(dict(id='reverse',source='sales',target='customer',source_column='customer_key',target_column='customer_key',cardinality='many-to-one'))
    RootWorkbench.model_validate(x)


def test_notebook_binding_requires_an_existing_saved_document(tmp_path):
    docs, workspace=prepared(tmp_path)
    validate_workspace_references(RootWorkbench.model_validate(fixture()),workspace)
    with pytest.raises(ValueError,match='not saved'):
        validate_workspace_references(RootWorkbench.model_validate(fixture()),{'notebook':None})


def test_workbench_save_preserves_notebook_runs_and_practice_state(tmp_path):
    docs, workspace=prepared(tmp_path)
    original=deepcopy(workspace)
    saved=docs.save_workbench(workspace['id'],workspace['revision'],fixture())
    assert saved['revision']==original['revision']+1
    for key in ('notebook','notebooks','runs','evidence','case_id','title'):
        assert saved[key]==original[key]
    assert Documents(tmp_path).get(saved['id'])['workbench']==fixture()


def test_rejected_save_has_no_partial_write(tmp_path):
    docs,workspace=prepared(tmp_path);before=docs.get(workspace['id'])
    bad=fixture();bad['views'][0]['resource_id']='missing'
    with pytest.raises(ValueError): docs.save_workbench(workspace['id'],workspace['revision'],bad)
    assert docs.get(workspace['id'])==before
    with pytest.raises(RevisionConflict): docs.save_workbench(workspace['id'],999,fixture())
    assert docs.get(workspace['id'])==before


def test_competing_writes_share_the_existing_revision_lock(tmp_path):
    docs,workspace=prepared(tmp_path)
    def save(_):
        try: docs.save_workbench(workspace['id'],workspace['revision'],fixture());return 'saved'
        except RevisionConflict: return 'conflict'
    with ThreadPoolExecutor(max_workers=2) as pool: assert sorted(pool.map(save,range(2)))==['conflict','saved']
    assert docs.get(workspace['id'])['revision']==workspace['revision']+1


def test_authenticated_validate_and_save_routes_do_not_invoke_a_kernel(tmp_path):
    app=create_app(tmp_path,token='foundation-test',mode='sqlite')
    docs=app.state.documents
    workspace=docs.create(None);workspace=docs.save_notebook(workspace['id'],0,{'id':'fixture-notebook','blocks':[]})
    def forbidden(*args,**kwargs): raise AssertionError('Design endpoints must not start a kernel')
    app.state.manager.call=forbidden
    headers={'Authorization':'Bearer foundation-test'}
    with TestClient(app,base_url='http://localhost') as client:
        base=f"/api/workspaces/{workspace['id']}/workbench"
        assert client.get('/api/foundation/schema').status_code==401
        assert client.get('/api/foundation/schema',headers=headers).status_code==200
        assert client.post(base+'/validate',json=fixture(),headers=headers).json()['truth']=='design_only'
        assert docs.get(workspace['id'])==workspace
        response=client.put(base,json={'revision':workspace['revision'],'workbench':fixture()},headers=headers)
        assert response.status_code==200,response.text
        assert response.json()['notebook']==workspace['notebook']
        assert response.json()['runs']==[]
        assert client.put(base,json={'revision':workspace['revision'],'workbench':fixture()},headers=headers).status_code==409
        bad=fixture();bad['resources'][0]['tasks'][0]['runtime']='fake'
        assert client.post(base+'/validate',json=bad,headers=headers).status_code==422
        assert len(docs.get(workspace['id'])['runs'])==0


def test_unknown_workspace_and_payload_limits(tmp_path):
    app=create_app(tmp_path,token='foundation-test',mode='sqlite')
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer foundation-test'}) as client:
        assert client.post('/api/workspaces/'+'0'*32+'/workbench/validate',json=fixture()).status_code==404
    value=fixture();value['resources'][0]['tasks']*=201
    with pytest.raises(ValueError):RootWorkbench.model_validate(value)
