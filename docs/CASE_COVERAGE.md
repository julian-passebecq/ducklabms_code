# Case coverage

Tool coverage is across the curriculum, not inside every project. These nine cases are foundation examples, not exhaustive professional certifications.

| Case | Selected modules | Steps | Physical data |
|---|---|---:|---|
| `airflow-batch` | airflow | 3 | 12 physical orders |
| `airflow-dbt` | airflow, dbt | 2 | 12 physical orders |
| `dbt-marts` | dbt | 2 | 12 physical orders |
| `polars-quality` | polars-notebook | 1 | 12 physical orders |
| `retail-medallion` | fabric-notebook, power-bi | 4 | 12 orders + 4 customer segments |
| `spark-tuning` | sparklab | 3 |
| `spark-window` | sparklab | 1 | 12 fact rows + 4 dimension rows |
| `turbine-ml` | databricks-notebook | 2 | 18 synthetic readings; 12 train / 6 test |
| `warehouse-sql` | warehouse | 2 | 12 physical orders |

The curriculum now centers on Fabric-style notebooks, dbt and Airflow, while retaining focused SQL/Polars/Spark/ML/BI learning cases. Data Factory is no longer an active Datapass module; use Microsoft Fabric for pipeline practice. Airflow can run as real ephemeral Airflow 3 on GitHub Actions when the remote adapter is configured.

The retail example deliberately remains tiny so learners can inspect every row. Spark tuning separately attaches a logical-scale simulation only when the bounded fixture matches. These are not contradictory dataset sizes.

Reference code is prefilled and separately available as a revealable solution. Learners can modify code and acceptance evaluates results. Blank-start mode, randomized variants, hidden holdout fixtures and anti-hardcoding checks remain curriculum work. Do not mistake this release for a secure exam platform.

Recommended next cases: dbt incremental models and tests; Airflow retries/idempotency with dbt; Airflow sensors and dynamic mapping; DuckLake partition/compaction exercises; inventory star schema concepts; noisy turbine regression with leakage tests.
