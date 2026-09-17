# Changelog — V6

Date: 2026-09-17

V6 is a workflow-correctness and cross-surface-consistency release. The curriculum breadth remains intentionally stable; the main work is making the simulator teach the correct Power BI sequence and architecture decisions.

## Storage/source compatibility

- Added connector-aware storage-mode validation.
- Direct Lake now rejects non-OneLake source paths in the simplified global-storage learning model.
- DirectQuery now rejects connectors such as Text/CSV that do not advertise DirectQuery capability.
- Import rejects connectors that do not expose an Import path in the connector registry.
- Governed release readiness inherits these compatibility failures instead of allowing an architecturally impossible model to appear production-ready.
- Refresh readiness now exposes the concrete failure explanation directly in the UI.

## Scenario consistency

Added a single scenario-profile contract used across simulator surfaces.

The active Sales, Wind, or Finance scenario now drives:

- PBIX/document title;
- report page identity;
- visual sample labels and representative values;
- field wells and filter examples;
- Data/Model context;
- Power Query preview data;
- DAX default examples and query output;
- TMDL example metadata;
- granular table-level refresh target;
- Service workspace name, report/model items, and lineage labels.

Explicit case-study identity takes precedence over incidental connector experiments. Source-based scenario inference remains available in free-play mode.

## Guided Close & Apply workflow

Added an explicit `queryApplied` validation contract.

Three projects now require Close & Apply after query shaping and before downstream semantic-model/report work:

- Adventure Sales 360;
- Project Margin & Forecast;
- Governed Executive BI Release.

The guided curriculum therefore increases from 38 to **41 validated steps**.

## Test improvements

Added `scripts/workflow-check.mjs` and `npm run check:workflow`.

Unlike the existing per-step state-contract test, this gate executes each case sequentially and verifies that later actions do not unexpectedly invalidate earlier completed steps.

Current workflow gate:

- Sales 360: 9/9;
- Wind Operations: 6/6;
- Project Margin & Forecast: 7/7;
- Governed Executive BI Release: 11/11;
- Broken BI Production Rescue: 8/8.

`BUILD_WINDOWS.cmd` now runs the sequential workflow gate before the production build.

## Additional fixes

- Fixed TMDL example generation so the generated measure expression is not self-referential.
- Power Query preview now uses scenario/source-appropriate representative rows instead of always rendering Sales data.
- Scenario changes reset authoring defaults and stale selected visual state.
- Package version moved to `6.0.0` and the deep release contract checks it explicitly.
