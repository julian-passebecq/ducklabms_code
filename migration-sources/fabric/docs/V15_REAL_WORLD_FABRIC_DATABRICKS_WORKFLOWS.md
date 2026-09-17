# V15 architecture — real-world Fabric and Databricks workflows

## Goal

V15 is intentionally **not** a Spark emulator or managed-cloud emulator. The objective is to reproduce the decisions, configuration surfaces, hand-offs and operational evidence a normal data engineer encounters while keeping execution deterministic and lightweight.

```text
Production semantics
        │
        ├── Microsoft Fabric UI/workflow concepts
        ├── Azure Databricks UI/workflow concepts
        └── realistic production code/config examples
                    │
                    ▼
          lightweight learning execution
                    │
      SQL + constrained Python + dbt-like runtime
                    │
                    ▼
          shared mutable case-study workspace
                    │
      tables + lineage + audit + checkpoints
```

## The seven-stage production lifecycle

Both Fabric and Databricks production case-study workbenches use the same lifecycle vocabulary:

| Stage | Question the learner must answer |
|---|---|
| Design | Which engine and orchestration pattern actually fit the workload? |
| Govern | Where do data, permissions, runtime configuration and dependencies live? |
| Ingest | How is raw/change data landed and how is incremental state preserved? |
| Transform | Should this be SQL, dbt, Python, Spark, Lakeflow or another declarative transform? |
| Orchestrate | Which jobs depend on which, how are retries/failures handled, and which trigger starts them? |
| Serve | What is the governed Gold/Warehouse/SQL result consumed downstream? |
| Operate | What evidence exists for runs, lineage, schema drift, failures, repair and recovery? |

Completion is derived from actual workspace evidence, so opening another workbench and returning does not lose lifecycle progress.

## Microsoft Fabric operating model

### Movement

Use **Copy Job** when the requirement is essentially data movement. Use a **Copy activity inside a Pipeline** when movement is only one stage in a larger orchestration.

The learning runtime creates representative Bronze/staging tables while the UI explains the production configuration.

### Transformation

The simulator keeps the tool-choice rule explicit:

- SQL/dbt for relational transformation/modeling;
- lightweight Python for custom logic at modest scale;
- Spark only when the production workload genuinely benefits from distributed execution.

Retail and ERP deliberately teach "do not introduce Spark by default." Turbine retains a production PySpark-shaped example because its production scenario assumes multi-TB telemetry.

### Environment and Spark Job Definition

The workbench models:

- Workspace default as the simplest default;
- a published Environment when reusable Spark runtime/libraries/resources are needed;
- Spark Job Definition main/reference files;
- default Lakehouse;
- arguments;
- retry policy;
- historical run snapshot.

The local run remains representative; no Spark cluster is claimed.

### Pipeline / dbt / Airflow boundary

```text
Fabric Pipeline
  = visual Fabric-native orchestration

dbt Job
  = transformation project / model DAG / tests

Airflow Job
  = deliberate code-first orchestration ownership
```

The same case study can therefore teach why a dbt Job belongs *inside* an orchestration rather than replacing orchestration.

## Azure Databricks operating model

### Governance first

The production case models:

```text
training catalog
├── landing schema
│   └── external volume for raw landing files
├── bronze schema
│   └── managed Delta tables
├── silver schema
│   └── managed Delta tables
└── gold schema
    └── governed serving tables
```

It teaches USE CATALOG / USE SCHEMA prerequisites, table/volume privileges, and the conceptual distinction between discoverability and data access.

### Compute separation

The simulator separates:

- **Serverless notebook/jobs compute** for managed interactive/workflow execution where available;
- **Classic compute** when explicit runtime/worker/network customization is required;
- **SQL Warehouse** for SQL-only serving/query workloads.

The Databricks notebook deliberately rejects Python cells when the learner selects SQL Warehouse, reinforcing the compute/language boundary.

### Auto Loader

The Auto Loader workbench models the operational state engineers actually care about:

- checkpoint location;
- schema location/state;
- schema-evolution policy;
- `_rescued_data` strategy;
- replay/idempotency expectations.

The local learning ingest is deterministic and idempotent for repeated representative samples.

### Lakeflow pipelines

The simulator distinguishes:

- streaming tables;
- materialized views;
- expectations with warn/drop/fail semantics;
- triggered vs continuous updates;
- AUTO CDC / SCD2 for ERP change data.

ERP now follows a true educational chain:

```text
ERP source changes
      ↓ Auto Loader
bronze.dbx_customer_changes
      ↓ Lakeflow AUTO CDC (simulated)
silver.dbx_customer_cdc
      ↓ SQL Warehouse serving projection
gold.dbx_customer_current
```

### Lakeflow Jobs

The workbench models:

- notebook/pipeline/dbt/SQL task DAGs;
- file-arrival, table-update, schedule, continuous and manual triggers;
- retries;
- failed/skipped-task repair;
- notifications and operational review.

## What is real vs simulated

### Executed locally

- representative SQL/table transformations;
- constrained Python/pandas-style transformations;
- dbt learning model compilation/materialization/tests;
- representative Copy/Copy Job effects;
- production workflow Bronze/Silver/Gold writes;
- lineage;
- run-audit rows;
- checkpoints;
- deterministic case-study evidence.

### Simulated deliberately

- Spark executors/driver/shuffle/networking;
- Fabric capacity;
- Databricks serverless/classic infrastructure;
- managed Auto Loader cloud file discovery;
- real Delta transaction logs;
- Lakeflow service execution;
- Unity Catalog control plane;
- cloud auth/networking/billing.

## Why this boundary is useful

The learner can practice the decisions and workflows that matter in interviews and jobs without confusing infrastructure simulation with real distributed execution.

The key learning objective is not "make everything Spark." It is:

```text
What problem do I have?
        ↓
What is the simplest production tool that owns that problem?
        ↓
How is it governed, orchestrated, monitored and recovered?
```
