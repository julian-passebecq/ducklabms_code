# V10 changelog — observable data engineering and recovery

## Added

- workspace lineage/provenance records with source, target, actor, operation, snapshot, and timestamp
- live Lakehouse Data quality workbench
- generated lineage graph and workspace history
- create/restore workspace checkpoints
- tutorial evidence panel showing workspace changes, latest event, lineage count, and case-specific tool-selection rationale
- expanded constrained pandas-style notebook API: rename, fillna, merge, column selection, groupby/aggregation
- dbt sources and `source()` compilation
- dbt view/table/incremental materialization metadata and incremental unique-key merge behavior
- realistic ERP customer source changes and incremental staging
- representative local stored-procedure effects for retail MERGE, turbine alert insertion, and ERP SCD2 + watermark advancement
- Airflow retries, retry delay, trigger rules, and simulated task failure/recovery
- generated Airflow Python now round-trips retry and trigger-rule configuration
- production PySpark equivalent panel for the turbine case only when the production-scale rationale justifies Spark

## Corrected

- retail no longer presents PySpark as the default Bronze→Silver solution
- ERP Copy Job now stages both `sales_order` and `customer` changes
- ERP SCD2 tutorial now has a genuine changed-customer dataset to merge
- Airflow graph→Python→graph previously lost retries/trigger rules; fixed and regression-tested

## QA

- V10 static/depth: 37/37
- V10 executable engine: 28/28
- V5–V9 historical regression assertions: 227/227
- combined: 292/292
- semantic TypeScript: 54 TS/TSX files PASS
