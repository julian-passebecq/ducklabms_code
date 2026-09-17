# V3 frontend architecture

```text
FluentProvider
├── Fabric theme
└── Azure theme

Product shell
├── Fluent product tabs
├── Fluent navigation/actions
└── product-specific page chrome

Shared LearningGraph (@xyflow/react)
├── node registry / common activity card
├── edges + conditions
├── drag/drop positioning
├── selection/delete
├── zoom/pan/minimap
└── runtime-status animation

Consumers
├── Fabric Data Factory Pipeline
├── Azure Data Factory Pipeline
├── ADF Mapping Data Flow
├── Fabric Eventstream
├── Databricks Lakeflow Pipelines
└── Databricks Lakeflow Jobs
```

## Why this split

Fluent UI is used for Microsoft-style shell and controls. It is not treated as a graph library. XYFlow owns graph geometry and interaction. Product pages map their own semantic node models into the shared graph.

This keeps future additions straightforward: lineage, deployment DAGs, medallion visualizations and a later Power BI lineage/model surface can use the same graph primitives without duplicating drag/connect/delete code.
