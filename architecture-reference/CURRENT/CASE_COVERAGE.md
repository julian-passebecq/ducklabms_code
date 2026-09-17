# Case coverage

Tool coverage is across the curriculum, not inside every project. These eight cases are foundation examples, not exhaustive professional certifications.

| Case | Selected modules | Steps | Physical data |
|---|---|---:|---|
| `airflow-batch` | airflow | 3 | 12 physical orders |
| `airflow-dbt` | airflow, dbt | 2 | 12 physical orders |
| `dbt-marts` | dbt | 2 | 12 physical orders |
| `polars-quality` | polars-notebook | 1 | 12 physical orders |
| `retail-medallion` | data-factory, fabric-notebook, power-bi | 4 | 12 orders + 4 customer segments |
| `spark-tuning` | sparklab | 3 | 12 fact rows + 4 dimension rows |
| `turbine-ml` | databricks-notebook | 2 | 18 synthetic readings; 12 train / 6 test |
| `warehouse-sql` | warehouse | 2 | 12 physical orders |

Seven reference workflows were executed in SQLite compatibility mode, including actual trusted CPython for the regression. The Polars case is authored but unexecuted here because the real package is unavailable. Every declared module ID is covered by at least one case.

The retail example deliberately remains tiny so learners can inspect every row. Spark tuning separately attaches a logical-scale simulation only when the bounded fixture matches. These are not contradictory dataset sizes.

Reference code is prefilled and separately available as a revealable solution. Learners can modify code and acceptance evaluates results. Blank-start mode, randomized variants, hidden holdout fixtures and anti-hardcoding checks remain curriculum work. Do not mistake this release for a secure exam platform.

Recommended next cases: incremental SQL load with watermark; source stored-procedure plus parameterized copy; dbt-only medallion; Airflow retries/idempotency with dbt; inventory star schema and DAX context; noisy turbine regression with leakage tests; Polars data quality without Spark.
