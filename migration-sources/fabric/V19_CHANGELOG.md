# V19 changelog

## Azure Databricks Lakeflow Jobs

- Wired `LakeflowJobsStudio` to the shared `DataWorkspace`.
- Successful original tasks now materialize representative ingestion/transformation/orchestration/serving effects.
- Failed runs leave completed Bronze/Silver evidence while skipped Gold remains absent.
- Repair runs apply only tasks with `repairDisposition: Executed`; preserved successful tasks do not rewrite their upstream tables.
- Added durable run history table: `ops.databricks_job_runs`.
- Added durable task matrix table: `ops.databricks_job_tasks`.
- Added `loadDatabricksJobRunsFromWorkspace()` so run/repair matrices reconstruct after navigating away and returning.
- Added a shared-workspace evidence panel in the Jobs workbench.

## Fabric Copy Job

- Wired the Copy Job workbench to the shared workspace.
- `Run` / `Save & run` now execute the case-study ingestion stage and create real Bronze/staging evidence.
- Output now reports touched tables and workspace snapshot rather than a fixed success message.

## Fabric Dataflow Gen2

- Wired Dataflow Gen2 to the shared workspace.
- Query preview now reads a live workspace table.
- Added executable `runDataflowGen2Publish()` runtime helper.
- Publish creates a representative `silver.df_*` table and lineage edge.
- Applied-step evidence is now visible in Lakehouse / OneLake Catalog / SQL after publication.

## QA / debugging

- Added V19 structural QA covering Jobs/Copy Job/Dataflow shared-workspace wiring.
- Added executable V19 tests for failed Lakeflow jobs, durable task matrices, repair-only downstream materialization, preserved upstream versions, persisted parent relationships, Copy Job Bronze evidence, Dataflow Silver evidence and lineage.
- Fixed a type-safety issue when reconstructing task values from persisted workspace rows.
- Clarified QA so a serving-stage audit row is not mistaken for rerunning the independent audit branch.
