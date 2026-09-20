# Official implementation references

Checked September 20, 2026. These are primary references for architecture and terminology, not evidence that our local implementation passes compatibility tests.

- Fluent UI 2 React setup, FluentProvider and v9 components: https://fluent2.microsoft.design/get-started/develop
- Public React component catalog: https://fluent2.microsoft.design/components/web/react/
- Microsoft Fabric frontend extensibility: https://learn.microsoft.com/en-us/fabric/workload-development-kit/extensibility-front-end
  The public sample is a React workload and includes a Fluent UI ribbon. It is not the complete proprietary Fabric/ADF/Power BI frontend.
- DuckLake connection/metadata/data paths: https://ducklake.select/docs/stable/duckdb/usage/connecting
- DuckLake extension: https://duckdb.org/docs/current/core_extensions/ducklake
- DuckLake 1.0 / DuckDB 1.5.2 reference implementation: https://duckdb.org/2026/04/22/duckdb-152.html
- DuckLake catalog database choices: https://ducklake.select/docs/stable/duckdb/usage/choosing_a_catalog_database
- DuckLake data inlining option: https://ducklake.select/docs/stable/duckdb/advanced_features/data_inlining
- DuckDB external-access / allowed-directories configuration: https://duckdb.org/docs/stable/configuration/overview
- Fabric Lakehouse default Delta Lake format: https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables
- ADF Stored Procedure activity invokes database procedures: https://learn.microsoft.com/en-us/azure/data-factory/transform-data-using-stored-procedure
- Fabric Stored Procedure activity: https://learn.microsoft.com/en-us/fabric/data-factory/stored-procedure-activity
- PySpark distributed DataFrame API: https://spark.apache.org/docs/4.1.1/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html
- DuckDB Python threading guidance: https://duckdb.org/docs/current/guides/python/multiple_threads
- FastAPI server workers: https://fastapi.tiangolo.com/deployment/server-workers/

Do not call this app an official Microsoft product or imply Microsoft endorsement. Use public component APIs and independently authored screens; retain applicable upstream notices. Do not redistribute font files. This package contains no Microsoft font binaries and no complete upstream Microsoft monorepo.
