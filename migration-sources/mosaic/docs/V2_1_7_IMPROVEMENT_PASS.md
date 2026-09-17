# V2.1.7 debug / improvement pass

## Scope

Notebook-first reliability pass. No new runtime or domain lab was added.

## Fixed

1. **Project replacement stale editor state** — New/Open `.ipynb`/Open project now remount the workspace so reused block IDs rehydrate their newly restored code/Markdown/output state.
2. **Project JSON state typing** — restored code/Markdown values must be strings; Jupyter-output state must be an array of object payloads; stale block keys are ignored.
3. **Optional metadata sanitation** — malformed notebook metadata, notebook info, datasets, result schema/origin and enum values are not trusted blindly.
4. **Legacy result transport truthfulness** — persisted previews restore as row transport even if an older snapshot says `arrow-ipc` without Arrow bytes.
5. **Empty dataset fidelity** — an exported project with no datasets restores with no datasets instead of silently receiving demo tables.
6. **Duplicate/invalid Jupyter cell IDs** — imported IDs are normalized/deduplicated deterministically, the raw ID is retained for inspection when changed, and saved outputs follow the repaired parent ID.
7. **Standalone duplicated output blocks** remain valid Mosaic presentation blocks even when they intentionally have no Jupyter parent metadata.

## Added regression coverage

`check:v217` executes malformed project-state sanitation, legacy result normalization, standalone output restore, duplicate Jupyter identity repair/output rebinding, workspace-remount wiring and empty-dataset round-trip checks.
