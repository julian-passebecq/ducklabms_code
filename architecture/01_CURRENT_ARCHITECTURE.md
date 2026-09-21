> Implementation update: cleanup + M2 and subsequent V1 code are already applied. This document retains design/component-delivery context. For current execution and qualification truth, read `docs/v1/RELEASE_STATUS.md` from the repository root.

# Current architecture and truthful status

This file distinguishes the **audited GitHub branch** from the separate Analytics M2 overlay. Do not merge their claims.

## A. Audited GitHub branch — `abb0345a...`

### Frontend foundation

The branch already has:

- React 19 + Fluent UI 2;
- Monaco-backed code editor;
- `react-grid-layout` notebook geometry;
- `@xyflow/react` graph canvas;
- one canonical notebook model with multiple views;
- a multi-pane workbench with tabs, 1–3 panes, horizontal/vertical direction, move-tab, focus-pane, pane weights and undo/redo;
- workspace resources for notebook references, catalog, evidence, workflow design, lineage design and data-model design;
- one live editor for a canonical notebook; secondary views are references/read-only until focus transfers.

### Jupyter interoperability

The current notebook core already supports real nbformat interchange:

- nbformat 4 import;
- Python and SQL executable imports where supported;
- markdown/raw cells;
- cell IDs, notebook/cell metadata and execution counts;
- saved output snapshots and attachments;
- unsupported code preserved read-only;
- nbformat 4.5 export;
- Datapass layout metadata namespaced under `metadata.mosaic`;
- generated Notebook, Two-page, Code+explanation, 2+1, Dashboard and Free canvas views.

### Local execution

```text
browser
  ↓
React / Fluent workbench
  ↓
FastAPI local control plane
  ↓
workspace documents + catalog + workers
  ↓
DuckDB / DuckLake
  ├── SQL
  ├── trusted CPython/pandas
  ├── Polars
  ├── current bounded dbt teaching adapter
  └── SparkLab semantic runtime + separate simulation
```

Current runtime truth:

| Runtime | Current branch truth |
|---|---|
| DuckDB | real local |
| DuckLake | real local profile: DuckDB compute + metadata + Parquet |
| Python/pandas | real trusted local CPython when opt-in is enabled |
| Polars | real local when installed |
| dbt | bounded teaching adapter; **not yet dbt Core** |
| SparkLab | real bounded semantic result + simulated distributed behavior |
| MotherDuck | optional adapter not connected |

### Frozen legacy paths still present

The branch still contains older remote experiment paths, including GitHub-Actions Airflow/Spark contracts and backend files. They are **legacy/reference, not V1 targets**.

Do not expand them. Do not delete them in an unrelated cleanup. Remove only after the Datapass Local Orchestrator / guided Spark replacement is integrated and tests prove no active dependency remains.

## B. Analytics M2 overlay — not yet native branch state

`Datapass_Analytics_M2.zip` adds a substantial UI/model overlay:

- dbt Studio source tree/editor;
- dbt artifact import and model lineage;
- data-model + SCD teaching surfaces;
- chart studio and dbt Charts YAML export;
- resource-like tabs, two panes, split/move/collapse/focus, palettes;
- guided Spark protocol preparation;
- safe local dbt helper scripts and a sample project.

Important limitation: M2 stores analytics state per notebook in:

`blockState['datapass:analytics:v1']`

That is a bounded interim integration. The final V1 should promote dbt/model/chart/pipeline resources to workspace ownership and migrate references rather than copy state between notebooks.

M2's recorded preview/model QA does **not** prove native branch assembly, full React/Vite semantic integration, native backend save/reopen, real dbt invocation, real dct invocation or connected fastapispark execution.

## C. Target V1 convergence

```text
Workspace
├── notebooks
├── catalog / data assets
├── dbt project(s)
├── lineage designs/imported evidence
├── data-model designs
├── chart boards
├── pipelines
├── exercises / attempts
├── figures / explanations
└── UI session / pane-tab layout
```

Views and tabs reference these resources. They do not own duplicate copies.
