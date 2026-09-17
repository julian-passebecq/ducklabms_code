# V6 changelog

## Activity authoring

- Added common Policy controls for retry, retry interval, secure input/output and simulated failure.
- Added dedicated Lookup configuration for Query, Stored procedure and Table modes.
- Added Stored Procedure connection/procedure/JSON parameter mapping editor.
- Added Script connection/query/logging configuration.
- Added Invoke Pipeline Fabric/ADF target, authentication, workspace, wait and parameter mappings.

## Triggers

- Added Fabric Fixed schedule, Interval schedule and Event trigger learning modes.
- Added ADF Schedule, Tumbling window and Event trigger learning modes.
- Added trigger definition validation and parameter mapping.
- Added Test trigger execution path into Monitoring.

## Dynamic content

- Added event metadata expressions.
- Added tumbling-window start/end expressions.
- Added `@item().property` support.
- Improved nested `greater`, `equals` and `concat` evaluation.
- Added missing-activity validation in direct and nested JSON expressions.

## Runtime and diagnostics

- Added attempts, input, output, error and metric payloads per activity run.
- Added secure-input/output flags and masking surfaces.
- Added detailed Copy transfer metrics.
- Added dependency-aware activity start offsets and critical-path run duration.
- Improved Monitoring List/Gantt inspection.

## Case-study fixes

- Corrected retail `batch_date` parameter mapping.
- Corrected turbine stored-procedure activity-output mappings.
- Fixed If/ForEach runtime context to include the full pipeline graph.
- Added ERP `@item().last_successful_ts` expression support.

## QA

- Added `qa-v6.mjs` (28 checks).
- Added `qa-engine-v6.mjs` (25 executable behavior checks).
- Added `qa-semantic-v6.mjs` across 44 TS/TSX files.
- Applied-solution validation now protects all 3 Fabric case studies.
- Inherited V5 suites continue to pass.
