# Architecture decision record: one workbench, many tool experiences

Status: implemented foundation, September 17, 2026.

## Composition

```text
Case study: task + concept + input/output assets + acceptance + selected modules
                              |
                  React + Fluent UI 2 root
       workspace / explorer / ribbon / module registry / run history
                              |
               Mosaic-derived generic notebook core
       block identity + source + notebook order + independent layouts
                              |
                  RuntimeClient / HTTP contract
                              |
                    FastAPI control plane
          documents + revisions + authentication + dispatch
                              |
              one persistent worker per active workspace
          SQL | SparkLab AST | trusted Python | Polars | dbt teaching SQL
                              |
                     one workspace catalog
       source / bronze / silver / gold / warehouse / features / metrics
                              |
              canonical DuckLake table layer
     DuckDB compute + SQLite metadata + Parquet data
                  data inlining disabled
                              |
       plain DuckDB local compatibility mode when needed
       SQLite explicitly labeled dependency fallback
```

MotherDuck is a future optional remote DuckDB/DuckLake target, not a required foundation. Polars and trusted Python are real optional execution paths, not second lakehouses. The local canonical DuckLake path uses the official DuckDB extension; notebook SQL cannot install/load extensions or attach arbitrary files.

## Separate the dimensions

**Product persona** controls labels, ribbon and relevant panels: Fabric-like notebook, Databricks-like notebook, ADF-like pipeline, dbt model, Airflow task, BI report. **Layout** controls where the same content blocks appear: notebook, double-page, split, 2+1, dashboard, canvas or focused practice. **Kernel** controls execution. **Case** controls learning requirements. These are separate choices, not four names for the same component.

A Fabric-inspired skin can therefore use a two-page Mosaic layout and a SparkLab kernel without making Mosaic depend on Fabric. A SQL-only warehouse case can use the same notebook with no Spark or orchestration at all.

### Presentation presets are product chrome, not new runtimes

The web root now has a small presentation-preset registry above the notebook-view layer:

- **Studio** keeps the full Datapass project explorer and arbitrary notebook views.
- **Fabric notebook** adds notebook/files navigation to the left explorer while keeping the same block IDs, source, run order, catalog and React Grid canvas.
- **Interview coding** defaults exercise documents to the existing Interview geometry (problem/browser, editor, result and guidance) and collapses the general workspace explorer until requested.

This is the intended product boundary:

```text
presentation preset   -> outer chrome / visible navigation
notebook view         -> block geometry
block                 -> source + semantic identity
kernel                -> execution
workspace catalog     -> data truth
```

Changing a presentation preset must therefore never copy code, create a second notebook, or change semantic execution order. More product-specific shells can be added as presets over the same document model instead of forking the editor.

## Shared data, not duplicated fixtures

Each workspace owns a catalog. The reference source fixtures are seeded once, and transformations publish physical tables into that catalog. Steps read the real outputs of prior steps. Modules must not manufacture successful result tables locally.

Publishing a new version records input versions. Freshness is transitive: replacing Bronze invalidates Silver and Gold even when their stored rows still exist. Stored output snapshots remain evidence, not proof of current correctness. Checks query physical rows; the retail copy/filter checks compare full expected rows, not merely counts. A preview-only KPI step additionally compares this execution's result, so old valid Gold data cannot disguise wrong KPI code.

The API enforces the registered output asset for graded steps. An ungraded cell remains available for free experimentation. This is learning feedback, not a secure proctored examination system.

## Notebook persistence and execution

Mosaic block IDs and semantic cell order are independent of grid geometry. Run Notebook uses the notebook view's semantic order, not visual x/y positions. Run Workflow follows case dependencies. These are intentionally different actions.

Root JSON stores notebook source, layouts, attached outputs and metadata. The backend document store uses optimistic revisions and atomic file replacement, returning a conflict instead of silently overwriting newer edits. Notebook export preserves Jupyter metadata, output bundles and attachments. Imports never execute automatically; raw HTML output is not injected into the page. Unsupported magics are preserved as read-only code.

For saved/reopened notebooks, server execution evidence can be reattached, but outputs without a current source checkpoint remain visibly historical until rerun. Notebook variables and persisted tables have different lifetimes.

## Runtime ownership and limits

The API never executes submitted Python itself. A local worker owns the database connection and serializes operations; Python and Spark symbol dictionaries are scoped by notebook. Six active workers is the default cap. Idle workers may be evicted; tables persist, variables do not. An in-use or reserved worker is not evicted.

A timed-out worker is terminated. The next request can start a fresh worker; persisted tables remain. This is lifecycle isolation and bounded concurrency, not hardened OS isolation. Python is off by default and must be explicitly enabled for trusted code.

Use a single Uvicorn API worker. This root is not a multi-user service. No Kubernetes, Redis, Celery, real Spark cluster or remote database is required for these local teaching cases.

## Why not combine every existing runtime?

The uploads contain React 18/19 mixtures, incompatible package assumptions, browser-local runtimes, fixture-specific simulators and overlapping source stores. Combining these unchanged would give the illusion of one application while retaining multiple inconsistent truths. The root therefore reuses stable mechanisms and contracts, retains larger modules for migration, and starts with a small vertically connected path.

## Warehousing versus orchestration

A source database or warehouse owns tables and stored procedures. ADF/Fabric Data Factory invokes activities and coordinates execution. Airflow coordinates tasks. dbt describes model dependencies and transformations. The root keeps those responsibilities separate. A future stored-procedure lesson should run a registered, parameterized database operation through an activity adapter, not teach that Data Factory itself is a SQL warehouse.

## Fidelity limits

DuckLake is not Delta Lake. Fabric Lakehouse uses Delta Lake as its default table format. Datapass uses DuckLake as its own canonical local teaching table layer because it exposes snapshots, schemas and Parquet-backed lakehouse behavior without pretending to reproduce Fabric's storage implementation. DuckDB SQL is not T-SQL. SparkLab is not complete PySpark. SQL-backed KPI cards are not a DAX engine.

See `SOURCES.md` for the official references supporting these distinctions.
