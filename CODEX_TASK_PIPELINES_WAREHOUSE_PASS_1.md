# Codex task — Pipelines + Warehouse Pass 1

Repository: https://github.com/julian-passebecq/ducklabms_code
Working branch: `codex/pipelines-warehouse-pass-1`
Base: `codex/sparklab-runtime-pass-1`

This is a **coding pass**, not a QA pass.

## Read first

1. `AGENTS.md`
2. `docs/agents/04_PIPELINES_WAREHOUSE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/MODULE_CONTRACT.md`
5. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`
6. `docs/SOURCE_AUDIT.md`
7. inspect `migration-sources/fabric` for the strongest existing PipelineStudio/Canvas, activity palette, parameter, run/output, warehouse and notebook teaching material
8. inspect current shared catalog/document/runtime APIs before adding anything

Do not redesign the overall architecture. Preserve the one React shell, one FastAPI control plane, one workspace/catalog, one notebook engine and one execution history.

## Coding-budget rule

Maximize useful production code.

- Do **not** run full regression, Playwright, startup, DuckLake or release suites.
- Run only the smallest targeted checks needed to continue safely.
- Do not repeatedly rerun tests after small edits.
- Mark broad verification `DEFERRED TO EXTERNAL QA`.
- Do not use a Medium/higher-cost agent without explicit user confirmation.
- If one area becomes blocked, continue implementing another bounded area.

## Main objective

Implement a strong **Data Factory / pipeline + warehouse teaching module** inside Datapass Studio.

The core case must demonstrate:

```text
registered source database procedure
    ↓ typed parameters
Copy activity
    ↓
Bronze table
    ↓
shared notebook transformation
    ↓
Gold table
    ↓
warehouse query / KPI validation
```

The same physical assets must be visible from notebook, pipeline, catalog and warehouse surfaces.

## A. Shared pipeline domain contract

Add a versioned pipeline contract in shared contracts.

Support at least:

- pipeline id/version/name
- parameters with type/default/required metadata
- activities with stable IDs
- dependency edges and success/failure conditions
- declared inputs/outputs
- activity-specific configuration
- retry policy
- timeout
- idempotency key/strategy where relevant
- execution truth label
- run state
- activity run evidence

Keep generic enough for ADF-inspired/Fabric Data Factory-inspired presentation without claiming vendor API parity.

Do not create a second workspace/project store.

## B. Pipeline activity set

Implement a bounded activity set using the existing root execution/catalog.

Priority:

1. Stored Procedure activity
2. Copy activity
3. Notebook activity
4. SQL Script / Warehouse query activity
5. Validation / Check activity
6. Wait / simple control activity only if useful
7. Conditional activity only if it can be implemented clearly within the pass

Each activity must declare actual root task inputs/outputs.

Do not silently emulate unsupported cloud connectors.

## C. Registered stored procedure adapter

Implement an allowlisted local source-database procedure registry.

Requirements:

- database owns the procedure definition;
- pipeline invokes it;
- typed parameters;
- parameter validation;
- deterministic result schema;
- clear supported/unsupported documentation;
- no arbitrary T-SQL execution claim;
- use DuckDB/local adapters where needed while explicitly labeling this as a local teaching adapter.

Seed one or more useful procedures for the focused case, e.g. parameterized order/customer extract by date/region/status.

The procedure result should feed Copy activity, not bypass the pipeline.

## D. Copy activity

Implement a proper Copy activity adapter.

Capabilities:

- source from registered procedure/query result or catalog asset;
- sink into shared catalog layer;
- source/sink schema evidence;
- rows read/written;
- bytes estimate;
- mapping/column rename support where bounded;
- overwrite/append behavior where explicitly supported;
- idempotent rerun semantics;
- failure if required source is missing or schema contract fails;
- publish lineage/input versions into the shared catalog.

Do not create a private pipeline dataset store.

## E. Pipeline execution engine

Extend the shared execution path with pipeline-run semantics while preserving root ownership.

Support:

- dependency graph validation;
- cycle rejection;
- topological scheduling;
- pending/running/succeeded/failed/skipped states;
- activity retries;
- partial failures;
- downstream skip on failed dependency;
- retry only failed activity where safe;
- run IDs/activity-run IDs;
- parameter snapshot;
- source/config revision snapshot;
- bounded cancellation contract only if existing worker architecture supports it truthfully;
- deterministic rerun behavior.

Do not create Celery/Redis/Kubernetes.

Sequential execution is acceptable initially if clearly documented; the UI may show graph dependencies without pretending actual parallel scheduling.

## F. Pipeline authoring UI

Migrate the strongest bounded pieces from `migration-sources/fabric` into the existing Fluent UI shell.

Implement:

- activity palette;
- dependency canvas;
- draggable nodes where practical;
- node selection;
- activity inspector;
- parameters panel;
- validation panel;
- run/output panel;
- save/reopen pipeline definition;
- status badges on nodes after a run;
- clear input/output/lineage labels.

Use existing provider/theme/layout conventions.

Do not create another React app or provider.

## G. ADF-inspired vs Fabric Data Factory-inspired teaching skins

Keep behavior contract shared, but allow presentation/lesson copy to distinguish:

- Azure Data Factory-inspired pipeline
- Microsoft Fabric Data Factory-inspired pipeline

Only claim differences actually modeled.

Do not claim exact service UI parity.

Use Fluent UI 2.

## H. Warehouse teaching surface

Create a separate warehouse/database teaching surface in the same app.

Capabilities:

- shared catalog browser focused on `warehouse` / Gold assets;
- SQL query editor using existing SQL runtime;
- schema/table explorer;
- stored procedure registry/documentation;
- query result;
- basic lineage/freshness;
- explain that DuckDB SQL is not T-SQL;
- optional examples of common warehouse concepts such as dimensions/facts, star schema, stored procedure invocation, incremental loads, surrogate/business keys where useful.

Do not put pipeline logic inside the warehouse module.

## I. Focused end-to-end case

Create one strong case study that proves the architecture.

Suggested flow:

1. user supplies typed parameters such as start_date/end_date/region
2. Stored Procedure activity invokes registered source extract
3. Copy activity writes `bronze.orders_extract`
4. Notebook activity uses SQL or SparkLab to clean/deduplicate/enrich into `silver.orders`
5. another transformation publishes `gold.sales_daily` or equivalent
6. Warehouse query validates business result
7. case acceptance checks real rows and freshness

The same notebook cell should be runnable manually and from the pipeline against the same assets.

Changing the notebook source should affect the next pipeline run.

## J. Freshness, lineage and stale downstream behavior

Integrate with existing root catalog lineage.

Required behavior:

- replacing Bronze invalidates Silver/Gold freshness;
- rerunning notebook transformation restores downstream freshness;
- stored old rows remain historical evidence, not proof of current correctness;
- pipeline run panel surfaces stale versus fresh outputs;
- acceptance checks query current physical data.

Do not duplicate lineage state.

## K. Parameters and validation

Support parameter types such as:

- string
- integer
- boolean
- date/datetime where practical

Validate:

- required/missing
- default
- simple enum/allowed values
- numeric bounds where declared
- date ordering for the case
- unknown parameters rejected

Persist a run-time parameter snapshot as evidence.

## L. Retry/idempotency learning behavior

Implement realistic teaching semantics:

- Copy overwrite rerun should not duplicate rows
- append mode must make duplication risk explicit
- procedure extract rerun is read-only
- notebook publication follows current root materialization semantics
- retry count/backoff metadata
- failed activity rerun path
- downstream outputs stale after upstream changes/failures

Make these concepts visible in the inspector/run panel.

## M. Run history and evidence

Pipeline runs must use shared workspace persistence/history.

Add structured pipeline evidence, not a private localStorage history.

Useful evidence:

- pipeline run id
- pipeline version
- parameters
- started/completed
- status
- activity runs
- retry count
- rows/bytes
- input/output assets
- input versions/output versions
- error
- truth label

Keep generic execution history and notebook runs distinct from pipeline-run aggregation but linked by IDs where activities invoke notebook/runtime execution.

## N. Interview/curriculum compatibility

Do not build a separate practice system.

Where practical, add a tiny internal pipeline exercise/case definition using the shared Interview Exercise contracts for concepts such as:

- identify stale downstream asset
- parameter validation
- retry/idempotency
- dependency/cycle reasoning

This is optional after the main pipeline implementation; do not sacrifice core code for it.

## O. Preserve SparkLab/notebook work

Do not regress the newly implemented notebook/interview/SparkLab features.

Pipeline Notebook activity must call the existing runtime/notebook path rather than inventing another executor.

SparkLab profile/AQE controls remain the notebook/runtime concern; pipeline can pass declared runtime configuration where the activity explicitly owns it.

## Out of scope

Do not:

- create a real Azure subscription integration;
- create Fabric cloud resources;
- claim arbitrary SQL Server stored procedure support;
- add Docker/Kubernetes/Redis/Celery;
- create another database/catalog;
- create another notebook;
- create another project/workspace store;
- implement Airflow/dbt in this pass;
- implement Power BI in this pass;
- run broad QA;
- call this v0.2 automatically.

## Minimal checks only

During coding, use only checks required to continue safely, for example:

- one focused pipeline-contract/backend test file;
- one focused stored-procedure/copy/freshness test;
- one TypeScript typecheck after major UI changes.

Do not run full browser/regression suites.

## Completion handoff

Commit all implementation to `codex/pipelines-warehouse-pass-1`.

Report:

- pipeline contracts added;
- activities implemented;
- stored procedure adapter status;
- Copy behavior;
- pipeline authoring UI;
- warehouse surface;
- end-to-end case;
- retry/idempotency/freshness behavior;
- exact files changed;
- minimal checks actually run;
- broad checks deferred;
- remaining unsupported semantics;
- whether the branch is ready for coordinator review.

Do not stop at a plan. Implement the pass.
