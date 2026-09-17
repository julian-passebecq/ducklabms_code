# Datapass Studio — Codex entrypoint

This repository is the **living implementation repository** for Datapass Studio Root 0.1.0.

Full repository URL: https://github.com/julian-passebecq/ducklabms_code

Historical/archive repository URL: https://github.com/julian-passebecq/ducklake_mslab

The archive repository is reference material only. Large source archives previously exceeded GitHub's normal 100 MB single-file limit, so the essential architecture, contracts, verification record, source audit and specialist instructions are also preserved directly in this code repository under `architecture-reference/`.

## Read first

1. `architecture-reference/README.md`
2. `START_HERE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/MODULE_CONTRACT.md`
5. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`
6. `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md`
7. `docs/VERIFICATION.md`
8. `docs/agents/00_COORDINATION.md`

Direct links:

- Architecture reference index: https://github.com/julian-passebecq/ducklabms_code/tree/main/architecture-reference
- Interview / LeetCode compatibility requirements: https://github.com/julian-passebecq/ducklabms_code/blob/main/architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md
- Start here: https://github.com/julian-passebecq/ducklabms_code/blob/main/START_HERE.md
- Architecture: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/ARCHITECTURE.md
- Module contract: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/MODULE_CONTRACT.md
- Notebook/runtime contract: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/NOTEBOOK_RUNTIME_CONTRACT.md
- Verification: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/VERIFICATION.md
- Agent coordination: https://github.com/julian-passebecq/ducklabms_code/blob/main/docs/agents/00_COORDINATION.md

## Codex execution-budget policy — code first

The user wants Codex sessions to spend their token/compute budget primarily on **implementation**, not repeated test execution.

For every Codex coding pass:

- Write and improve as much bounded production code as is safely possible before spending time on broad verification.
- Do **not** run the entire Python, TypeScript, browser, integration or release-QA suites merely because they exist.
- Full regression, browser, release-gate and exhaustive test execution will normally be run **outside the coding Codex session** by a separate QA/test pass or external environment.
- Inside Codex, run only the **minimum essential checks needed to continue coding safely**: for example a targeted unit test for the code just changed, a compiler/typecheck needed to locate a blocking error, a narrow build check after a structural change, or a tiny smoke test when the next implementation step otherwise cannot be trusted.
- Do not repeatedly rerun the same test/build after each small edit. Batch implementation, then perform one narrow confirmation only when needed.
- If a test failure is already well understood and the fix is straightforward, implement the fix and continue rather than spending the session exhaustively proving unrelated areas.
- Record the exact full test/build commands that external QA should run later, plus any areas that especially need verification.
- Never claim an unrun test passed. Mark deferred checks explicitly as `DEFERRED TO EXTERNAL QA`.
- The goal is **maximum useful implementation per Codex session while preserving enough local feedback to avoid coding blindly**.

### Agent escalation rule

Do **not** automatically switch to, invoke, or delegate to a Medium agent (or equivalent higher-cost secondary reasoning agent).

Using a Medium agent should be **exceptional** and only considered when the current coding agent is genuinely blocked on a problem that prevents meaningful implementation from continuing. Before using one, stop and ask the user for explicit confirmation. State the blocker briefly and why escalation is necessary. If useful implementation can continue without escalation, continue coding instead.

## Established architecture — do not redesign from scratch

The preserved architect direction is one application and one shared project model:

- one React application using Fluent UI 2 / Fluent UI React v9 patterns;
- one FastAPI control plane;
- one shared workspace catalog and persistence model;
- one generic Mosaic/Jupyter/Deepnote-inspired notebook and layout system;
- shared execution services and run history;
- reusable SparkLab simulated-Spark kernel;
- DuckDB as the normal local analytical execution/storage choice;
- DuckLake as an explicit optional storage path;
- Polars where useful;
- MotherDuck optional/future, not a requirement for local learning;
- Fabric/Data Factory, SQL warehousing, Airflow/dbt, Power BI and Databricks-inspired ML are modules/tool experiences of the same application, not independent applications with duplicate state.

Keep **case**, **tool experience**, **document**, **layout** and **runtime** separate. A Fabric-inspired notebook is a skin/tool experience over the shared notebook model, not a second notebook engine.

Do not create another application shell, notebook format, catalog, database, execution history or private dataset store for a specialist module.

Real local execution results must remain explicitly separate from simulated cluster/cloud metrics, timing and cost.

## Interview / LeetCode compatibility requirement

The shared core must remain compatible with a future **Interview Practice** module rather than creating another LeetCode application. Read `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md` before changing notebook, validation, runtime or persistence contracts.

Preserve the ability to support standalone exercises, starter code, **Run vs Submit**, visible/hidden result-based tests, exercise-attempt history distinct from notebook revisions and run history, reset/reveal operations, problem metadata and a named interview/practice layout. Do not implement the full Interview module during Core Integration Pass 1 unless explicitly assigned; preserve compatibility now and implement it later as a bounded module.

## Existing advanced work is retained

Use these as migration sources, not as competing roots:

- `migration-sources/mosaic` — notebook/layout foundation.
- `migration-sources/sparklab` — SparkLab runtime/simulation/truth packs.
- `migration-sources/fabric` — Fabric/Data Factory inspired surfaces and lessons.
- `migration-sources/powerbi` — Power BI learning surfaces and model/report work.
- `migration-sources/airflow-dbt` — Airflow/dbt learning work.
- `migration-sources/guide` — Microsoft data guide/curriculum material.
- `migration-sources/command-center` — supporting shell/reference material.

## Immediate order of work

Follow the existing specialist coordination instead of inventing a new sequence. The current root explicitly says to close the real React/DuckDB release gates first, then deepen notebook/Mosaic and SparkLab, then allow bounded specialist modules to advance against stable shared interfaces.

Closing a release gate does not require the coding Codex session itself to run the exhaustive suite. Codex should implement the required fixes and perform only essential unblocker checks; the dedicated external QA/test pass records the broad evidence.

Do not call an architecture document a new code release. Root 0.1.0 is the implementation baseline; the later Core Architecture Contract v1 is an architecture contract, not automatically v0.2.
