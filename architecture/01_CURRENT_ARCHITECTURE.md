# Current architecture

## Product shell

Datapass Studio is a single React 19 + Fluent UI 2 application.

Core frontend pieces:

- `apps/web/src/App.tsx` — product shell and surface navigation.
- `apps/web/src/NotebookCanvas.tsx` — draggable/resizable notebook geometry using `react-grid-layout`.
- `apps/web/src/notebook.ts` — canonical notebook/block source model and views.
- `apps/web/src/playgrounds.ts` — V1 playground presets and starter notebooks.
- `apps/web/src/workspacePresentation.ts` — Studio / Fabric / LeetCode product chrome.
- `apps/web/src/foundation/WorkbenchSurface.tsx` — outer multi-pane resource workbench.
- `packages/notebook-core` — domain-neutral notebook/view model.
- `packages/contracts` — shared API/runtime contracts.

The same notebook can be rendered in different layouts without duplicating source.

## V1 playgrounds

### DuckLake / DuckDB lab

Truth:

- DuckDB SQL is real local execution.
- DuckLake mode is real DuckDB compute + DuckLake metadata + Parquet data.
- Local catalog/table exploration is shared by the playgrounds.
- DuckDB compatibility mode remains valid when DuckLake is not enabled.

### Fabric-style notebook

Truth:

- UI is Fabric-inspired, not Microsoft Fabric itself.
- Python is real trusted-local CPython only when explicitly enabled.
- SparkLab is a bounded PySpark-compatible semantic subset.
- SparkLab distributed stages/tasks/shuffle/cost are modeled/simulated, not evidence from a real Spark cluster.
- SQL, Python and SparkLab use the same Datapass workspace/catalog.

### Free coding canvas

The free view contains SQL, Python, Polars, SparkLab and Markdown blocks.

Users may drag and resize blocks. Geometry is presentation state only. Canonical source and notebook execution order remain separate.

### LeetCode arena

Exercise workspaces have a focused layout:

```text
problems | problem + guidance | editor + results
```

SQL, Python and Polars exercise packs use the same workspace model and persistence path as notebooks.

### MotherDuck-ready SQL

V1 is deliberately local-first.

A MotherDuck indicator may appear in the UI, but there is currently no completed remote MotherDuck execution adapter. Datapass must never imply that local data was uploaded or that MotherDuck executed a query unless the runtime contract explicitly reports that connection.

## Backend

Current backend is FastAPI under `apps/api/datapass`.

Local development/usage:

```text
browser
   ↓
React / Vite or built assets
   ↓
FastAPI
   ↓
workspace document + catalog
   ↓
DuckDB / DuckLake
   ├── SQL
   ├── trusted Python
   ├── Polars
   └── SparkLab semantic runtime
```

`start.py` is the current supported local launcher.

## Storage truth

For V1, the preferred order is:

```text
DuckLake local  -> canonical local lakehouse profile
DuckDB local    -> lighter real SQL compatibility profile
MotherDuck      -> optional later cloud analytics adapter
```

Do not introduce a database merely because it has a free tier. New storage must solve a concrete product need.

Neon may later hold account/progress/application metadata if Datapass becomes multi-device or multi-user. It is not required for the first local V1 and should not become the canonical notebook/lakehouse data path by accident.

## Runtime truth labels

Keep the UI explicit:

| Runtime | V1 truth |
|---|---|
| DuckDB | real local |
| DuckLake | real local metadata/data profile |
| Python | real local, trusted opt-in |
| Polars | real local when package is installed |
| SparkLab | semantic/emulated Spark subset + simulated distributed metrics |
| MotherDuck | optional adapter, currently unavailable unless explicitly connected |
| real Apache Spark | future Oracle runtime |
| Airflow | future persistent Oracle orchestration; existing GitHub runner is frozen lab/reference work |

## Deployment split

The target split is:

```text
                 DATAPASS
                    │
          Cloudflare frontend
                    │
             lightweight edge
                    │
       HTTPS API origin (later)
                    │
                Oracle A1
           2 OCPU / 12 GB
                    │
      FastAPI + Airflow + Spark
             + Polars/dbt
```

Until Oracle/another HTTPS API origin exists, the complete execution experience remains local through `start.py`.
