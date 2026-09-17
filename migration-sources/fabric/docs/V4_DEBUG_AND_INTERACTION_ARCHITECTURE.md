# V4 debug and interaction architecture

## Shared graph responsibilities

`LearningGraph` owns generic interaction behavior:

- drag/drop coordinates
- node selection
- edge selection
- node movement
- source/target handles
- connections
- delete key handling
- node context-menu event forwarding
- zoom/pan/minimap
- execution animation derived from node status

Product pages remain responsible for domain semantics.

## Pipeline semantics

The pipeline page owns:

- activity configuration
- dependency condition
- undo/redo history
- validation
- failure simulation
- dependency-aware debug execution
- run persistence
- schedule simulation
- tutorial validation

## Debug plan

The simulator builds a deterministic dependency plan from the current DAG.

For each activity:

1. wait until all upstream activities have terminal states
2. evaluate edge dependency conditions
3. mark the activity `Skipped` if dependencies do not match
4. otherwise move `Queued → In progress`
5. resolve to `Succeeded` or `Failed`
6. continue to downstream dependencies

This is intentionally a learning approximation of cloud orchestration rather than a backend execution service.

## Dependency conditions

- `Succeeded`: execute after upstream success
- `Failed`: execute after upstream failure
- `Completed`: execute after upstream success, failure or skip
- `Skipped`: execute after upstream skip

## Why failure simulation exists

Without real Fabric/ADF cloud resources, a learner would otherwise never be able to practice:

- error paths
- conditional dependencies
- failed-run monitoring
- skipped downstream tasks
- retry/debug reasoning

The `simulateFailure` activity property is therefore explicitly labeled as learning-only.
