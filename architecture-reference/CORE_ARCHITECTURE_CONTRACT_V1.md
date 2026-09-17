# Core Architecture Contract v1 — preserved architect summary

Status: architecture contract / direction. **This document does not declare a v0.2 implementation release.**

This file consolidates the later architect direction that followed Root 0.1.0. It does not replace the preserved Root 0.1.0 documents in `CURRENT/`; it clarifies the intended core boundaries for subsequent implementation work.

## 1. One modular application, not microservices

Keep one React application and one FastAPI application with well-defined internal modules. Runtime workers may be separate processes for execution/lifecycle isolation, but they are not separate user-facing products.

```text
DATAPASS STUDIO
|
+-- Application shell
|   +-- Workspace / case selection
|   +-- Explorer and asset navigation
|   +-- Command bar and keyboard commands
|   +-- Tool experience selection
|   +-- Run history and system status
|
+-- Shared workbench
|   +-- Notebook document model
|   +-- Flexible pane/layout model
|   +-- Code editor and output renderers
|   +-- Explanation / solution / exercise panels
|   +-- Extension slots for specialist views
|
+-- Core services
|   +-- Workspace persistence and revisions
|   +-- Catalog and asset versions
|   +-- Execution coordination
|   +-- Kernel/session lifecycle
|   +-- Lineage and freshness
|   +-- Exercise validation and progress
|
+-- Execution adapters
|   +-- SQL
|   +-- SparkLab
|   +-- Trusted Python
|   +-- Polars
|
+-- Specialist modules
|   +-- Fabric / lakehouse
|   +-- Data Factory / pipelines
|   +-- SQL warehousing
|   +-- Airflow / dbt
|   +-- Power BI / semantic models
|   +-- Databricks-inspired ML
|
+-- Case packages
    +-- Fixtures and expected results
    +-- Activities and explanations
    +-- Selected modules and layouts
    +-- Acceptance rules
```

Do not add Kubernetes, a microfrontend framework, a separate backend per tool, or an independent notebook engine per specialist unless the architecture is deliberately changed later.

Keep these five concepts independent:

- **Case**: problem and learning objectives.
- **Tool experience**: relevant interface and terminology.
- **Document**: editable notebook, SQL model, pipeline definition, etc.
- **Layout**: where content appears.
- **Runtime**: how supported code executes.

A Fabric-inspired notebook is a tool experience around the shared notebook, not a second notebook format.

## 2. Database ownership

Do not allow the API process, notebook workers, pipeline workers and Python processes to independently open the same local DuckDB database for competing writes.

The intended shape is a workspace execution coordinator with controlled data ownership. The data worker owns SQL execution and managed table publication. Trusted Python/Polars execution exchanges bounded data or artifact references through the core rather than bypassing catalog/lineage rules.

Storage responsibilities remain separated:

- core metadata store: documents, revisions, run records, catalog references, progress/settings;
- DuckDB: default local analytical execution/storage;
- DuckLake adapter: optional actual DuckLake storage/snapshot exercises;
- artifact directory: files, figures, exports and non-table outputs;
- MotherDuck adapter: optional future remote execution, not required for local lessons.

SQLite compatibility mode remains explicitly distinct from the intended DuckDB runtime.

## 3. Managed assets need versions

Logical assets such as `gold.customer_revenue` must resolve through the catalog to a published version.

A managed asset record should carry, at minimum:

- asset identity;
- logical name and namespace;
- asset kind;
- storage location/reference;
- schema;
- current published version;
- producing run;
- input asset versions;
- freshness state.

This versioning is what lets dbt, Fabric-style notebooks, pipelines and Power BI share one source of truth and determine when downstream output is stale.

Keep scratch work separate from published project assets. Scratch tables/results can remain exploratory. Published assets enter the shared catalog with lineage and version information. Managed assets should not be overwritten through untracked side channels.

Do not claim one atomic transaction across different storage systems. Use a recoverable staged publication protocol and clean up abandoned staged outputs.

## 4. One execution lifecycle

Notebook Run, pipeline activities and Airflow-style tasks should submit work through the same core execution service rather than each implementing separate cancellation, history and output storage.

A run record should preserve:

- Run ID and workspace ID;
- document/cell/task identity;
- exact submitted source or plan;
- source revision;
- runtime and adapter version;
- input asset versions;
- requested compute profile;
- status and timestamps;
- outputs and published assets;
- validation results;
- failure/cancellation reason.

A run executes the source captured at submission. A late result attaches to the cell/revision that produced it rather than silently becoming the output of newer edited code.

Cancellation must be honest. A cancel request is not proof that execution stopped. Publication that already committed must not later be rewritten as though the run never succeeded.

Shared execution plumbing does **not** mean identical tool semantics. Airflow trigger rules, Data Factory dependencies and dbt behavior remain specialist semantics interpreted by their adapters.

## 5. Notebook remains first-class core infrastructure

Keep three models separate:

- notebook document: cells, source, semantic order, metadata and output references;
- layout document: pane arrangement, sizes, visibility, selected tabs and content references;
- runtime session: variables, kernel identity, execution count and lifecycle.

Moving a cell between panes changes layout, not semantic execution order or source identity.

Standard layout presets should be implemented over one layout system, including conventional notebook, double-page, study, practice, workflow and analysis arrangements.

For `.ipynb`, preserve standard cells, outputs, attachments and unknown metadata. Put Datapass-specific layout metadata in a namespaced metadata field. Import remains non-executing; unsupported content may be preserved without being falsely presented as executable.

Avoid mounting a heavyweight active code editor for every cell in a long notebook. Keep stable document state and selectively activate editor views.

## 6. Freeze a small specialist SDK / shared service boundary

Specialists consume shared services rather than arbitrary internals. The shared boundary is equivalent to:

```text
workspace
documents
catalog
execution
sessions
artifacts
validation
commands
notifications
```

Specialists contribute module manifests, views/panels, document types/editors, activity/model definitions, bounded runtime/compiler adapters and case content.

They do not instantiate their own database, workspace store, authentication flow or notebook persistence system.

Backend wire contracts should have one canonical schema source with frontend types/contract tests generated or validated from it. Use an explicit bundled module registry before considering dynamic plugin loading.

## 7. SparkLab truth contract

Keep parser/semantic execution, physical simulation and cost modeling distinct.

Every SparkLab result should clearly distinguish:

- **computed result**: rows/values actually produced by local execution;
- **semantic emulation**: supported Spark-like behavior implemented by the teaching adapter;
- **simulation**: virtual stages/tasks/shuffle/cluster behavior/cost;
- **unavailable**: behavior the adapter cannot execute or justify.

Changing a virtual cluster profile must not change the computed result rows. If physical input no longer matches a simulation truth pack's assumptions, the local data result can remain valid while the simulation becomes unavailable.

Do not force every case through SparkLab. SQL, Python and Polars remain independent valid paths.

## 8. Exercise validation is a core service

Specialists use a common acceptance framework while supplying tool-specific rules.

Depending on the exercise, validation can include schema, duplicate-sensitive row comparison, aggregates, null behavior, ordering requirements and configured numeric tolerances.

Keep distinct outcomes for:

- execution succeeded;
- data result correct;
- required technique satisfied;
- dependencies current;
- simulation assumptions applicable.

Acceptance records should preserve source revision, input versions and validator version so old accepted output does not certify later edited code.

## 9. Ownership

- **Core integrator**: shared contracts, shell, persistence, execution, catalog and release process.
- **Notebook specialist**: editing, layouts, import/export, editor lifecycle and accessibility.
- **Spark specialist**: supported Spark semantics, truth fixtures and simulation models.
- **Pipeline/warehouse specialist**: pipeline activities, database lessons and procedure teaching adapters.
- **Airflow/dbt specialist**: workflow/model semantics, editors and bounded compilers.
- **BI specialist**: semantic models, supported DAX behavior, visuals and refresh dependencies.
- **ML/Polars specialist**: training/evaluation exercises, dataframe operations and experiment views.
- **Curriculum/test owners**: case composition, explanations, fixtures and independent release evidence.

For stored-procedure lessons, the database owns the stored procedure; Data Factory invokes it. Do not model Data Factory itself as the database.

## 10. Required next implementation gates

Before broad new specialist feature work, the architect prioritized closing Root 0.1.0's open gates:

1. reproducible dependency installation;
2. strict TypeScript check and production React build;
3. actual DuckDB execution, publication, reopen and workspace isolation;
4. shared contract/schema validation;
5. queue/cancellation/timeout/restart/late-result tests;
6. persistence/revision/interrupted-save/stale-output tests;
7. real browser behavior against the React app;
8. one connected ingestion -> transformation -> published table -> KPI path with wrong edits and stale dependencies tested;
9. notebook import/export and layout changes without source/identity loss.

After those pass, deepen notebook/Mosaic and SparkLab, then advance bounded specialist modules against stable interfaces.

## Common specialist rule

Extend the existing Datapass Studio root. Do not create another application shell, database, notebook format, execution history or dataset store. Read the architecture reference and capability/contract documents first. Implement assigned modules through the shared services, preserve tool-specific semantics, label unsupported/simulated behavior explicitly, and propose shared-contract changes to the root integrator instead of competing with it.
