# V17 graph-aware recovery and retry-policy architecture

## Goal

V17 makes recovery behavior resemble how an engineer reasons about an orchestration DAG rather than how activities happen to be stored in a React array.

## Fabric rerun model

Each recorded activity run now carries its incoming dependency snapshot:

```text
activity
  dependencies
    - upstream node id
    - Succeeded / Failed / Completed / Skipped condition
```

A pipeline run also stores the runtime pipeline-parameter and variable snapshot used for that execution.

### Full retry

All activities are in scope. Dependency conditions are reevaluated using the simulated rerun outcomes.

### Rerun from failed activity

1. Find all failed activities in the parent run.
2. Walk the DAG downstream from those failed roots.
3. Preserve unrelated activities.
4. Force each failed root to execute as a recovery start.
5. Reevaluate downstream dependency conditions from the new results.

Example:

```text
Copy ──Succeeded──> Transform ──Succeeded──> Publish
                         │
                         └──Failed──> Notify failure

Parent run:
Copy ✓  Transform ✕  Publish skipped  Notify ✓

Recovery:
Copy preserved
Transform reruns ✓
Publish reruns ✓
Notify becomes skipped because Transform no longer failed
```

### Rerun from selected activity

The selected activity is a recovery start node. Historical upstream status is preserved for evidence but does not prevent the selected activity from running. Only the selected activity and its descendants are in the execution scope.

## Preserved vs skipped

These are intentionally different concepts:

- **Preserved**: succeeded/failed historically, but not executed again in this recovery run.
- **Skipped**: activity is in the rerun evaluation path but its dependency condition is not satisfied.

The run model keeps the normal activity status plus a separate rerun disposition so Monitoring can communicate both pieces of information.

## Runtime context

A run records:

```text
parameterValues
variableValues
```

Reruns carry those snapshots forward. This keeps the learning experience explicit about the inputs under which the parent run failed.

## Fabric retry policy learning model

Fabric mode now models:

```text
Retry count
Retry interval type
  - Fixed
  - Increasing Delay
Base retry interval
Maximum retry interval
Conditional retry (learning preview)
  - Error code
  - Failure type
  - Error message
```

The failure simulator supplies representative error metadata. A configured retry condition either matches and consumes the configured attempts or does not match and stops after the first failure.

The increasing-delay calculation is deterministic for learning and reports cumulative representative wait evidence. It is not an attempt to emulate Fabric's control plane or randomized scheduler exactly.

ADF keeps the simpler fixed retry interval in this simulator so shared React components do not erase product differences.

## Databricks repair model

The representative Lakeflow Job now contains a branch:

```text
                  ┌── publish_audit
clean_silver ─────┤
                  └── quality_gate ──> aggregate_gold
```

If `quality_gate` fails:

```text
publish_audit   Succeeded
quality_gate    Failed
aggregate_gold  Skipped
```

Repair scope contains `quality_gate` and `aggregate_gold`, while `publish_audit` is preserved. This makes the distinction between repair and full rerun visible.

## Execution boundary

Still real in the local learning runtime:

- run metadata;
- dependency evaluation;
- retry/repair scope calculation;
- parameter snapshots;
- representative data mutations already supported elsewhere in the app.

Still simulated:

- Fabric control-plane scheduling;
- randomized retry backoff;
- actual Databricks Jobs compute;
- Spark executors / clusters;
- cloud billing and infrastructure.
