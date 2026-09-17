# Changelog — V7

**Date:** 2026-09-17

V7 is a behavior-consistency and resumability release. Curriculum breadth remains intentionally stable; the work is concentrated on making the simulator's state transitions match what the UI says happened.

## Performance Analyzer state consistency

- Timing rows are now built once from report complexity and shared by both the table and inspector.
- Selecting a slow visual no longer shows stale pre-scaling DAX/display timings in the inspector.
- Copy Query now attempts to use the browser clipboard and generates a scenario-aware sample DAX query instead of a Sales-only query.

## Service refresh-state propagation

- The semantic-model item no longer claims `Completed` before any simulated operation has run.
- Service inventory now shows `Not run`, `Failed`, `Completed`, `Direct Lake`, or `Query-time` where appropriate.
- A failed simulated refresh therefore remains visible when the learner moves from Refresh into Service.

## Governed release readiness

- Pre-release review increased from four to five gates.
- The new **Power Query load state** gate blocks a green production-readiness state when source/query edits have not been applied.
- Blank workspaces also fail this gate because no governed source set exists.

## Power Query hardening

- Transformations cannot be appended to a query that is not backed by a connected source.
- Power Query now shows a true empty state when no source exists instead of inventing profile-table queries.
- Close & Apply, View M, Advanced Editor, and Add Step are disabled until a real query exists.
- The Advanced Editor sample M chain now feeds `Filtered Rows` into `Changed Type` rather than accidentally bypassing the filtered step.
- Persisted `queryDirty` is recomputed from current/applied snapshots during migration instead of trusting a stale boolean from an older/crashed session.

## Case-study session behavior

- Each project now has an isolated resumable browser session.
- Switching from one project to another stores the current project and restores the target project's previous state if present.
- **Restart this case** clears only the active project's session and restores that case's original seed.
- If global Reset is used while the Case Studies page is open, the active case is reseeded instead of leaving the guide pointed at an empty/unrelated workspace.

## Report authoring depth

- Analytics-pane options (Average line, Constant line, Min/max line, Error bars) now persist per selected visual and survive workspace normalization.
- Selected visual analytics choices are visible on the report canvas.
- Visual-scope filter count is visible on the canvas.
- Title formatting now affects simulated visual titles.
- Alt text is applied as an accessibility label and the Tooltips toggle controls the native learning tooltip.

## DAX / scenario consistency

- The inline raw-column-arithmetic warning now adapts to the active fact table instead of only recognizing `Sales[...]` expressions.
- Quick measure templates are scoped to the active Sales, Wind, or Finance scenario rather than exposing unrelated templates in every case.

## Test coverage additions

Behavior/migration gates now cover:

- Performance timing scaling;
- Service latest-refresh propagation;
- Power Query release-load blocking;
- phantom query transformation prevention;
- stale `queryDirty=false` migration recovery;
- visual analytics migration;
- independent case-session save/resume/restart behavior.

Package version: **7.0.0**.
