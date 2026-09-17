# Root integrator - first mandatory pass

Read `AGENTS.md`, START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, essential checks actually run, checks deferred to external QA, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

## Implementation-first budget

This coding pass should maximize useful implementation. Broad regression/release testing is assigned to the external QA pass in `09_RELEASE_QA.md`.

Inside this Codex coding session, run only tests/build/typechecks that are strictly needed to unblock or safely continue implementation. Examples: one targeted test for a changed contract, a typecheck needed to identify a compiler blocker, a narrow Vite build after a structural frontend change, or a tiny DuckDB smoke check when the next code step otherwise cannot be trusted. Do not spend the session repeatedly executing the complete Python/TypeScript/browser/integration suite.

Mark unrun broad checks `DEFERRED TO EXTERNAL QA` and list the exact commands/areas the QA pass must verify. Never imply an unrun check passed.

Do not automatically switch to or delegate to a Medium agent (or equivalent higher-cost secondary agent). Escalation is exceptional. If the current agent becomes genuinely blocked and useful coding cannot continue, ask the user for explicit confirmation before escalation and briefly state why it is required.

## Core implementation work

Own shared contracts, apps/web shell, dependency manifests and API integration. Install actual dependencies when needed for implementation, resolve strict TypeScript/build issues encountered while coding, generate the real lockfile after a successful install, and repair the real React/DuckDB integration. Resolve actual package versions from official packages, not guesses.

Advance the implementation needed for case creation, notebook layouts, Monaco workers, kernel selection, run-one/run-notebook/run-workflow, save/reopen, output freshness, import/export, dirty-state switching, error recovery and actual DuckDB ownership/persistence. Use the smallest essential checks needed while coding; leave exhaustive journey/regression verification for `09_RELEASE_QA.md`.

Then formalize ToolContext services and per-module panel registration without hot-loading untrusted code. Do not implement full Power BI, Airflow or ADF here. Coordinate shared-contract changes; specialists may not independently rewrite this layer.

At handoff, provide the exact full QA commands and risk areas so the independent release/test agent can run the broad evidence pass outside the coding session.
