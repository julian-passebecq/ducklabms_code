# Power BI Learning Studio — V10 changelog

**Date:** 2026-09-17

## Fixed

- Pruned orphan `queryTransforms` / `transformLog` entries whose queries no longer correspond to active sources.
- Pruned orphan `appliedQueryTransforms` entries whose sources are no longer in the applied source snapshot.
- Prevented malformed `visualDetails.type` from overriding the authoritative visual type stored in `workspace.visuals`.
- Added typed normalization for visual interaction values, report theme, refresh mode, measure formulas, and DAX-object formulas.
- Global **Reset lab state** now clears saved case-study sessions as well as the active workspace.
- Case Studies now recovers invalid persisted case IDs before using them for validation/session persistence.
- Data view now shows loaded/applied connections rather than staged Power Query sources and warns when pending query changes exist.
- Refresh evidence now includes the loaded Power Query transformation snapshot. Applying changed query logic invalidates an older completed Import refresh.
- Case-study state inspector now distinguishes Performance Analyzer evidence as **Current**, **Stale**, or **Not run**.

## Guided workflow improvement

**Broken BI Production Rescue** now requires:

1. explicit Dynamic RLS/security review;
2. current post-repair Performance Analyzer evidence;
3. an all-green **5/5 governed release readiness** state;
4. publication only after that gate passes.

The total guided workflow grows from **42 to 44 steps**.

## QA additions

Added regression coverage for:

- global case-session reset;
- orphan query-state migration;
- orphan applied-query snapshot migration;
- authoritative visual-type recovery;
- invalid interaction/theme/refresh-mode recovery;
- malformed formula recovery;
- refresh invalidation after applied Power Query logic changes;
- the new `releaseReady` guided contract;
- sequential production-rescue readiness before publish.
