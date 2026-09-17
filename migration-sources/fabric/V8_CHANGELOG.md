# V8 changelog — shared executable learning runtime

Date: 2026-09-16

## Objective

Move the project from a primarily UI/tutorial simulator to a **realistic educational workstation with shared executable data state**, without attempting to emulate distributed Spark infrastructure.

## Added

### Shared DataWorkspace

- one workspace state shared by Notebook, SQL, Data Explorer, Lakehouse, Pipeline, Databricks learning notebook, and dbt
- persisted with the existing lab state
- table version, updated timestamp, runtime source, snapshot counter, and workspace event history
- case-study reset reseeds both workspace and notebook

### Executable notebook

- real editable NotebookDocument
- Python / SQL / Markdown cell creation
- single-cell and Run-all execution
- constrained pandas-style Python learning API
- SQL cells use the same local workspace
- writes immediately appear in Lakehouse/Data Explorer/SQL
- live schema/data inspection

### Local training SQL

- SELECT / WHERE / GROUP BY / aggregates / ORDER BY / LIMIT
- CREATE OR REPLACE TABLE AS SELECT
- INSERT INTO SELECT
- typed DATE/TIMESTAMP literals used by case studies
- real table creation/update in shared state

### Pipeline data execution

The orchestration engine still simulates cloud execution, but successful learning activities can now mutate the shared workspace:

- Copy
- Copy Job
- Notebook
- Dataflow learning mutation
- dbt Job

The Notebook activity executes the edited notebook document rather than emitting only a canned Spark-like message.

### dbt Job learning workbench

- new Fabric navigation route
- editable model SQL
- `ref()` dependency discovery
- dbt DAG rendered with the shared graph engine
- compile preview
- dependency-order model execution
- table materialization in shared workspace
- basic not-null and unique tests
- dbt pipeline activity
- ERP case study changed from generic Dataflow stage to dbt Job / `dbt build`

### Databricks learning notebook

- editable cells
- executes through the same lightweight shared training runtime
- live catalog state
- Databricks compute/Spark infrastructure remains simulated intentionally

### Engine terminology

Renamed the old `Mock DuckLake` default to **Local workspace** so the UI no longer implies that the deterministic JavaScript learning state is a real DuckLake deployment.

MotherDuck remains optional and separate.

## QA added

- `scripts/qa-v8.mjs` — 22 V8 architecture/depth checks
- `scripts/qa-engine-v8.mjs` — 16 executable data-runtime tests
- package version advanced to `0.8.0`
- `npm run qa` now includes V8 through V5 regression suites

## V8 executable test coverage

- case-study workspace seeding
- SELECT against real workspace rows
- WHERE / ORDER / LIMIT
- CTAS table creation
- Python learning-runtime table write
- Run-all notebook mutation
- pipeline Notebook executing edited notebook state
- dbt `ref()` compilation
- dbt dependency graph
- dbt staging materialization
- dbt gold materialization
- dbt model tests
- dbt run materialization without invoking tests
- ERP dbt project target and end-to-end build
- TIMESTAMP literal handling

## Deferred intentionally

- arbitrary Python interpreter
- real pandas process in the browser
- Spark cluster/runtime emulation
- DuckLake as a mandatory backend
- Power BI
