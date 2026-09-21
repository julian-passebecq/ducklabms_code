import pytest
from apps.api.datapass.local_data import parse_csv,import_csv
from apps.api.datapass.catalog import Catalog

@pytest.mark.parametrize('text',['','a,A\n1,2','x,y\n1','bad name\n1','x\n1\x00','x\n"unterminated','x\n'+('a'*10001),'x\n'+'1\n'*5001])
def test_invalid_csv_rejected(text):
    with pytest.raises(ValueError):parse_csv(text)

def test_quotes_bom_empty_fields_and_no_type_inference():
    cols,rows,digest=parse_csv('\ufeffid,label\n001,"a,b"\n002,\n')
    assert cols==['id','label'] and rows==[['001','a,b'],['002','']] and len(digest)==64

def test_real_compatibility_catalog_import_create_only_and_persistence(tmp_path):
    c=Catalog(tmp_path,mode='sqlite')
    value=import_csv(c,'bronze.csv_test','id,label\n001,a\n002,\n')
    assert value['rows_imported']==2 and value['result']['rows'][0]['id']=='001'
    with pytest.raises(ValueError):import_csv(c,'bronze.csv_test','id\n3')
    with pytest.raises(ValueError):import_csv(c,'source.orders','id\n3')
    c.close();c=Catalog(tmp_path,mode='sqlite');assert c.query('select count(*) as n from bronze.csv_test')['rows']==[{'n':2}];c.close()

def test_empty_csv_body_creates_empty_typed_table(tmp_path):
    c=Catalog(tmp_path,mode='sqlite');v=import_csv(c,'bronze.csv_empty','id,label\n');assert v['rows_imported']==0 and v['result']['columns']==['id','label'];c.close()

def test_bad_asset_or_failed_parse_never_changes_catalog(tmp_path):
    c=Catalog(tmp_path,mode='sqlite');before=c.listing()
    for name,text in [('bronze.x;DROP TABLE source.orders','x\n1'),('bronze.csv_bad','x,y\n1')]:
        with pytest.raises(ValueError):import_csv(c,name,text)
    assert c.listing()==before;c.close()


def test_csv_api_revision_provenance_and_reopen(tmp_path):
    from fastapi.testclient import TestClient
    from apps.api.datapass.api import create_app
    app=create_app(tmp_path,token='csv-api-test',mode='sqlite')
    with TestClient(app,base_url='http://localhost',headers={'Authorization':'Bearer csv-api-test'}) as client:
        w=client.post('/api/workspaces',json={'title':'CSV example'}).json();wid=w['id']
        body={'asset':'bronze.uploaded','text':'id,label\n001,"a,b"\n002,\n','workspace_revision':w['revision']}
        response=client.post(f'/api/workspaces/{wid}/catalog/import-csv',json=body)
        assert response.status_code==200,response.text
        result=response.json();assert result['rows_imported']==2
        saved=client.get(f'/api/workspaces/{wid}').json()
        assert saved['revision']==result['workspace_revision']==1
        run=saved['runs'][-1];assert run['status']=='success' and run['source_hash']==result['sha256']
        assert client.post(f'/api/workspaces/{wid}/catalog/import-csv',json={**body,'asset':'bronze.other'}).status_code==409
        assert client.post(f'/api/workspaces/{wid}/catalog/import-csv',json={**body,'workspace_revision':1}).status_code==422
        assert len(client.get(f'/api/workspaces/{wid}').json()['runs'])==1
        app.state.manager.restart(wid)
        preview=client.get(f'/api/workspaces/{wid}/catalog/preview',params={'asset':'bronze.uploaded'})
        assert preview.status_code==200,preview.text
        assert preview.json()['result']['rows']==[{'id':'001','label':'a,b'},{'id':'002','label':''}]
        other=client.post('/api/workspaces',json={'title':'Isolated workspace'}).json()['id']
        absent=client.get(f'/api/workspaces/{other}/catalog/preview',params={'asset':'bronze.uploaded'})
        assert absent.status_code!=200  # Never reads a different workspace's data.


def test_workspace_names_trimmed_and_case_names_can_be_customized(tmp_path):
    from apps.api.datapass.documents import Documents
    from apps.api.datapass.content import cases
    docs=Documents(tmp_path)
    assert docs.create(None,'  My named workspace  ')['title']=='My named workspace'
    assert docs.create(cases()[0]['id'],'My custom case')['title']=='My custom case'
    with pytest.raises(ValueError): docs.create(None,'   ')
