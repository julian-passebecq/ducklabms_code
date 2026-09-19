from __future__ import annotations

import json
from pathlib import Path
import stat

import pytest
from fastapi.testclient import TestClient

from apps.api.datapass.api import create_app
from apps.api.datapass import rust_engine


def fake_engine(tmp_path: Path) -> Path:
    path = tmp_path/'fake-datapass-engine'
    path.write_text('''#!/usr/bin/env python3
import json,sys
request=json.load(sys.stdin)
if request["kind"]=="probe":
    payload={"protocol_version":1,"engine":"datafusion","engine_version":"55.0.0","truth":"real_local","activation":"experimental_opt_in","default_runtime_changed":False}
elif request["kind"]=="query":
    payload={"protocol_version":1,"engine":"datafusion","engine_version":"55.0.0","truth":"real_local","row_count":1,"preview_row_count":1,"truncated":False,"rows":[{"answer":42}],"logical_plan":"Projection","physical_plan":"ProjectionExec","physical_plan_with_metrics":"ProjectionExec metrics=[]","sources":request["sources"]}
else:
    print(json.dumps({"protocol_version":1,"ok":False,"payload":None,"error":"unsupported"}));sys.exit(2)
print(json.dumps({"protocol_version":1,"ok":True,"payload":payload,"error":None}))
''')
    path.chmod(path.stat().st_mode | stat.S_IXUSR)
    return path


def test_status_is_explicitly_unavailable_without_binary(monkeypatch):
    monkeypatch.delenv('DATAPASS_RUST_ENGINE_BIN',raising=False)
    value=rust_engine.status()
    assert value['available'] is False
    assert value['activation']=='experimental_opt_in'
    assert value['default_runtime_changed'] is False


def test_workspace_query_resolves_only_workspace_relative_sources(tmp_path,monkeypatch):
    binary=fake_engine(tmp_path);monkeypatch.setenv('DATAPASS_RUST_ENGINE_BIN',str(binary))
    data=tmp_path/'workspace'/'data';data.mkdir(parents=True)
    parquet=data/'events.parquet';parquet.write_bytes(b'fixture')
    result=rust_engine.workspace_query(data,{'sql':'select 42','sources':[{'name':'events','path':'events.parquet'}],'max_rows':10,'target_partitions':2})
    assert result['truth']=='real_local'
    assert result['sources'][0]['path']==str(parquet.resolve())
    with pytest.raises(ValueError,match='workspace-relative'):
        rust_engine.workspace_query(data,{'sql':'select 42','sources':[{'name':'events','path':str(parquet.resolve())}]})
    with pytest.raises(ValueError,match='escapes'):
        rust_engine.workspace_query(data,{'sql':'select 42','sources':[{'name':'events','path':'../outside.parquet'}]})


def test_authenticated_api_keeps_rust_engine_opt_in_and_separate_from_kernel(tmp_path,monkeypatch):
    binary=fake_engine(tmp_path);monkeypatch.setenv('DATAPASS_RUST_ENGINE_BIN',str(binary))
    app=create_app(tmp_path/'workspaces',token='rust-test',mode='sqlite')
    workspace=app.state.documents.create(None)
    data=app.state.documents.folder(workspace['id'])/'data';data.mkdir(exist_ok=True)
    (data/'events.parquet').write_bytes(b'fixture')
    def forbidden(*args,**kwargs): raise AssertionError('Rust spike endpoint must not invoke the existing kernel manager')
    app.state.manager.call=forbidden
    headers={'Authorization':'Bearer rust-test'}
    with TestClient(app,base_url='http://localhost') as client:
        assert client.get('/api/engines/rust').status_code==401
        status_response=client.get('/api/engines/rust',headers=headers)
        assert status_response.status_code==200
        assert status_response.json()['engine']=='datafusion'
        response=client.post(f"/api/workspaces/{workspace['id']}/engines/rust/query",headers=headers,json={
            'sql':'select 42 as answer','sources':[{'name':'events','path':'events.parquet'}],'max_rows':5,'target_partitions':2,
        })
        assert response.status_code==200,response.text
        body=response.json()
        assert body['truth']=='real_local'
        assert body['rows']==[{'answer':42}]
        assert app.state.documents.get(workspace['id'])['runs']==[]
