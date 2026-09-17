# Product architecture — V0.3 source of truth

## Core product

**DuckLake Data Engineering Lab** is a notebook-oriented engineering lab for practicing production-style ETL/lakehouse work and transferable Spark reasoning without requiring a persistent Spark cluster.

```text
Public / generated Parquet case datasets
                 |
                 v
       DuckDB local / MotherDuck
                 |
                 v
             DuckLake
       Bronze -> Silver -> Gold
                 |
        +--------+--------+
        |                 |
        v                 v
   SQL Notebook       PySpark Notebook
   real execution     training syntax
        |                 |
        v          +------+------+
   DuckDB / MD      |             |
                   v             v
            real result path   SparkLab
            DuckDB / Polars    distributed model
                   |             |
                   +------+------+
                          v
                 same known data
                          |
              dbt / Airflow / DQ
                          |
                       Evidence
```

## Technology responsibilities

- **Parquet** — core analytical source/data-file format used throughout the main curriculum.
- **DuckDB** — local SQL execution, profiling, statistics and query plans.
- **MotherDuck** — cloud execution and larger case-study datasets.
- **DuckLake** — canonical lakehouse state, snapshots and medallion tables.
- **Polars** — real local lazy DataFrame execution for selected cases; never presented as Spark itself.
- **SparkLab** — supported PySpark-like API plus dataset-grounded distributed-runtime teaching.
- **dbt** — modular Silver/Gold transformation and tests.
- **Airflow** — orchestration, retries and backfills.
- **Evidence** — thin KPI/consumer verification layer.

## Main cases

1. Mobility — windows, dedupe, late data, small files.
2. Retail — broadcast joins, severe key skew, SCD2.
3. Energy — Polars, broadcast sensor dimension, rolling windows, pruning.
4. Finance — ordered windows, wide aggregations, backfills and snapshot recovery.

## Optional interoperability appendix

Avro, Iceberg, Delta and other DuckDB integrations remain useful advanced labs but are not part of the main product identity.
