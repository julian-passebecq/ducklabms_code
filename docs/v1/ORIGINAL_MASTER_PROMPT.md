# Datapass Studio V1 — Final Pro AI Master Handoff

## 0. Mission

Finish **Datapass Studio V1** from the existing implementation. This is a consolidation and completion pass, not a restart.

The product is a **local-first data-engineering learning IDE/workbench**. Its primary differentiator is the flexible workspace: one canonical set of resources can be opened in multiple tabs/panes/layouts and used by Notebook, dbt, Pipeline, modeling, Arena, SparkLab and visual explanation surfaces without duplicating source or runtime state.

The V1 goal is a coherent product that a user can launch locally and genuinely use for data-engineering practice. Prefer depth, truth and integration over adding unrelated tools.

## 1. Exact repository baseline

Use:

- repository: `julian-passebecq/ducklabms_code`
- branch: `codex/real-spark-proxy-1`
- exact commit: `abb0345a78836508f6024d79710a46973cbed9d6`
- PR: `#5`

The PR was re-verified on 2026-09-21 as open, mergeable and not draft.

Do not:

- start from `main`;
- start from `codex/airflow-github-actions-1`;
- merge historical remote Airflow/Spark branches into the candidate;
- silently replace the pinned baseline with a newer commit;
- reconstruct a fake repository from excerpts if exact source materialization fails.

If the environment has GitHub read access but cannot clone, use the exact connected repository as reference and ask for/export a source archive before making a full edited release. Do not claim a complete source build from a partial tree.

## 2. Apply the local deliveries in the correct order

This handoff contains two nested deliveries.

### A. Pre-Pro cleanup

`06_DELIVERY/Datapass_PrePro_Cleanup_2026-09-21.zip`

Purpose:

- replace stale architecture direction;
- mark old Oracle/Airflow/remote-runtime material as legacy/reference;
- correct the Jupyter imported-Python runtime label;
- focus `AGENTS.md` and `START_HERE.md` on the active architecture;
- add resource/theme/Jupyter/ConceptMotion/scope architecture notes.

Apply its architecture overlay and patches semantically against the exact pinned baseline. Do not delete legacy runtime code during this cleanup merely because it is no longer V1 direction; quarantine/reference it until replacement tests prove safe removal.

### B. Analytics M2

`06_DELIVERY/Datapass_Analytics_M2.zip`

M2 already contains M1 + M2 work. Do **not** layer an older M1 delivery underneath it.

First read inside M2:

- `START_HERE.md`
- `CHANGES.md`
- `QA_STATUS.md`
- `NEXT_AI_PROMPT.md`

Use its assembler against the exact pinned source when possible. M2 is an overlay/assembler delivery, not a complete repository snapshot and not a production certification.

## 3. Frozen product scope

### 3.1 Core product

The product is the **Datapass Workbench**, not DuckLake alone.

Conceptually:

```text
Workspace
├── Explorer
├── Context / Inspector
├── Pane A
│   ├── tab: Notebook
│   ├── tab: SQL result
│   └── tab: dbt model
├── Pane B
│   ├── tab: Lineage
│   ├── tab: Data model
│   └── tab: Visual explanation
└── optional Pane C
    └── another view of an existing canonical resource
```

Tabs/panes/layout are presentation state. Resource identity/source is canonical.

### 3.2 V1 data/runtime stack

Keep and complete:

- React 19 + Fluent UI 2;
- Monaco;
- `@xyflow/react` graph surfaces;
- local FastAPI control plane;
- DuckDB as the authoritative local analytical SQL engine;
- DuckLake as the canonical/default local lakehouse/table layer;
- Python/pandas as a first-class local trusted runtime;
- Polars as a first-class DataFrame/lazy runtime;
- dbt Core + dbt-duckdb as the real local analytics-engineering runtime;
- dbt artifacts/lineage and dbt Charts compatibility where qualified;
- optional MotherDuck later, explicit and never required;
- guided SparkLab using the existing bounded Spark semantics and `fastapispark` integration path.

### 3.3 V1 product surfaces

Finish/integrate these surfaces inside one shell:

1. Workbench / free canvas
2. Notebook
3. DuckDB / DuckLake exploration
4. dbt Lab / dbt Studio
5. Lineage
6. Data Model / star schema / SCD Lab
7. Charts
8. Pipeline Lab
9. Arena / interview practice
10. SparkLab
11. ConceptMotion visual explanations

These are not separate apps and must not own duplicate databases, notebook formats, workspaces or run histories.

### 3.4 Explicitly out of Datapass V1

Do not add or revive:

- Apache Iceberg;
- Oracle VM dependency;
- real Apache Airflow scheduler/runtime;
- Prefect;
- Kubernetes;
- Docker as a product requirement;
- real distributed Spark cluster;
- GitLab migration;
- dbt Cloud dependency;
- hosted multi-user execution;
- full Git Lab or Git curriculum;
- Linux Lab;
- Bash or PowerShell curriculum;
- generic terminal / PTY product surface;
- SSH Lab;
- Docker/container curriculum;
- OpenTofu / Terraform / IaC Lab;
- generic CI/CD curriculum.

A future sibling Dev/Ops workbench may use those ideas later. Do not extract a generic platform now just to serve that hypothetical product.

## 4. Non-negotiable architecture invariants

### A. One canonical resource, many views

Opening the same notebook/model/chart/DAG in a second tab or pane must create another **view**, not another source-of-truth document.

### B. Presentation is not execution

Keep this separation:

```text
Experience skin/theme
        ↓
Workbench tabs/panes/layout
        ↓
Canonical resource/document
        ↓
Runtime adapter
        ↓
Workspace catalog/evidence
```

Changing Fabric-inspired → Databricks-inspired → Arena must never clone code, tables or runtime state.

### C. Workspace owns durable analytics resources

M2 temporarily stores analytics under notebook-owned attachment state. Migrate durable resources to workspace ownership before adding more large features.

Target conceptual ownership:

```text
Workspace
├── notebooks
├── catalog / connections
├── dbt project
├── data-model designs
├── chart boards
├── pipelines
├── exercises / attempts
├── run evidence
└── ui session
    ├── panes
    ├── tabs
    ├── explorer/context state
    ├── theme
    └── experience skin/layout preset
```

Do not lose notebook-attached M2 content during migration. Add explicit migration/versioning and tests.

### D. Runtime truth

The UI must visibly distinguish:

- real local result;
- real remote result if ever connected;
- imported evidence;
- authored/design-only graph;
- emulated semantics;
- simulated metrics;
- unavailable capability.

SparkLab result rows may be real bounded semantics while stages/tasks/shuffle/spill/skew are simulated. Keep those visually and structurally separate.

### E. DuckLake is canonical

Do not add a second competing default lakehouse format. Use one normal workspace lake/catalog with logical source/bronze/silver/gold layers unless an advanced exercise explicitly needs more than one attached DuckLake.

### F. Polars is compute, not storage

Polars must be first-class in Notebook/Arena/Pipeline learning, but it must reuse shared workspace data and not create its own catalog or application.

## 5. Flexible workbench requirements

The current workbench direction is correct and should be strengthened, not replaced.

Required V1 interaction model:

- named workspaces;
- real tabs owned by panes;
- `+` to open/create supported resources;
- split right/down;
- 1–3 panes is acceptable for V1;
- move tab between panes;
- close tab without deleting source;
- close/collapse pane without deleting source;
- resizable pane weights/divider;
- focus one pane and restore prior layout;
- left Explorer;
- right Context/Inspector where useful;
- Ctrl+K command palette/search;
- undo/redo for layout/design operations;
- resource references remain stable across views;
- only one live editable viewport for the same canonical notebook unless shared multi-viewport editing is explicitly implemented safely.

Do not attempt detached windows/collaboration/arbitrary nested infinite split trees for V1.

## 6. Jupyter interoperability is a core feature

Preserve and qualify existing `.ipynb` support.

Current implementation already supports nbformat 4 import and nbformat 4.5 export, including:

- markdown cells;
- raw cells;
- Python cells;
- SQL cells;
- stable cell IDs;
- cell metadata;
- execution counts;
- markdown attachments;
- saved output bundles;
- notebook metadata;
- unsupported code preserved read-only rather than silently mistranslated;
- Datapass/Mosaic layout metadata in a namespaced metadata field.

Existing generated views include:

- Notebook;
- Two-page;
- Code + explanation;
- 2 + 1;
- Dashboard;
- Free canvas.

Fix the stale imported Python subtitle so it does not say `Pyodide`; current root execution truth is Python/trusted local CPython when enabled.

Deepnote direct proprietary import is not a V1 requirement. `.ipynb` is the interchange path.

Optional post-core enhancement only: a linked/continuous two-page spread using two viewports over one canonical notebook, not two document copies.

## 7. Theme vs Experience Skin

Separate these concepts.

### Theme

- Fluent Light
- Neutral Light
- Dark

### Experience Skin

- Datapass Studio
- Fabric-inspired
- Databricks-inspired
- Arena

Implement via tokens/density/chrome, not forked React trees.

Suggested token layer:

```text
--dp-canvas-bg
--dp-panel-bg
--dp-sidebar-bg
--dp-border
--dp-text
--dp-muted
--dp-accent
--dp-code-bg
--dp-tab-active
--dp-tree-selection
--dp-success
--dp-warning
--dp-danger
```

Official Microsoft Fabric and Databricks marks/icons may be used only in appropriate contextual/training/reference roles and according to their usage rules. They are not Datapass branding.

## 8. Focused resource model

Evolve the current `Resource`/`RootWorkbench` model rather than creating another shell.

V1 resource families should cover:

- notebook;
- catalog/table;
- result/evidence;
- dbt project/file;
- DAG/pipeline;
- lineage;
- data model;
- chart board/chart;
- figure/visual explanation;
- docs/reference;
- exercise.

Do not add terminal/Git/Linux/IaC resource types in V1.

Use a focused renderer/host registry so `WorkbenchSurface.tsx` does not become a giant conditional forever.

## 9. App decomposition

`apps/web/src/App.tsx` is already large. Before adding substantial UI, extract stable boundaries such as:

- `AppShell` / navigation;
- `WorkspaceExplorer`;
- `ResourceHost` / renderer registry;
- command palette/search;
- runtime truth/status strip;
- lab-specific surfaces.

Do not refactor merely for style. Extract where it reduces coupling and enables workspace-owned resources.

## 10. dbt architecture

Implement two intentionally different modes.

### A. Real dbt Project mode

Workspace owns a real dbt project with at least:

- `dbt_project.yml`;
- models;
- schema YAML;
- seeds where useful;
- tests;
- snapshots later if stable;
- chart YAML where relevant.

Execution path:

```text
Datapass UI
  ↓ explicit action
FastAPI bounded dbt runner
  ↓
dbt Core + dbt-duckdb
  ↓
DuckDB/DuckLake local target
  ↓
manifest / run_results / compiled SQL / catalog artifacts
  ↓
Datapass status + lineage + tests + evidence
```

Requirements:

- explicit action only;
- no arbitrary browser-supplied shell strings;
- allowlisted actions such as parse/build/run/test with bounded selectors;
- timeout/cancellation;
- workspace/project locking;
- stdout/stderr capture;
- exact dbt version/provenance;
- artifact invocation IDs must match the run being shown;
- current M2 draft lineage may remain useful while editing;
- authoritative project lineage comes from real dbt artifacts after parse/build;
- do not claim automatic column-level lineage without a dedicated parser/proof.

### B. dbt Exercise mode

Keep a fast bounded teaching path inspired by the Zillacode audit:

- versioned fixture tables;
- expected semantic result;
- bounded literal `ref()`/`source()` replacement;
- execute compiled SQL in DuckDB;
- result-based semantic grading;
- no arbitrary Jinja/macro execution from untrusted exercise input.

Do not require a full dbt subprocess for every tiny exercise.

## 11. Data Model / SCD

V1 should support educational design/reasoning for:

- fact/dimension/source tables;
- columns/types/nullability;
- declared PK/FK/key roles;
- grain;
- 1:1, many:1, 1:many, many:many;
- source-target mappings where authored;
- star schema exercises;
- DDL preview/export where practical;
- SCD Type 1 / 2 / 3 exercises;
- row validity/as-of reasoning.

Authored relationships are design metadata unless actual database constraints/evidence prove otherwise.

## 12. Charts

Keep charting bounded and useful:

- KPI;
- bar;
- line;
- table;
- explicit query/result provenance;
- stale-result state;
- dbt Charts YAML import/export/compatibility where qualified;
- native Datapass preview must not pretend to be the official `dct` renderer.

## 13. Pipeline Lab and Datapass Local Orchestrator

Do not depend on a real Airflow scheduler for V1.

Pipeline Lab should teach Airflow-like concepts while executing through a small Datapass local runner.

### Authoring

Provide a bounded Python-like DSL / syntax and safe compiler using Python AST. Support enough for learning:

- pipeline/DAG metadata;
- task definitions;
- dependencies with `>>`;
- retries/retry delay;
- simple groups/trigger rules later only if they fit;
- schedule expression as metadata.

Do not execute arbitrary source just to discover the graph.

Compile to one canonical DAG IR.

### UI

A useful layout is:

```text
DAG graph        | pipeline.py
-----------------+-----------------
Task details     | logs / runs
```

Editing code should update the graph after a short debounce. On compile error, show diagnostics and preserve the last valid graph.

### Local runner

Start sequential/topological and truthful. Real supported task types may include:

- SQL → DuckDB/DuckLake;
- dbt → dbt Core runner;
- quality/assertion;
- trusted Python/pandas where explicitly enabled;
- Polars;
- bounded file import/export where safe and product-relevant.

Record:

- queued/running/success/failed/skipped;
- attempt number;
- retries;
- elapsed duration;
- logs;
- upstream/downstream failure propagation;
- input/output resource refs.

No V1 daemon scheduler, worker queue, XCom clone, sensors, backfills or distributed executor. Schedule strings are teaching/config metadata while the app is closed.

Exercise grading for DAG tasks should compare semantic IR/edges/properties, not exact source formatting.

## 14. Unified Arena / exercise contract

Evolve toward **one semantic exercise with multiple runtime variants** rather than separate content silos.

Desired variants where appropriate:

- SQL;
- pandas/Python;
- Polars;
- dbt;
- PySpark/SparkLab.

A shared exercise should carry:

- id/version;
- scenario/title/industry;
- difficulty/topics;
- learning objectives;
- fixture version;
- input table schemas;
- visible examples;
- hidden test references;
- expected result semantics;
- language/runtime variants;
- starter source;
- bounded supported-operation metadata;
- solution/explanation/optimization/reflection;
- attempt/grading policy;
- optional visual explanation/figure reference.

Semantic grading should explicitly address columns, row cardinality, ordering policy, duplicates, nulls and numeric tolerance.

Preserve attempt history separately from notebook revisions/run history.

Do not send private hidden tests/solutions to the browser unnecessarily.

## 15. SparkLab / fastapispark

SparkLab is a **guided bounded PySpark learning module**, not a generic fake full Spark runtime.

Known service contract from prior audit:

- `GET /health`
- `GET /v1/runtimes`
- `POST /v1/spark/compile`
- `POST /v1/spark/plan`
- `POST /v1/spark/execute`
- `POST /v1/spark/sql`

Known supported concepts include filter/select/with-column/group/order/limit/distinct/drop-duplicates/repartition/join and simulated distributed planning/metrics.

Before enabling Run in the current Guided Spark UI:

- inspect the live `julian-passebecq/fastapispark` contract/version;
- add version negotiation;
- validate supported operations;
- bind a versioned fixture;
- grade the full bounded semantic result;
- create attempt identity;
- qualify protocol conformance.

The UI must show two truth zones:

```text
REAL BOUNDED RESULT
rows/schema/checks

SIMULATED SPARK EXECUTION MODEL
stages/tasks/partitions/shuffle/spill/skew/modeled duration
```

Never present simulated metrics as real Spark telemetry.

## 16. ConceptMotion / visual explanations

Use the existing ConceptMotion ecosystem as a reusable **FigureResource** seam, not as a separate visual-algorithm app.

Prioritize visuals directly relevant to data engineering:

- SQL joins / NULL extension / cardinality;
- table transformations;
- workflow/DAG run state;
- lineage/data flow;
- batching;
- partitions;
- Spark shuffle/skew/partition concepts;
- a small number of Python/Arena algorithms only when they reinforce interview/data-engineering learning.

Use existing semantic specs/player/renderer contracts where possible. Do not copy donor code/assets without compatible licensing.

A useful workbench composition is:

```text
code/exercise        | visual explanation
result/tests         | explanation/checkpoint
```

## 17. MotherDuck

MotherDuck remains optional and should not delay V1.

If implemented:

- explicit opt-in;
- credentials outside browser documents;
- clear local vs remote badge;
- no silent upload/fallback;
- local mode behavior unchanged when absent.

Do not make it a prerequisite for normal workspaces.

## 18. Cloudflare / deployment

Cloudflare is not the immediate product milestone anymore. Existing deployment notes may remain useful, but do not spend the Pro pass on deployment before the local product is structurally complete.

A future web shell deployment may serve static assets and a small gateway. Heavy Python/data/dbt/Spark work remains local or behind an explicit compatible backend.

## 19. Legacy code policy

Old remote GitHub-Actions Airflow/Spark work may remain in the tree as frozen/reference code during this pass.

Do not:

- advertise it as V1 runtime direction;
- wire new product features to it;
- delete it blindly during unrelated refactors.

After local Pipeline/SparkLab replacements are proven, a later cleanup may remove/quarantine unused legacy paths with dependency tests.

## 20. Coding order

Use this sequence unless evidence in the real source forces a small adjustment.

### Phase 0 — materialize and qualify M2 in the real app

1. exact baseline checkout/materialization;
2. apply Pre-Pro cleanup;
3. assemble/apply M2 once;
4. `npm ci` / dependency installation;
5. fix React 19/Fluent/Monaco integration issues;
6. targeted type/build checks;
7. native browser journey;
8. save/reopen/export/import checks;
9. real dbt/dct qualification only if dependencies are available.

Do not treat M2's component harness as full native certification.

### Phase 1 — workspace-owned resources

Migrate M2 dbt/model/chart state out of per-notebook attachment. Introduce/additive versioning and reference validation. Preserve old documents.

### Phase 2 — resource host + App decomposition + theme/skin

Create a focused renderer/host registry, extract stable shell boundaries, and separate Theme from Experience Skin.

### Phase 3 — real dbt Core bridge

Connect the dbt Studio concepts to allowlisted local dbt Core execution and authentic artifacts.

### Phase 4 — Pipeline Lab

Build the safe compiler + DAG IR + graph/code UI + local orchestrator, reusing the existing dependency-runner ideas where appropriate.

### Phase 5 — unified exercises

Add multi-runtime variants progressively, especially SQL/pandas/Polars/dbt/PySpark where semantically appropriate.

### Phase 6 — Guided SparkLab integration

Wire the live bounded fastapispark contract, preserving REAL vs SIMULATED truth separation.

### Phase 7 — ConceptMotion seam

Add FigureResource and a small high-quality set of data-engineering visuals.

### Phase 8 — V1 polish/release candidate

Finish tabs/panes/focus/search/theme persistence, local launch UX, documentation and final release gates.

## 21. Current M2 qualification evidence

The latest local pre-Pro verification re-ran M2's bounded checks successfully:

- 111 Node model/editor/analytics tests passed;
- 30 Python assembler/local-tool tests passed;
- strict analytics TypeScript passed;
- 26 syntax/transpile inputs clean;
- preview module build checks passed;
- 49 component browser interactions passed;
- 0 uncaught page errors;
- 0 outgoing requests in the component-only journey.

These are meaningful but **do not prove** native integration into the pinned full repository. The M2 assembler's attempt to download the full GitHub source in the prior environment failed because shell/Python networking could not reach GitHub. Do not reinterpret that as an application failure.

## 22. Code-first / QA policy

Follow repository `AGENTS.md` code-first guidance, but keep claims exact.

During implementation:

- run targeted tests/typechecks needed to continue safely;
- batch changes instead of repeatedly running all suites;
- never claim an unrun gate passed;
- record deferred full QA commands.

Before calling the V1 candidate complete, run the final acceptance gates in `05_ACCEPTANCE/V1_ACCEPTANCE_GATES.md`.

## 23. Final deliverable expected from Pro

Do not stop at a plan if the environment supports implementation.

Return a complete edited candidate (or a source ZIP/patch if GitHub is read-only), plus:

- exact starting SHA and final candidate SHA/hash;
- changed-file list;
- migration notes;
- architecture decisions changed, if any;
- tests actually run and raw results;
- explicit deferred tests;
- known limitations;
- instructions to launch locally;
- confirmation that excluded DevOps/IaC/Iceberg/Oracle/Airflow scope was not reintroduced.

The user's priority is to **finish Datapass V1**, not to widen the roadmap.
