from __future__ import annotations

import os
from pathlib import Path

import pytest

from apps.api.datapass.lakehouse import attach_ducklake


class _Cursor:
    def __init__(self, *, rows=None, row=None):
        self._rows = rows or []
        self._row = row

    def fetchall(self):
        return list(self._rows)

    def fetchone(self):
        return self._row


class _FakeDuckDB:
    def __init__(self):
        self.statements: list[str] = []

    def execute(self, sql: str):
        self.statements.append(sql)
        normalized = " ".join(sql.split())
        if "FROM duckdb_extensions()" in normalized:
            return _Cursor(rows=[("ducklake", "1.0-test"), ("sqlite", "test")])
        if normalized == "SELECT version()":
            return _Cursor(row=("v1.5.5-test",))
        return _Cursor()


def test_new_ducklake_profile_uses_sqlite_metadata_parquet_and_no_inlining(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("DATAPASS_INSTALL_DUCKLAKE", raising=False)
    db = _FakeDuckDB()

    profile = attach_ducklake(db, tmp_path)

    assert profile.active is True
    assert profile.compute_engine == "duckdb"
    assert profile.metadata_backend == "sqlite"
    assert profile.metadata_file == "lake-metadata.sqlite"
    assert profile.data_format == "parquet"
    assert profile.data_directory == "lake-files"
    assert profile.data_inlining_row_limit == 0
    assert profile.legacy_metadata is False
    assert (tmp_path / "lake-files").is_dir()

    attach = next(sql for sql in db.statements if sql.startswith("ATTACH "))
    assert "ducklake:sqlite:" in attach
    assert "DATA_PATH" in attach
    assert "DATA_INLINING_ROW_LIMIT 0" in attach
    assert any(sql.startswith("SET allowed_directories=") for sql in db.statements)


def test_legacy_duckdb_metadata_is_preserved_instead_of_orphaned(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("DATAPASS_INSTALL_DUCKLAKE", raising=False)
    (tmp_path / "lake-catalog.ducklake").write_bytes(b"legacy")
    db = _FakeDuckDB()

    profile = attach_ducklake(db, tmp_path)

    assert profile.metadata_backend == "duckdb-legacy"
    assert profile.metadata_file == "lake-catalog.ducklake"
    assert profile.legacy_metadata is True
    attach = next(sql for sql in db.statements if sql.startswith("ATTACH "))
    assert "ducklake:sqlite:" not in attach
    assert "DATA_INLINING_ROW_LIMIT 0" in attach


@pytest.mark.skipif(
    os.environ.get("DATAPASS_DUCKLAKE_INTEGRATION") != "1",
    reason="real DuckLake extension integration is an explicit CI/smoke gate",
)
def test_real_ducklake_profile_round_trip(tmp_path: Path, monkeypatch):
    pytest.importorskip("duckdb")
    monkeypatch.setenv("DATAPASS_INSTALL_DUCKLAKE", "1")

    from apps.api.datapass.execution import Engine

    engine = Engine(tmp_path, "ducklake")
    try:
        contract = engine.capabilities()["lakehouse"]
        assert contract["active"] is True
        assert contract["metadata_backend"] == "sqlite"
        assert contract["data_inlining_row_limit"] == 0

        engine.catalog.materialize(
            "bronze.integration_probe",
            "SELECT 1 AS id, 'ducklake' AS layer",
            "integration-test",
        )
    finally:
        engine.catalog.close()

    assert (tmp_path / "lake-metadata.sqlite").exists()
    assert list((tmp_path / "lake-files").rglob("*.parquet"))

    reopened = Engine(tmp_path, "ducklake")
    try:
        assert reopened.catalog.query(
            "SELECT * FROM bronze.integration_probe"
        )["rows"] == [{"id": 1, "layer": "ducklake"}]
    finally:
        reopened.catalog.close()
