# V2 Improvement Pass

This pass focuses on correctness and teaching value rather than adding unrelated platform features.

## Airflow

- added `upstream_failed` state and propagation
- separated branch `skipped` from failure-blocked downstream tasks
- leaf-task DagRun result semantics for supported scenarios
- parallel-aware logical timing / critical-path elapsed time
- retry and sensor logical timing
- inspector start/finish timing
- visible task-group boxes in DAG graphs
- fixed graph left-edge clipping

## dbt

- first-class seed `ref()` support in the bounded compiler
- seed nodes in dbt/hybrid lineage
- clickstream bot seed participates in `stg_events`
- `session_key()` macro participates in `int_sessions`
- model build dependency blocking ignores source/seed nodes correctly
- stronger seed/resource validation

## Regression coverage

Added assertions for:

- independent Airflow roots sharing logical `t+0`
- finance critical-path makespan
- `upstream_failed` vs `skipped`
- successful `all_done` leaf DagRun caveat
- dbt seed compilation
- session macro expansion
- clickstream build after seed dependency
- task-group graph rendering
- `upstream_failed` visual styling
