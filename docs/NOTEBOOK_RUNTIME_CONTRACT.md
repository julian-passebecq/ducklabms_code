# Notebook and runtime invariants

1. A block has a stable identity. A view references that identity; it does not copy its source.
2. Visual rearrangement is not execution-order rearrangement. Semantic move controls are explicit.
3. Notebook, two-page, split, 2+1, dashboard, canvas and focused-practice views share source and output identity.
4. A code cell can select SQL, SparkLab, Python, Polars or dbt SQL. The selected kernel is preserved in root Jupyter metadata; plain external Jupyter clients may not understand the custom kernel extension.
5. Spark/Python symbols persist only within a notebook's worker namespace. Catalog tables are shared across notebooks in that workspace.
6. Run history, cell output and acceptance are distinct. Historical output cannot independently certify fresh data.
7. Imports preserve supported metadata and attachments without executing code or injecting raw output HTML.
8. Unknown notebook magics are retained read-only, not silently translated.
9. Core notebook modules may import types/layout helpers, but not Fabric/ADF/Airflow/Power BI logic.
10. Runtime failures must surface as failures; no fall-through to prerecorded successful results.

## Root functions

`createCaseNotebook`, `practiceView`, `sourceOf`, `withSource`, `setBlockKernel`, `recordExecution`, `restoreNotebook`, `importNotebook`, `exportNotebook`, `attachServerEvidence`, `addCell` are in `apps/web/src/notebook.ts`. Domain-neutral parsing, export and layout logic are extracted from Mosaic under `packages/notebook-core`.

The canvas injects a renderer and geometry changes. The editor adapter uses locally bundled Monaco workers, with an accessible plain-text fallback. No CDN-based runtime editor loading is configured. The actual Monaco/Fluent bundle still needs the unexecuted build gate.

## Practical boundaries

SQL accepts a deliberately restricted set of statements. It does not provide a full administrative console or arbitrary file/network reads. Python can run general installed Python code only after trusted-local opt-in. SparkLab accepts a published subset, not arbitrary Python pretending to be Spark. The dbt adapter expands literal ref/source calls; macros, config, tests, snapshots and incremental semantics remain specialist migration work.

Result previews are bounded to 200 rows. Full SQL materialization is separate. Python `query()` refuses a truncated preview instead of silently training on only a prefix. Python publication supports 1..10,000 simple rectangular rows, not arbitrary nested frames or empty typed schemas. Those limitations should be expanded deliberately, with tests.

Root JSON exports include layout geometry. ipynb export carries the original Mosaic view metadata; the extra focused-practice preset is a root-document view preference, not a standard Jupyter feature.
