# Databricks-style ML and Polars specialist

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own ML and dataframe teaching modules, not another runtime service. Use the root trusted Python/Polars kernels and data publication API. Coordinate any kernel changes centrally.

Extend turbine-ml into a useful synthetic but noisy regression case: timestamped observations, chronological split, train-only preprocessing, baseline comparison, holdout metrics and a recorded model artifact. Add a Polars-only quality case that does not require Spark. Use real installed local libraries; do not call a Python result MLlib or MLflow unless those APIs actually run.

Build a Databricks-inspired experiment/results pane using shared notebook blocks. Record dataset versions, parameters, measured local runtime and model metrics. Virtual cluster/cost context stays separate. Test leakage, missing values, rejected schemas, reproducibility, fresh/reopened results and timeouts. Keep arbitrary Python behind explicit trusted-local opt-in. No new cloud account or paid resource dependency.
