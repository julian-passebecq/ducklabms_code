# Analytics M2: scope, ownership and handoff

## Decisions

The user's latest request narrows the product, not restarts it. Keep the existing
React/Fluent UI and NotebookDesktop, notebook source model, FastAPI local runtime,
DuckDB/DuckLake catalog, and exercise history. No new application/server is required
for each tool. Airflow/Prefect/Oracle/Docker are not part of this milestone.

Layers are presentations: Notebook/Canvas/Arena; dbt Studio; lineage; schema and
SCD design; Charts; runtime information; guided Spark integration preparation.

## Implemented ownership

`apps/web/src/studio/analytics` owns the new components and pure models.
`LabProject` schema 1 is attached to the CURRENT canonical notebook at
`blockState['datapass:analytics:v1']`. This is intentionally a bounded integration,
not a second database or private catalog. It holds dbt text files, imported artifact
metadata, schema designs, chart snapshots, and tab/pane/theme state.

**Important limit:** analytics ownership is per notebook in M2, not a workspace-wide
shared dbt-project registry. Switching to another notebook can show another analytics
attachment. A future promotion to shared workspace resources needs an explicit
reference migration, not implicit copying. Do not call the current tabs multiple
independently editable notebooks or new isolated project instances.

The root notebook adapter explicitly preserves this namespace on restore; the
generic Mosaic parser strips all non-cell namespaces by design and stays unchanged.
Unknown analytics schemas are retained and reported for recovery, not silently reset.
Unsafe JSON fails restoration. UI commit size is 1.2 MB; the entire existing backend
notebook still has its own 2 MB limit. Export smaller samples/artifacts if necessary.

`.ipynb` export is not an analytics backup. Use Project JSON for the entire native
notebook, or Export analytics JSON for the attachment alone. Standalone preview saves
its fixture notebook set separately from the original M1 storage key.

## Implemented interactions

Tabs are resource-view references, currently one tab per layer per pane. Two panes,
right/down split, tab move, close, single-pane consolidation, collapse/restore,
keyboard/pointer divider, palette, independently hidden left/right context chrome,
and three semantic palettes. Notebook editor is mounted once; another notebook pane
is a reference with focus transfer. The original M1 notebook/canvas/arena stays intact.

No automatic two-column notebook continuation, nested arbitrary split tree, second
browser-window synchronization, general document-tab creation or collaboration.

## dbt Studio and lineage

SQL/YAML/CSV source tree + editing + safe source export. Import manifest schema v9-v12
and run-results v4-v6. Results must have the same nonempty invocation ID. Imported
SQL and build results remain historical/user-supplied; edited source does not magically
recompile or authenticate them. Imported compiled SQL is read-only.

Native artifact dependencies produce model-level lineage, optional tests and directed
upstream/downstream highlighting. Draft lineage only scans bounded literal ref/source
expressions; dynamic Jinja/macros and arbitrary SQL cannot be inferred reliably here.
Authored column mappings are separate designs. Neither is marketed as automatic
column-level SQL analysis or an Airflow DAG scheduler.

## Schema and SCD

Editable fact/dimension/source tables; grain, columns, types, primary keys/nullability;
cardinality links, authored column mappings; movable cards; DDL preview/export and
static design diagnostics. DDL never executes. Key constraints need real data tests.

The fixed customer-change scenario replays Type 1 overwrite, Type 2 historical versions
with half-open validity intervals, and Type 3 immediate previous value. Unchanged
attributes do not create a Type 2 version. A row-count question grades only this fixture,
not arbitrary SQL. This is executable browser-side teaching logic, not fake dbt output.

## Charts and dct

Native Datapass preview of explicit sample/imported JSON rows: bar/line/KPI/table,
selection of dimension/measure/aggregation, accessible tables, SQL source provenance.
Editing SQL marks data stale and suppresses the chart until fresh import or exact
snapshot-query restore. Importing rows associates the current query as a user-supplied
label; it does not prove that the rows came from that query.

YAML export targets the documented dbt Charts DSL (source, queries, charts, rows).
`dbt_charts.yml` routes source db to the dbt profile. Actual dct validation/rendering is
an optional dependency and remains externally qualified, not embedded/reimplemented.
No upstream dbt-ui app is embedded. Its editing/artifact interactions are design references.

## Optional real local execution

`tools/materialize_dbt.py` validates a source export and creates a NEW folder with
local profiles.yml and seed/model/test files; no execution/install/network happens.
`tools/run_local_dbt.py` shows argv by default, requires --execute, uses shell=False,
a fixed action allowlist, a timeout, and explicit local project/profile scope. dbt project
macros/hooks are trusted code with OS privileges; this is NOT a security sandbox.

The example dbt project is a separate declared teaching project, NOT a duplicate
Datapass catalog pretending to be shared. Future integration must bind the existing
workspace database with deliberate file/process locking, catalog refresh, workspace
IDs and source revisions. Import artifact pairs from the same build before another
command overwrites target/manifest.json.

Pandas/Polars use Python libraries when installed. FastAPI is the existing local
transport/control plane, not a reason to provision a VM. MotherDuck needs explicit
credentials/server-side profile handling and quota awareness; no browser token field.

## Guided Spark boundary

Reference: julian-passebecq/fastapispark. It has stateless compile/plan/execute services,
DuckDB semantic results and separate simulated distributed metrics. M2 includes only
a lesson contract, compile-envelope qualification and bounded request preparation.
No network invocation. The lesson's fixture/version, allowed operations, expected rows
and conformance tests must be finalized before enabling Run. Server-side argument
validation, protocol/version negotiation, auth, full-result grading and attempt identity
are required. Existing local SparkLab code remains frozen, not automatically swapped.

## Next work, in order

1. Assemble the pinned repo plus this overlay; run real dependencies/typecheck/build.
2. Test native save/reopen/import, errors/dirty state, editor focus and split switching.
3. Qualify dbt-duckdb and dct versions on the local sample; capture authentic artifacts.
4. Add a narrow trusted-local job bridge to the existing service, not a new server root.
5. Promote analytics project ownership to workspace resources with safe migration if needed.
6. Improve notebook tabs, continuation view and catalog-to-chart bindings.
7. Add explicit MotherDuck adapter and separately qualified guided Spark lessons.
8. Consider orchestration only after that foundation is stable.

See package REFERENCES.md for official documentation checked September 21, 2026.
