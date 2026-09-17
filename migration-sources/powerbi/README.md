# Power BI Learning Studio V15

Interactive React learning application that simulates the modern Power BI authoring, modeling, operations, troubleshooting, and delivery lifecycle. It is designed as a hands-on learning workstation rather than a static PL-300 reference.

## What the studio teaches

- Get Data and connector/storage-mode selection.
- Power Query transformations, query folding, profiling, query-specific Applied Steps, M Advanced Editor concepts, reversible pending-change state, query deletion, Close & Apply snapshots, and loaded-vs-staged model behavior.
- Data view and semantic-model inspection.
- Star-schema modeling with per-relationship cardinality, cross-filter direction, active/inactive state, relationship deletion, date-table configuration, and model-health diagnostics.
- DAX measures, calculated columns, filter/row context, `CALCULATE`, iterators, virtual relationships, time intelligence, ranking, `KEEPFILTERS`, DAX queries, visual calculations, UDFs, ratio-total reasoning, and Direct Lake calculated-column preview concepts.
- TMDL authoring concepts.
- Report authoring with Build / Format / Analytics modes, field wells, persistent selected-visual formatting, interactions, analytics overlays, bookmarks, themes, accessibility, on-object concepts, duplicate/delete behavior, and visual/page/report filter practice.
- Performance Analyzer simulation with DAX-query/render/other timings, optimization reasoning, loaded-model evidence signatures, and stale-evidence detection.
- Import, DirectQuery, Direct Lake, composite-model, gateway, scheduled refresh, incremental refresh, granular semantic-model operations, blocked staged-query operations, and refresh-history evidence tied to the loaded query snapshot.
- Power BI Service concepts: workspace inventory, lineage, semantic models, permissions, RLS, endorsement, deployment stages, app publication, governed release-readiness checks, and prerequisite-gated Copilot/AI readiness.
- Architecture-decision practice and production troubleshooting.
- Five guided end-to-end case studies with isolated/resumable project sessions and state validation.

## V15 debug / improvement highlights

### Relationship diagrams survive destructive edits

Model View no longer draws relationship lines by raw array position. Relationship geometry follows the relationship identity, so deleting a middle relationship does not make a surviving path appear between the wrong tables. Endpoint markers now also reflect the configured cardinality (`1:*`, `*:1`, `1:1`, or `*:*`).

### Loaded-model boundaries are more truthful

If the semantic model is removed, existing report visuals now show a broken-model state rather than continuing to render healthy sample values. Performance Analyzer cannot record evidence before a model exists, and Service inventory/model controls/lineage plus the Desktop status bar no longer imply a loaded semantic model when there is none.

### Power Query selection is hardened after deletion

Deleting queries can no longer leave an out-of-range local selection that later jumps to the wrong source. New Source selects the newly added query deterministically. Reference-only Recent Sources / Enter Data controls are now visibly disabled rather than acting like silent no-op buttons.

### Persisted state is pruned, not merely overwritten

Migration now rebuilds the known workspace schema instead of spreading arbitrary persisted properties back into it. Unknown top-level keys and unknown nested visual/DAX/performance keys are removed during normalization.

## Earlier V14 debug / improvement highlights

### Case-study resume now includes the learner cursor

Each project now persists both its isolated workspace state and its last guided-step position. Switching away and back returns to the same step. Restart this case clears only that project workspace + cursor, while the global reset clears all case workspaces and step positions. External/global reset while the Case Studies page is open also resets the active cursor correctly.

### Runtime semantic-object identities are hardened

Measure and DAX-object writes now use case-insensitive upsert logic immediately. `Revenue` followed by `revenue` updates the same modeled identity instead of temporarily creating duplicates until the next browser reload/migration normalization.

### DAX architecture and Query View behavior are more truthful

The Direct Lake calculated-column preview is blocked unless a compatible OneLake Direct Lake model is actually loaded. DAX Query View now includes a `DEFINE MEASURE` learning example, and **Update model** parses and persists the first supported `DEFINE MEASURE` statement instead of only displaying a local success message.

### Service connectivity follows loaded state

Service connectivity settings now evaluate the loaded semantic-model source snapshot. A source merely staged in Power Query no longer makes Service say the model connection is Ready before Close & Apply.

## Earlier V13 debug / improvement highlights

### Loaded model is now a first-class boundary

Report, Model, DAX, and TMDL no longer behave as if a semantic model exists merely because a source has been staged. A first Power Query source must be loaded with Close & Apply before model authoring becomes active. A staged deletion keeps the previous loaded model available until the deletion is applied.

### Scenario identity follows the loaded snapshot

In free play, adding OneLake or finance sources no longer changes Report/Model/Service terminology before those source changes are loaded. The simulator keeps the previous semantic-model scenario while Power Query changes are pending.

### Direct Lake is an explicit architecture step

Wind Operations now validates Direct Lake independently from connecting OneLake. For a compatible OneLake source without staged Power Query transformations, choosing Direct Lake establishes the loaded semantic-model path without pretending Power Query Close & Apply is part of that path.

### TMDL Apply now mutates semantic-model state

The TMDL learning surface now previews a supported measure declaration and can apply that measure into the shared workspace. Invalid/unsupported scripts are blocked explicitly; non-measure TMDL metadata remains preview-only.

The guided curriculum is now **5 end-to-end case studies / 45 guided steps**.

## Earlier V11 debug / improvement highlights

### Loaded-model status during destructive Power Query edits

Staging deletion of the final Power Query source no longer makes Service claim the semantic model is immediately **Not configured**. Until Close & Apply commits that change, the previously loaded model still exists, so V11 reports **Pending changes** and the governed release card tells the learner to Close & Apply.

### Relationship identity is name-aware

Relationship metadata is matched by relationship name before positional fallback. Reordered saved state therefore keeps cardinality, filter direction, and active/inactive state attached to the correct relationship.

### Relationship deletion is functional

Model view includes **Delete selected relationship**. The operation removes the selected relationship and aligned metadata without flattening surviving properties, and the model change invalidates prior Performance Analyzer evidence.

## Earlier V10 debug / improvement highlights

### Stronger saved-state recovery

V10 expands workspace normalization beyond collection shape checks:

- orphan Power Query state is pruned when its source no longer exists;
- orphan applied-query snapshots are removed when the corresponding loaded source is gone;
- visual metadata cannot override the authoritative visual type stored on the report canvas;
- unsupported visual interaction values are reset safely;
- malformed measure and DAX formulas are normalized to strings before editors/signatures consume them;
- unsupported theme and refresh-mode values fall back to valid simulator defaults.

### Global reset now means global

`Reset lab state` clears both the active workspace and all hidden resumable case-study sessions. `Restart this case` remains project-scoped.

An invalid persisted `caseStudyId` is also recovered before case validation: the case page resumes a valid saved session when one exists or reseeds the selected project.

### Data view respects Close & Apply

The Data view now shows **loaded connections** from the last applied Power Query snapshot. If queries are edited but not applied, the Data view explicitly states that it is still showing the previously loaded semantic-model state.

### Refresh evidence follows transformation logic

A successful Import refresh is no longer considered current after changed Power Query logic is applied. The refresh evidence signature now includes the loaded query-transformation snapshot, so:

- staged edits → `Pending changes`;
- Close & Apply changed query logic → prior refresh becomes `Refresh required`;
- a new semantic-model operation records evidence for the newly loaded transformation state.

### Broken BI Production Rescue now enforces production readiness

The diagnostic case previously allowed the learner to publish even while the governed release card could remain red. V10 adds:

- an explicit Dynamic RLS/security-review repair step;
- a full **5/5 governed release readiness** validation step before publishing.

The case now verifies the production contract rather than merely demonstrating that Power BI can technically publish an artifact.

## Coverage snapshot

- 13 curriculum modules
- 13 DAX concept maps
- 16 guided DAX exercises
- 23 connector/source patterns
- 20 visual types
- 12 Power Query trainer concepts
- 7 refresh patterns
- 12 architecture-decision scenarios
- 12 report-authoring feature references
- 5 simulated Performance Analyzer rows
- 8 troubleshooting tickets
- 6 Copilot/AI-readiness checklist gates
- 5 end-to-end case studies / 45 guided steps
- 13 highlighted 2026 update cards

## Guided projects

1. **Adventure Sales 360** — relational ingestion, Power Query, star schema, DAX, report authoring, gateway/refresh, RLS, and Service delivery.
2. **Wind Operations Monitor** — OneLake/Direct Lake reasoning, telemetry semantic modeling, modern DAX, and operations reporting.
3. **Project Margin & Forecast** — Azure SQL + SharePoint-style inputs, finance modeling, variance DAX, incremental refresh, management UX, and dynamic RLS.
4. **Governed Executive BI Release** — performance diagnostics, model contract, refresh/security governance, deployment-stage reasoning, permissions, endorsement, and app publication.
5. **Broken BI Production Rescue** — deliberately broken state repaired through performance evidence, relationship correction, Date-table setup, gateway/credentials, schema operations, Copilot readiness, explicit RLS review, post-repair verification, a 5/5 release gate, and publication.

## Run locally

Windows:

```text
RUN_WINDOWS.cmd
```

Or:

```bash
npm install
npm run dev
```

Full production verification:

```bash
npm run check
npm run check:deep
npm run check:state
npm run check:behavior
npm run check:workflow
npm run check:migration
npm run check:syntax
npm run check:css
npm run build
npm run preview
```

`BUILD_WINDOWS.cmd` runs every pre-build QA gate before the Vite production build.

## Learning boundary

This is an educational simulator. It does **not** execute the VertiPaq/DAX engine, execute real Power Query M against connectors, authenticate to Microsoft tenants, publish to the real Power BI Service, invoke real Copilot, or operate an actual gateway/refresh. Simulated state is stored locally in the browser.

The UI mirrors Power BI concepts and information architecture without attempting a pixel-perfect clone of proprietary Microsoft assets.

## Source basis

The curriculum is grounded in the user-supplied Microsoft PL-300 lab repository snapshot and the Microsoft Learn source map already documented in `SOURCES.md`. V15 introduces no new release-specific product claims; this pass focuses on relationship-diagram correctness, destructive-query selection recovery, loaded-model truthfulness, persisted-state pruning, and regression hardening.

See `SOURCES.md`, `TEST_REPORT.md`, `CHANGELOG_V15.md`, and `PROJECT_STATUS.md`.
