# V14 architecture — end-to-end challenge evidence

## Goal

V14 adds a layer above the existing workbenches. It does not execute the exercise for the learner. Instead it asks the learner to work in Notebook, dbt, Pipeline, Monitor, Lakehouse, Practice and Recovery, then validates the state those surfaces produced.

```text
Challenge stage
    |
    +--> Open Notebook / dbt / Pipeline / Monitor / Recovery
    |       |
    |       +--> mutate or inspect the shared learning state
    |
    +--> return to Challenge
            |
            +--> validate observable evidence
                    +-- tables / columns / data rules
                    +-- lineage
                    +-- pipeline DAG + configuration
                    +-- latest run
                    +-- checkpoints / reliability
                    +-- watermarks / SCD2
```

## Why this is useful

The earlier tutorial/practice engines could validate individual steps and isolated code exercises. V14 adds a production-style integration question: **did the whole engineering path actually leave the right data, orchestration and operational evidence?**

## Challenge missions

### Retail

1. Build `challenge.retail_clean` locally without Spark.
2. Run tested dbt models and prove lineage into Gold.
3. Build Notebook -> dbt -> Stored procedure orchestration.
4. Prove the latest Debug run succeeded through those runtimes.
5. Confirm data quality is healthy and a recovery checkpoint exists.

### Turbine

1. Build a representative local feature table.
2. Complete the production-scale Spark decision drill.
3. Build Eventstream -> Notebook -> If -> Stored procedure.
4. Prove the operational run.
5. Confirm healthy/recoverable state.

The Spark stage is deliberately a **decision gate**, not a local Spark execution gate.

### ERP

1. Build Lookup -> ForEach -> Copy Job -> dbt -> Stored procedure and validate dynamic-content configuration.
2. Execute a successful incremental run.
3. Prove incremental staging and dbt-conformed changes exist.
4. Prove SCD2 current state and watermark advancement.
5. Confirm reliability health and rollback readiness.

## SQL join subset

The local runtime now supports an educational subset of joins:

```sql
SELECT r.sale_id, r.customer_id, s.net_sales
FROM raw.sales_csv r
INNER JOIN silver.sales_clean s
  ON r.sale_id = s.sale_id;
```

and:

```sql
SELECT c.customer_id, c.customer_name, o.order_id, o.amount
FROM erp.customer c
LEFT JOIN erp.sales_order o
  ON c.customer_id = o.customer_id;
```

Supported scope is intentionally narrow: equality joins with INNER/LEFT semantics, aliases, and qualified projections. The goal is deterministic learning, not replacing DuckDB or a real SQL engine.

## Incremental dbt rerun proof

The new ERP practice drill runs `dbt build` twice. The evidence contract verifies that the unique-key incremental model remains stable:

```text
staging.customer_changes
3 rows -> 3 rows
```

That turns idempotency from a definition into an executable property.

## Persistence

Challenge progress is stored separately from tutorial and isolated practice progress. Older V13 labs therefore keep their existing pipeline/data/tutorial state and simply start with fresh V14 challenge progress.
