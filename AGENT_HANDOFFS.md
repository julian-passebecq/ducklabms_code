# Specialist coordination

## One authoritative root

Root 0.1.0 is the new integration baseline. Do not keep releasing unrelated top-level app ZIPs. Retained sources are input material for bounded modules. Shared files have one integrator owner; specialists propose shared changes rather than independently editing them.

## Order of work

First run `01_ROOT_INTEGRATION.md` and `09_RELEASE_QA.md`: actual React/DuckDB build gates are still open. Then deepen the generic notebook and Spark kernel using `02_NOTEBOOK_MOSAIC.md` and `03_SPARKLAB_KERNEL.md`. Once shared interfaces are stable, pipeline, Airflow/dbt, BI and ML specialists can work concurrently in their own module folders. Curriculum work can proceed against the frozen case schema.

Do not give every specialist permission to replace packages/contracts, the API, the root package.json or Mosaic. The integrator merges only bounded changes with evidence. Each contribution must name the root version/contract version it targets.

## Completion report required from every specialist

State the exact feature implemented, files changed, tests run and raw output, real/simulated/unsupported behavior, what original features remain unmigrated, and any required shared-contract changes. A screenshot is evidence only for the actual runtime/client shown. No silent replacement with a static mockup.

## Prompt index

- `01_ROOT_INTEGRATION.md`: Root integrator - first mandatory pass.
- `02_NOTEBOOK_MOSAIC.md`: Notebook specialist - preserve the generic engine.
- `03_SPARKLAB_KERNEL.md`: SparkLab specialist - semantic truth before visual realism.
- `04_PIPELINES_WAREHOUSE.md`: ADF/Fabric pipeline and warehouse specialist.
- `05_AIRFLOW_DBT.md`: Airflow/dbt specialist - three independent learning paths.
- `06_POWER_BI.md`: Power BI specialist - bind the semantic model to root assets.
- `07_DATABRICKS_ML_POLARS.md`: Databricks-style ML and Polars specialist.
- `08_GUIDE_CURRICULUM.md`: Curriculum/data-guide specialist.
- `09_RELEASE_QA.md`: Independent release and integration test agent.


---

# Root integrator - first mandatory pass

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own shared contracts, apps/web shell, dependency manifests and API integration. First install the actual dependencies, resolve strict TypeScript errors, generate a lockfile, run the Vite build and test the real React app with DuckDB. Do not count the offline diagnostic client as React evidence. Resolve actual package versions from official packages, not guesses.

Verify case creation, all notebook layouts, actual Monaco workers, kernel selection, run-one/run-notebook/run-workflow, save/reopen, output freshness, exports/imports, dirty-state switching and error recovery. Test narrow screens and keyboard navigation. Repair any issues with minimal changes, preserving the 16 notebook-contract tests and Python suite.

Then formalize ToolContext services and per-module panel registration without hot-loading untrusted code. Do not implement full Power BI, Airflow or ADF here. Release only with actual build/test logs and an updated gate table. Coordinate shared-contract changes; specialists may not independently rewrite this layer.

---

# Notebook specialist - preserve the generic engine

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own packages/notebook-core and focused notebook components only, after coordinating shared changes with the root integrator. Use migration-sources/mosaic as the source baseline. Do not put Fabric, dbt or Power BI logic in the notebook core.

Improve practical layout freedom: resizable editor/explanation/output regions, two-page reading, 2+1 interview layout, accessible drag/reorder controls and per-view reset. Semantic execution order must stay independent of geometry. Preserve custom practice layouts through root save/reopen. Add deletion with explicit scope (view-only versus entire block), undo and safe import/export error handling.

Fix source-checkpoint hydration so a saved result is clearly current, stale or historical based on server evidence and asset versions. Do not trust imported output as a passed check. Keep raw HTML inert. Test rich ipynb metadata, attachments, unsupported magics, code/output grouping and cross-view edits. Render the same notebook in Fabric-like and neutral skins without duplicating source.

---

# SparkLab specialist - semantic truth before visual realism

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own services/sparklab and bounded adapter changes coordinated with apps/api/datapass/execution.py. Use migration-sources/sparklab for existing truth packs and tests. Keep parser, semantic execution, physical simulation and cost as distinct layers.

First document the exact supported PySpark syntax and errors. Add real-PySpark oracle comparison fixtures for nulls, joins, duplicate column names, integer/decimal aggregates, ordering, groupBy, window functions and lazy transformations versus actions. Do not implement unsupported syntax by returning expected answers. Preserve per-notebook symbols and reject Python and/or on Columns.

Connect one additional truth pack end to end: actual shared catalog input, immutable fixture validation, real result acceptance, independently labeled virtual stages and deterministic cost model. Changing a virtual profile must never change result rows. No real-vendor price claims without dated supplied inputs. Add incorrect-but-plausible code, skew and broadcast counterexamples. Record which metrics are assumptions and which have real benchmark calibration.

---

# ADF/Fabric pipeline and warehouse specialist

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own a new tool module for pipeline authoring and a separate database/warehouse teaching surface. Read migration-sources/fabric for the existing PipelineStudio/Canvas, notebook and warehouse lessons. Preserve root data ownership and execution history.

Implement one focused case: registered source-database stored procedure with typed parameters -> Copy activity -> Bronze -> notebook transformation -> Gold. A database owns stored procedures; ADF/Fabric Data Factory invokes them. A named, allowlisted local procedure adapter is acceptable when clearly labeled, but arbitrary T-SQL must not be presented as executed SQL Server code.

Migrate a Fluent activity palette, dependency canvas, activity inspector, parameters and run/output panel. Every node maps to a root task with declared inputs/outputs; manual notebook runs and pipeline runs must see the same assets. Test retries/idempotency, partial failures, dependency cycles, parameter validation and downstream staleness. Keep Azure Data Factory and Fabric Data Factory labels distinct where behavior differs. Do not recreate notebook or storage internals.

---

# Airflow/dbt specialist - three independent learning paths

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own new Airflow and dbt domain modules. Use migration-sources/airflow-dbt and its existing DAG/compiler/snapshot/explanation code. Do not merge its old App root or private datasets into the new root.

Deliver three cases: Airflow-only orchestration, dbt-only transformation, and Airflow triggering a dbt project. Each reads/publishes root assets. Start with a working graph and editable task/model source, compiled SQL, logs and artifact lineage. Make scheduler semantics explicit: logical dates, dependencies, retries and trigger rules are not just animated boxes.

Extend literal ref/source support through a declared safe subset, with meaningful diagnostics for unsupported Jinja. Migrate tests and incremental/snapshot semantics only when actually executed and tested; do not call the teaching compiler dbt Core. For DAG parsing, do not exec arbitrary Python in the API process. Reuse the root notebook editor and kernel controls. Add failure/retry/idempotency and stale-artifact tests. Keep shared contract changes as proposals to the integrator.

---

# Power BI specialist - bind the semantic model to root assets

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own the Power BI learning module. Use migration-sources/powerbi for existing model, DAX, report, refresh and lesson features. Root Gold/warehouse tables are the only authoritative data sources.

Deliver one complete star-schema KPI case: fact/dimension selection, relationships, model view, a small explicit DAX subset, report visuals and refresh/freshness evidence. The existing root SQL KPI is an integration seam, not a DAX engine. Do not present every DAX expression as supported. Test filter context, row context, CALCULATE transitions, relationship direction, ambiguous paths and BLANK behavior for whatever subset is claimed.

Use Fluent panels/ribbons and the common notebook for explanations/code, but keep the semantic model distinct from SQL transforms. Model/report refresh must consume asset versions and visibly invalidate stale reports. No hardcoded successful KPI cards. Do not replace the notebook core with a bespoke BI lesson layout engine. Preserve unsupported/teaching/real distinctions in every panel.

---

# Databricks-style ML and Polars specialist

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own ML and dataframe teaching modules, not another runtime service. Use the root trusted Python/Polars kernels and data publication API. Coordinate any kernel changes centrally.

Extend turbine-ml into a useful synthetic but noisy regression case: timestamped observations, chronological split, train-only preprocessing, baseline comparison, holdout metrics and a recorded model artifact. Add a Polars-only quality case that does not require Spark. Use real installed local libraries; do not call a Python result MLlib or MLflow unless those APIs actually run.

Build a Databricks-inspired experiment/results pane using shared notebook blocks. Record dataset versions, parameters, measured local runtime and model metrics. Virtual cluster/cost context stays separate. Test leakage, missing values, rejected schemas, reproducibility, fresh/reopened results and timeouts. Keep arbitrary Python behind explicit trusted-local opt-in. No new cloud account or paid resource dependency.

---

# Curriculum/data-guide specialist

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own content/cases and optional explanatory panels. Use migration-sources/guide for taxonomy and official references. Command Center is a portfolio shell, not the missing coding-animation engine; do not claim its animations were integrated.

Create concise case tasks: concept -> objective -> input -> editable code -> expected artifact -> result-based check -> hint -> revealable explanation. Include SQL-only, dbt-only, Airflow-only, Fabric-style Spark, Power BI model/DAX and Databricks-style ML paths. Coverage means each tool appears somewhere, not everywhere.

Strengthen grading with row/schema comparisons, negative examples and small holdout fixtures. Never grade by keyword presence alone. Keep truthful explanations of what runs locally, what is simulated and what remains unsupported. Verify current Microsoft terminology against primary sources with dates. Add optional motion only through the shared block renderer with reduced-motion support; it must not own data or execution state.

---

# Independent release and integration test agent

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Do not add product features. Verify the integrator's root with real npm/Python dependencies. Run Python tests, TypeScript contract tests, strict typecheck, Vite build and real browser journeys. Optional DuckDB/Polars tests must execute rather than be counted as skipped passes. DuckLake must demonstrate actual attach/write/reopen and data files before being called verified.

Exercise two simultaneous requests, timeout/restart, incompatible schema, wrong code, stale upstream data, corrupted import, duplicate block IDs, optimistic save conflicts and cross-workspace isolation. Verify that a workflow and a manual notebook use the same catalog. Confirm each output remains attached to its cell and profile changes do not alter results.

Check every screenshot against the actual client tested. The diagnostic client is not the React release. Record failures and blocked checks explicitly, with raw logs. Return a gate table and reproduction steps to the integrator; do not hide missing functionality behind a passing aggregate test count.