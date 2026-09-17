# SparkLab Virtual Runtime architecture — V0.5

## Objective

Provide a free PySpark notebook training environment whose **results, physical reasoning and cost reasoning have different explicit truth levels**.

```text
PySpark-like notebook
        |
        v
safe Python AST parser
(no eval / no exec)
        |
        v
SparkLab relational IR
        |
        +--------------------------+
        |                          |
        v                          v
real result path              virtual Spark path
DuckDB/MotherDuck             physical planner
or Polars                     task generator
        |                     virtual executors
        |                     AQE / skew / spill
        |                     capacity scheduler
        |                          |
        +-------------+------------+
                      v
                  cost model
          SCC / Fabric-like / DBU-eq
```

## Truth model

### Semantic truth

Validated deterministically:

- supported PySpark-like syntax;
- result schema/row semantics once connected to DuckDB/Polars;
- known table statistics and exercise invariants;
- compiled relational SQL.

### Physical truth

Dataset-grounded simulation:

- stages and Exchange boundaries;
- virtual workers/executors/slots;
- tasks and scheduling waves;
- reference partition-size distribution;
- broadcast eligibility;
- modeled shuffle bytes;
- skew detection;
- AQE partition splitting;
- memory pressure and spill model;
- cluster/capacity contention;
- relative runtime estimate.

### Economic truth

Transparent usage model:

- SparkLab Compute Credits (SCC) have a fixed lab price;
- Fabric-like usage converts Spark vCore-hours to CU-hours via a configurable adapter;
- Databricks-like usage outputs DBU-equivalent units through a configurable profile;
- real currency for vendor adapters is `null` until a dated price input is supplied.

Never present a simulated value as an Azure/Databricks invoice.

## Why no Kubernetes

Virtual workers are state objects, not processes. Real containers would make the lab slower and more expensive while still failing to reproduce a managed cloud scheduler, network topology or proprietary runtime. Kubernetes can be useful later for deployment, but it should never be part of the teaching simulation itself.

## Safe parser

`services/sparklab/safe_parser.py` accepts a narrow AST subset:

- PySpark SQL imports only;
- simple assignments;
- `spark.table` / `spark.read.parquet`;
- whitelisted DataFrame methods;
- whitelisted `functions` and `Window` expressions;
- comparisons, arithmetic and boolean Spark expressions.

Arbitrary imports, arbitrary attribute access and arbitrary statements are rejected.

## Virtual scheduler

`runtime.py` uses a deterministic discrete-event scheduler:

- each worker exposes virtual core slots;
- task duration depends on partition size, operator class and profile throughput;
- dynamic allocation chooses workers up to profile limits;
- stages execute sequentially while tasks execute concurrently across slots;
- per-task memory working-set estimates can trigger spill penalties;
- no actual Spark workers are started.

## AQE model

Reference defaults currently mirror documented Spark behavior for the training pack:

- adaptive execution enabled;
- 10 MB auto-broadcast threshold;
- 64 MB advisory shuffle partition size;
- skew factor 5× median;
- skew threshold 256 MB.

The model deliberately implements only behaviors required by validated exercises. It does not claim to reimplement Catalyst/AQE fully.

## Cloud-like profiles

### Fabric-like F64 Starter Pool

V0.5 uses a profile based on the documented Medium-node shape and F64 starter-pool ceiling:

- 8 Spark vCores / 64 GB per virtual worker;
- up to 16 workers / 128 Spark vCores;
- dynamic allocation enabled;
- Fabric-equivalent cost adapter: 0.5 CU-hour per Spark-vCore-hour.

The simulator does not claim exact Fabric runtime performance.

### Databricks-like Jobs Compute

A generic jobs-compute profile models worker autoscaling and reports **DBU-equivalent** usage. The DBU/node factor is a teaching configuration, not a published Databricks SKU claim. A real current list price can be supplied later from Databricks pricing data.

## Multi-cluster capacity

The workspace simulator can model competing jobs without creating clusters:

```text
Fabric-like shared capacity: 128 cores

Analyst notebook    24 cores   RUNNING
Nightly ETL         64 cores   RUNNING
Historical backfill 64 cores   QUEUED
```

This is used to teach contention, queueing, burst/on-demand decisions and SLA trade-offs.

## Calibration policy

Every serious exercise receives an **Exercise Truth Pack** before it enters the curriculum. The pack defines:

- table sizes / row counts;
- key distributions;
- reference partition evidence;
- expected result semantics;
- valid/invalid strategies;
- physical-plan expectations;
- cost/performance constraints.

Future calibration should run canonical solutions through real local Apache Spark during development and compare SparkLab's plan categories and relative estimates. Real Spark is a test oracle, not a user runtime dependency.
