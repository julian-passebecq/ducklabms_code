# V19 durable orchestration and transformation evidence

V19 focuses on one rule: **a successful or failed orchestration surface should leave evidence that other workbenches can inspect.**

## Lakeflow Jobs

The Jobs UI remains a simulator for Databricks managed compute, but its representative data effects are durable.

```text
Original failed run

 ingest_bronze   ✓  -> Bronze table exists
 clean_silver    ✓  -> Silver table exists
 publish_audit   ✓  -> audit evidence exists
 quality_gate    ✕
 aggregate_gold  skipped -> Gold absent
```

A repair run preserves the three successful tasks and reruns only the unsuccessful/dependent branch. In the learning workspace this means Bronze/Silver table versions remain unchanged while Gold is materialized.

Operational history is stored separately from data effects in `ops.databricks_job_runs` and `ops.databricks_job_tasks`, so remounting the workbench does not erase the run matrix.

## Fabric Copy Job

Copy Job now invokes the existing case-aware Fabric ingestion runtime. The output is therefore the same Bronze/staging evidence used by Notebook, Dataflow, Pipeline and OneLake governance.

## Dataflow Gen2

Dataflow Gen2 reads a live workspace source and publishes a representative Silver table through `runDataflowGen2Publish()`.

The local runtime intentionally implements only a small deterministic subset of Power Query behavior. The goal is not to recreate M; it is to make the product workflow observable:

```text
source table
   ↓
applied steps
   ↓
Publish
   ↓
Silver table + lineage
   ↓
Lakehouse / Catalog / SQL can inspect result
```

## Execution philosophy

Real locally: representative rows, tables, schema, snapshots, lineage, run/task audit, partial success and repair effects.

Simulated: managed Databricks/Fabric compute, Spark execution, cloud networking/authentication, billing and service control planes.
