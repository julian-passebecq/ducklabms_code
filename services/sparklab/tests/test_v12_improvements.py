import json
from pathlib import Path

from services.sparklab.cost import price_job
from services.sparklab.generate_preview import build_preview
from services.sparklab.runtime import load_cluster_profiles, simulate_retail_job
from services.sparklab.safe_parser import SafeSparkParser
from services.sparklab.sparklab import SparkSession

ROOT = Path(__file__).resolve().parents[1]
PROFILES = ROOT / "profiles.json"
CLUSTERS = ROOT / "cluster_profiles.json"
JOIN_PACK = ROOT / "exercises" / "retail_broadcast_join_03.json"


def parse(code: str):
    return SafeSparkParser(SparkSession.from_profile(PROFILES, "retail")).parse(code).dataframe


def test_select_star_preserves_wildcard_and_known_schema():
    df = parse('df = spark.table("silver.orders")\nresult = df.select("*")')
    assert 'SELECT * FROM' in df.sql
    assert df.current_columns() == ["order_id", "customer_id", "segment_id", "net_amount", "loaded_at"]


def test_when_cast_isin_between_and_rename_compile_portably():
    code = r'''
from pyspark.sql import functions as F
orders = spark.table("silver.orders")
result = (orders
    .filter(F.col("segment_id").isin(1, 2, 3) & F.col("net_amount").between(0, 5000))
    .withColumn("amount_int", F.col("net_amount").cast("int"))
    .withColumn("bucket", F.when(F.col("net_amount") > 100, "high").otherwise("normal"))
    .withColumnRenamed("loaded_at", "ingested_at"))
'''
    df = parse(code)
    sql = df.sql
    assert 'IN (1, 2, 3)' in sql
    assert 'BETWEEN 0 AND 5000' in sql
    assert 'CAST("net_amount" AS INTEGER)' in sql
    assert 'CASE WHEN ("net_amount" > 100) THEN \'high\' ELSE \'normal\' END' in sql
    assert '"loaded_at" AS "ingested_at"' in sql
    assert "ingested_at" in (df.current_columns() or [])


def test_multikey_join_uses_using_and_excludes_join_keys_from_right_projection():
    code = r'''
a = spark.table("silver.orders")
b = spark.table("silver.customers").withColumnRenamed("loaded_at", "customer_loaded_at")
result = a.join(b, ["customer_id", "segment_id"], "left")
'''
    df = parse(code)
    assert 'USING ("customer_id", "segment_id")' in df.sql
    cols = df.current_columns() or []
    assert cols.count("customer_id") == 1
    assert cols.count("segment_id") == 1
    assert "customer_loaded_at" in cols


def test_cost_model_includes_driver_and_exposes_slot_utilization():
    pack = json.loads(JOIN_PACK.read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["fabric_f64_like"]
    job = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=True)
    assert job.driver_core_hours > 0
    assert job.core_hours > job.worker_core_hours
    assert job.node_hours > job.worker_node_hours
    assert 0 < job.cluster_utilization_pct <= 100
    priced = price_job(job, profile)
    assert priced["fabric_like"]["cu_hours"] == round(job.core_hours * 0.5, 4)


def test_checked_in_runtime_preview_is_generated_from_current_runtime():
    expected = build_preview()
    actual = json.loads((ROOT / "runtime_preview.json").read_text())
    assert actual == expected
