# V4 Changelog — Reliability / dbt resource semantics

Date: 2026-09-17  
Package: `0.5.0`

## dbt correctness

- Separated **model contracts** from ordinary dbt data tests.
- Removed the synthetic `contract` test type from the test schema.
- Added build-time bounded contract preflight for simulated `dbt run` / `dbt build`.
- Ensured simulated `dbt test` does not re-run contracts.
- Added edited-SQL regression coverage for contract column mismatches.
- Added validation rejecting contract metadata on ephemeral teaching models.
- Improved relationships tests to model multiple parent resources.
- Added multi-parent relationships selection and downstream-gating regression coverage.
- Added real mart-level singular tests where removing fake contract tests exposed empty Hybrid test scopes.

## Snapshots

- Added structured snapshot definitions to the project model.
- Added timestamp-strategy customer history in e-commerce.
- Added check-strategy account-mapping history in finance.
- Added a bounded SCD2 snapshot simulator with `dbt_valid_from` / `dbt_valid_to`.
- Added changed / inserted / unchanged classifications.
- Added generated current-style snapshot YAML lessons.
- Added explicit messaging that hard-delete policy, adapter SQL and warehouse writes are not simulated.
- Added snapshot resource state to project-wide simulated `dbt build`.
- Added source/ref snapshot dependency parsing and validation.
- Added snapshot nodes to dbt lineage; clicking a snapshot node opens the snapshot lesson.

## Build/resource semantics

- Project-wide simulated `dbt build` now exposes seed and snapshot resource states.
- Model-scoped selectors intentionally leave unrelated project resource types skipped.
- Added validation for malformed snapshot configuration, duplicate keys and unresolved relations.

## UI / teaching

- Added **Tests & contracts** split presentation.
- Added dedicated **Snapshots** lab.
- Added contract preflight status to the model inspector.
- Added snapshot strategy/configuration summaries and observation/history tables.
- Added snapshot/contract styles and static UI wiring gates.

## Regression gates

Added or strengthened tests for:

- contract-vs-test semantics;
- edited SQL contract failures;
- multi-parent relationships tests;
- timestamp and check snapshot behavior;
- project seed/snapshot build states;
- invalid snapshot metadata and duplicate keys;
- snapshot dependency resolution;
- first-class snapshot lineage wiring;
- snapshot compiled-module/static-style smoke coverage.

All existing Airflow, schedule, Hybrid, scenario-matrix, persistence, accessibility, production-build and route-smoke gates remain enabled.
