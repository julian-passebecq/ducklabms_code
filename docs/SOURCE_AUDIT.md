# Source audit and integration ledger

Audit scope: archive structure, manifests, key state/runtime/layout modules, selected tests and public upstream APIs. This was not a line-by-line security or feature audit of every uploaded file. Full ZIP SHA-256 values are in `source-inventory.json`.

## Input inventory

| Archive | Entries | SHA-256 prefix |
|---|---:|---|
| `DuckLake_Data_Engineering_Lab_V0.12_Source(2).zip` | 114 | `2155c73ac47cf5ca` |
| `Fabric_Azure_Data_Engineering_Lab_V21(2).zip` | 171 | `73ab5fbba1dee223` |
| `Microsoft_Data_Guide_Fluent2_React_V4_4_Debug_Improvement_2026-09-17(1).zip` | 40 | `c65dcab37b8419fe` |
| `PowerBI_Learning_Studio_V15_2026-09-17(2).zip` | 69 | `39d5f7c0abb997ad` |
| `Project_Command_Center_Fluent2_React_v5 (1).zip` | 63 | `580acc43fdf1f27b` |
| `Project_Command_Center_Fluent2_React_v5(2).zip` | 63 | `580acc43fdf1f27b` |
| `airflow-dbt-learning-studio-v7(2).zip` | 85 | `8122c580ba7b9b6d` |
| `fluentui-charting-contrib-main (1).zip` | 17514 | `4cb38f84beb8badd` |
| `fluentui-master (1)(1).zip` | 23302 | `22efe3bc0e85a193` |
| `mosaic-v2.1.7-debug-improvement-pass(2).zip` | 72 | `b0b2d085617b73d1` |

The two Command Center archives are byte-identical duplicates by SHA-256. They are not two separate product modules. Ten uploads represent seven application codebases and two upstream Microsoft source repositories.

## Findings and disposition

| Source | Reused now | Retained for migration / caveat |
|---|---|---|
| Mosaic 2.1.7 | Generic types, layout functions, ipynb parser/export, project sanitizer; canvas pattern | Original full UI and browser runtimes remain reference-only. New execution uses FastAPI. |
| DuckLake Lab 0.12 / SparkLab | Safe AST compiler, bounded semantic fixtures, virtual resource/cost model | Prior standalone UI/API not embedded. Only one physical-model truth pack is connected in root. Original name did not itself guarantee a general DuckLake-backed catalog. |
| Fabric/Azure Lab V21 | Freshness-aware dependency principle; case and panel references | Full notebook/pipeline/product editors and independent JS runtime are NOT all migrated. |
| Airflow/dbt Studio V7 | Requirements, lessons and module source retained; root adds literal ref/source SQL + dependency execution | Advanced DAG/compiler/retry/sensor/snapshot features stay in source pending bounded migration. |
| Power BI Studio V15 | Shared Gold KPI path establishes integration seam | Original DAX/model/report/refresh tooling is retained, not integrated by renaming a SQL preview. |
| Microsoft Data Guide V4.4 | Concepts, reference organization and teaching content available | Content module, not runtime foundation. Existing freshness claims require re-verification per lesson. |
| Project Command Center V5 | Fluent shell/evidence organization reference | This ZIP is a project portfolio/control center, not the actual coding-animation engine. |
| fluentui-master | Public package approach, architecture and license reference | Do not vendor or rebuild the entire monorepo. Use published v9 components. |
| fluentui-charting-contrib-main | License/source availability reviewed | Optional charting reference. Huge source archive excluded from root; charting is not required for the runtime. |

## Why a new integration root rather than a giant merge

The originals contain different dependency versions and independent data/state models. Their App roots are not safely composable without boundaries. Mosaic already uses Fluent UI: it needs adapter extraction and integration, not a rewrite because Fluent was absent. Keeping Mosaic generic is more valuable than moving Fabric-specific code into it.

The Fabric lab provides useful lineage/freshness ideas. SparkLab already separates result semantics, physical simulation and cost. Those boundaries are kept. Command Center and Data Guide are supporting modules, not competing owners of execution or layout.

## Copied and changed code

The five core Mosaic files were extracted under `packages/notebook-core/src`. New root wrappers live in `apps/web/src/notebook.ts` and `NotebookCanvas.tsx`. The reused Spark parser receives deliberate semantic/diagnostic corrections in the runtime copy: Python `and`/`or` on Spark Columns is rejected; use parenthesized `&`/`|` operations. SQL-string filters and expanded keyword arguments are explicitly rejected rather than raising obscure errors or being ignored. Original source remains intact in `migration-sources/sparklab` for comparison.

Root execution no longer returns standalone simulator fixtures as if they were the active workspace. Supported Spark SQL reads the shared catalog. Virtual metrics are conditional on immutable fixture matching. Original model confidence percentages are not treated as calibration evidence.

## Source retention and licenses

`migration-sources/` contains original code/docs/configs, not generated dist files, dependency trees, images or fonts. Original upstream license notices are retained when present. `third-party/` contains Microsoft source-license references. The package does not grant a new license over user-provided source or third-party assets. There are no font binaries in the deliverable.

Original release-note claims are historical inputs. They are not a replacement for the new root's own `docs/VERIFICATION.md` evidence.

## Core Integration Pass 1 — September 18, 2026

Retained all migration sources unchanged. The existing Mosaic extraction now compiles against the real readonly grid-layout types. Root adapters preserve workflow-to-cell output attachment after ipynb import and root-owned panel registration supplies workspace/runtime services. Responsive stacking changes presentation only. Catalog/document metadata replacement tolerates bounded Windows sharing locks; DuckLake has access only to its workspace data directory. Actual React, DuckDB, Polars, DuckLake and Windows startup evidence replaces the earlier unavailable-package gates in docs/VERIFICATION.md.

No independent application, notebook format, catalog, database abstraction, provider or runtime was added. Root version remains 0.1.0. Full original Power BI, Airflow/dbt, ADF/Fabric, ML and guide functionality remains unmigrated as listed above.


## Notebook + Interview Practice Pass 1

Reused Mosaic view creation, scoped removal/grouping and layout reset helpers. Extended the shared notebook wrapper, existing Monaco adapter, RuntimeClient, worker and Documents store. Applied CodeDELeet audit concepts (canonical versus related placement; resume versus recommendation; scoped practice state; durable draft versus cache; safe candidate import) without importing its shell, browser store, editor stack or runtime. The two SQL exercises are internal demos; no CodeDELeet corpus is claimed as migrated. See NOTEBOOK_INTERVIEW_PASS_1_HANDOFF.md for implementation and deferred QA.
