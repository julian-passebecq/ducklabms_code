# Power BI Learning Studio V4 — improvement/debug pass

**Date:** 2026-09-17

V4 is a behavior-hardening release. It keeps the V3 curriculum and case-study scope, but fixes several simulator states that could teach the wrong operational lesson or leak stale UI state across workflows.

## Behavior fixes

- Fixed Service workspace tabs: Reports, Semantic models, Dashboards, and Dataflows now filter the simulated inventory instead of only changing the active tab style.
- Fixed global search: troubleshooting tickets are now actually included in the searchable item registry.
- Fixed Import refresh readiness: an on-premises gateway is required only for the simulated private SQL Server path; cloud Import sources no longer receive a false gateway warning.
- Added explicit credential readiness for Import operations.
- Copilot approval is now prerequisite-gated by business metadata + Prepare data for AI. Turning either prerequisite off revokes simulated approval.
- Added a governed pre-release readiness card separating “can publish” from “ready to publish.”
- Fixed selected-visual editing so Format-pane title/tooltips/alt text and edit-interaction choices persist on the selected visual object.
- Fixed stale selected-visual indexes after case restart/switch so old canvas selection cannot target an out-of-range visual.
- Fixed stale Power Query query selection after source lists change.

## Power Query state model

- Applied Steps are now tracked per query, not repeated across every query.
- Global transformation count is still preserved for case-study validation/progress.
- Undo removes the last step from the active query and the matching global progress entry only.
- Close & Apply now records a model-load timestamp.
- New transformations mark the query state as pending/dirty; Close & Apply clears that pending state.
- V3 global transforms are migrated into the first query when an older localStorage snapshot is opened.

## Refresh / operations realism

- Refresh execution now uses a shared readiness evaluator.
- No-source operations fail explicitly.
- Private SQL Import distinguishes missing gateway mapping from missing credentials.
- Azure SQL/cloud Import can be ready without the on-premises gateway toggle, while still requiring credentials in the learning model.
- Direct Lake and DirectQuery use separate operational interpretations instead of Import-centric language.
- Gateway and credential controls disable when they do not apply to the selected storage/source path.

## Release/test harness

- Added `scripts/behavior-check.mjs` with pure behavioral regression tests.
- Added `scripts/css-check.cjs`, which parses the full stylesheet through PostCSS rather than only counting braces.
- Syntax checking now falls back to a globally installed TypeScript parser when local npm dependencies are unavailable.
- `BUILD_WINDOWS.cmd` runs content, deep, state, behavior, syntax, and CSS gates before `vite build`.
- Package version advanced to `4.0.0`.

## Scope intentionally unchanged

V4 does not add more case studies or inflate curriculum counts. The focus is correctness of the existing learning workflow:

- 13 curriculum modules
- 16 guided DAX exercises
- 23 connector/source patterns
- 20 visual types
- 12 architecture decision scenarios
- 8 troubleshooting tickets
- 5 case studies / 38 guided steps
