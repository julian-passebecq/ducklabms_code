# V11 architecture — Reliability, recovery, and failure learning

## Purpose

V11 turns failures into first-class learning scenarios. The app no longer treats a failed task as only a red node; it teaches what state changed before the failure, how to contain the incident, how to restore or repair the smallest affected scope, how to prove correctness, and how to resume downstream work safely.

## Reliability loop

```text
Inject deterministic incident
        ↓
Detect with data-contract rules
        ↓
Contain invalid state / quarantine
        ↓
Repair or restore safe checkpoint
        ↓
Verify data checks + dbt gate
        ↓
Rerun only affected path
        ↓
Postmortem / prevention decision
```

The postmortem checklist is explicitly represented as:

1. Detection
2. Containment
3. Correction
4. Verification
5. Prevention

## Recovery state

The shared learning workspace remains the source of truth. A reliability incident mutates real learning tables and may also mutate watermark/control state. Recovery therefore operates on the same objects used by Notebook, SQL, dbt, Pipeline, Airflow, Lakehouse, and Monitor.

Checkpoints capture table state before risky operations. Pipeline Debug creates a checkpoint before learning-data execution so partial successful upstream mutations can be safely inspected or rolled back after a downstream failure.

## Runtime status model

V10 had strong orchestration semantics but runtime data failures could be less visible than configured/simulated failures. V11 introduces an `effectiveStatus` map produced by actual data execution.

```text
planned status
      ↓
activity executes
      ↓
real learning-runtime result
      ↓
effective status
      ↓
dependency conditions re-evaluated
      ↓
Monitor run + recovery evidence
```

This allows a dbt test failure, for example, to turn an activity from planned `Succeeded` to actual `Failed`. A downstream `Succeeded` edge then skips, while a `Failed` edge can activate a containment task.

## Runtime root cause

`executePipelineLearningData()` returns both effective activity status and a runtime-error map. `createRun()` records those errors as `LearningDataRuntimeError` diagnostics. Monitor surfaces the first failed activity, attempts, error/output, and downstream skipped count.

## Deterministic incident design

The failure drills are intentionally deterministic so tutorials and QA can reproduce them exactly.

### Retail

- duplicate sale key
- invalid negative quantity
- dbt uniqueness/quality failure
- quarantine + targeted repair

### Turbine

- replay duplicate event
- missing required telemetry
- raw-event quarantine and replay-safe correction
- deliberately avoids teaching dbt as the raw-stream repair tool

### ERP

- duplicate customer business key
- poisoned future watermark
- existing incremental staging can also be corrupted
- repair cleans both source/staging state and restores the watermark
- dbt gate confirms rerun readiness

## Why this matters educationally

The learner practices a more realistic operational sequence:

- identify whether the failure is data, transformation, orchestration, or infrastructure related;
- avoid defaulting to Spark/full refresh for correctness problems;
- understand that upstream mutations may already have committed;
- use quarantine and checkpoints deliberately;
- prove recovery with deterministic checks/tests;
- rerun the smallest affected downstream scope;
- record a prevention decision.

## Explicit execution boundary

Executable in the local learning environment:

- table mutation and data-contract assessment
- quarantine tables
- checkpoint/restore
- dbt model/test failure and recovery
- pipeline dependency consequences
- failed-branch execution
- Monitor diagnostics

Still simulated:

- managed Fabric compute/capacity
- cloud transactional guarantees
- actual distributed Spark failure recovery
- managed Airflow infrastructure
- Azure/Databricks control-plane failures

## V11 regression strategy

V11 adds both source/depth QA and executable engine tests. The engine suite covers baseline health, all three incidents, quarantine/repair, checkpoint rollback, dbt failure/recovery, staged ERP rerun corruption, runtime failure propagation, skipped success-only branches, activated failed branches, and Monitor root-cause creation.
