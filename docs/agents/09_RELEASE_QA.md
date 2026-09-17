# Independent release and integration test agent

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Do not add product features. Verify the integrator's root with real npm/Python dependencies. Run Python tests, TypeScript contract tests, strict typecheck, Vite build and real browser journeys. Optional DuckDB/Polars tests must execute rather than be counted as skipped passes. DuckLake must demonstrate actual attach/write/reopen and data files before being called verified.

Exercise two simultaneous requests, timeout/restart, incompatible schema, wrong code, stale upstream data, corrupted import, duplicate block IDs, optimistic save conflicts and cross-workspace isolation. Verify that a workflow and a manual notebook use the same catalog. Confirm each output remains attached to its cell and profile changes do not alter results.

Check every screenshot against the actual client tested. The diagnostic client is not the React release. Record failures and blocked checks explicitly, with raw logs. Return a gate table and reproduction steps to the integrator; do not hide missing functionality behind a passing aggregate test count.
