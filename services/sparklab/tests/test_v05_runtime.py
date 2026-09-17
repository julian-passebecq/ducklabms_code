import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

from services.sparklab.cost import price_job
from services.sparklab.runtime import load_cluster_profiles, normalized_partitions, partition_evidence, simulate_finance_window_job, simulate_retail_job, simulate_retail_skew_job, simulate_workspace
from services.sparklab.safe_parser import SafeSparkParser, SparkLabSyntaxError
from services.sparklab.sparklab import SparkSession, functions as F

PROFILES = ROOT / "profiles.json"
CLUSTERS = ROOT / "cluster_profiles.json"
PACK = ROOT / "exercises" / "retail_broadcast_skew.json"

CODE = '''
from pyspark.sql import functions as F
orders = spark.table("silver.orders")
segments = spark.table("silver.dim_customer_segment")
result = (orders
    .filter(F.col("net_amount") > 0)
    .join(F.broadcast(segments), "segment_id")
    .groupBy("customer_id")
    .agg(F.sum("net_amount").alias("revenue"), F.count("*").alias("orders")))
'''


def test_safe_parser_compiles_retail():
    spark = SparkSession.from_profile(PROFILES, "retail")
    result = SafeSparkParser(spark).parse(CODE)
    assert result.target_name == "result"
    assert "INNER JOIN" in result.dataframe.sql
    assert 'GROUP BY "customer_id"' in result.dataframe.sql
    assert 'SUM("net_amount") AS "revenue"' in result.dataframe.sql


def test_safe_parser_rejects_arbitrary_python():
    spark = SparkSession.from_profile(PROFILES, "retail")
    try:
        SafeSparkParser(spark).parse('import os\nresult = spark.table("silver.orders")')
    except SparkLabSyntaxError as exc:
        assert "PySpark SQL imports" in str(exc)
    else:
        raise AssertionError("unsafe import was accepted")


def test_broadcast_reduces_shuffle_but_groupby_remains():
    pack = json.loads(PACK.read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["fabric_f64_like"]
    optimized = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=True)
    baseline = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=False)
    assert optimized.shuffle_gb < baseline.shuffle_gb
    assert optimized.shuffle_gb >= 26.0
    assert any("AQE split" in n for s in optimized.stages for n in s.notes)
    assert max(t.duration_s for s in optimized.stages for t in s.tasks) > 0


def test_aqe_changes_task_shape():
    pack = json.loads(PACK.read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["generic_8x8"]
    aqe = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=True)
    no_aqe = simulate_retail_job(pack, profile, aqe_enabled=False, broadcast=True)
    assert len(aqe.stages[-1].tasks) > len(no_aqe.stages[-1].tasks)
    assert max(t.partition_mb for t in aqe.stages[-1].tasks) < max(t.partition_mb for t in no_aqe.stages[-1].tasks)


def test_cost_adapters_are_explicit():
    pack = json.loads(PACK.read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["fabric_f64_like"]
    job = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=True)
    priced = price_job(job, profile)
    assert priced["sparklab"]["estimated_eur"] > 0
    assert priced["fabric_like"]["cu_hours"] > 0
    assert priced["fabric_like"]["estimated_eur"] is None


def test_workspace_queues_backfill():
    state = simulate_workspace(128)
    assert state["used_cores"] == 88
    assert state["queued"][0]["name"] == "Historical backfill"


def test_safe_parser_supports_window_cases():
    mobility = '''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
w = Window.partitionBy("trip_id").orderBy(F.col("loaded_at").desc())
clean = (spark.table("bronze.trips")
    .filter(F.col("trip_date") == "2026-09-17")
    .withColumn("rn", F.row_number().over(w))
    .filter(F.col("rn") == 1)
    .drop("rn"))
'''
    spark = SparkSession.from_profile(PROFILES, "mobility")
    out = SafeSparkParser(spark).parse(mobility).dataframe.sql
    assert 'ROW_NUMBER() OVER (PARTITION BY "trip_id" ORDER BY "loaded_at" DESC)' in out

    energy = '''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
sensors = spark.table("silver.dim_sensor")
telemetry = spark.table("silver.telemetry")
w = Window.partitionBy("turbine_id").orderBy("event_ts").rowsBetween(-59, 0)
result = telemetry.join(F.broadcast(sensors), "sensor_id").withColumn("rolling_power", F.avg("power_mw").over(w))
'''
    spark = SparkSession.from_profile(PROFILES, "energy")
    out = SafeSparkParser(spark).parse(energy).dataframe.sql
    assert 'ROWS BETWEEN 59 PRECEDING AND CURRENT ROW' in out


def test_memory_pressure_profile_can_spill():
    from services.sparklab.runtime import ClusterProfile
    pack = json.loads(PACK.read_text())
    tiny = ClusterProfile(
        id="tiny", name="Tiny memory lab", min_workers=2, max_workers=2,
        cores_per_worker=8, memory_gb_per_worker=4, driver_cores=2, driver_memory_gb=2,
        scan_mb_s_per_core=100, shuffle_mb_s_per_core=70, disk_mb_s_per_worker=120,
        dynamic_allocation=False,
    )
    job = simulate_retail_job(pack, tiny, aqe_enabled=False, broadcast=False)
    assert job.spill_gb > 0


def test_partition_vector_preserves_truth_pack_statistics():
    pack = json.loads((ROOT / "exercises" / "retail_broadcast_join_03.json").read_text())
    stats = pack["statistics"]
    parts = normalized_partitions(
        float(stats["fact_bytes_gb"]) * 1024,
        int(stats["shuffle_partitions"]),
        float(stats["median_partition_mb"]),
        float(stats["largest_partition_mb"]),
        int(stats["hot_partition"]),
    )
    evidence = partition_evidence(parts)
    assert abs(evidence["total_mb"] - float(stats["fact_bytes_gb"]) * 1024) < 0.2
    assert abs(evidence["median_mb"] - float(stats["median_partition_mb"])) < 0.2
    assert abs(evidence["largest_mb"] - float(stats["largest_partition_mb"])) < 0.2
    assert abs(evidence["skew_ratio"] - float(stats["largest_partition_mb"]) / float(stats["median_partition_mb"])) < 0.05


def test_retail_broadcast_exercise_has_real_baseline_and_hint_delta():
    pack = json.loads((ROOT / "exercises" / "retail_broadcast_join_03.json").read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["fabric_f64_like"]
    baseline = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=False)
    hinted = simulate_retail_job(pack, profile, aqe_enabled=True, broadcast=True)
    assert baseline.plan_decision["final_join"] == "SortMergeJoin"
    assert hinted.plan_decision["final_join"] == "BroadcastHashJoin"
    assert baseline.shuffle_gb > hinted.shuffle_gb
    assert hinted.shuffle_gb >= 26.0


def test_retail_skew_exercise_models_aqe_without_join():
    pack = json.loads((ROOT / "exercises" / "retail_customer_skew_04.json").read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["fabric_f64_like"]
    job = simulate_retail_skew_job(pack, profile, aqe_enabled=True)
    assert len(job.stages) == 2
    assert job.plan_decision["aqe_skew_split"] is True
    assert job.shuffle_gb >= 26.0
    assert any("AQE split" in note for note in job.stages[-1].notes)


def test_retail_training_plan_honors_withheld_catalog_statistics():
    spark = SparkSession.from_profile(PROFILES, "retail")
    orders = spark.table("silver.orders")
    segments = spark.table("silver.dim_customer_segment")

    baseline = orders.join(segments, "segment_id").explain_training()
    hinted = orders.join(F.broadcast(segments), "segment_id").explain_training()

    assert any(stage["op"] == "sort_merge_join" for stage in baseline["stages"])
    assert any("catalog size statistics are unavailable" in note for note in baseline["notes"])
    assert any(stage["op"] == "broadcast_hash_join" for stage in hinted["stages"])


def test_safe_parser_binds_common_function_import_aliases_and_boolean_ops():
    code = r'''
from pyspark.sql.functions import col, sum as spark_sum
orders = spark.table("silver.orders")
result = (orders
    .filter((col("net_amount") > 0) & ~(col("customer_id") == "C004"))
    .groupBy("customer_id")
    .agg(spark_sum("net_amount").alias("revenue")))
'''
    spark = SparkSession.from_profile(PROFILES, "retail")
    parsed = SafeSparkParser(spark).parse(code)
    assert 'AND' in parsed.dataframe.sql
    assert 'NOT' in parsed.dataframe.sql
    assert 'SUM("net_amount") AS "revenue"' in parsed.dataframe.sql


def test_safe_parser_supports_dataframe_subscript_and_unbounded_window_constants():
    code = r'''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
tx = spark.table("silver.transactions")
w = Window.partitionBy("account_id").orderBy("transaction_ts").rowsBetween(Window.unboundedPreceding, Window.currentRow)
result = tx.filter(tx["amount"] != 0).withColumn("running_net", F.sum("amount").over(w))
'''
    spark = SparkSession.from_profile(PROFILES, "finance")
    parsed = SafeSparkParser(spark).parse(code)
    assert 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW' in parsed.dataframe.sql
    assert '("amount" <> 0)' in parsed.dataframe.sql


def test_finance_window_runtime_preserves_hot_account_partition():
    pack = json.loads((ROOT / "exercises" / "finance_account_window_03.json").read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["fabric_f64_like"]
    code = r'''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
w = Window.partitionBy("account_id").orderBy("transaction_ts").rowsBetween(Window.unboundedPreceding, Window.currentRow)
lagw = Window.partitionBy("account_id").orderBy("transaction_ts")
result = (spark.table("silver.transactions")
    .withColumn("previous_amount", F.lag("amount").over(lagw))
    .withColumn("running_net", F.sum("amount").over(w)))
'''
    spark = SparkSession.from_profile(PROFILES, "finance")
    df = SafeSparkParser(spark).parse(code).dataframe
    job = simulate_finance_window_job(pack, profile, df, aqe_enabled=True)
    assert job.shuffle_gb == 9.7
    assert job.plan_decision["window_partitioned"] is True
    assert job.plan_decision["hot_key_splittable"] is False
    assert job.plan_decision["aqe_skew_split"] is False
    assert max(t.partition_mb for t in job.stages[-1].tasks) >= 278


def test_finance_global_window_models_single_task_and_spill_pressure():
    pack = json.loads((ROOT / "exercises" / "finance_account_window_03.json").read_text())
    profile = load_cluster_profiles(str(CLUSTERS))["generic_8x8"]
    code = r'''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
w = Window.orderBy("transaction_ts").rowsBetween(Window.unboundedPreceding, Window.currentRow)
result = spark.table("silver.transactions").withColumn("running_net", F.sum("amount").over(w))
'''
    spark = SparkSession.from_profile(PROFILES, "finance")
    df = SafeSparkParser(spark).parse(code).dataframe
    job = simulate_finance_window_job(pack, profile, df, aqe_enabled=True)
    assert len(job.stages[-1].tasks) == 1
    assert job.plan_decision["window_partitioned"] is False
    assert job.stages[-1].spill_gb > 0
