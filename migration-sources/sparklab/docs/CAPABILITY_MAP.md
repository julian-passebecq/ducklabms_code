# Capability map — V0.3

| Capability | Real execution | SparkLab teaching | Core? |
|---|---|---|---|
| Parquet scans | DuckDB / MotherDuck / Polars | partitions, pruning, file count | Yes |
| DuckLake Bronze/Silver/Gold | DuckDB / MotherDuck | Spark-style transformations can target equivalent logical tables | Yes |
| SQL notebook | DuckDB / MotherDuck | logical-plan comparison | Yes |
| PySpark notebook syntax | supported compatibility subset | stages, shuffle, skew, broadcast | Yes |
| Polars DataFrame | Polars when wired to runtime | compare lazy DataFrame vs Spark reasoning | Yes |
| Airflow | service integration | retries/backfills/asset reasoning | Yes |
| dbt | dbt project | materialization + test reasoning | Yes |
| Evidence KPIs | Evidence project | downstream anomaly signal | Yes |
| Avro | DuckDB extension when enabled | ingestion comparison | Advanced |
| Iceberg / Delta | DuckDB extensions when enabled | table-format comparison | Advanced |

SparkLab never claims to emulate executor JVMs, actual network shuffle, GC, cluster contention or distributed wall-clock performance.
