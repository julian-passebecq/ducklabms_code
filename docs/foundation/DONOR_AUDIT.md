# Bounded donor and capability audit

Implementation base: `julian-passebecq/ducklabms_code` at
`dee5b0da0fe1cec4a9bd24179fe63cbf46bba7a3`.
Verified source tree: `d10e3e7a34c21291bf0130d18a306bebab9d3cb2`.
The complete source archive was obtained through GitHub Actions run `35460596949`,
artifact `10589498818`; the extracted tree matched that commit exactly before edits.

| Source actually inspected | Decision / concrete result |
| --- | --- |
| `apps/web/src/App.tsx`, `notebook.ts`, `NotebookCanvas.tsx`, `CodeEditor.tsx`, `MonacoAdapter.tsx`, `plugins.tsx` | Keep the application, editor, provider, document state and case-tool registry. Extract the existing NotebookCanvas expression for reuse in the new workbench surface; do not copy its engine. |
| `packages/contracts/src/index.ts`, `apps/api/datapass/api.py`, `documents.py` | Add one optional envelope and API operations; use the existing session token, revision, document lock and atomic file writer. |
| Current Interview and SparkLab imports/contracts / runtime boundary | No edits to exercise packs, grading, attempt storage, kernel implementations, Spark interpreter, Spark truth packs, cluster profiles or ResultView. |
| `migration-sources/fabric/src/graph-engine/LearningGraph.tsx` | Extract/adapt its controlled ReactFlow mechanics: provider boundary, custom nodes/handles, local drag state, drag-stop persistence, connection/selection callbacks, minimap and controls. `apps/web/src/foundation/GraphCanvas.tsx` records this provenance. |
| `migration-sources/fabric/src/components/PipelineCanvas.tsx` and `src/lib/pipeline.ts` | Retain palette/canvas/property separation and dependency validation. Root graph properties use typed resources instead of importing the donor's private pipeline/runtime state. Full activity palette, nested containers, debug/run panes and schedule engine are not migrated. |
| `migration-sources/airflow-dbt/src/types.ts` and `src/components/GraphCanvas.tsx` | Preserve distinction between orchestration and transformation domains. Do not import the alternative SVG renderer or independent simulator persistence. Dedicated DAG/code adapters and richer dbt execution remain later work. |
| `react_ms_fluent_2_framework` commit `30e69639bfc3929c348fd8f9c6c38a2cb61984d8`, `FILE_MANIFEST.txt` and `project/conceptmotion_studio/src/lib/generatorSpecs.js` | Audit the actual generator validation source, not a nonexistent packages directory. Reuse the validation principles (unique IDs, valid field endpoints, distinct lineage/model schemas) in root-owned typed validators; do not import its incompatible JSON formats or another shell. |

## Retained donor ownership to retire in later passes

The independent Fabric, Airflow/dbt, Power BI, guide and visual-platform implementations
remain migration sources, not active competing roots. Full Fabric activity definitions,
provider extensions, Airflow schedules/retries, dbt model compilation and deeper SQL
lineage still require bounded adapters against the foundation.

This pass is not a claim that those engines were merged. It establishes the shared
resource/view and graph surfaces that later extractions can target. No old donor
catalog, browser store, notebook engine or executor was mounted in the live root.

## Dependency decision

Only `@xyflow/react` 12.8.5 was added to the web workspace, with the generated lockfile
retained. Existing Fluent UI v9, React, Monaco and notebook grid versions were not
upgraded. Root npm workspace structure remains unchanged. ELK, a separate docking
framework, DAX, ML and remote cloud execution were not introduced.

Reference documentation used for API verification:
- https://reactflow.dev/api-reference/react-flow
- https://reactflow.dev/api-reference/types/on-move
- https://reactflow.dev/api-reference/utils/apply-node-changes
- https://docs.pydantic.dev/latest/concepts/unions/
