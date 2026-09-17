import json
from pathlib import Path

import pytest

from services.semantic.executor import execute_reference_sql, verify_against_truth
from services.sparklab.safe_parser import SafeSparkParser
from services.sparklab.sparklab import SparkSession

ROOT = Path(__file__).resolve().parents[1]
PROFILES = ROOT / "sparklab" / "profiles.json"
PACK = ROOT / "sparklab" / "exercises" / "retail_broadcast_join_03.json"

GOOD_CODE = '''
from pyspark.sql import functions as F
orders = spark.table("silver.orders")
segments = spark.table("silver.dim_customer_segment")
result = (orders.filter(F.col("net_amount") > 0)
    .join(F.broadcast(segments), "segment_id")
    .groupBy("customer_id")
    .agg(F.sum("net_amount").alias("revenue"), F.count("*").alias("orders")))
'''


def compiled_sql(code: str) -> str:
    spark = SparkSession.from_profile(PROFILES, "retail")
    return SafeSparkParser(spark).parse(code).dataframe.sql


def test_reference_fixture_executes_real_rows():
    result = execute_reference_sql(compiled_sql(GOOD_CODE), "retail")
    assert result.status == "executed"
    assert result.engine == "SQLite reference fixture"
    assert result.row_count == 5
    assert result.columns == ["customer_id", "revenue", "orders"]
    assert any(row["customer_id"] == "CORPORATE_ACCOUNT_01" and row["revenue"] == 4500.0 for row in result.rows)


def test_reference_fixture_matches_truth_pack():
    pack = json.loads(PACK.read_text())
    result = verify_against_truth(execute_reference_sql(compiled_sql(GOOD_CODE), "retail"), pack)
    assert result.verified is True


def test_wrong_semantics_fail_truth_pack():
    wrong = GOOD_CODE.replace('.filter(F.col("net_amount") > 0)\n    ', '')
    pack = json.loads(PACK.read_text())
    result = verify_against_truth(execute_reference_sql(compiled_sql(wrong), "retail"), pack)
    assert result.verified is False
    assert result.row_count == 7


def test_fixture_executor_is_read_only():
    with pytest.raises(ValueError):
        execute_reference_sql('DELETE FROM silver.orders', 'retail')


def test_execution_provenance_is_deterministic():
    first = execute_reference_sql(compiled_sql(GOOD_CODE), "retail", engine="sqlite")
    second = execute_reference_sql(compiled_sql(GOOD_CODE), "retail", engine="sqlite")
    assert first.engine_key == "sqlite"
    assert len(first.query_sha256) == 64
    assert len(first.preview_sha256) == 64
    assert len(first.result_sha256 or "") == 64
    assert first.query_sha256 == second.query_sha256
    assert first.preview_sha256 == second.preview_sha256
    assert first.result_sha256 == second.result_sha256
    assert first.verification_complete is True
    assert first.preview_truncated is False
    assert first.elapsed_ms >= 0


def test_truncated_preview_can_still_verify_using_full_bounded_hash():
    pack = json.loads(PACK.read_text())
    result = execute_reference_sql(compiled_sql(GOOD_CODE), "retail", limit=2, engine="sqlite")
    checked = verify_against_truth(result, pack)
    assert checked.preview_truncated is True
    assert checked.verification_complete is True
    assert len(checked.result_sha256 or "") == 64
    assert checked.verified is True


def test_explicit_duckdb_request_is_capability_safe():
    from services.semantic.executor import SemanticEngineUnavailable, capabilities
    caps = capabilities()
    if caps["semantic_engines"]["duckdb"]["available"]:
        result = execute_reference_sql(compiled_sql(GOOD_CODE), "retail", engine="duckdb")
        assert result.engine_key == "duckdb"
    else:
        with pytest.raises(SemanticEngineUnavailable):
            execute_reference_sql(compiled_sql(GOOD_CODE), "retail", engine="duckdb")


def test_known_schema_withcolumn_replacement_executes_portably():
    code = '''
from pyspark.sql import functions as F
orders = spark.table("silver.orders")
result = orders.withColumn("net_amount", F.col("net_amount") * 2).select("order_id", "net_amount")
'''
    result = execute_reference_sql(compiled_sql(code), "retail", engine="sqlite")
    assert result.row_count == 12
    row = next(item for item in result.rows if item["order_id"] == "O-001")
    assert row["net_amount"] == 200.0
    assert result.columns == ["order_id", "net_amount"]


def test_known_schema_drop_and_whole_row_dedupe_execute_portably():
    code = '''
orders = spark.table("silver.orders")
result = orders.drop("loaded_at").dropDuplicates()
'''
    result = execute_reference_sql(compiled_sql(code), "retail", engine="sqlite")
    assert result.row_count == 12
    assert "loaded_at" not in result.columns
    assert result.preview_truncated is False


def test_large_bounded_result_withholds_verification_hash_above_ceiling():
    result = execute_reference_sql(
        'SELECT a.order_id AS a, b.order_id AS b, c.order_id AS c, d.order_id AS d FROM silver.orders a CROSS JOIN silver.orders b CROSS JOIN silver.orders c CROSS JOIN silver.orders d',
        'retail',
        limit=3,
        engine='sqlite',
    )
    assert result.row_count == 12 ** 4
    assert result.preview_truncated is True
    assert result.verification_complete is False
    assert result.result_sha256 is None


def test_semantic_executor_rejects_multiple_statements():
    with pytest.raises(ValueError):
        execute_reference_sql('SELECT * FROM silver.orders; SELECT * FROM silver.orders', 'retail')
