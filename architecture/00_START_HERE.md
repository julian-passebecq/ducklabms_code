# Datapass Studio V1 architecture — start here

Status: **edited V1 candidate; native release qualification blocked, 2026-09-21**

The implementation pass is already applied. Read `../docs/v1/RELEASE_STATUS.md` and `03_STATUS_AND_ROADMAP.md` before using the historical baseline references below. Do not reapply M2.

## Repository continuation point

- Repository: `julian-passebecq/ducklabms_code`
- Active branch: `codex/real-spark-proxy-1`
- Open PR: `#5`
- Exact audited branch head: `abb0345a78836508f6024d79710a46973cbed9d6`
- Prior functional baseline: `5ace7654baad1bc2d2dd1254efa5abd2a55cbb3e`

The base was materialized at the exact audited head. Continue from this edited candidate; never silently substitute a newer branch tip. **Do not restart from `main`.**

The current branch CI run for `abb0345a...` completed successfully. This does not qualify the separate Analytics M2 overlay.

## Product thesis

Datapass is a **local-first data-engineering learning IDE/workbench**.

The core product is the flexible workbench: one workspace can compose notebooks, data, dbt resources, DAGs, lineage, data models, charts, exercises, visual explanations and run evidence in panes/tabs without duplicating their canonical source.

Datapass is not a generic developer IDE and is not a DevOps curriculum product.

## Frozen V1 stack

- React 19 + Fluent UI 2
- Monaco
- flexible pane/tab/workbench shell
- FastAPI local control plane
- DuckDB
- DuckLake
- trusted local CPython / pandas
- Polars
- dbt Core + dbt-duckdb (local bridge implemented; native execution not yet qualified)
- Datapass Local Orchestrator (implemented manual local execution; not an Airflow scheduler)
- Arena
- guided SparkLab / `fastapispark`
- ConceptMotion visual explanations where useful
- `.ipynb` import/export

MotherDuck remains optional/later and disconnected by default.

## V1 surfaces

1. Flexible Workbench
2. Notebook
3. DuckDB / DuckLake
4. dbt Lab
5. Data Model / SCD
6. Charts
7. Pipeline Lab
8. Arena
9. SparkLab
10. Visual explanations

## Explicitly not V1

- Iceberg
- Oracle dependency
- real Apache Airflow scheduler/runtime
- real distributed Spark cluster
- Kubernetes
- Prefect / Meltano
- Docker requirement
- Git/Linux/terminal/IaC curriculum
- generic DevOps workbench
- dbt Cloud requirement
- hosted multi-user execution

## Read next

1. `01_CURRENT_ARCHITECTURE.md`
2. `02_DECISIONS.md`
3. `03_STATUS_AND_ROADMAP.md`
4. `04_CLOUDFLARE_TARGET.md`
5. `05_NEXT_AI_HANDOFF.md`
6. `06_RESOURCE_MODEL.md`
7. `07_THEME_AND_SKINS.md`
8. `08_NOTEBOOK_INTEROP.md`
9. `09_CONCEPTMOTION_SEAM.md`
10. `10_SCOPE_SPLIT.md`

## Non-negotiable architecture rule

Presentation is not execution and a view is not a copy.

```text
experience skin / theme
        ↓
workspace pane + tab
        ↓
resource view / notebook geometry
        ↓
canonical resource + source
        ↓
runtime adapter
        ↓
shared workspace/catalog/evidence
```

Changing Studio/Fabric/Databricks/Arena chrome, splitting panes, moving tabs, or changing notebook geometry must never silently clone source or change runtime truth.
