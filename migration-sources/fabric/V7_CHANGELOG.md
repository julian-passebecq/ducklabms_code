# V7 changelog — nested authoring and Copy Mapping

Date: 2026-09-16

## Added

### Nested control-flow editor
- Added `src/lib/nestedActivities.ts` with structured child activity definitions.
- Added transparent parser for legacy pipe-delimited child lists.
- Added `NestedActivityEditor` using the shared `LearningGraph` / XYFlow engine.
- Added breadcrumb context: Pipeline > parent activity > branch.
- Persisted child node positions and names.
- Added full-screen editing for ForEach, If True, If False, and Until child activity collections.
- Updated compact Properties preview to read/write the same structured model.

### Copy Mapping
- Added `src/lib/copyMapping.ts`.
- Added `CopyMappingEditor`.
- Added mock schema import for retail/sales, turbine/IoT, and ERP/customer datasets.
- Added auto-map toggle.
- Added manual source/destination mapping rows with visible interim data types.
- Added New mapping / Clear / Reset operations.
- Added `mappedColumns` and `autoMap` to simulated Copy metrics.

### Dynamic Content
- Reorganized suggestions into Pipeline parameters, Variables, Activity outputs, Iteration & trigger, and Functions.
- Added dynamic-content search.
- Added runtime-context summary.

### Monitoring
- Added Trigger history view.
- Trigger history excludes Debug runs and groups simulated triggered runs by trigger label.
- Added run count, success/failure counts, average duration, and latest run information.

## Fixed

- Fixed structured nested activity data being downgraded to legacy pipe text when a child was added from the compact Properties preview.
- Preserved old saved projects by keeping legacy nested-list and legacy Copy Mapping parsing.

## QA

- Added `qa-v7.mjs`: 21/21 PASS.
- Added `qa-engine-v7.mjs`: 11/11 PASS.
- Full V7 + V6 + V5 QA: 146/146 PASS.
- Shimmed semantic TypeScript pass: 48 files PASS.
- Curriculum/route QA: PASS.
- npm dependency-backed build remains blocked by sandbox DNS (`EAI_AGAIN registry.npmjs.org`).
