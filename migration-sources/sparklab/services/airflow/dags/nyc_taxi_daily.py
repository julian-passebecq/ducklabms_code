"""Airflow 3 TaskFlow scaffold for the Studio's NYC Taxi case.

Business SQL remains outside the DAG. Airflow coordinates bounded steps and
retries; ingestion must therefore be idempotent.
"""
from __future__ import annotations

from datetime import timedelta
import pendulum
from airflow.sdk import dag, task


@dag(
    dag_id="nyc_taxi_daily",
    schedule="0 1 * * *",
    start_date=pendulum.datetime(2026, 9, 1, tz="UTC"),
    catchup=True,
    tags=["ducklake-studio", "nyc-taxi"],
    default_args={"retries": 2, "retry_delay": timedelta(minutes=5)},
)
def nyc_taxi_daily():
    @task
    def detect_batch() -> dict[str, str]:
        return {"service_date": "{{ ds }}", "source_uri": "TODO"}

    @task
    def ingest_bronze(batch: dict[str, str]) -> dict[str, str]:
        # Adapter target: DuckDB/MotherDuck connection + append-only Bronze load.
        # Required invariant: the batch identifier is recorded with every row.
        return batch

    @task
    def bronze_quality(batch: dict[str, str]) -> dict[str, str]:
        # Fast structural checks before expensive downstream transformations.
        return batch

    @task
    def build_silver(batch: dict[str, str]) -> dict[str, str]:
        # Execute versioned SQL/dbt, never embed hundreds of SQL lines in the DAG.
        return batch

    @task
    def dbt_gold(batch: dict[str, str]) -> dict[str, str]:
        return batch

    @task
    def publish_consumer(batch: dict[str, str]) -> None:
        # Evidence refresh/build hook belongs here after contracts are green.
        print(f"publish {batch['service_date']}")

    batch = detect_batch()
    bronze = ingest_bronze(batch)
    checked = bronze_quality(bronze)
    silver = build_silver(checked)
    gold = dbt_gold(silver)
    publish_consumer(gold)


nyc_taxi_daily()
