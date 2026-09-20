from __future__ import annotations

import base64
import io
import json
import zipfile

import pytest

from apps.api.datapass.airflow_remote import AirflowRemote, AirflowRemoteConfig


class Response:
    def __init__(self, status_code: int, data=None, content: bytes | None = None):
        self.status_code = status_code
        self._data = data
        self.content = content if content is not None else (json.dumps(data).encode() if data is not None else b"")
        self.text = self.content.decode("utf-8", "replace")

    def json(self):
        return self._data


class Client:
    def __init__(self, handler):
        self.handler = handler

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def post(self, url, **kwargs):
        return self.handler("POST", url, kwargs)

    def get(self, url, **kwargs):
        return self.handler("GET", url, kwargs)


def configured() -> AirflowRemoteConfig:
    return AirflowRemoteConfig(
        repo="owner/datapass",
        workflow="datapass-airflow-remote.yml",
        ref="main",
        token="server-only-token",
        public_repo=True,
    )


def test_capability_truth_when_remote_airflow_is_not_configured():
    capability = AirflowRemote(
        AirflowRemoteConfig("owner/repo", "workflow.yml", "main", None, True)
    ).capabilities()

    assert capability["enabled"] is False
    assert capability["mode"] == "github_actions_ephemeral"
    assert capability["airflow_version"] == "3.3.2"
    assert "persistent Airflow scheduler" in capability["scheduler_truth"]
    assert "no secrets" in capability["privacy"].lower()


def test_dispatch_is_bounded_and_token_stays_server_side(monkeypatch):
    calls = []

    def handler(method, url, kwargs):
        calls.append((method, url, kwargs))
        return Response(
            200,
            {
                "workflow_run_id": 12345,
                "html_url": "https://github.com/owner/datapass/actions/runs/12345",
            },
        )

    monkeypatch.setattr(
        "apps.api.datapass.airflow_remote.httpx.Client",
        lambda **_: Client(handler),
    )
    remote = AirflowRemote(configured())
    result = remote.dispatch(
        dag_id="learning_dag",
        logical_date="2026-01-01T00:00:00+00:00",
        source="from airflow.sdk import dag\n",
    )

    assert result["run_id"] == 12345
    assert result["request_id"]
    method, url, kwargs = calls[0]
    assert method == "POST"
    assert url.endswith("/actions/workflows/datapass-airflow-remote.yml/dispatches")
    assert kwargs["headers"]["Authorization"] == "Bearer server-only-token"
    payload = kwargs["json"]
    assert payload["ref"] == "main"
    assert payload["return_run_details"] is True
    assert payload["inputs"]["request_id"] == result["request_id"]
    assert base64.b64decode(payload["inputs"]["dag_source_b64"]).decode() == "from airflow.sdk import dag\n"

    with pytest.raises(ValueError):
        remote.dispatch(dag_id="../bad", logical_date="2026-01-01", source="x")
    with pytest.raises(ValueError):
        remote.dispatch(dag_id="ok", logical_date="2026-01-01", source="x" * 30001)


def test_status_uses_exact_github_run_id(monkeypatch):
    def handler(method, url, kwargs):
        assert method == "GET"
        assert url.endswith("/actions/runs/77")
        return Response(
            200,
            {
                "id": 77,
                "status": "completed",
                "conclusion": "success",
                "html_url": "https://github.com/owner/datapass/actions/runs/77",
                "created_at": "2026-09-20T12:00:00Z",
                "run_started_at": "2026-09-20T12:00:01Z",
                "updated_at": "2026-09-20T12:00:10Z",
            },
        )

    monkeypatch.setattr(
        "apps.api.datapass.airflow_remote.httpx.Client",
        lambda **_: Client(handler),
    )
    status = AirflowRemote(configured()).status(77)
    assert status["run_id"] == 77
    assert status["artifact_available"] is True
    assert status["conclusion"] == "success"


def test_result_reads_only_bounded_airflow_artifact(monkeypatch):
    request_id = "0123456789abcdef"
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as bundle:
        bundle.writestr(
            "result.json",
            json.dumps(
                {
                    "schema_version": 1,
                    "request_id": request_id,
                    "dag_id": "learning_dag",
                    "logical_date": "2026-01-01T00:00:00+00:00",
                    "status": "success",
                    "exit_code": 0,
                    "airflow_version": "3.3.2",
                    "runner": "github-hosted-ubuntu",
                    "execution_mode": "airflow dags test",
                    "persistent_scheduler": False,
                    "tasks": ["extract", "transform"],
                }
            ),
        )
        bundle.writestr("dag-test.log", "real airflow log\n")
    archive = buffer.getvalue()

    remote = AirflowRemote(configured())
    monkeypatch.setattr(
        remote,
        "_run",
        lambda run_id: {
            "id": run_id,
            "status": "completed",
            "html_url": f"https://github.com/owner/datapass/actions/runs/{run_id}",
        },
    )

    def handler(method, url, kwargs):
        if url.endswith("/actions/runs/88/artifacts"):
            return Response(
                200,
                {
                    "artifacts": [
                        {
                            "name": f"datapass-airflow-{request_id}",
                            "archive_download_url": "https://api.github.test/artifact.zip",
                        }
                    ]
                },
            )
        if url == "https://api.github.test/artifact.zip":
            return Response(200, content=archive)
        raise AssertionError(url)

    monkeypatch.setattr(
        "apps.api.datapass.airflow_remote.httpx.Client",
        lambda **_: Client(handler),
    )
    result = remote.result(88, request_id)
    assert result["status"] == "success"
    assert result["tasks"] == ["extract", "transform"]
    assert result["log"] == "real airflow log\n"
    assert result["run_id"] == 88
    assert "real Airflow 3.3.2" in result["truth"]
