# Modular root foundation 1: compatibility freeze

This is an additive, bounded implementation on Root 0.1.0. It is not a new root
version, a replacement application, or a claim that the final modular platform is complete.

## Authoritative boundaries

| Contract | Decision in this pass | Owner |
| --- | --- | --- |
| Workspace | Existing schema_version 1; optional `workbench` envelope only. | Existing `Documents` and FastAPI application |
| Resource | Discriminated, versioned reference/design; stable id, title, revision. `schema_version:1` is the envelope version. | `packages/contracts/src/foundation.ts` / `apps/api/datapass/foundation.py` |
| Notebook | Resource stores `notebook_id` only. Cell IDs, block state, semantic order, saved notebooks, outputs and `.ipynb` format stay unchanged. | Existing notebook helpers / notebook-core |
| View | Independent id, canonical resource_id, presentation mode, graph positions, viewport and selection. | Workbench state operations |
| App layout | Up to three tabbed panes, orientation and width weights. No notebook block coordinates here. | Workbench state operations |
| ModuleManifest | Existing contract_version 1 and root `plugins.tsx` registry retained unchanged. Personas are presentation presets, not extra providers or module activation. | Existing root plugin registry |
| Runtime/Evidence | Existing ExecuteRequest, Execution, RuntimeClient and TruthKind unchanged; additive runtime descriptors and display truth mapping only. | Existing ApiClient / KernelManager |
| Catalog | `CatalogPort.catalog()` consumes the existing Asset list; bindings store names only. | Existing root catalog |
| Graph | GraphProjection is a disposable **display projection** only. It is never an execution plan, persisted domain graph or source of catalog truth. | Shared GraphCanvas |
| Workflow | Tasks + success/completion dependencies + optional canonical notebook refs + declared runtime target. | WorkflowResource validator/adapter |
| Lineage | Authored, table-level dataset derivations; optional live catalog name binding. | LineageResource validator/adapter |
| DataModel | Tables, columns, grain, keys, roles, SCD intent and column relationships/cardinality. | DataModelResource validator/adapter |
| Exercise / Attempt / Case | Existing definitions, hidden tests, grading and Run vs Submit preserved. No new challenge schema or duplicate attempt store. | Existing root exercise and case services |

## Explicitly bounded schema

This freeze covers the fields executable in the foundation. It does not claim to
implement the handoff's entire eventual WorkflowSpec/LineageSpec: parameter snapshots,
groups, provider extension payloads, column lineage, source spans, automatic evidence
links and external runtime credential contracts remain future additions. Unknown
fields are rejected, not silently dropped or interpreted as code. Version changes
must include an explicit migration; no donor schema is silently aliased to this one.

The server publishes `/api/foundation/schema` under the existing token boundary.
The committed `workbench.schema.json` is generated from the same Pydantic model.
The TypeScript and server types consume one shared JSON fixture in focused tests.
This is not a claim of exhaustive generated type/schema equivalence.

## Truth and execution

Workflow, lineage and model canvases are **design_only**. Adding a task, selecting a
runtime, connecting a notebook reference or choosing SCD Type 2 performs no execution.
The existing case-workflow route remains available separately and unchanged.

`local.sql`, `local.python` and `local.polars` describe existing local adapters.
`local.sparklab` describes local semantic emulation with separately modeled cluster
metrics. `local.dbt` describes the existing bounded SQL compilation path, not dbt CLI.
`remote.motherduck` is declared but unavailable; there is no credential prompt,
network upload or hidden remote fallback. No actual remote executor was added.

Measured local milliseconds remain distinct from modeled virtual seconds. Opening
Evidence renders the existing run list through ResultView; it does not generate
runs. Existing server-owned fixture/attempt privacy and stale-result logic are not
reimplemented by the workbench.

## Layout, editing and persistence

One resource can have many view IDs, without cloned notebook source. The current
root notebook has at most one live editor in visible workbench panes; another view
is read-only and can take editor focus. Switching to another linked notebook uses
the existing root save/restore/evidence hydration path. Simultaneous independent
editing of different notebooks is not implemented in this pass.

Graph positions belong to each view. Changing layout does not change a graph's
semantic revision; editing domain properties updates the canonical resource seen by
all views. Closing a tab preserves its source. Removing a resource detaches the
reference/design and its views, never the underlying notebook, table or run.
A notebook reference used by a workflow must be unlinked before removal.

Transient workbench undo/redo is bounded to 40 checkpoints and is not durable history.
Resource revisions describe those design checkpoints; authoritative save concurrency
uses the existing monotonically increasing workspace revision, not a design revision.
No execution freshness guarantee depends on these design revisions.

`Documents.save_workbench` validates size, domain semantics and saved notebook refs,
then uses the existing workspace lock, revision compare-and-swap and atomic file
replacement. A failed validation/conflict leaves saved data unchanged. Notebook and
workbench saves are **two sequential checkpoints**, not one new multi-document
transaction. If the second fails, the first saved notebook remains safe and the
workbench draft remains unsaved for export/reconciliation.

Imports validate through the authenticated API, do not save automatically, and do
not invoke KernelManager. A workspace/draft change during async validation cancels
application of the result. Export contains layout/design/reference JSON only, not
notebooks, data, credentials or a backup of the workspace.

## Limits

60 resources, 120 views, three panes, 200 nodes and 500 edges per graph, 200 columns
per table, and a 2 MB workbench document limit. Legacy workspaces may have more
notebooks than the resource limit: initial seeding links at most 58 notebooks plus
Catalog/Evidence, prioritizing the active one, without deleting any unlinked source.

Workflow and same-version dataset lineage must be acyclic. Data-model relationship
cycles and self-reference are valid structural designs; column endpoints must exist.
Cardinality/key/SCD metadata are declarations, not checks of actual dataset rows.
