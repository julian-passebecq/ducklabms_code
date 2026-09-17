# Codex task — Core Integration Pass 1

Repository: https://github.com/julian-passebecq/ducklabms_code

Working branch: `codex/core-integration-pass-1`

Do not start a new application or redesign the platform. Work from the existing Datapass Studio Root 0.1.0 implementation in this repository.

## Read first, in this order

1. `AGENTS.md`
2. `architecture-reference/README.md`
3. `START_HERE.md`
4. `docs/ARCHITECTURE.md`
5. `docs/MODULE_CONTRACT.md`
6. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`
7. `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md`
8. `docs/VERIFICATION.md`
9. `docs/agents/00_COORDINATION.md`
10. `docs/agents/01_ROOT_INTEGRATION.md`
11. `docs/agents/09_RELEASE_QA.md`

## Objective

Complete as much of the root integration implementation as possible in one coding pass. **Do not stop at a plan and do not spend the coding budget repeatedly running broad test suites.**

Focus on the shared core only. Do not implement full Power BI, Airflow, dbt, ADF/Fabric, Databricks or Interview Practice feature sets in this pass.

## Coding-budget rule — implementation first

The user explicitly wants this Codex session optimized for code output.

- Spend the large majority of the session writing, repairing and integrating production code.
- Full Python regression, TypeScript regression, browser journeys, complete integration suites and release-QA runs will be executed **outside this coding Codex session**.
- Run only the **minimum essential check required to keep coding safely**. Examples: one targeted test for a changed contract, a typecheck needed to locate a blocking compiler error, a narrow build after a structural frontend change, or a tiny DuckDB smoke check when the next implementation step otherwise cannot be trusted.
- Do not rerun the complete suite after each group of edits. Batch implementation.
- If a known failure has an obvious fix, implement the fix and continue rather than consuming the session on unrelated verification.
- Never claim an unrun check passed. Mark it `DEFERRED TO EXTERNAL QA` and record the exact command/area to verify later.
- At handoff, provide a concise external-QA checklist rather than consuming the coding pass executing it.

### No automatic Medium-agent escalation

Do not automatically switch to, invoke, or delegate to a **Medium agent** or equivalent higher-cost secondary agent.

This is exceptional only. If you become genuinely blocked and useful coding cannot continue, stop and ask the user for explicit confirmation before escalating. State the blocker and why Medium is required. If useful implementation can continue, continue coding with the current agent.

## Implementation targets

Advance/fix as much of the following as possible, using only essential unblocker checks inside Codex:

- install/resolve real Python and npm dependencies when required to implement the root correctly;
- generate and commit the real npm lockfile after a successful dependency resolution;
- resolve strict TypeScript and React integration issues encountered while implementing;
- repair Vite/build configuration and frontend structure so external QA can run the production build cleanly;
- harden the actual React app, not only the diagnostic client;
- make actual DuckDB the normal verified implementation path rather than relying on SQLite compatibility behavior;
- harden the Retail revenue lakehouse connected path implementation;
- harden notebook save/reopen and all existing layout modes;
- harden `.ipynb` export/import and source/cell identity preservation;
- preserve distinct run-one, run-notebook and run-workflow semantics;
- preserve stale downstream assets after upstream mutation and correct recomputation behavior;
- harden timeout/restart/error recovery, output-to-cell attachment and workspace isolation where contracts already define them;
- preserve the shared workspace/catalog/runtime/notebook ownership boundaries;
- keep real local execution distinct from simulated cluster/cloud metrics and costs;
- formalize shared ToolContext/module registration where needed without implementing full specialist products.

If compiler/build/runtime feedback is strictly required to make the next code decision, run the narrowest relevant command. Otherwise keep implementing and leave broad verification for external QA.

## Interview / LeetCode compatibility guardrail

Do **not** build the full Interview Practice module in Core Pass 1. Preserve compatibility with the explicit requirements in `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md` while hardening shared contracts.

In particular, do not introduce core changes that prevent later support for:

- standalone exercises independent of full case studies;
- starter code and reset semantics;
- a clear Run vs Submit distinction;
- visible/hidden/edge-case result-based validation;
- exercise-attempt history distinct from notebook revisions and generic run history;
- a named interview/practice layout built on the same notebook document;
- problem metadata/filtering;
- future alternate RuntimeClient adapters for bounded public-demo execution.

If a core contract must change, keep these capabilities possible without creating a second app, notebook engine, catalog, database or execution service.

## Existing advanced sources

Use `migration-sources/` only as reference/input material. Do not merge old application roots wholesale.

- `migration-sources/mosaic`
- `migration-sources/sparklab`
- `migration-sources/fabric`
- `migration-sources/powerbi`
- `migration-sources/airflow-dbt`
- `migration-sources/guide`
- `migration-sources/command-center`

The separate historical CodeDELeet archive is future migration/reference material for problem definitions, fixtures, graders, explanations and tests after it is audited. Do not introduce its old application shell as another root.

## Completion requirements

Commit the implementation and return:

- exact files changed;
- substantial functionality implemented/fixed;
- essential checks actually run, if any, with raw result;
- broad checks explicitly marked `DEFERRED TO EXTERNAL QA`;
- exact commands the external QA pass should run;
- high-risk areas QA should inspect first;
- current real/simulated/unsupported boundaries;
- unresolved implementation blockers;
- any shared-contract changes that future specialists must know.

Do not call this v0.2 merely because the architecture contract is v1. A new implementation release number requires a deliberate tested release boundary after external QA evidence exists.
