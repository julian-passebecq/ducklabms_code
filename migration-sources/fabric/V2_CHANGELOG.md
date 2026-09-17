# V2 changelog

## Product architecture
- Reorganized shell into Microsoft Fabric and Azure.
- Azure now has explicit Azure Data Factory and Azure Databricks sub-products.
- Power BI reserved as disabled next-pass surface.

## Fabric additions
- Expanded learning hub with 9 curriculum modules.
- Added Copy Job wizard.
- Added Lakehouse/OneLake workbench with shortcuts, SQL endpoint, medallion and Mirroring simulation.
- Added Environment + Spark Job Definition workbench with Materialized Lake View concept.
- Added Real-Time Intelligence workbench (Eventstream → Eventhouse/KQL → Activator).
- Added governance, OneLake Catalog, security, lineage and impact analysis.
- Added deployment pipeline / CI-CD simulator.
- Preserved pipeline, Dataflow Gen2, notebook, warehouse SQL, data explorer, monitor and manage surfaces.

## Azure Databricks additions
- Workspace/notebook surface.
- Unity Catalog / Catalog Explorer.
- Compute selection.
- Delta Lake + Auto Loader/streaming.
- Lakeflow pipelines.
- Lakeflow Jobs with task DAG, triggers, retries and notifications.
- Serverless SQL Warehouse.
- Spark UI / skew / shuffle troubleshooting.
- Guided ADF → Databricks notebook integration.

## Curriculum
- Mapped uploaded mslearn-fabric labs.
- Mapped uploaded mslearn-databricks exercises.
- Mapped uploaded DP-750 labs.
- Added current-product concepts from Microsoft Learn.
