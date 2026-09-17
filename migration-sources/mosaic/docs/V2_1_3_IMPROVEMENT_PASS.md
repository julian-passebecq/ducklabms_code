# V2.1.3 debug / improvement pass

## Focus

Notebook ordering, Dashboard pinning, export integrity, and immediate persistence correctness.

## Changes

- Added Notebook **Move earlier / Move later** controls.
- Imported code cells move with their saved Jupyter output block.
- Reset Layout now preserves deliberate semantic Notebook order.
- Dashboard pins use first-free half-width tile placement.
- Dashboard reset uses the same placement for post-baseline pins.
- Project export collects only current block-owned state.
- `usePersistentState` writes synchronously as well as keeping the effect fallback, preventing stale Duplicate/Export content after an edit.
- Imported Markdown now has Restore behavior matching imported SQL/Python.

## Bugs fixed

1. Reset Layout could visually revert a reordered Notebook to import-time geometry while execution order remained changed.
2. Project export swept every `mosaic:v2:*` localStorage key, including stale deleted blocks and UI preferences.
3. A very fast Duplicate/Export after an edit could observe a one-render-old persisted block value.
4. Newly pinned Dashboard outputs defaulted to generic full-width placement.
5. Imported Markdown had no Restore-original-source affordance.

## Scope deliberately unchanged

No new runtimes or domain labs were added. V2 remains the generic notebook/layout engine.
