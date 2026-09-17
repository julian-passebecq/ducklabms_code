# V5 Changelog — Guided mock project + interaction hardening

Date: 2026-09-17  
Package version: `0.6.0`

## Added: guided mock project

A fifth project, **Mock project — Fulfillment SLA**, is now available in Airflow, dbt and Hybrid modes.

The learner starts from a marketplace operations brief rather than from a solved pipeline. The overview includes:

- role and business brief;
- concrete requirements and constraints;
- required deliverables;
- acceptance checks;
- five reasoning checkpoints;
- collapsible hints and reference answers;
- a collapsed reference architecture rationale so the solution is not exposed immediately.

The reference implementation is fully wired into the existing simulators:

- independent order-event ingestion and shipment-file readiness;
- late-input sensor behavior;
- transient shipment-load retry;
- permanent upstream ingestion failure;
- dbt staging/intermediate/incremental mart layers;
- `sla_targets.csv` as a real seed dependency;
- relationships / accepted-values / uniqueness / singular quality tests;
- Airflow→dbt run scopes plus a separate dbt test/publication gate;
- bad-quality scenario that builds the mart but blocks publication.

## Debug / interaction corrections

### dbt lineage resource nodes

Source and seed lineage nodes no longer behave like dead controls:

- clicking a source in the dbt lab opens its corresponding sample dataset;
- clicking a seed opens the real seed file in the editor;
- non-model source/seed nodes in the Hybrid graph are marked non-interactive instead of exposing keyboard/button semantics that lead nowhere.

`GraphCanvas` now supports `selectable:false` for intentionally informational nodes.

### Hybrid command wording

The Hybrid execution panel now says **dbt run scopes + tests** rather than **dbt build + tests**. This matches the actual bounded simulator, which models Airflow-triggered run scopes followed by a separate test gate.

## New regression coverage

V5 adds explicit tests for the mock project:

- normal Airflow execution;
- parallel root readiness/ingestion start;
- transient shipment load retry count;
- incremental mart compilation;
- seed-ref resolution;
- Hybrid data-quality failure behavior;
- publication blocking after the dbt test gate fails;
- mock metadata completeness and acceptance checks.

The static audit now also requires:

- requirements-first mock UI;
- collapsed reference architecture rationale;
- concrete SLA seed data;
- source/seed lineage navigation wiring;
- non-interactive Hybrid resource nodes;
- correct Hybrid run/test wording.

All V4 semantic, snapshot, contract, scheduler, scenario-matrix, persistence, build and SPA smoke gates remain enabled.
