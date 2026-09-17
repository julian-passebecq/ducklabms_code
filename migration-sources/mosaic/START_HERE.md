# Start here — Mosaic V2.1.7

## What this branch is

A configurable notebook/layout engine. It is not the Airflow/dbt learning app and it is not a Fabric clone.

The acceptance question is:

> Can I keep one notebook and reorganize it freely without rewriting the content?

## Fast notebook test

1. Start **Notebook**.
2. Edit/run SQL.
3. Run Python; the latest shared table is available as `input_df`.
4. Switch to **Two-page** and **Code + explanation**.
5. Drag/resize blocks and verify the code does not change.
6. Select a Notebook block and use **Move earlier / Move later**.
7. Collapse/expand a block; its prior height should return.
8. Duplicate a block immediately after editing it; the duplicate should contain the latest text/code.
9. Pin an output to Dashboard; switch it between **Half width** and **Full width**.
10. Reset Notebook layout after reordering; visual order must still match semantic notebook order.

## Replacement-state regression test

1. Edit a cell in Project A.
2. Open another project or `.ipynb` that reuses the same Jupyter/block ID but contains different source.
3. The visible editor must immediately show Project B's source, not Project A's mounted React state.
4. Click **New** and confirm starter cells rehydrate correctly even if their IDs already existed.

## Fast Jupyter round-trip test

1. Click **Open .ipynb**.
2. Confirm original order in **Notebook**.
3. Switch to **Two-page**; code and saved outputs stay together.
4. Resize/collapse a block in Two-page.
5. Edit an imported Python or SQL cell.
6. Click **Export .ipynb**.
7. Reopen the exported notebook in Mosaic.
8. Verify edited code, original Jupyter metadata/outputs and Mosaic layout/collapse state return.
9. Unsupported `%%bash`/shell cells should display read-only in Mosaic but remain original code cells in the exported notebook.
10. A malformed notebook with duplicate cell IDs should import both cells with repaired unique IDs and keep each output attached to the correct repaired parent.

Use **Export project** instead when you need the complete Mosaic project including datasets and Mosaic-only chart/table/catalog blocks.

## Project round-trip / malformed-project test

1. Make layout/code changes.
2. Click **Export project**.
3. Click **Open project** and reload the JSON file.
4. Verify blocks, views, saved outputs and current view are restored.
5. Stale/deleted block state must not return.
6. Browser-local CSV/Parquet assets are reattached only when fingerprints match.
7. Malformed grid coordinates, duplicate layout entries and stale IDs must be sanitized.
8. Non-string editor state and malformed optional notebook metadata must be dropped rather than reaching Monaco/React.
9. A project exported with zero datasets must restore with zero datasets.

## Data navigation

Clicking a dataset targets one visible SQL block in the current view, falls back to Notebook, and creates a SQL block if none exists.

## Source verification

```powershell
npm run verify:source
```

This runs architecture/model/import/ergonomics/V2.1.3–V2.1.7 behavior tests plus syntax and strict internal TypeScript gates.
