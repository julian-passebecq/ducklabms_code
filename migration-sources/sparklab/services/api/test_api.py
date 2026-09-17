from fastapi.testclient import TestClient

from services.api.main import app

client = TestClient(app)

BROADCAST_CODE = '''
from pyspark.sql import functions as F
orders = spark.table("silver.orders")
segments = spark.table("silver.dim_customer_segment")
result = (orders.filter(F.col("net_amount") > 0)
    .join(F.broadcast(segments), "segment_id")
    .groupBy("customer_id")
    .agg(F.sum("net_amount").alias("revenue"), F.count("*").alias("orders")))
'''

BASELINE_CODE = BROADCAST_CODE.replace("F.broadcast(segments)", "segments")

SKEW_CODE = '''
from pyspark.sql import functions as F
orders = spark.table("silver.orders")
result = (orders.filter(F.col("net_amount") > 0)
    .groupBy("customer_id")
    .agg(F.sum("net_amount").alias("revenue"), F.count("*").alias("orders")))
'''


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["runtime"] == "SparkLab V0.12"


def test_simulate_broadcast_join():
    response = client.post(
        "/simulate",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["job"]["shuffle_gb"] >= 26
    assert data["job"]["plan_decision"]["final_join"] == "BroadcastHashJoin"
    assert data["semantic_execution"]["verified"] is True
    assert data["semantic_execution"]["row_count"] == 5
    assert data["cost"]["fabric_like"]["cu_hours"] > 0
    assert data["truth_boundary"]["simulated"]


def test_no_hint_produces_calibrated_sort_merge_baseline():
    response = client.post(
        "/simulate",
        json={
            "code": BASELINE_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()["job"]
    assert data["plan_decision"]["final_join"] == "SortMergeJoin"
    assert data["shuffle_gb"] > 50


def test_grade_accepts_broadcast_solution_and_rejects_baseline_engineering():
    good = client.post(
        "/grade",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert good.status_code == 200, good.text
    assert good.json()["grade"]["pass"] is True
    assert good.json()["grade"]["scores"]["semantic"] == 100
    assert good.json()["semantic_execution"]["verified"] is True

    baseline = client.post(
        "/grade",
        json={
            "code": BASELINE_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert baseline.status_code == 200, baseline.text
    assert baseline.json()["grade"]["pass"] is False
    assert baseline.json()["grade"]["checks"]["explicit_broadcast"] is False


def test_skew_truth_pack_is_independent_of_join_exercise():
    response = client.post(
        "/notebook/run",
        json={
            "code": SKEW_CODE,
            "case": "retail",
            "exercise_id": "retail_customer_skew_04",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "succeeded"
    assert len(data["simulation"]["stages"]) == 2
    assert data["simulation"]["plan_decision"]["aqe_skew_split"] is True
    assert data["grade"]["pass"] is True


def test_grade_penalizes_repartition_one():
    bad = SKEW_CODE.replace('orders = spark.table("silver.orders")', 'orders = spark.table("silver.orders").repartition(1)')
    response = client.post(
        "/grade",
        json={
            "code": bad,
            "case": "retail",
            "exercise_id": "retail_customer_skew_04",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["grade"]["anti_patterns"]


def test_notebook_run_returns_stage_summaries():
    response = client.post(
        "/notebook/run",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    stage = response.json()["simulation"]["stages"][-1]
    assert stage["p50_task_s"] > 0
    assert stage["p95_task_s"] >= stage["p50_task_s"]
    assert stage["max_partition_mb"] > 0


def test_notebook_run_compiles_uncalibrated_case_without_fake_scheduler():
    mobility = '''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
w = Window.partitionBy("trip_id").orderBy(F.col("loaded_at").desc())
result = spark.table("bronze.trips").withColumn("rn", F.row_number().over(w))
'''
    response = client.post(
        "/notebook/run",
        json={
            "code": mobility,
            "case": "mobility",
            "exercise_id": "mobility_window_04",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "compiled"
    assert data["simulation"] is None
    assert "no calibrated truth pack" in data["truth_boundary"]["distributed"]


def test_unknown_truth_pack_is_not_silently_replaced():
    response = client.post(
        "/simulate",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "does_not_exist",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 404


def test_workspace_capacity_validation():
    assert client.get("/workspace/simulate?capacity_cores=128").status_code == 200
    assert client.get("/workspace/simulate?capacity_cores=0").status_code == 422


def test_grade_semantics_uses_executed_fixture_not_plan_shape_only():
    # Same grain and metric aliases, but omitting the business filter changes real rows.
    wrong = BROADCAST_CODE.replace('.filter(F.col("net_amount") > 0)\n    ', '')
    response = client.post(
        "/grade",
        json={
            "code": wrong,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["semantic_execution"]["verified"] is False
    assert data["grade"]["scores"]["semantic"] == 0
    assert data["grade"]["pass"] is False


def test_notebook_run_returns_bounded_executed_rows():
    response = client.post(
        "/notebook/run",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    semantic = response.json()["semantic_execution"]
    assert semantic["status"] == "executed"
    assert semantic["engine"] == "SQLite reference fixture"
    assert semantic["verified"] is True
    assert semantic["columns"] == ["customer_id", "revenue", "orders"]
    assert semantic["row_count"] == 5


def test_capabilities_report_semantic_engine_truthfully():
    response = client.get("/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert data["runtime"] == "SparkLab V0.12"
    assert data["semantic_engines"]["sqlite"]["available"] is True
    assert data["auto_selection"] in {"sqlite", "duckdb"}
    assert data["distributed_runtime"]["real_spark_cluster"] is False


def test_notebook_run_provenance_fields_are_present():
    response = client.post(
        "/notebook/run",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
            "semantic_engine": "sqlite",
        },
    )
    assert response.status_code == 200, response.text
    semantic = response.json()["semantic_execution"]
    assert semantic["engine_key"] == "sqlite"
    assert len(semantic["query_sha256"]) == 64
    assert len(semantic["preview_sha256"]) == 64
    assert len(semantic["result_sha256"]) == 64
    assert semantic["verification_complete"] is True
    assert semantic["preview_truncated"] is False


def test_explicit_unavailable_duckdb_does_not_fabricate_execution():
    caps = client.get("/capabilities").json()
    if caps["semantic_engines"]["duckdb"]["available"]:
        return
    response = client.post(
        "/notebook/run",
        json={
            "code": BROADCAST_CODE,
            "case": "retail",
            "exercise_id": "retail_broadcast_join_03",
            "cluster_profile": "fabric_f64_like",
            "semantic_engine": "duckdb",
        },
    )
    assert response.status_code == 200, response.text
    semantic = response.json()["semantic_execution"]
    assert semantic["status"] == "unsupported"
    assert semantic["engine_key"] == "duckdb"
    assert semantic["verified"] is False


FINANCE_WINDOW_CODE = r'''
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = (Window.partitionBy("account_id")
    .orderBy("transaction_ts")
    .rowsBetween(Window.unboundedPreceding, Window.currentRow))

result = (spark.table("silver.transactions")
    .withColumn("previous_amount", F.lag("amount").over(Window.partitionBy("account_id").orderBy("transaction_ts")))
    .withColumn("running_net", F.sum("amount").over(w)))
'''

def test_finance_window_truth_pack_executes_and_grades():
    response = client.post(
        "/notebook/run",
        json={
            "code": FINANCE_WINDOW_CODE,
            "case": "finance",
            "exercise_id": "finance_account_window_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["semantic_execution"]["verified"] is True
    assert data["semantic_execution"]["row_count"] == 8
    assert data["simulation"]["plan_decision"]["window_partitioned"] is True
    assert data["simulation"]["plan_decision"]["window_ordered"] is True
    assert data["simulation"]["plan_decision"]["hot_key_splittable"] is False
    assert data["simulation"]["shuffle_gb"] == 9.7
    assert data["grade"]["pass"] is True


def test_finance_global_window_is_flagged_as_single_partition_antipattern():
    bad = r'''
from pyspark.sql import functions as F
from pyspark.sql.window import Window
w = Window.orderBy("transaction_ts").rowsBetween(Window.unboundedPreceding, Window.currentRow)
result = (spark.table("silver.transactions")
    .withColumn("previous_amount", F.lag("amount").over(Window.orderBy("transaction_ts")))
    .withColumn("running_net", F.sum("amount").over(w)))
'''
    response = client.post(
        "/grade",
        json={
            "code": bad,
            "case": "finance",
            "exercise_id": "finance_account_window_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["simulation"]["plan_decision"]["window_partitioned"] is False
    assert len(data["simulation"]["stages"][-1]["tasks"]) == 1
    assert data["grade"]["pass"] is False
    assert any("global ordered window" in item for item in data["grade"]["anti_patterns"])


def test_truth_pack_case_mismatch_is_rejected():
    response = client.post(
        "/simulate",
        json={
            "code": FINANCE_WINDOW_CODE,
            "case": "retail",
            "exercise_id": "finance_account_window_03",
            "cluster_profile": "fabric_f64_like",
        },
    )
    assert response.status_code == 422


def test_sql_runtime_executes_real_bounded_rows_without_spark_simulation():
    response = client.post(
        "/sql/run",
        json={
            "sql": "SELECT customer_id, SUM(net_amount) AS revenue FROM silver.orders WHERE net_amount > 0 GROUP BY customer_id ORDER BY customer_id",
            "case": "retail",
            "semantic_engine": "sqlite",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "succeeded"
    assert data["semantic_execution"]["status"] == "executed"
    assert data["semantic_execution"]["engine_key"] == "sqlite"
    assert data["semantic_execution"]["row_count"] == 5
    assert data["simulation"] is None
    assert data["cost"] is None
    assert data["truth_boundary"]["distributed"] == "not modeled for SQL runtime"


def test_sql_runtime_rejects_missing_fixture_and_write_statements():
    missing = client.post("/sql/run", json={"sql": "SELECT 1", "case": "energy"})
    assert missing.status_code == 422
    write = client.post("/sql/run", json={"sql": "DELETE FROM silver.orders", "case": "retail"})
    assert write.status_code == 422
