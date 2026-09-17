# V4 changelog — realism + debug pass

Date: 2026-09-16

## Fixed defects

- Fixed a genuine TypeScript syntax bug in `LearningGraph.tsx` where `??` and `||` were mixed without parentheses.
- Tightened graph icon typing and added safe icon fallback behavior.
- Added stronger pipeline validation for cyclic, self and duplicate dependencies.

## Authoring UX

- Added dependency-edge selection.
- Added dependency-condition editing for Succeeded / Failed / Completed / Skipped.
- Added node right-click context menu.
- Added Duplicate activity.
- Added Reset run status.
- Added collapsible Activities / Properties / Tutorial panes.
- Added simulated schedule editor.
- Added explicit Save/autosave feedback.

## Debug/runtime simulator

- Replaced one-shot all-green debug animation with a deterministic dependency-aware execution plan.
- Added live Queued / In progress / Succeeded / Failed / Skipped transitions.
- Added learning-only per-activity failure simulation.
- Added dependency branch behavior so Failed and Completed paths can be practiced.
- Added skipped downstream activities when dependency conditions are not met.
- Failed runs now produce failed activity output and are recorded as Failed.

## Monitoring

- Functional text filter.
- Functional status filter.
- Expandable activity diagnostics.
- Failed/skipped status visualization.
- CSV export for the filtered run set.

## QA

- `npm run qa`: 29/29 static checks passed.
- 38 TypeScript/TSX files parsed with 0 syntax diagnostics.
- Shimmed semantic TypeScript pass succeeded.
- Direct pure-engine tests passed for cycle detection and dependency/failure behavior.
- Real dependency-backed build still requires a connected npm environment.
