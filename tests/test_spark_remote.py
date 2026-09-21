from __future__ import annotations

import json

import pytest

from apps.api.datapass.execution import Engine
from apps.api.datapass.spark_remote import SparkRemote, SparkRemoteConfig


class Response:
    def __init__(self, status_code: int, data=None):
        self.status_code = status_code
        self._data = data
        self.text = json.dumps(data) if data is not None else ""

    def json(self):
        return self._data


class Client:
    def __init__(self, handler):
        self.handler = handler

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url, **kwargs):
        return self.handler("GET", url, kwargs)

    def post(self, url, **kwargs):
        return self.handler("POST", url, kwargs)


def test_spark_proxy_unconfigured_is_explicit():
    capability = SparkRemote(SparkRemoteConfig(None, None)).capabilities()
    assert capability["enabled"] is False
    assert capability["mode"] == "github_actions_ephemeral"
    assert "SparkLab simulation remains available" in capability["cluster_truth"]


def test_spark_proxy_keeps_runner_key_server_side(monkeypatch):
    calls = []

    def handler(method, url, kwargs):
        calls.append((method, url, kwargs))
        if method == "POST":
            return Response(
                202,
                {
                    "request_id": "0123456789abcdef",
                    "status": "accepted",
                    "job_id": "github:42",
                    "run_id": 42,
                    "run_url": "https://github.test/actions/runs/42",
                    "truth": "accepted",
                },
            )
        raise AssertionError(url)

    monkeypatch.setattr(
        "apps.api.datapass.spark_remote.httpx.Client",
        lambda **_: Client(handler),
    )

    remote = SparkRemote(SparkRemoteConfig("https://spark.example", "server-secret"))
    result = remote.dispatch(
        code='result = spark.table("silver.orders")',
        tables=[{"name": "silver.orders", "rows": [{"order_id": "O-1"}]}],
        collect_limit=50,
    )

    assert result["run_id"] == 42
    assert result["job_id"] == "github:42"
    method, url, kwargs = calls[0]
    assert method == "POST"
    assert url == "https://spark.example/v1/spark/verify"
    assert kwargs["headers"]["X-Datapass-Runner-Key"] == "server-secret"
    assert kwargs["json"]["tables"][0]["name"] == "silver.orders"


def test_exact_workspace_fixture_is_prepared_without_sampling(tmp_path):
    engine = Engine(tmp_path / "data", mode="sqlite")
    try:
        engine.catalog.materialize(
            "bronze.orders",
            "SELECT * FROM source.orders",
            "seed",
        )
        prepared = engine.spark_verify_fixture(
            {
                "notebook_id": "case-notebook",
                "code": (
                    'from pyspark.sql import functions as F\n'
                    'orders = spark.table("bronze.orders")\n'
                    'result = orders.filter(F.col("net_amount") > 0)'
                ),
            }
        )
        assert prepared["sources"] == ["bronze.orders"]
        assert prepared["tables"][0]["name"] == "bronze.orders"
        assert len(prepared["tables"][0]["rows"]) == 12
        assert prepared["truth"] == "exact bounded workspace rows prepared locally; no silent sampling"
    finally:
        engine.catalog.close()


def test_fixture_fails_closed_when_catalog_preview_would_truncate(tmp_path):
    engine = Engine(tmp_path / "data", mode="sqlite")
    try:
        values = " UNION ALL ".join(
            f"SELECT {i} AS id, {i} AS amount" for i in range(250)
        )
        engine.catalog.materialize("bronze.large_probe", values, "seed")
        with pytest.raises(ValueError, match="exceeds the bounded fixture limit"):
            engine.spark_verify_fixture(
                {
                    "notebook_id": "case-notebook",
                    "code": (
                        'from pyspark.sql import functions as F\n'
                        'source = spark.table("bronze.large_probe")\n'
                        'result = source.filter(F.col("amount") > 0)'
                    ),
                }
            )
    finally:
        engine.catalog.close()


def test_spark_proxy_uses_provider_neutral_job_routes(monkeypatch):
    calls = []

    def handler(method, url, kwargs):
        calls.append((method, url, kwargs))
        if url.endswith("/v1/spark/jobs/github:42"):
            return Response(200, {"job_id":"github:42","status":"completed","conclusion":"success"})
        if url.endswith("/v1/spark/jobs/github:42/result/0123456789abcdef"):
            return Response(200, {"job_id":"github:42","request_id":"0123456789abcdef","status":"success"})
        raise AssertionError(url)

    monkeypatch.setattr(
        "apps.api.datapass.spark_remote.httpx.Client",
        lambda **_: Client(handler),
    )

    remote = SparkRemote(SparkRemoteConfig("https://spark.example", "server-secret"))
    status = remote.status("github:42")
    result = remote.result("github:42", "0123456789abcdef")
    assert status["job_id"] == "github:42"
    assert result["job_id"] == "github:42"
    assert calls[0][1].endswith("/v1/spark/jobs/github:42")
    assert calls[1][1].endswith("/v1/spark/jobs/github:42/result/0123456789abcdef")
