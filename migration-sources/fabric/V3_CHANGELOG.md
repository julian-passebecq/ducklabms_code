# V3 changelog — Fluent 2 / interactive graph pass

## Added

- Fluent UI React v9 dependency and dynamic Fabric/Azure themes.
- XYFlow/React Flow graph engine in `src/graph-engine/LearningGraph.tsx`.
- Shared graph node visuals with status badges and Microsoft-like properties.
- Drag palette item → exact drop position on pipeline canvas.
- Native handles for dependency creation.
- Node/edge Delete and Backspace behavior.
- Zoom, pan, fit-view, grid snapping and minimap.
- Pipeline undo/redo history.
- Activity palette search.
- Fluent tabs/inputs/checkboxes/textareas in pipeline properties.
- Fluent product tabs and shell controls.

## Migrated to the shared graph engine

- Fabric Data Factory pipeline
- Azure Data Factory pipeline
- Azure Mapping Data Flow
- Fabric Eventstream
- Databricks Lakeflow Pipelines
- Databricks Lakeflow Jobs

## Preserved

- 3 Fabric case studies and validators
- Fabric platform modules
- Azure Data Factory learning surfaces
- Azure Databricks modules
- optional MotherDuck adapter
- Power BI placeholder only
