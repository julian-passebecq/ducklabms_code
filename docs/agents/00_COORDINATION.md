# Specialist coordination

## One authoritative root

Root 0.1.0 is the new integration baseline. Do not keep releasing unrelated top-level app ZIPs. Retained sources are input material for bounded modules. Shared files have one integrator owner; specialists propose shared changes rather than independently editing them.

## Order of work

First run `01_ROOT_INTEGRATION.md` and `09_RELEASE_QA.md`: actual React/DuckDB build gates are still open. Then deepen the generic notebook and Spark kernel using `02_NOTEBOOK_MOSAIC.md` and `03_SPARKLAB_KERNEL.md`. Once shared interfaces are stable, pipeline, Airflow/dbt, BI and ML specialists can work concurrently in their own module folders. Curriculum work can proceed against the frozen case schema.

Do not give every specialist permission to replace packages/contracts, the API, the root package.json or Mosaic. The integrator merges only bounded changes with evidence. Each contribution must name the root version/contract version it targets.

## Completion report required from every specialist

State the exact feature implemented, files changed, tests run and raw output, real/simulated/unsupported behavior, what original features remain unmigrated, and any required shared-contract changes. A screenshot is evidence only for the actual runtime/client shown. No silent replacement with a static mockup.

## Prompt index

- `01_ROOT_INTEGRATION.md`: Root integrator - first mandatory pass.
- `02_NOTEBOOK_MOSAIC.md`: Notebook specialist - preserve the generic engine.
- `03_SPARKLAB_KERNEL.md`: SparkLab specialist - semantic truth before visual realism.
- `04_PIPELINES_WAREHOUSE.md`: ADF/Fabric pipeline and warehouse specialist.
- `05_AIRFLOW_DBT.md`: Airflow/dbt specialist - three independent learning paths.
- `06_POWER_BI.md`: Power BI specialist - bind the semantic model to root assets.
- `07_DATABRICKS_ML_POLARS.md`: Databricks-style ML and Polars specialist.
- `08_GUIDE_CURRICULUM.md`: Curriculum/data-guide specialist.
- `09_RELEASE_QA.md`: Independent release and integration test agent.
