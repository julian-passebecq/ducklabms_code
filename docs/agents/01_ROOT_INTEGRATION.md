# Root integrator - first mandatory pass

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own shared contracts, apps/web shell, dependency manifests and API integration. First install the actual dependencies, resolve strict TypeScript errors, generate a lockfile, run the Vite build and test the real React app with DuckDB. Do not count the offline diagnostic client as React evidence. Resolve actual package versions from official packages, not guesses.

Verify case creation, all notebook layouts, actual Monaco workers, kernel selection, run-one/run-notebook/run-workflow, save/reopen, output freshness, exports/imports, dirty-state switching and error recovery. Test narrow screens and keyboard navigation. Repair any issues with minimal changes, preserving the 16 notebook-contract tests and Python suite.

Then formalize ToolContext services and per-module panel registration without hot-loading untrusted code. Do not implement full Power BI, Airflow or ADF here. Release only with actual build/test logs and an updated gate table. Coordinate shared-contract changes; specialists may not independently rewrite this layer.
