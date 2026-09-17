# V6 changelog — reliability + guided practice hardening

Version: `0.7.0`  
Date: 2026-09-17

## Airflow simulator

- Replaced the fixed 100-step run-to-end guard with a deterministic `simulationStepBudget()` derived from task count, configured retries and sensor poke requirements.
- Added regression coverage for a 130-poke sensor timeout to prove valid long-running sensor lessons reach their intended terminal state instead of tripping the guard.
- Added validation for negative `retryDelaySeconds`.
- Added stricter case validation for bad-quality scenarios: a bad-quality target must be an Airflow quality task, and Hybrid quality gates must name the injected failing dbt test.

## dbt simulator

- Project-wide simulated `dbt build` no longer marks every snapshot successful at command start.
- Snapshot execution now respects its declared dependency:
  - `source()` dependency: available external source can run the snapshot lesson;
  - seed `ref()`: the seed must load first;
  - model `ref()`: the model must build successfully first;
  - failed/skipped referenced model: snapshot becomes skipped.
- Added ordering regressions proving a model-backed snapshot appears after the referenced model in the command log and is skipped after an injected model compile failure.

## Guided mock project

- Every reasoning checkpoint now includes an editable **Your design note** field.
- Draft answers persist locally per mock case using safe string-record loading.
- The mock surface shows `drafted / total` progress without pretending to grade open-ended architecture reasoning.
- Added **Clear drafts** as an explicit local reset.
- Invalid/array-shaped saved mock-answer payloads are rejected rather than trusted.

## Shell / interaction robustness

- Persisted per-lab case IDs are schema/ID validated on startup and stale IDs fall back to the current default case.
- `GraphCanvas` now creates a unique SVG arrow marker ID with React `useId()`, avoiding duplicate IDs when multiple graphs are rendered in one document.
- Updated the local React type shim for `useId`.

## Verification additions

- long-sensor dynamic-guard regression;
- negative retry-delay validation;
- snapshot/model dependency ordering and blocked-snapshot regression;
- malformed Hybrid bad-quality scenario validation;
- persisted mock-answer type filtering;
- static audit for case-ID validation, unique SVG marker IDs, mock-draft controls and snapshot dependency scheduling;
- production smoke checks for the new Airflow/dbt/graph/mock code paths.

All V5 tests and case-study consistency gates remain enabled.
