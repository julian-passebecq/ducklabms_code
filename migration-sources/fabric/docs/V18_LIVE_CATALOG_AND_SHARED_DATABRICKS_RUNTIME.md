# V18 architecture — live catalog and shared Databricks runtime

## Goal

V18 closes a major realism gap: individual Fabric / Databricks screens should not behave like independent mockups. The learner should be able to ingest representative data, transform it, query it, inspect governance, and observe lineage across product workbenches without losing the data state.

## Evidence model

```text
Case-study source tables
        │
        ├── Fabric Copy / Notebook / SQL / dbt
        │
        └── Databricks Auto Loader / Lakeflow / SQL
                         │
                         ▼
              Shared learning workspace
              ├── tables + schemas
              ├── versions
              ├── row counts
              ├── runtime source
              ├── history
              └── lineage
                         │
        ┌────────────────┴─────────────────┐
        ▼                                  ▼
Fabric OneLake governance          Databricks Unity Catalog
live assets / lineage / impact     live assets / lineage / grants
```

Cloud control planes remain simulated. The shared workspace is a deterministic local learning model.

## Databricks Auto Loader

The workbench still teaches production-shaped `cloudFiles`, checkpoints, schema evolution and `_rescued_data`. V18 adds actual representative effects:

1. successful ingestion calls the existing Databricks production-ingest runtime;
2. the Bronze table is written into the shared workspace;
3. additive schema evolution updates the live table with a representative new column;
4. rescue mode writes a representative `_rescued_data` payload;
5. Catalog Explorer and SQL Warehouse immediately observe that table.

## Lakeflow Pipelines

The declarative graph remains simulated compute. A successful learning update executes representative stages:

```text
Auto Loader / Bronze
       ↓
Lakeflow transform / Silver
       ↓
optional serving materialization / Gold
```

The runtime emits real table versions and lineage. This means the learner can move from Lakeflow to Catalog Explorer or SQL Warehouse and inspect the consequences.

## Databricks SQL Warehouse

The SQL Editor now runs `executeWorkspaceSql()` against the same workspace.

Supported educational behavior includes:

- `SELECT`;
- filters / grouping / ordering / limit;
- INNER and LEFT equality joins;
- CTAS;
- INSERT SELECT;
- three-level `training.schema.table` references.

The catalog component is intentionally virtual: local objects remain stored as `schema.table`, while a Databricks-style `training.schema.table` name resolves to them.

## Fabric governance

OneLake Catalog is now evidence-driven:

- asset list comes from `workspace.tables`;
- lineage comes from `workspace.lineage`;
- impact analysis follows emitted downstream edges;
- table row counts, layers and runtime source reflect the learner's actions.

The security / endorsement controls remain simulations because no real tenant or identity system exists.

## Execution boundary

### Real in the local learning workspace

- representative table materialization;
- schemas and row counts;
- SQL execution;
- table versions;
- lineage edges;
- Auto Loader schema-evolution evidence;
- Lakeflow representative Bronze/Silver/Gold output;
- Fabric / Databricks catalog discovery.

### Simulated

- Spark executors and clusters;
- Databricks serverless/classic compute;
- actual Auto Loader file discovery;
- managed Unity Catalog storage/privileges;
- Lakeflow control plane;
- OneLake/Purview control plane;
- cloud authentication and billing.

## Why this matters educationally

The simulator should teach causality:

> I ingested this source with Auto Loader → a Bronze table appeared → Lakeflow materialized Silver → SQL Warehouse queried Gold → Unity Catalog lineage explains how the object was produced.

That is more useful than four independent screens that merely resemble the real products.
