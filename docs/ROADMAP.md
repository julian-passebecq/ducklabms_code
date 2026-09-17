# Release sequence and remaining work

## Gate 0: validate this root with actual packages

Install dependencies, generate the npm lockfile, execute strict typechecking and the Vite build, and run actual DuckDB/Polars cases. Verify all React layouts in a browser, including narrow screens and keyboard navigation. Run DuckLake attachment/write/reopen/Parquet evidence as a separate opt-in test. Do not promote the root as fully verified before this gate.

## Gate 1: make the root pleasant to use

Finish splitters, per-view persistence and source/checkpoint hydration; add robust kernel cancellation UX and dirty-state recovery. Formalize module services/panel registration. Benchmark only measured UI/SQL paths. Preserve the current notebook round-trip and stale-input tests.

## Gate 2: deepen the three core learning paths

Notebook/Spark specialist expands semantic accuracy with real-PySpark oracle comparisons. Pipeline specialist adds source-database stored-procedure calls, conditional activities and inspector behavior. Airflow/dbt specialist migrates the existing compiler/scheduler lessons without recreating the root data store. Root-level changes are coordinated, not made independently in three forks.

## Gate 3: semantic modeling and ML

Migrate Power BI model/DAX/refresh lessons behind explicit supported semantics and root asset bindings. Add a Databricks-style ML lifecycle using genuine local Python libraries, proper train/test leakage tests and provenance. Add larger/dirty/noisy fixtures as separate cases, not replacements for readable toy examples.

## Gate 4: optional infrastructure

MotherDuck, more advanced DuckLake lifecycle and a hosted sandbox are optional adapters after local correctness. Do not start with Kubernetes or a real cluster merely to draw realistic cluster screens. Remote services require explicit credentials and cost consent.

## Specifically not yet implemented

Full original ADF/Fabric pipeline editors; Airflow scheduler semantics; full dbt project/Jinja runner; general DAX evaluator/model engine; Power BI UI/model/report integration; full PySpark API; per-cell progress streaming; collaborative multi-user editing; arbitrary file upload/data connector catalog; native SQL Server stored-procedure execution; cloud authentication; MotherDuck; real pricing feed; full Microsoft product UI parity; actual browser-verified React release.
