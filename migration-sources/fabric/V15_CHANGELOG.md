# V15 changelog — real-world Fabric + Databricks usage simulation

V15 deepens **production-shaped usage** without changing the project's execution philosophy: lightweight SQL/Python/dbt data effects run locally; Spark clusters, managed cloud compute, billing and infrastructure remain simulated.

## Added

### Production workflow simulators

New dedicated workbenches for both Microsoft Fabric and Azure Databricks walk each of the three case studies through seven production lifecycle stages:

1. design;
2. govern;
3. ingest;
4. transform;
5. orchestrate;
6. serve;
7. operate.

Every stage shows two separate contracts:

- what a real engineer configures in the cloud product;
- what the local learning runtime actually executes.

The stage creates observable evidence in the same shared workspace used by Notebook, SQL, dbt, Pipeline, Lakehouse and recovery exercises.

### Fabric production realism

- Copy Job vs Copy activity decision guidance.
- Workspace default vs published Environment.
- Spark Job Definition main file, reference files, arguments, default Lakehouse, retry policy and run snapshot concepts.
- Spark remains case-specific: turbine production scale can justify distributed Spark; Retail and ERP explicitly prefer SQL/dbt/Python unless requirements change.
- Pipeline remains the default visual Fabric-native orchestrator; Airflow is framed as a deliberate code-first alternative.
- ERP production ingestion now stages **both order changes and customer changes** before the dbt/SCD2 path.
- Production stage completion is derived from workspace evidence instead of transient React state.
- Stages follow a recommended production sequence and retain completion after navigation.

### Azure Databricks production realism

- Unity Catalog governance-first pattern: catalog/schema/table/volume boundaries, external landing volume, managed curated tables and least-privilege concepts.
- Compute choices separated into Serverless, Classic and SQL Warehouse.
- SQL Warehouse notebook mode blocks Python cells in the simulator.
- Auto Loader includes checkpoint/schema state, schema-evolution strategies and `_rescued_data` concepts.
- Lakeflow pipelines expose triggered/continuous mode and expectation actions (warn/drop/fail).
- Lakeflow Jobs expose file-arrival/table-update/schedule/continuous/manual triggers plus repair-run behavior.
- ERP production flow now ingests separate Bronze order/customer CDC feeds before simulated Lakeflow AUTO CDC SCD2.
- The AUTO CDC lineage edge is generated from the actual Bronze customer-change table rather than bypassing ingestion.

## Shared executable evidence

Representative production stages create real local learning artifacts such as:

### Fabric

- `bronze.fabric_sales_raw`
- `silver.fabric_sales_clean`
- `gold.fabric_daily_sales`
- `staging.fabric_sales_order_incremental`
- `staging.fabric_customer_incremental`
- `staging.fabric_customer_changes`
- `dw.fabric_dim_customer_current`
- `ops.fabric_run_audit`

### Databricks

- `bronze.dbx_sales_raw`
- `bronze.dbx_turbine_events`
- `bronze.dbx_sales_order_changes`
- `bronze.dbx_customer_changes`
- `silver.dbx_sales_clean`
- `silver.dbx_turbine_features`
- `silver.dbx_customer_cdc`
- `gold.dbx_daily_sales`
- `gold.dbx_turbine_risk`
- `gold.dbx_customer_current`
- `ops.databricks_run_audit`

Lineage and checkpoints are generated from those local writes.

## Debug / regression fixes

- Fixed the new V15 engine-test harness so TypeScript sources are compiled to temporary CommonJS before Node execution.
- Relaxed the V14 version gate so it remains a historical regression suite on later releases.
- Restored the explicit educational guard wording: use Spark **not by default**; prefer SQL/dbt where appropriate.
- Production workflow completion no longer disappears after navigating away and back.
- ERP Fabric production flow no longer bypasses staged customer ingestion.
- ERP Databricks AUTO CDC no longer reads directly from the seed customer table after an Auto Loader stage; it consumes `bronze.dbx_customer_changes`.

## QA

- V15 static/depth checks: **30/30 PASS**
- V15 executable production-workflow checks: **32/32 PASS**
- Previous V5-V14 assertions: **497/497 PASS**
- Combined assertions: **559/559 PASS**
- Shimmed semantic TypeScript: **63 TS/TSX files PASS**
- Missing routes: **0**
- Fabric modules: **16**
- Databricks modules: **9**
- ADF modules: **2**
- Guided case studies: **3**

A fresh npm dependency install still does not complete in this sandbox, so the dependency-backed Vite build remains an external connected-machine gate.
