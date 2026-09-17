# Mosaic V2.1.7 architecture

## 1. Block identity is separate from layout

```text
Project
├── blocks
│   ├── markdown
│   ├── SQL
│   ├── Python
│   ├── Polars
│   ├── saved Jupyter output
│   ├── table
│   ├── chart
│   └── catalog
│
└── views
    ├── Notebook
    ├── Two-page
    ├── Code + explanation
    ├── 2 + 1
    ├── Dashboard
    └── Free canvas
```

A view stores `blockIds` plus grid coordinates. It does not clone a block. Presentation-only state such as `collapsedIds` and remembered expanded heights also belongs to the view, so collapsing a cell in Two-page does not collapse the same block in Notebook.

## 2. Jupyter import

```text
.ipynb JSON
   ↓
parseIpynb()
   ├── stable Mosaic block IDs
   ├── Jupyter cell metadata
   ├── local block state
   └── normalized saved outputs
   ↓
createImportedViews()
   ├── original vertical order
   ├── height-balanced two-page
   ├── code + explanation
   ├── 2 + 1
   ├── output dashboard
   └── free canvas
```

The original cell identity is kept in `WorkbenchPanel.notebook`. A saved Jupyter output is represented as a separate read-only block tied to `parentCellId`.

Changing views does not alter notebook computation/order.

## 3. Execution

```text
SQL ───────────────→ DuckDB-Wasm ─┐
                                  │
Python ← latest shared ResultTable │
  ↓                               │
Pyodide ──────────────────────────┤
                                  ├→ shared ResultTable → Table / Chart / Dashboard
Polars ← latest shared ResultTable │
  ↓                               │
Pyodide + Polars ─────────────────┘
```

`Run view` uses `view.blockIds` order. Geometry is intentionally not execution order.

## 4. Dataset targeting

Dataset navigation resolves a SQL target in this order:

1. selected SQL block **if visible in the current view**;
2. first visible SQL block in the current view;
3. SQL block in Notebook;
4. any existing SQL block and the view that contains it;
5. create a new SQL block.

The generated replacement event contains `blockId`, so only one editor changes.

## 5. UI shell

```text
┌─────────────────────────────────────────────────────────────┐
│ top bar / layout tabs / open .ipynb / run                  │
├────┬──────────────┬──────────────────────────┬──────────────┤
│rail│ project/data │ draggable workspace      │ inspector    │
│    │ explorer     │                          │ cell metadata│
├────┴──────────────┴──────────────────────────┴──────────────┤
│ status                                                      │
└─────────────────────────────────────────────────────────────┘
```

Fluent UI handles shell controls. React Grid Layout owns spatial geometry.

## 6. Extension boundary

Mosaic owns:

- block identity;
- configurable views/layout;
- selection/Inspector;
- notebook import;
- persistence;
- shared result plumbing;
- basic browser runtimes.

Domain applications can provide additional block renderers (DAG, dbt lineage, architecture diagram, lesson card) without moving that domain logic into Mosaic core.


## 7. Output inspection

The shared result remains one `ResultTable`, but presentation blocks may expose different views of it. The core Table block now supports:

```text
Table
  └── bounded row preview

Profile
  ├── type
  ├── null / empty count
  ├── distinct count
  └── example value
```

When a result is truncated, profile statistics are explicitly described as preview statistics rather than whole-dataset statistics.

## 8. Build configuration gate

The node TypeScript configuration uses `allowImportingTsExtensions` together with `noEmit: true`, which is required by TypeScript 5.7. A dedicated stubbed gate compiles `vite.config.ts` against the real node tsconfig even when external npm packages are unavailable in the preparation environment.


## 9. Notebook order versus layout

Spatial dragging/resizing is presentation-only. Notebook semantic order remains `view.blockIds`. The Inspector exposes explicit **Move earlier / Move later** actions only in Notebook. Imported code cells and their saved Jupyter output blocks are treated as one move group. Reset Layout reflows geometry to the current semantic order instead of restoring import-time ordering.

## 10. Dashboard pin placement

New dashboard pins use the first collision-free 6-column tile slot. This keeps Dashboard usable without forcing every newly pinned output to full width. Reset Layout uses the same half-width placement for blocks that were pinned after the baseline was created.

## 11. Project export scope

Project export serializes top-level project state plus code/markdown/Jupyter-output state for blocks that actually exist in the current project. Theme/preferences and stale deleted-block localStorage keys are deliberately excluded.


## 12. Jupyter export boundary

`.ipynb` is the semantic notebook interchange format. Mosaic exports Notebook-view Markdown/code cells plus their saved Jupyter outputs. Notebook metadata, cell metadata, attachments and stable cell IDs are preserved when available.

Mosaic stores spatial presentation metadata under the safe namespaced `metadata.mosaic` field:

```text
.ipynb
├── standard Jupyter cells / outputs
└── metadata.mosaic
    └── views
        ├── Notebook
        ├── Two-page
        ├── Code + explanation
        ├── 2 + 1
        ├── Dashboard refs
        └── Free canvas
```

Jupyter ignores that namespace, while Mosaic can restore represented cell geometry and collapse state on re-import. Presentation-only Mosaic blocks and browser datasets are intentionally not encoded as fake Jupyter cells; **Export project** remains the full-fidelity Mosaic format.

Unsupported imported code (for example `%%bash`) is read-only in Mosaic but retains its original code source and metadata for `.ipynb` export.


## 13. Project replacement and state rehydration

Block IDs are stable identifiers, so a newly opened notebook can legitimately reuse an ID that is already mounted in React. LocalStorage replacement alone is not enough because an existing editor hook can retain its in-memory state. V2.1.7 increments a workspace revision after **New**, `.ipynb` import and Mosaic project import, forcing only the workspace subtree to remount and rehydrate from the newly restored block state.

## 14. Untrusted project-state boundary

Mosaic project JSON is treated as user-controlled input. Restore validates/sanitizes block types, optional Jupyter metadata, datasets, result origin/schema, block editor values and grid geometry before those values reach React/Monaco. Persisted result snapshots always restore as row transport; an old `arrow-ipc` flag cannot claim Arrow backing after its bytes have been removed.

## 15. Jupyter identity repair

nbformat 4.5 cell IDs must be unique. Import therefore preserves valid IDs but repairs duplicates/invalid characters deterministically. `NotebookCellMeta.originalCellId` records the raw ID only when normalization was required, while saved-output `parentCellId` points to the repaired effective cell ID. This keeps output grouping/layout metadata unambiguous and guarantees valid unique IDs on export.
