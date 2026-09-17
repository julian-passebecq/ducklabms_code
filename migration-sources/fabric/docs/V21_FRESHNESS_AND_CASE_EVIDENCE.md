# V21 architecture — freshness-aware case evidence

## Problem

A production learning simulator should distinguish **artifact existence** from **artifact currency**.

Before V21:

```text
Bronze v1 -> Silver v1 -> Gold v1
                 all complete

Bronze rerun -> Bronze v2
Silver v1 and Gold v1 still displayed as complete
```

That is operationally misleading.

## V21 model

Every learner-created object is evaluated against workspace history and lineage.

```text
source/bronze write snapshot
        |
        v
silver write snapshot
        |
        v
gold write snapshot
```

If an upstream write snapshot is newer than a downstream write snapshot, the downstream object is stale.

The check is recursive, so Gold can become stale because Silver is stale even when Gold's immediate source has not itself been rewritten.

## Canonical object identity

Databricks-facing SQL can use three-level names:

```text
training.gold.daily_sales
```

The local workspace stores:

```text
gold.daily_sales
```

V21 canonicalizes both before reading history or freshness, preventing a three-level alias from bypassing stale-data detection.

## Production lifecycle freshness

Each platform lifecycle stage now has:

```text
missing
fresh
stale
```

Evidence sources:

- Design/Govern/Orchestrate: operational audit row with `evidence_snapshot`.
- Ingest/Transform/Serve: live workspace table write snapshot plus recursive lineage freshness.
- Operate: production checkpoint snapshot.

A stage is stale if:

1. its own table is stale relative to upstream lineage; or
2. an earlier lifecycle stage was refreshed after that stage's evidence snapshot.

## Acceptance semantics

Case-study table evidence now requires:

- learner-created, non-seed object;
- required minimum row count;
- fresh lineage state.

When a criterion accepts either Fabric or Databricks artifacts, the engine evaluates all candidates and accepts a fresh candidate even when another platform's artifact is stale.

Lineage evidence also requires a fresh downstream target when that target exists in the workspace.

## Learning flow

```text
Complete case
  -> 100% acceptance

Rerun ingestion
  -> Bronze fresh
  -> Silver stale
  -> Gold stale
  -> acceptance drops

Re-run affected downstream path
  -> Transform fresh
  -> Orchestrate fresh
  -> Serve fresh
  -> Operate fresh
  -> acceptance returns to 100%
```

This teaches the user to reason about **data currency, dependency propagation, and the smallest safe reprocessing scope**, not merely whether an object exists.
