# Datapass Studio — Codex entrypoint

This repository is the **living implementation repository** for Datapass Studio Root 0.1.0.

Full repository URL: https://github.com/julian-passebecq/ducklabms_code

Historical/archive repository URL: https://github.com/julian-passebecq/ducklake_mslab

The archive repository is reference material only. Large source archives previously exceeded GitHub's normal 100 MB single-file limit, so the essential architecture, contracts, verification record, source audit and specialist instructions are also preserved directly in this code repository under `architecture-reference/`.

## Read first

1. `architecture-reference/README.md`
2. `START_HERE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/MODULE_CONTRACT.md`
5. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`
6. `docs/VERIFICATION.md`
7. `docs/agents/00_COORDINATION.md`

Direct links:

- Architecture reference index: https://github.com/julian-passebecq/ducklabms_code/tree/main/architecture-reference
- Start here: https://github.com/julian-passebecq/ducklabms_code/blob/main/START_HERE.md
- Architecture: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/ARCHITECTURE.md
- Module contract: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/MODULE_CONTRACT.md
- Notebook/runtime contract: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/NOTEBOOK_RUNTIME_CONTRACT.md
- Verification: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/VERIFICATION.md
- Agent coordination: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/agents/00_COORDINATION.md

## Established architecture — do not redesign from scratch

The preserved architect direction is one application and one shared project model:

- one React application using Fluent UI 2 / Fluent UI React v9 patterns;
- one FastAPI control plane;
- one shared workspace catalog and persistence model;
- one generic Mosaic/Jupyter/Deepnote-inspired notebook and layout system;
- shared execution services and run history;
- reusable SparkLab simulated-Spark kernel;
- DuckDB as the normal local analytical execution/storage choice;
- DuckLake as an explicit optional storage path;
- Polars where useful;
- MotherDuck optional/future, not a requirement for local learning;
- Fabric/Data Factory, SQL warehousing, Airflow/dbt, Power BI and Databricks-inspired ML are modules/tool experiences of the same application, not independent applications with duplicate state.

Keep **case**, **tool experience**, **document**, **layout** and **runtime** separate. A Fabric-inspired notebook is a skin/tool experience over the shared notebook model, not a second notebook engine.

Do not create another application shell, notebook format, catalog, database, execution history or private dataset store for a specialist module.

Real local execution results must remain explicitly separate from simulated cluster/cloud metrics, timing and cost.

## Existing advanced work is retained

Use these as migration sources, not as competing roots:

- `migration-sources/mosaic` — notebook/layout foundation.
- `migration-sources/sparklab` — SparkLab runtime/simulation/truth packs.
- `migration-sources/fabric` — Fabric/Data Factory inspired surfaces and lessons.
- `migration-sources/powerbi` — Power BI learning surfaces and model/report work.
- `migration-sources/airflow-dbt` — Airflow/dbt learning work.
- `migration-sources/guide` — Microsoft data guide/curriculum material.
- `migration-sources/command-center` — supporting shell/reference material.

## Immediate order of work

Follow the existing specialist coordination instead of inventing a new sequence. The current root explicitly says to close the real React/DuckDB release gates first, then deepen notebook/Mosaic and SparkLab, then allow bounded specialist modules to advance against stable shared interfaces.

Do not call an architecture document a new code release. Root 0.1.0 is the implementation baseline; the later Core Architecture Contract v1 is an architecture contract, not automatically v0.2.
