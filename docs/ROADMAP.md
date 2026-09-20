# Release sequence and remaining work

## Gate 0: validate this root with actual packages

Install dependencies, execute strict typechecking and the Vite build, and run actual DuckDB/Polars cases. Verify all React layouts in a browser, including narrow screens and keyboard navigation. Run the canonical DuckLake attachment/write/reopen test and require evidence of SQLite metadata, Parquet files and data inlining disabled. Plain DuckDB remains a compatibility mode, not a fake DuckLake fallback. Do not promote the root as fully verified before this gate.

## Gate 1: make the root pleasant to use

Finish splitters, per-view persistence and source/checkpoint hydration; add robust kernel cancellation UX and dirty-state recovery. Formalize module services/panel registration. Benchmark only measured UI/SQL paths. Preserve the current notebook round-trip and stale-input tests.

## Gate 2: deepen the three core learning paths

Fabric-style notebook/SparkLab work deepens lakehouse, partitioning and Spark semantics. dbt work owns models, tests, lineage and a focused future dbt Charts experience. Airflow owns DAG authoring/visualization plus optional real ephemeral execution through GitHub Actions. Do not build a Data Factory/Fabric pipeline clone; use Microsoft Fabric itself for pipeline practice.

## Gate 3: semantic modeling and ML

Migrate Power BI model/DAX/refresh lessons behind explicit supported semantics and root asset bindings. Add a Databricks-style ML lifecycle using genuine local Python libraries, proper train/test leakage tests and provenance. Add larger/dirty/noisy fixtures as separate cases, not replacements for readable toy examples.

## Gate 4: optional infrastructure

MotherDuck/managed DuckLake is the preferred future hosted analytical-data target. GitHub Actions is the selected ephemeral real-Airflow runner. More advanced hosted sandboxing remains optional. Do not start Kubernetes or a permanent Airflow cluster merely to draw realistic screens. Remote services require explicit credentials and cost/privacy consent.

## Specifically not yet implemented

ADF/Fabric pipeline editors are intentionally out of scope; persistent Airflow scheduler semantics are not claimed by the GitHub Actions runner; full dbt project/Jinja runner; general DAX evaluator/model engine; Power BI UI/model/report integration; full PySpark API; per-cell progress streaming; collaborative multi-user editing; arbitrary file upload/data connector catalog; native SQL Server stored-procedure execution; cloud authentication; MotherDuck; real pricing feed; full Microsoft product UI parity; actual browser-verified React release.
