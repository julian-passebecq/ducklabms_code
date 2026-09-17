# Research and scope notes — V2

Research date: 2026-09-16.

V2 uses two complementary sources:

- User-provided Microsoft Learn repositories for curriculum structure and exercises.
- Current Microsoft Learn documentation for product naming and features that have evolved since some course labs were authored.

## Fabric scope

Fabric is modeled as an integrated data-engineering platform over OneLake, with Data Factory, Data Engineering/Spark, Data Warehouse, Real-Time Intelligence, governance/monitoring and deployment surfaces.

Current concepts reflected in V2 include Copy Job, Dataflow Gen2, Lakehouse, OneLake shortcuts, Environments, Spark Job Definitions, Materialized Lake Views, Warehouse/T-SQL, Eventstream/Eventhouse/KQL/Activator, OneLake Catalog, security/lineage, deployment pipelines, Mirroring, SQL Database awareness and GraphQL awareness.

## Azure scope

Azure Data Factory and Azure Databricks are separate products with an explicit integration boundary.

ADF models linked services, datasets, Integration Runtime, pipeline/control-flow authoring, Mapping Data Flow, triggers, debug and monitoring.

Azure Databricks models notebooks, serverless/classic compute, Unity Catalog, Delta Lake, Auto Loader/Structured Streaming, Lakeflow pipelines, Lakeflow Jobs, Serverless SQL Warehouse, and Spark monitoring/optimization.

## Intentional simplifications

- No Microsoft/Azure/Databricks resources are provisioned.
- Cloud auth, billing, networking and control-plane operations are simulated.
- MotherDuck remains optional only for browser SQL exploration; it does not make the Microsoft cloud simulations real.
- Power BI is reserved for the next pass.
