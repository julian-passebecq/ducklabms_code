# V18 changelog — live Fabric / Databricks catalog integration

V18 is a consistency and evidence release. It removes several remaining static-demo boundaries so the Fabric governance and Databricks workbenches observe the same mutable learning workspace.

## Azure Databricks

### Unity Catalog / Catalog Explorer

- Catalog Explorer now lists live workspace schemas and tables instead of a fixed case-study table.
- Row counts, table version, runtime source and update timestamp come from actual learning-workspace state.
- Live lineage shows upstream/downstream edges emitted by Auto Loader, Lakeflow, Notebook, SQL, dbt and production-workflow actions.
- Table grants and landing-volume examples remain simulated governance actions, while object discovery is now evidence-driven.

### Auto Loader / Delta

- A successful `availableNow` learning run now materializes the representative Bronze table in the shared catalog.
- Checkpointing is required before the learning runtime commits ingestion evidence.
- Schema-evolution restart now mutates the same Bronze table inspected by Catalog Explorer and SQL Warehouse.
- `addNewColumns` / type-widening learning paths add a representative `firmware_version` field.
- `rescue` adds representative `_rescued_data` evidence rather than only changing a status label.
- ERP Auto Loader workbench now focuses the customer CDC feed instead of showing the order source while writing a customer target.

### Lakeflow Pipelines

- Pipeline updates now materialize representative Bronze/Silver/Gold tables in the shared workspace using the existing production-workflow runtime.
- Successful updates emit real learning lineage and table versions.
- `Fail update` stops before downstream Silver/Gold materialization in the workbench drill.
- Pipeline graph status reflects succeeded / failed / skipped state.
- The workbench explicitly separates simulated declarative/Spark compute from real representative local table effects.

### Databricks SQL Warehouse

- SQL Editor now executes through the shared SQL runtime instead of displaying static case-study rows.
- Catalog tree is generated from live workspace schemas/tables.
- Three-level `catalog.schema.table` reads are supported by the local runtime.
- CTAS using a three-level name maps to the local `schema.table` object while preserving the catalog-qualified source lineage.
- Query failures, read-only results and table-mutating SQL now produce actual runtime evidence.

## Microsoft Fabric governance

- OneLake Catalog now lists live workspace assets created by Pipeline, Notebook, SQL, dbt and production workflow actions.
- Catalog search operates over actual workspace objects.
- Lineage view renders emitted runtime lineage rather than a fixed architecture diagram.
- Impact analysis derives downstream dependencies from actual lineage edges.
- Fabric and Databricks governance workbenches therefore observe the same evidence model while retaining product-specific UX concepts.

## Shared runtime corrections

- `findWorkspaceTable()` now resolves three-level names such as `training.gold.sales` to the learning `gold.sales` object.
- Three-level writes strip the catalog prefix when materialized into the local learning catalog.
- Added Auto Loader schema-drift mutation helper so UI schema state and table schema evidence cannot diverge.

## QA

- V18 static/depth: **24/24 PASS**
- V18 executable shared-workspace engine: **23/23 PASS**
- Previous V5-V17 regression: **643/643 PASS**
- Combined automated assertions: **690/690 PASS**
- Shimmed semantic TypeScript: **64 TS/TSX files PASS**
- Missing routes: **0**
