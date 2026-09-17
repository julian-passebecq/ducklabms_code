# Next iterations after V8

## Priority 1 — deepen executable case studies

- make each guided tutorial step verify expected table/schema/data effects in addition to UI configuration
- add reset-to-step / reset-data controls
- surface before/after row counts and schema diffs
- add richer lineage events derived from actual notebook/dbt/pipeline writes

## Priority 2 — notebook realism without Spark emulation

- notebook save/rename/duplicate
- parameter cell and pipeline base-parameter binding
- dataframe/table variable browser
- better Python learning API error messages
- SQL result paging and richer schema browser
- explicit equivalent-PySpark teaching callouts where useful, without executing Spark

## Priority 3 — dbt learning depth

- sources.yml/schema.yml style editor
- model materializations: view/table/incremental simulation
- additional generic tests
- custom SQL tests
- docs/lineage browser
- variables and target/environment behavior
- pipeline dbt Job parameter mapping

## Priority 4 — optional real SQL backend

Evaluate replacing or complementing the current local TypeScript SQL subset with DuckDB-Wasm if dependency/runtime cost is acceptable. Keep tutorials deterministic and credential-free. MotherDuck remains optional.

## Priority 5 — advanced lakehouse concepts

Use DuckLake only for a dedicated advanced lab if we want to teach:

- snapshots/time travel
- schema evolution
- Parquet-backed lakehouse metadata
- catalog concepts

Do not make it a dependency of the beginner/intermediate Fabric workflow.

## Later — Power BI

Power BI stays deferred until the data-engineering experience is mature. When added, connect it to the existing Gold/Warehouse state rather than introducing a separate fake dataset.
