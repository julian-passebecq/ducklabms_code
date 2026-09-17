# Changelog — V5

**Date:** 2026-09-17

V5 is a state-correctness and regression-testing release. Curriculum counts remain intentionally stable; the work is concentrated in simulator behavior that can otherwise teach the wrong Power BI mental model.

## Fixed

### DirectQuery/composite connectivity

- Fixed private DirectQuery paths incorrectly bypassing gateway checks.
- Fixed DirectQuery paths incorrectly bypassing credentials checks.
- Cloud DirectQuery now distinguishes credentials from on-premises gateway requirements.
- Composite models now use the same source-path readiness evaluator instead of falling through to an always-ready generic branch.
- Refresh-operation messages now describe DirectQuery and composite behavior separately from Import processing.

### Power Query undo / Close & Apply

- Added query-aware `transformLog` entries (`query + step`).
- Fixed Undo when two queries contain the same Applied Step name.
- Added `appliedSources` and `appliedQueryTransforms` snapshots.
- Close & Apply snapshots the current source/query state.
- Pending state is derived from the current state versus the applied snapshot.
- Undoing exactly back to the snapshot clears pending state automatically.
- Added simulated query deletion that removes only that query's transforms/log entries.
- Duplicate source additions no longer misleadingly act like a new connection.

### Relationship model

- Added `relationshipDetails` aligned with model relationships.
- Cardinality, filter direction, and active state are now stored per relationship.
- Model view supports selecting a relationship and editing its own properties.
- Added an explicit apply-direction-to-all repair action.
- Model health scans all relationship paths for broad bidirectional and many-to-many warnings.
- Governed release readiness fails if any relationship still has an unintended broad `Both` path.
- Broken BI Production Rescue now requires clearing all seeded bidirectional paths.

### Report filters

- Filters pane is now interactive instead of decorative.
- Added persistent visual-, page-, and report-scope filters.
- Visual filters are stored on the selected visual object.
- Page/report filters are normalized in workspace state and survive reload/migration.

## Migration / test architecture

- Extracted `initialWorkspace` and `normalizeWorkspace` from React into `src/utils/workspaceState.js`.
- Added `check:migration` for pure V3/V4/V5 state migration tests.
- Migration tests cover legacy global Power Query transforms, V4 query maps, dirty post-apply state, relationship-detail migration, visual filters, report filters, nested defaults, and malformed persisted arrays.
- Expanded behavior tests for DirectQuery/composite readiness, applied-state reversibility, duplicate step names across queries, query deletion, and per-relationship model health.
- Deep release checks now protect V5 schema fields and the new filter/model/query behavior.

## Product baseline

Microsoft Learn was rechecked on 2026-09-17. The latest published Power BI monthly update page available was still **August 2026**, so V5 retains that baseline rather than relabeling the simulator as a September monthly release.
