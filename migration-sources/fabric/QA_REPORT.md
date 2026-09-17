# QA report — V21

## Release result

PASS at the source/runtime level.

- V21 static/depth QA: **18/18**
- V21 executable freshness/consistency QA: **65/65**
- historical V5-V20 regression assertions: **812/812**
- combined automated assertions: **895/895**
- semantic TypeScript: **66 TS/TSX files PASS**
- missing routes: **0**

## V21 executable coverage

Across Retail, Turbine, and ERP, on both Fabric and Databricks, V21 verifies:

- correctly sequenced production workflows reach 7/7 fresh lifecycle stages;
- correctly sequenced workflows reach 100% live case acceptance;
- re-running ingestion preserves ingestion freshness;
- re-running ingestion marks Transform stale;
- re-running ingestion marks Serve stale;
- re-running ingestion marks Operate stale;
- stale downstream evidence lowers live case acceptance below 100%;
- stale serving artifacts do not receive fake new write snapshots;
- re-running the affected downstream path restores 7/7 fresh lifecycle stages;
- live case acceptance returns to 100% after reprocessing.

Additional V21 tests verify:

- Fabric and Databricks candidates can coexist in one shared workspace;
- a stale Fabric Silver artifact does not mask a fresh Databricks Silver artifact;
- three-level Databricks object names resolve the same history snapshot as local schema.table names;
- ERP ingestion requires both order and customer feeds.

## Historical compatibility

All V5-V20 suites pass. The V15 Auto Loader idempotency test was updated to keep its repeated-ingestion assertion while respecting V21 lifecycle freshness: after Design/Govern is refreshed, ingestion must be refreshed again before the lifecycle can be considered fully current.

## Dependency-backed build gate

A fresh `npm install --ignore-scripts --no-audit --no-fund` attempt was made. The sandbox did not complete dependency retrieval and no `node_modules` directory was created. A genuine dependency-backed `npm run build` therefore remains a connected-workstation release gate.
