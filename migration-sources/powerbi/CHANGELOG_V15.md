# Power BI Learning Studio — V15 changelog

**Date:** 2026-09-17

## Debug / improvement focus

V15 is a destructive-edit, loaded-model truthfulness, and persisted-state sanitation pass on top of V14.

### Relationship diagram correctness after destructive edits

- Relationship lines now resolve their visual slot from the relationship identity instead of mutable array position.
- Deleting a middle relationship no longer causes a surviving relationship to be drawn between the wrong tables.
- Relationship endpoint markers now reflect the configured cardinality:
  - `1:*`
  - `*:1`
  - `1:1`
  - `*:*`
- Pure regression helpers cover both relationship-to-slot resolution and cardinality marker rendering.

### Power Query selection recovery

- The local active-query selection is clamped after query deletion.
- Adding a new source selects that new query deterministically rather than jumping because of a stale out-of-range index.
- `Recent Sources` and `Enter Data` are now explicitly disabled/reference-only instead of looking clickable while doing nothing.

### Loaded-model truthfulness in Report, Performance, and Service

- Existing report visuals no longer keep rendering healthy sample values after the loaded semantic model is removed; they show a broken-model state instead.
- Model-bound field editing, filter creation, and Analytics overlays are gated when no semantic model is loaded.
- Performance Analyzer cannot record evidence before a semantic model exists.
- Optimization checkboxes remain unavailable until an Analyzer run exists.
- Service workspace inventory, model-specific controls, lineage, and the Desktop status bar now respect the loaded semantic-model boundary.

### Persisted-state sanitation

- Workspace normalization no longer spreads arbitrary persisted top-level keys back into the sanitized state.
- Unknown visual-detail, DAX-object, and performance keys are pruned during migration.
- Duplicate applied-source identities are normalized as well.
- This prevents obsolete/corrupt state from silently surviving every migration pass.

## Regression additions

V15 adds assertions for:

- relationship geometry following semantic identity after reorder/delete;
- cardinality markers matching configured cardinality;
- unknown top-level/nested persisted keys being pruned;
- Power Query destructive-selection recovery wiring;
- Performance Analyzer loaded-model gating;
- broken report visuals when model data is unavailable;
- Service/status-bar loaded-model boundaries.

All 5 cases / 45 sequential steps remain satisfiable.
