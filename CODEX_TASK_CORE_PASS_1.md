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

Complete the root integration and release-gate pass already defined by the architect. Do not stop at a plan.

Focus on the shared core only. Do not implement full Power BI, Airflow, dbt, ADF/Fabric, Databricks or Interview Practice feature sets in this pass.

## Required work

- Install the real Python and npm dependencies.
- Generate and commit the real npm lockfile after a successful install.
- Resolve strict TypeScript issues.
- Run and repair the Vite production build.
- Run the existing Python and TypeScript test suites.
- Verify the actual React app, not only the diagnostic client.
- Verify actual DuckDB execution and persistence.
- Verify the Retail revenue lakehouse connected path end to end.
- Verify notebook save/reopen and all existing layout modes.
- Verify `.ipynb` export/import round trips and source/cell identity preservation.
- Verify run-one, run-notebook and run-workflow behavior remains semantically distinct.
- Verify stale downstream assets after upstream mutation and recomputation behavior.
- Verify timeout/restart/error recovery, output-to-cell attachment and workspace isolation where already covered by the contracts.
- Preserve the shared workspace/catalog/runtime/notebook ownership boundaries.
- Keep real local execution distinct from simulated cluster/cloud metrics and costs.

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

Return and commit:

- exact files changed;
- tests run and raw results;
- build result;
- DuckDB verification result;
- actual React/browser evidence when available;
- current real/simulated/unsupported boundaries;
- unresolved blockers;
- updated verification/gate documentation where evidence changed.

Do not call this v0.2 merely because the architecture contract is v1. A new implementation release number requires a deliberate tested release boundary.
