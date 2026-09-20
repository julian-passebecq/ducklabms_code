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
        probe = next(asset for asset in engine.catalog.listing() if asset["name"] == "bronze.integration_probe")
        assert probe["storage"]["truth"] == "measured_ducklake_metadata"
        assert probe["storage"]["format"] == "parquet"
        assert probe["storage"]["file_count"] >= 1
        assert probe["storage"]["size_bytes"] > 0
        assert probe["storage"]["snapshot_id"] is not None

        spark_run = engine.execute({
            "op": "execute",
            "case_id": "retail-medallion",
            "notebook_id": "ducklake-evidence",
            "cell_id": "scan",
            "language": "sparklab",
            "code": 'result = spark.table("bronze.integration_probe").select("id")',
            "profile": "generic_8x8",
            "aqe": True,
        })
        assert spark_run["status"] == "success", spark_run
        assert spark_run["simulation"]["status"] == "modeled"
        assert spark_run["simulation"]["assumptions"]["kind"] == "catalog rows + measured DuckLake Parquet files/bytes"
        stats = spark_run["simulation"]["assumptions"]["input_statistics"]["bronze.integration_probe"]
        assert stats["input_truth"] == "rows measured from table; bytes/files measured from DuckLake metadata"
        assert stats["bytes"] == probe["storage"]["size_bytes"]
        assert stats["source_files"] == probe["storage"]["file_count"]
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


@pytest.mark.skipif(
    os.environ.get("DATAPASS_DUCKLAKE_INTEGRATION") != "1",
    reason="real DuckLake maintenance integration is an explicit CI/smoke gate",
)
def test_ducklake_small_files_compact_without_breaking_time_travel(tmp_path: Path, monkeypatch):
    pytest.importorskip("duckdb")
    monkeypatch.setenv("DATAPASS_INSTALL_DUCKLAKE", "1")

    from apps.api.datapass.execution import Engine

    engine = Engine(tmp_path, "ducklake")
    try:
        engine.catalog.materialize(
            "bronze.compaction_probe",
            "SELECT 1 AS id, 'first' AS payload",
            "compaction-test",
        )
        before_snapshot = engine.catalog.lakehouse_overview()["snapshots"][0]["snapshot_id"]

        for value in range(2, 7):
            engine.catalog.execute(
                f"INSERT INTO bronze.compaction_probe VALUES ({value}, 'v{value}')",
                "compaction-test",
            )

        before = next(
            row for row in engine.catalog.lakehouse_overview()["tables"]
            if row["name"] == "bronze.compaction_probe"
        )
        assert before["file_count"] >= 4
        assert before["small_file_count"] >= 4
        assert before["compaction_advisory"] == "consider_merge_adjacent_files"

        current_rows = engine.catalog.query(
            "SELECT COUNT(*) AS n FROM bronze.compaction_probe"
        )["rows"]
        historical_rows = engine.catalog.db.execute(
            f"SELECT COUNT(*) FROM bronze.compaction_probe AT (VERSION => {before_snapshot})"
        ).fetchone()[0]
        assert current_rows == [{"n": 6}]
        assert historical_rows == 1

        engine.catalog.db.execute(
            "CALL ducklake_merge_adjacent_files('lake', 'compaction_probe', schema => 'bronze')"
        )
        after = next(
            row for row in engine.catalog.lakehouse_overview()["tables"]
            if row["name"] == "bronze.compaction_probe"
        )
        assert after["file_count"] < before["file_count"]
        assert engine.catalog.db.execute(
            f"SELECT COUNT(*) FROM bronze.compaction_probe AT (VERSION => {before_snapshot})"
        ).fetchone()[0] == 1
        assert engine.catalog.query(
            "SELECT COUNT(*) AS n FROM bronze.compaction_probe"
        )["rows"] == [{"n": 6}]
    finally:
        engine.catalog.close()
