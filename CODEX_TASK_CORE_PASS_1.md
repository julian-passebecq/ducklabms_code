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
7. `docs/VERIFICATION.md`
8. `docs/agents/00_COORDINATION.md`
9. `docs/agents/01_ROOT_INTEGRATION.md`
10. `docs/agents/09_RELEASE_QA.md`

## Objective

Complete the root integration and release-gate pass already defined by the architect. Do not stop at a plan.

Focus on the shared core only. Do not implement full Power BI, Airflow, dbt, ADF/Fabric or Databricks feature sets in this pass.

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

## Existing advanced sources

Use `migration-sources/` only as reference/input material. Do not merge old application roots wholesale.

- `migration-sources/mosaic`
- `migration-sources/sparklab`
- `migration-sources/fabric`
- `migration-sources/powerbi`
- `migration-sources/airflow-dbt`
- `migration-sources/guide`
- `migration-sources/command-center`

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
