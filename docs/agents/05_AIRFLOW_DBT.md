# Airflow/dbt specialist - three independent learning paths

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own new Airflow and dbt domain modules. Use migration-sources/airflow-dbt and its existing DAG/compiler/snapshot/explanation code. Do not merge its old App root or private datasets into the new root.

Deliver three cases: Airflow-only orchestration, dbt-only transformation, and Airflow triggering a dbt project. Each reads/publishes root assets. Start with a working graph and editable task/model source, compiled SQL, logs and artifact lineage. Make scheduler semantics explicit: logical dates, dependencies, retries and trigger rules are not just animated boxes.

Extend literal ref/source support through a declared safe subset, with meaningful diagnostics for unsupported Jinja. Migrate tests and incremental/snapshot semantics only when actually executed and tested; do not call the teaching compiler dbt Core. For DAG parsing, do not exec arbitrary Python in the API process. Reuse the root notebook editor and kernel controls. Add failure/retry/idempotency and stale-artifact tests. Keep shared contract changes as proposals to the integrator.
