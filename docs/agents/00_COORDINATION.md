# Specialist coordination

## One authoritative root

Root 0.1.0 is the new integration baseline. Do not keep releasing unrelated top-level app ZIPs. Retained sources are input material for bounded modules. Shared files have one integrator owner; specialists propose shared changes rather than independently editing them.

## Order of work

Core Integration Pass 1 closed the actual React/DuckDB build gates with the evidence in `docs/VERIFICATION.md`. Rerun those gates after future shared-core changes through the dedicated external QA/test pass in `09_RELEASE_QA.md`.

The next implementation emphasis is the generic notebook/workbench and Spark kernel using `02_NOTEBOOK_MOSAIC.md` and `03_SPARKLAB_KERNEL.md`, while preserving the explicit Interview / LeetCode compatibility contract in `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md`. Once shared interfaces are stable, pipeline, Airflow/dbt, BI and ML specialists can work concurrently in their own module folders. Curriculum work can proceed against the frozen case schema.

Do not give every specialist permission to replace packages/contracts, the API, the root package.json or Mosaic. The integrator merges only bounded changes with evidence. Each contribution must name the root version/contract version it targets.

## Codex coding-session budget

Specialist coding agents are **implementation-first**. Spend the session writing and integrating as much useful bounded code as possible.

- Broad regression, browser, integration and release suites are normally deferred to the dedicated external QA/test pass.
- During coding, run only the smallest check required to unblock or safely continue implementation: a targeted unit test, narrow compiler/typecheck, focused build, or tiny smoke check.
- Batch changes before checking them; do not rerun broad suites after every edit.
- Never report a deferred check as passing. Write `DEFERRED TO EXTERNAL QA` and list the exact command/area the QA agent must verify.
- The dedicated release-QA agent remains responsible for exhaustive evidence after the coding pass.

Do not automatically switch to or delegate work to a **Medium agent** (or equivalent higher-cost secondary agent). Escalation is exceptional: only when the current agent is genuinely blocked and useful implementation cannot continue. Ask the user for explicit confirmation before escalating and state the blocker briefly. If useful coding can continue, continue coding.

## Completion report required from every specialist

State the exact feature implemented, files changed, essential checks actually run and their raw output, checks deferred to external QA, real/simulated/unsupported behavior, what original features remain unmigrated, and any required shared-contract changes. A screenshot is evidence only for the actual runtime/client shown. No silent replacement with a static mockup.

## Prompt index

- `01_ROOT_INTEGRATION.md`: Root integrator - shared-core maintenance/integration.
- `02_NOTEBOOK_MOSAIC.md`: Notebook specialist - preserve and deepen the generic engine.
- `03_SPARKLAB_KERNEL.md`: SparkLab specialist - semantic truth before visual realism.
- `04_PIPELINES_WAREHOUSE.md`: ADF/Fabric pipeline and warehouse specialist.
- `05_AIRFLOW_DBT.md`: Airflow/dbt specialist - three independent learning paths.
- `06_POWER_BI.md`: Power BI specialist - bind the semantic model to root assets.
- `07_DATABRICKS_ML_POLARS.md`: Databricks-style ML and Polars specialist.
- `08_GUIDE_CURRICULUM.md`: Curriculum/data-guide specialist.
- `09_RELEASE_QA.md`: Independent external release and integration test agent.
