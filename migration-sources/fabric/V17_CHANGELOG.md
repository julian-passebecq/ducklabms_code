# V17 changelog — graph-aware recovery and retry policy realism

V17 is an operational-depth release. It does not add another product area. It corrects recovery semantics and deepens day-to-day Fabric / Databricks reliability behavior while keeping the lightweight educational runtime.

## Fabric Pipeline / Monitoring

- Rerun scope now follows the recorded dependency graph instead of activity array order.
- `Rerun from failed activity` targets failed nodes plus their actual descendants.
- `Rerun from selected activity` forces the selected activity to become the recovery start node, even when its parent run had an upstream failure.
- Dependency conditions are reevaluated after rerun outcomes change. A former `Failed` branch can become skipped while a `Succeeded` branch becomes active.
- Unrelated successful branches are marked **Preserved**, not incorrectly labeled `Skipped`.
- Rerun status is calculated from executed work; a preserved historical failure does not automatically fail a selected-activity recovery run.
- Pipeline runs persist activity dependency snapshots, runtime parameter values and pipeline variable values.
- Monitoring shows the runtime context snapshot and visually separates preserved activities from executed/skipped activities.

## Fabric activity retry policy

- Added Fabric-style retry interval type: `Fixed` or `Increasing Delay`.
- Added maximum retry interval for increasing-delay simulations.
- Added conditional retry learning controls for supported Fabric activities: error code, failure type and error message.
- Added simulated failure type / error code / error message so learners can see when retry conditions match or do not match.
- Runtime diagnostics expose retry policy, condition match and representative cumulative wait evidence.
- Retry count validation now caps the learning model at 1000 and validates the increasing-delay maximum.
- The ADF shell intentionally retains the simpler fixed retry interval rather than inheriting Fabric-only preview controls.

## Azure Databricks Lakeflow Jobs

- Added an independent `publish_audit` branch alongside the quality/publish branch.
- Repair scope is now computed as failed/skipped tasks plus their dependent descendants.
- Successful independent branches are explicitly marked **Preserved** during repair.
- The Jobs UI shows the planned repair scope before execution and the executed/preserved disposition afterward.
- Repair-time parameter overrides remain supported.

## Debugging fixes

- Fixed Fabric rerun behavior that previously depended on activity creation order.
- Fixed selected-activity recovery so the selected activity is not blocked by the historical status of an upstream preserved activity.
- Fixed rerun overall status so preserved historical failures do not incorrectly fail a new scoped recovery run.
- Updated V16 regression gates to accept the corrected preserved-activity semantics without weakening the older operational coverage.

## QA

- V17 static/depth: **23/23 PASS**
- V17 executable operational engine: **24/24 PASS**
- Previous V5-V16 regression: **596/596 PASS**
- Combined automated assertions: **643/643 PASS**
- Shimmed semantic TypeScript: **64 TS/TSX files PASS**
- Missing routes: **0**
