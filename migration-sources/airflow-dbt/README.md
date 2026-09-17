# Orchestration Studio — V7 adversarial reliability + self-review hardening

A focused **Airflow + dbt learning simulator** built with React, TypeScript and Microsoft Fluent UI 2.

The application is deliberately **not** a real Airflow scheduler, Python runtime, dbt engine, warehouse, Spark cluster or notebook platform. It teaches system structure and behavior through deterministic, inspectable simulations. Code practice and simulated execution are explicitly separated throughout the UI.

## V7 highlights

V7 focuses on truthfulness and adversarial regression coverage rather than adding another platform subsystem:

- The bounded cron parser now rejects invalid weekday numbers (`8`, `9`) and wrap-around ranges such as `5-1` instead of silently mapping them modulo seven.
- Scenario validation now rejects failure/quality scenarios that omit their injection target, branch scenarios without a declared non-selected branch, invalid sensor timeout counts, and `failedDbtTest` metadata attached to non-quality scenarios.
- The scenario matrix now validates the **advertised effect**, not only terminal state: retry counts, sensor pokes, permanent retry exhaustion, branch skips, quality-gate failure, and declared dbt-test failure are all asserted across the built-in cases.
- Hybrid execution now exposes separate **run-scope** and **test-gate** phase states. A successful dbt model phase followed by an operational Airflow test-wrapper failure no longer looks like an unqualified end-to-end success.
- The mock Fulfillment SLA exercise now includes a persisted manual acceptance checklist. It is explicitly self-review, not automatic architecture grading.
- Browser persistence claims are now truthful: Airflow/dbt editors and the mock workspace report when `localStorage` is unavailable and explain that edits then live only in the open tab.
- Stored learner self-review data is schema-filtered just like mock draft text, and the storage schema version is advanced to V5.


## Labs

### Airflow Lab

The Airflow examples use modern Airflow 3 Task SDK authoring style (`airflow.sdk`) where appropriate. The simulator teaches:

- DAG dependencies and graph/grid views
- retries, retry delays and retry exhaustion
- transient versus deterministic failures
- `failed`, `upstream_failed`, branch `skipped`, and supported trigger-rule behavior
- sensors, repeated pokes, reschedule intervals and timeout scenarios
- branching and joins
- task groups rendered as visible graph containers
- XCom concepts
- logical task timing, including parallel upstream work
- step-through execution and run-to-end execution
- bounded cron/data-interval previews, catchup and backfill concepts
- execution history, simulated logs and task inspection

A stepped run is continued by **Run simulation** rather than discarded. Runnable tasks are chosen by their earliest logical eligibility time so delayed retries and sensors do not incorrectly jump ahead of independent work.

### dbt Lab

The explorer resembles a compact dbt repository:

```text
models/
  staging/
  intermediate/
  marts/
seeds/
tests/
snapshots/
macros/
models.yml
dbt_project.yml
```

It teaches:

- `ref()` and `source()`
- staging / intermediate / marts
- view / table / incremental / ephemeral materializations
- sources and seeds as lineage resources
- timestamp/check snapshots with a bounded SCD2 history simulator
- schema/data tests and singular-test structure
- `not_null`, `unique`, `relationships`, `accepted_values`, and lesson-specific singular quality gates
- **model contracts as build-time interface checks, separate from data tests**
- Jinja/macros, compiled SQL, `this`, `is_incremental()` and ephemeral inlining
- documentation/catalog concepts
- command semantics for simulated `dbt run`, `dbt test`, and `dbt build`
- bounded selection: current model, parents, children, or both directions

`dbt build` models selected resources and upstream data-test gating. A failing error-level upstream test can block selected descendants. Project-wide simulated `dbt build` also surfaces seed and snapshot resource states. `dbt run` does not run data tests. `dbt test` treats selected model relations as already existing and does not re-run model contracts.

Model contracts are intentionally not represented as `dbt test` nodes. The bounded contract preflight checks final projected **column names** for included contracted models. It does not pretend to reproduce adapter-specific type/constraint enforcement.

Model-scoped selectors never silently broaden to the full project: selecting a seed, macro, YAML file, snapshot, or other non-model resource produces an empty model selection and disables the command until a model is selected.

The built-in compiler is intentionally bounded. It supports the constructs needed by the included lessons (`config`, model/seed `ref`, `source`, `is_incremental`, `this`, ephemeral inlining, `cents_to_currency`, `normalized_reference`, and `session_key`) and **rejects unsupported remaining Jinja** instead of guessing.

#### Snapshot lab

The snapshot lab from passive project structure to a real teaching surface:

- modern YAML snapshot configuration
- `timestamp` and `check` strategies
- `unique_key`, `updated_at`, and `check_cols`
- two source observations
- changed / inserted / unchanged classification
- simulated SCD2 rows with `dbt_valid_from` and `dbt_valid_to`
- first-class snapshot nodes in lineage tied to their `source()`/`ref()` relation
- validation that the snapshot relation actually resolves to a declared source/model/seed

Hard-delete policies, adapter-generated snapshot SQL, and warehouse writes remain out of scope and are labelled as such.

### Hybrid Airflow + dbt Lab

The hybrid view makes the ownership boundary explicit:

```text
raw ingestion
    -> raw load
    -> Airflow launches dbt run scopes
    -> dbt orders SQL models by lineage
    -> Airflow launches dbt test / quality scopes
    -> publish/report
```

Cross-links are directional. A selected dbt model can show:

```text
Run by Airflow: <dag_id> -> <task_id>
Test gate:      <dag_id> -> <task_id>
```

This avoids conflating model execution with a later quality gate. Partial orchestration stays partial: if staging completed and a later mart task failed, the simulator does not invent successful downstream models.

## Case studies

- **E-commerce** — customers, products, orders and returns; country seed; customer timestamp snapshot; daily incremental sales mart; retries; late files; relationships and mart-quality failures.
- **Clickstream** — raw events, bot-user-agent seed, sessions and funnels; hourly ingestion; late partitions; branching/quarantine; event-quality checks.
- **Finance reconciliation** — bank transactions versus ledger; account-mapping seed plus check-strategy snapshot; parallel upstream work; control totals; exception handling.
- **Mock project — Fulfillment SLA** — requirements-first marketplace exercise with order events, a late shipment feed, seller metadata, an SLA-target seed, safe parallelism, an incremental mart, data-quality publication gate, and revealable reference answers.
- **Scratch project** — free code/model editing without claiming arbitrary execution.

Each structured case has a business problem, sample data, architecture rationale, Airflow DAG, dbt lineage, tests, failure scenarios and Airflow↔dbt links. The mock project additionally starts from requirements/constraints/deliverables, keeps the architecture rationale collapsed until reveal, and includes reasoning checkpoints with hints/reference answers plus acceptance checks.

## Run locally

Requirements: a current Node.js installation. The present V7 build uses pinned browser modules from `esm.sh` for React and Fluent UI, so browser network access is required to mount the UI.

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/airflow
http://127.0.0.1:5173/dbt
http://127.0.0.1:5173/hybrid
```

Other commands:

```bash
npm run typecheck
npm test
npm run audit
npm run smoke
npm run verify
npm run build
```

If the pinned browser UI modules cannot load, the page displays an explicit runtime-load diagnostic rather than silently showing a blank application. The simulation source/tests themselves remain local.

## Simulation boundaries

- Arbitrary Airflow Python entered in the editor is saved for practice but is **not executed**.
- Arbitrary SQL is not sent to a warehouse.
- Structured case-study metadata drives Airflow execution states and Hybrid boundaries.
- Edited dbt **model SQL** feeds the bounded compiler/command simulator; unsupported constructs are rejected.
- Model contracts use a bounded projected-column-name preflight, not real adapter/warehouse enforcement.
- Snapshot history is a deterministic two-observation teaching simulation, not `dbt-core` or a physical snapshot table.
- Data-test outcomes are deterministic lesson scenarios, not queries executed against a warehouse.
- The schedule preview is a bounded cron/data-interval teaching model, not Airflow's full timetable/timezone engine.
- Scratch mode intentionally refuses to infer runtime behavior from arbitrary text.

## V7 verification

`npm run verify` covers:

- strict TypeScript compilation
- Airflow retry/sensor/branch/trigger-rule/logical-scheduling tests
- bounded cron and data-interval tests
- dbt compiler/materialization/seed/macro tests
- dbt run/test/build selection and upstream-test-gating tests
- model-contract separation and edited-SQL contract mismatch tests
- relationship-test multi-parent selection/gating behavior
- timestamp/check snapshot SCD2 regression tests
- snapshot relation/resource consistency validation
- project-wide seed/snapshot build-state assertions
- Hybrid partial-scope and run-vs-test-phase tests, including explicit run-scope/test-gate phase summaries and operational test-wrapper failure
- guided mock-project Airflow/dbt/Hybrid reference-solution assertions
- all-scenario terminal-state **and advertised-effect** matrix across every structured case study
- persistence fallbacks when browser storage is blocked, including honest editor/mock-workspace messaging and filtered self-review records
- case-study semantic validation and Airflow↔dbt cross-link validation
- dead-control/state-reset/edit-propagation/accessibility static audit, including lineage resource click semantics
- snapshot/contract UI wiring audit
- production build and static SPA route/module/style smoke test

See `AUDIT_REPORT.md` and `CHANGELOG_V7.md` for details.
