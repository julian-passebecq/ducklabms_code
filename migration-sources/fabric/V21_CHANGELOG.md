# V21 changelog — freshness-aware case evidence and production lifecycle

## Why this pass

V20 introduced production case-study briefs and live acceptance criteria. During V21 defect hunting, one important operational inconsistency remained: once a downstream artifact existed, the simulator continued to treat it as complete even if an upstream ingestion stage was rerun later.

That could teach the wrong production habit. A Gold table from yesterday is not current merely because it still exists after Bronze changed today.

## Added

- Workspace object freshness model with `fresh`, `stale`, and `missing` states.
- Recursive lineage freshness: a table is stale when a direct or transitive upstream object changed after the table was produced.
- Canonical object-name handling so `training.gold.table` and `gold.table` share the same history identity.
- Production-stage evidence model with snapshot-aware freshness for Design, Govern, Ingest, Transform, Orchestrate, Serve, and Operate.
- Stage audit rows now persist their evidence snapshot.
- ERP ingestion freshness requires both order and customer change feeds on Fabric and Databricks.
- Case-study acceptance now rejects stale table/lineage evidence instead of only checking object existence.
- Mixed-platform acceptance chooses a fresh candidate when one platform artifact is stale and the other is current.
- Case-study UI now shows stale stages, reasons, and a downstream-staleness warning.
- Production workflow shows `Fresh evidence`, `Stale evidence`, or `Not run`, and blocks later stages when their prerequisite is stale.
- Case-study platform track now follows the currently selected Fabric/Databricks product rather than retaining an old local toggle state.

## Example

A completed Retail workflow has fresh Bronze, Silver, Gold, lineage, and recovery evidence.

If Bronze ingestion is rerun afterward:

- Bronze remains fresh.
- Silver becomes stale.
- Gold becomes stale transitively.
- Orchestrate and Operate evidence become stale because an earlier lifecycle stage was refreshed later.
- Case acceptance drops below 100%.

After re-running Transform -> Orchestrate -> Serve -> Operate, the case returns to 7/7 fresh lifecycle stages and 100% acceptance.

## Compatibility/debug fixes

- Fixed three-level Databricks identifiers bypassing latest-history lookup in the freshness engine.
- Updated the historical V15 idempotency test so it still verifies repeated Auto Loader ingestion but then re-runs ingestion after Design/Govern before asserting a fully current production lifecycle.
- Preserved all prior V5-V20 runtime behavior and case-study completion on correctly sequenced workflows.

## QA

- V21 static/depth QA: 18/18 PASS.
- V21 executable freshness/consistency QA: 65/65 PASS.
- Previous V5-V20 regression assertions: 812/812 PASS.
- Combined automated assertions: 895/895 PASS.
- Shimmed semantic TypeScript: 66 TS/TSX files PASS.
- Missing routes: 0.
- npm dependency installation remains externally blocked in this sandbox; no `node_modules` directory was created.
