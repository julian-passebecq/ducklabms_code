# Mosaic V2.1.7 — Notebook Layout Engine

Mosaic is a notebook-first React workspace built around one principle:

> keep the computation, change the presentation.

A SQL/Python/Polars/text/output block has one identity. The same block can appear in a classic notebook, two-page view, code + explanation view, 2 + 1 layout, dashboard, or free canvas without copying its content.

Mosaic opens real Jupyter `.ipynb` files, reorganizes them spatially, and exports the semantic notebook back to nbformat 4.5 while preserving Mosaic layout metadata in a namespaced Jupyter metadata field.

## Core stack

- React + TypeScript
- Microsoft Fluent UI 2 (`@fluentui/react-components`)
- React Grid Layout
- Monaco editors
- DuckDB-Wasm SQL
- Pyodide Python
- browser Polars
- CSV / TSV / Parquet catalog
- local browser persistence

Airflow, dbt and Spark-learning applications remain outside this core branch. They can reuse Mosaic as a configurable shell later.

## Views

1. **Notebook** — semantic notebook/run order.
2. **Two-page** — the same notebook split into two height-balanced columns.
3. **Code + explanation** — code/output left, markdown right.
4. **2 + 1** — two compact notebook groups above a larger lower pane.
5. **Dashboard** — presentation tiles over the same project blocks/results.
6. **Free canvas** — arbitrary spatial arrangement.

Dragging/resizing changes presentation only. **Move earlier / Move later** in Notebook intentionally changes notebook/run order. Imported code cells move together with their saved Jupyter output block.

## `.ipynb` import and export

Mosaic imports Markdown, Python, `%%sql` / `%sql`, raw cells, unsupported code as read-only, attachments and saved outputs.

V2.1.7 hardens notebook identity:

- valid Jupyter cell IDs are preserved;
- malformed IDs are normalized;
- duplicate IDs are deterministically repaired (`id`, `id-2`, ...);
- the raw duplicate/invalid ID remains visible in Inspector as **Original ID**;
- saved output blocks are rebound to the repaired parent cell ID;
- export always produces unique nbformat 4.5 cell IDs.

Direct **Export `.ipynb`** preserves edited Python/SQL/Markdown, notebook/cell metadata, attachments, saved output payloads, execution counts and Mosaic view metadata under `metadata.mosaic`.

`.ipynb` represents the semantic notebook document. Presentation-only Mosaic blocks such as standalone chart/table/catalog blocks remain part of **Export project** JSON, which is the full-fidelity Mosaic format.

## V2.1.7 project-state hardening

Opening a new notebook/project can reuse the same block IDs as the previous one. V2.1.7 forces the workspace to remount after **New / Open `.ipynb` / Open project**, so mounted editor hooks reread the newly restored browser state instead of showing stale code from the previous project.

Project JSON restore now also sanitizes:

- block types and optional Jupyter metadata;
- code/Markdown state types;
- saved-output arrays;
- notebook-info metadata;
- dataset enum fields;
- result schema/origin metadata;
- stale `arrow-ipc` transport flags from old persisted previews;
- grid geometry and stale layout references.

An intentionally empty dataset catalog remains empty after project round-trip; Mosaic no longer silently inserts demo datasets into that restored project.

## Notebook ergonomics

- Add Block inserts near the selected block.
- Duplicate Block copies current persisted block content into a new independent Mosaic block.
- Blocks collapse per view and restore their previous expanded height.
- Reset Layout clears collapse state while preserving deliberate Notebook order.
- Result blocks provide **Table | Profile**.
- Imported saved Jupyter outputs can be pinned/unpinned from Dashboard.
- Dashboard pins use predictable half-width tiles and can be changed to **Half width** or **Full width** from Inspector.
- Clicking a dataset targets one visible SQL block, creating a SQL block if required.
- `Run view` follows notebook block order exactly.
- Deleting an imported Jupyter code cell also removes its associated saved-output block.
- **Open project** restores Mosaic JSON exports and reattaches matching browser-local datasets when OPFS fingerprints match.
- Editor persistence writes synchronously, avoiding stale Duplicate/Export snapshots immediately after an edit.

## Run

```powershell
npm install
npm run verify:source
npm run build
npm run dev
```

Or on Windows:

```powershell
.\start.ps1
```

## Validation status

`npm run verify:source` passes architecture, model, `.ipynb`, ergonomics, V2.1.3–V2.1.7 hardening, TS/TSX syntax and strict internal TypeScript gates.

The preparation environment does not contain the external React/Fluent/Vite dependency tree, so the dependency-resolved `npm run build` cannot complete here unless npm registry access succeeds. No partial dependency tree is included in the archive.

See `docs/TEST_REPORT_V2.md`.
