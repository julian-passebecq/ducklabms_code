# V3 changelog — semantic and product hardening

## Airflow

- Runnable tasks are selected by earliest logical eligibility time, preserving independent work while sensors/retries wait.
- **Run simulation** now continues a partially stepped run instead of silently creating a new run.
- Added bounded cron parsing and data-interval previews, including weekday/weekend gaps.
- Preserved distinct `failed`, `upstream_failed`, and branch `skipped` teaching states.
- Preserved parallel-aware critical-path timing and task logical start/finish inspection.
- Expanded scenario-matrix regression tests across every structured case study.

## dbt

- Added separate simulated `dbt run`, `dbt test`, and `dbt build` commands.
- Added lineage selectors: all, exact model, parents, children, and parents+children.
- `dbt build` now models selected upstream test failures blocking selected descendants.
- Model-scoped selection no longer broadens to the full project when a non-model resource is selected; the command is disabled until a model is selected.
- Added explicit compile/test coverage for e-commerce `country_codes` and finance `account_mapping` seed lineage.
- Singular-test files in the explorer now correspond to actual singular test definitions.

## Hybrid

- Separates Airflow-triggered dbt run scopes from later test/quality scopes.
- A model inspector distinguishes **Run by Airflow** from **Test gate** and includes `DAG -> task` context.
- Partial execution remains partial; later Airflow failures cannot fabricate downstream dbt success.

## Persistence and UX

- Browser storage access uses guarded helpers; blocked storage degrades safely.
- Project graph nodes and explorer items expose improved keyboard/ARIA semantics.
- Concept dialog closes with Escape.
- UI startup uses a caught dynamic import plus a timed fallback diagnostic.
- Local static/dev server path containment was tightened.

## Validation and release gates

- Airflow `orchestrates` metadata must match Hybrid run links.
- Hybrid test links must reference models that own declared tests.
- Quality scenarios must fail a test inside the modeled Hybrid test scope.
- Added full scenario-matrix terminal-state regression.
- Static smoke checks the boot fallback, route serving, compiled main module and stylesheet.
