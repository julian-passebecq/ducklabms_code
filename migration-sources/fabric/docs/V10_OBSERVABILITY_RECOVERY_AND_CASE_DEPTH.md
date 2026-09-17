# V10 architecture — observability, recovery, and case-study depth

## Goal

V10 shifts the workstation from “a UI that can execute some transformations” toward an educational data-engineering system where the learner can observe consequences and recover from mistakes.

## Shared workspace state

`DataWorkspace` now owns:

```text
snapshot
tables
history
lineage[]
checkpoints[]
```

All lightweight executable surfaces write into this same state.

## Provenance model

Every supported write can add one or more lineage edges:

```text
source table
   ↓
actor + operation + snapshot
   ↓
target table
```

Actors include SQL, Notebook/Python, Pipeline Copy, Copy Job, Dataflow Gen2, dbt model, and representative stored-procedure operations.

This is generated from execution, not a pre-drawn case-study diagram.

## Data quality

`workspaceInsights.ts` calculates teaching profiles for each live table:

- row/column count
- null count and percentage
- distinct count
- min/max
- duplicate primary-key rows
- heuristic quality score

The score is intentionally labeled as a teaching heuristic.

## Checkpoint and restore

A checkpoint clones the table state at the current workspace snapshot. Restore creates a new snapshot and reinstates the checkpoint table state. This supports labs that deliberately mutate data and then recover.

## Python learning boundary

The notebook does not execute arbitrary Python and does not claim to be Spark. It supports a transparent subset useful for small educational transformations:

- `table()`
- copy/filter/drop-null/drop-duplicates
- rename/fill-null/select
- merge
- groupby + aggregate
- derived columns
- `write_table()` / `display()`

For the turbine production-scale case, the UI can show the real-world PySpark-shaped equivalent without executing a Spark cluster.

## dbt

The local dbt model supports:

- `source()` and `ref()` resolution
- model DAG
- table/view/incremental materialization concepts
- incremental unique-key merge
- compile/run/build/test distinctions
- basic tests
- data lineage

## ERP executable flow

```text
control.watermarks
      ↓
Copy Job
      ├── staging.sales_order_incremental
      └── staging.customer_incremental
                    ↓
             dbt incremental
                    ↓
          staging.customer_changes
                    ↓
        dw.usp_merge_customer_scd2
             ├── close old row
             ├── insert new row
             └── advance watermarks
```

The case now tests state, idempotency, SCD history, and recovery rather than only naming those concepts.

## Airflow recovery semantics

The learning DAG runtime now executes:

- retries
- retry delays (time passage simulated)
- `all_success`
- `all_done`
- failure injection
- downstream skip behavior

Generated Python preserves retries, retry delay, and trigger rules during graph↔code round-tripping.

## Execution boundary

### Executed locally

SQL subset, constrained pandas-style transforms, shared table mutation, dbt model semantics, selected Pipeline data effects, representative case-study stored-procedure effects, Airflow DAG state/retry logic.

### Simulated

Spark distributed compute, Fabric capacity, managed Airflow/dbt services, cloud authentication/resources, Integration Runtime, Databricks clusters, actual Warehouse stored-procedure engine.
