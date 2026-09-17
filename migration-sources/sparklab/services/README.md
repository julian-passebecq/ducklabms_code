> V0.6 note: backend/runtime behavior is unchanged from the tested V0.5 foundation; V0.6 focuses on the notebook workbench UI.

# Services — V0.5

- `api/` — FastAPI control plane for safe compile/simulate calls.
- `sparklab/` — PySpark compatibility layer, safe AST parser, truth packs, virtual cluster, cost model and tests.
- `ducklake/` — DuckLake bootstrap and incident SQL.
- `airflow/` — orchestration scaffold.
- `dbt/` — transformation/test scaffold.
- `evidence/` — thin consumer/KPI scaffold.
- `motherduck/` — MotherDuck integration notes.

The runtime intentionally does **not** require Kubernetes. Docker is optional packaging only.
