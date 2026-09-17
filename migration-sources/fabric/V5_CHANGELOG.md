# V5 changelog — parameters, expressions, containers and Gantt monitoring

Date: 2026-09-16

## Pipeline authoring

- Added persistent pipeline **parameters** and **variables**.
- Added a Parameters & Variables editor from the pipeline command bar.
- Added runtime parameter overrides when starting Debug.
- Added **Set Variable** activity.
- Added **Append Variable** activity with Array-variable validation.
- Added **Until** activity with nested child activities.
- Retained and expanded ForEach and If Condition container behavior.

## Dynamic content

- Added reusable expression engine and expression builder.
- Added expression suggestions and preview.
- Supports pipeline parameter references, variable references, Lookup/activity outputs, item(), utcNow(), greater(), equals() and concat().
- Pipeline validation rejects unrecognized expression syntax.
- Pipeline validation reports missing parameter and variable references.

## Copy activity

- Replaced generic key/value settings with dedicated Source / Sink / Mapping / Settings tabs.
- Added source query / source format.
- Added sink format / write behavior / pre-copy script.
- Added column mapping preview.
- Added parallel-copies setting.

## Container activities

- ForEach now models nested activities and reports iteration behavior.
- If Condition now models separate True and False activity branches.
- Until models repeated child activities and a termination expression.

## Runtime simulator

- Successful Set Variable activities mutate current pipeline-variable state.
- Successful Append Variable activities append evaluated values to array variables.
- Runtime parameter overrides are passed into expression/variable evaluation for the current Debug run only.
- Existing failure/dependency/cycle behavior is retained.

## Monitoring

- Added List / Gantt view toggle.
- Added activity-duration bars per run.
- Failed / skipped / succeeded states are visually represented in the Gantt timeline.

## QA

- V4 regression suite: 29/29 PASS.
- V5 static/regression suite: 46/46 PASS.
- V5 engine smoke suite: 15/15 PASS.
- 42 TS/TSX files parse with 0 syntax diagnostics.
- Shimmed semantic TypeScript pass: PASS.
- Curriculum/routes regression: PASS.
- Real npm dependency install was attempted but timed out in the sandbox.
