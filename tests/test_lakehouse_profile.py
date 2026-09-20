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

        engine.catalog.execute(
            "CREATE TABLE silver.pruning_probe (id INTEGER, amount DOUBLE)",
            "lakehouse-fidelity-test",
        )
        engine.catalog.execute(
            "INSERT INTO silver.pruning_probe VALUES (1, 10.0)",
            "lakehouse-fidelity-test",
        )
        first_snapshot = engine.catalog.ducklake_table_evidence("silver.pruning_probe")["storage"]["snapshot_id"]
        for value in (100, 1000, 10000):
            engine.catalog.execute(
                f"INSERT INTO silver.pruning_probe VALUES ({value}, {float(value)})",
                "lakehouse-fidelity-test",
            )

        pruning_before = engine.catalog.ducklake_table_evidence("silver.pruning_probe")
        assert pruning_before["storage"]["file_count"] >= 4
        assert pruning_before["storage"]["small_file_count"] >= 2
        assert pruning_before["storage"]["compaction_candidate"] is True

        zone_map = engine.catalog.ducklake_pruning_evidence("silver.pruning_probe", '("id" < 50)')
        assert zone_map is not None
        assert zone_map["truth"] == "measured_ducklake_zone_map_metadata"
        assert zone_map["candidate_files"] < zone_map["total_files"]
        assert zone_map["candidate_bytes"] < zone_map["total_bytes"]

        historical = engine.catalog.ducklake_snapshot_preview("silver.pruning_probe", first_snapshot, 50)
        assert historical["truth"] == "real DuckLake time-travel query"
        assert historical["result"]["rows"] == [{"id": 1, "amount": 10.0}]

        pruning_spark = engine.execute({
            "op": "execute",
            "case_id": "retail-medallion",
            "notebook_id": "ducklake-pruning",
            "cell_id": "pruned-scan",
            "language": "sparklab",
            "code": 'from pyspark.sql import functions as F\nresult = spark.table("silver.pruning_probe").filter(F.col("id") < 50).select("id")',
            "profile": "generic_8x8",
            "aqe": True,
        })
        assert pruning_spark["status"] == "success", pruning_spark
        scan_stats = pruning_spark["simulation"]["assumptions"]["input_statistics"]["silver.pruning_probe"]
        assert scan_stats["pruning"]["truth"] == "measured_ducklake_zone_map_metadata"
        assert scan_stats["scan_files"] == zone_map["candidate_files"]
        assert scan_stats["bytes"] == zone_map["candidate_bytes"]
        assert "zone-map" in scan_stats["input_truth"]

        compaction = engine.catalog.ducklake_compact("silver.pruning_probe")
        assert compaction["truth"] == "real DuckLake merge_adjacent_files maintenance"
        assert compaction["logical_rows_preserved"] == 4
        assert compaction["after"]["file_count"] < compaction["before"]["file_count"]
        assert engine.catalog.ducklake_snapshot_preview(
            "silver.pruning_probe", first_snapshot, 50
        )["result"]["rows"] == [{"id": 1, "amount": 10.0}]

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
