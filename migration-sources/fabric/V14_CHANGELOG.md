# V14 changelog — end-to-end challenges + join/idempotency depth

## Purpose

V14 consolidates the learning experience around multi-stage proof rather than adding another product emulator. Learners now move between Notebook/SQL/dbt/Pipeline/Monitor/Recovery and return to one challenge surface that validates the actual shared state.

## Added

- New **End-to-end challenge** Fabric workbench and typed `challenge` route.
- Three case-specific five-stage challenge missions:
  - Retail production handoff
  - Turbine telemetry + production-scale Spark judgment
  - ERP incremental + SCD Type 2 production challenge
- Sequential stage gating, assistance-aware scoring, hint ladder, durable local progress and JSON challenge-report export.
- Challenge validators for:
  - real workspace tables/columns/row counts;
  - unique/positive data constraints;
  - generated lineage;
  - completed Hands-on practice exercises;
  - pipeline dependency graph order;
  - required activity configuration/dynamic-content fragments;
  - latest successful run evidence;
  - recovery checkpoints;
  - reliability health;
  - ERP watermarks and SCD2 current-row state.
- Safe **challenge start checkpoint** action.

## SQL runtime improvement

The lightweight training SQL engine now supports deterministic equality joins:

- `INNER JOIN ... ON left = right`
- `LEFT JOIN ... ON left = right`
- table aliases and qualified column references.

This is intentionally a learning subset, not a full SQL parser.

## New practice drills

- Retail INNER JOIN: raw sales + Silver sales.
- Turbine INNER JOIN: raw event context + engineered risk.
- ERP LEFT JOIN: customers retained even when no order exists.
- ERP incremental dbt idempotency: `dbt build` runs twice and validates stable `staging.customer_changes` row count.

## Debug fixes / hardening

- Challenge pipeline validation follows the actual dependency graph rather than node creation order.
- Historical V13 package-version QA now accepts later versions and remains a real regression gate.
- Static route/curriculum inventory now includes the V14 challenge route and 15th Fabric module.
- `dbt compile`/run/build/test behavior from V13 remains intact.

## QA

- V14 static/depth: 27/27 PASS
- V14 executable challenge/runtime: 27/27 PASS
- Previous V5–V13 regression assertions: 443/443 PASS
- Combined assertions: 497/497 PASS
- Shimmed semantic TypeScript: 61 TS/TSX files PASS
- Missing routes: 0
- Fabric modules: 15
- Databricks modules: 8
- ADF modules: 2
- Case studies: 3

The dependency-backed Vite build remains an external gate because npm dependency retrieval did not complete in this sandbox.
