# V2 scope and next pass

## Completed in V2

- Fabric and Azure are first-class top-level product areas.
- Azure splits into Data Factory and Azure Databricks.
- Three original Fabric guided case studies are preserved.
- Fabric capability map expanded well beyond pipeline authoring.
- Azure Databricks gets dedicated workbenches for Unity Catalog, compute, Delta/Auto Loader, Lakeflow pipelines/jobs, SQL Warehouse and monitoring.
- A cross-service ADF → Databricks guided lab is implemented.
- Power BI is intentionally reserved but disabled.

## Recommended V2.1 depth pass before Power BI

1. Add per-workbench guided steps with a common validator/solution engine (currently the main 3 Fabric pipeline labs have the strongest validator system; newer workbenches use local interactive checklists).
2. Add a reusable fake resource graph so creating a Lakehouse or Catalog object in one page appears automatically on other pages.
3. Add richer pipeline parameter/expression editor and variable library simulation.
4. Add Fabric notebook multi-cell add/delete/reorder and session/output history.
5. Add richer T-SQL execution semantics for dimensions/SCD Type 1/2.
6. Add KQL exercise validator and event generator controls.
7. Add Delta MERGE, OPTIMIZE and time-travel exercises with stateful versions.
8. Add Unity Catalog privilege inheritance and row-filter/column-mask exercises.
9. Add Lakeflow pipeline expectation metrics and event-log drilldown.
10. Add Jobs if/else and for-each branch editing with drag/drop.
11. Add ADF self-hosted Integration Runtime and trigger parameterization exercises.
12. Add Mirroring, GraphQL and Materialized Lake Views as deeper workbenches if desired.

## Power BI next pass

Add Power BI only after the engineering/control-plane depth above is stable. Suggested Power BI layer:

- Semantic model / star schema
- Relationships and cardinality
- Measures / DAX
- Direct Lake vs Import vs DirectQuery mental model
- Report authoring
- Performance Analyzer / DAX Studio concepts
- RLS
- Deployment / refresh / gateway
- End-to-end lineage from Fabric/Databricks serving layer to semantic model and report
