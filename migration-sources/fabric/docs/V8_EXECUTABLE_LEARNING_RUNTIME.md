# V8 executable learning runtime

## Design goal

V8 treats realism as **real data consequences inside an educational simulator**, not as cloud-infrastructure emulation.

A learner should be able to:

1. inspect a Bronze table,
2. edit a notebook,
3. run Python/SQL,
4. see a Silver table appear,
5. run that notebook from a pipeline,
6. run a dbt model against the same state,
7. inspect the resulting Gold table from SQL/Lakehouse/Data Explorer,
8. understand how the Microsoft product surfaces fit together.

The app should not pretend that a browser tab is an Apache Spark cluster.

## Shared state

```text
Case study seed
      |
      v
DataWorkspace
  - tables[]
  - snapshot
  - history[]
      |
      +--> Fabric Notebook
      +--> Fabric Lakehouse
      +--> SQL Studio
      +--> Data Explorer
      +--> Fabric Pipeline runtime
      +--> Databricks learning notebook
      +--> dbt workbench
```

Every workspace table stores:

- schema
- name
- layer
- columns
- rows
- primary/foreign-key metadata when available
- version
- updatedAt
- runtimeSource

Workspace writes increase the snapshot and create history events.

## Notebook runtime

### SQL cells

SQL is interpreted by the local learning engine in `src/lib/dataRuntime.ts`.

It intentionally implements a bounded SQL subset used by the training scenarios. Unsupported SQL should fail explicitly instead of returning fabricated results.

### Python cells

Python cells use a constrained pandas-like training DSL. Example:

```python
orders = table("bronze.orders")
clean = orders.drop_duplicates(["order_id"])
clean = clean.filter("amount > 0")
clean["net"] = clean["qty"] * clean["unit_price"]
write_table("silver.orders", clean, layer="silver")
display(clean)
```

This is not arbitrary Python execution and is not advertised as one.

The purpose is to teach the shape of dataframe work while preserving deterministic, browser-safe exercises.

## Pipeline integration

The pipeline's orchestration semantics continue to come from the existing debug engine:

- dependency conditions
- retries/policies
- failures/skips
- nested control flow
- triggers
- monitoring

After the run plan determines successful activities, `executePipelineLearningData()` applies learning-data consequences in run order.

Important examples:

```text
Copy      -> source rows copied into learning Bronze table
Notebook  -> actual edited NotebookDocument is executed
Copy Job  -> incremental/staging table is produced
Dataflow  -> learning destination table is produced
dbt Job   -> dbt project compiles/tests/materializes into workspace
```

This keeps cloud orchestration simulated while making the data path observable and stateful.

## dbt learning model

The dbt workbench is intentionally narrower than the complete dbt CLI.

Implemented:

- models
- `ref()` parsing
- dependency graph
- topological model order
- compiled SQL
- model materialization
- basic not-null tests
- basic unique tests
- run/build-style logs

The same SQL engine executes compiled models, so the resulting tables are visible everywhere else.

## MotherDuck boundary

MotherDuck remains optional through the pre-existing WASM client integration.

V8 does not make MotherDuck the tutorial source of truth because:

- guided labs must run with no account or token,
- case-study state must reset deterministically,
- offline/local use is valuable,
- external persistence is not required to teach the product workflow.

The UI therefore distinguishes:

```text
Local workspace  -> tutorial runtime / deterministic
MotherDuck       -> optional external SQL exploration
```

## Why DuckLake is deferred

DuckLake could later power an advanced lab for snapshots, schema evolution, Parquet metadata, and time travel. It is not required for the primary learning goals of:

- orchestration
- notebook authoring
- SQL transformation
- dataframe concepts
- dbt
- monitoring
- case-study workflow

## Simulation boundary

### Executable/local

- table reads/writes
- selected SQL
- pandas-style learning transforms
- notebook sequencing
- dbt dependency compilation
- dbt materialization/tests
- pipeline-to-notebook execution
- cross-surface catalog visibility

### Simulated

- Fabric cloud capacity
- OneLake physical storage
- Spark executors/clusters
- Azure Integration Runtime
- Databricks compute provisioning
- Eventstream networking
- managed dbt service
- real scheduled background execution
- cloud IAM

That boundary is intentional and should stay visible in the UI.
