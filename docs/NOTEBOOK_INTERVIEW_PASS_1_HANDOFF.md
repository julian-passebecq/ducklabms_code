# Notebook + Interview Practice Pass 1

Branch: `codex/notebook-interview-pass-1`. Root 0.1.0 remains the baseline. Ready for coordinator implementation review; broad acceptance is **DEFERRED TO EXTERNAL QA**.

## Implemented features

- Versioned public ExerciseDefinition and immutable ExerciseAttempt contracts. Canonical Python response schemas are exported through OpenAPI, with matching TypeScript interfaces. Metadata includes curriculum placement, related associations, authored recommendation, fixture versions, visible/hidden/edge check references, explicit solution reveal, hints, explanation and follow-ups.
- Standalone practice workspaces without a case, plus practice documents inside existing case workspaces. Both use the existing workspace/catalog/worker. Shared persistence retains drafts by notebook ID; opening another exercise saves the current draft first. Topic/language resume pointers are independent of case navigation and recommendation metadata.
- Interview browser in the existing activity rail, with search, topic, difficulty and solved/unsolved/review filters. Status uses server attempts for the installed exercise version. The browser explicitly describes its latest-200-attempt window.
- Named Interview layout with problem, code, output/checks and guidance panes. Existing Notebook, Two-page, Code + explanation, 2 + 1 and other Mosaic views reference the same blocks. Geometry persists without altering source or semantic execution order. Neutral/Fabric-inspired/Databricks-inspired skins affect presentation only.
- Separate visible Run and graded Submit controls through RuntimeClient and the serialized workspace worker. Submit captures exact saved source, SHA-256, workspace source checkpoint revision, exercise/validator/fixture versions, engine/package version, execution IDs, namespace generation, input versions, measured local time and check outcomes.
- SQL grading reruns source over server-owned visible/hidden/edge CTE fixtures using Engine.execute and the root duplicate-sensitive, exact-column row comparator with declared numeric tolerances. Fixtures do not replace workspace tables. A public-example constant passes Run but fails Submit.
- Hidden/edge expected rows, actual rows, SQL wrappers and detailed errors stay inside the worker. The public execution enters generic run history. Hidden execution IDs/outcomes live in the attempt; hidden raw executions are not copied into client-visible run history.
- Attempts persist as separate atomic files under the existing workspace document store, outside notebook revisions and the bounded generic run cache. Worker timeout/unavailability records an error attempt.
- Cell reset; bounded exercise reset including deleted-answer recovery; output clear; visible-check retry; persisted hint count; explicit server solution reveal; review/confidence/perceived-difficulty metadata; view-only hide; whole-document deletion with grouped output removal. Reset preserves unrelated source/notes.
- One-step undo for reset/clear/delete/hide/layout operations. Further content edits invalidate it to avoid overwriting later work; automatic geometry normalization preserves it. Layout reset restores hidden references without resurrecting deleted document blocks.
- Stable shared Monaco document/cell model paths, retained view state, bounded inactive model cache and removal of canvas remounting on every layout switch. Nonselected cells initially use the plain editor; users can activate Monaco individually. Cache eviction never deletes notebook source.
- Source-verified output hydration against server hashes, reset/clear suppression of old evidence, submitted-source capture for late results, and distinct current/stale/historical labels. Imported output remains untrusted. Imports validate and save a candidate before replacing live UI state; failed import/save retains current source.
- Rich ipynb attachments, unknown metadata and inert unsupported code remain preserved. Export now also retains unknown Datapass cell metadata properties. Root JSON remains the full practice-session format.

## Shared contracts and persistence

`Workspace.case_id` is nullable for standalone practice. Optional `notebooks`, `practice_resume`, and `practice_review` extend the existing workspace document. Old documents remain readable, including the untyped notebook-save compatibility path. Attempt `source_revision` identifies the shared workspace revision at the saved source checkpoint, not a keystroke counter.

New routes:

```text
GET /api/exercises
POST /api/exercises/{exercise_id}/solution
POST /api/workspaces/{id}/exercise
GET /api/workspaces/{id}/attempts
PUT /api/workspaces/{id}/practice/{exercise_id}/review
```

Run/Submit reject mismatched exercise versions/kernels, changed workspace revisions and source bytes different from the saved checkpoint. Requests cannot supply expected answers or grading specifications. `RuntimeClient.exercise` is the shared operation. Exercise schema and module contract versions remain 1; TruthKind adds semantic-emulation. Other kernel names in shared contracts do not imply implemented grading adapters.

## CodeDELeet and Mosaic provenance

Implemented audit concepts: canonical placement distinct from related associations; scoped practice resume distinct from recommendations and case state; durable drafts distinct from editor caches; candidate validation before import replacement. Referenced only: old pack schemas, workstation implementations, recommendations and corpus. No CodeDELeet problem text was fabricated or claimed as migrated. No old pack adapter was needed.

Reused Mosaic imported-view, grouping/deletion, semantic-order and layout-reset helpers. No second app shell, editor framework, database/catalog, runtime service or notebook format was introduced.

## Essential checks actually run

Evidence: `evidence/notebook-interview-pass-1-checks.txt`.

- `npm run typecheck`: passed without diagnostics, once during integration and once after final typed UI changes.
- `.venv/Scripts/python.exe -m pytest -q tests/test_interview.py`: 5 passed. Includes real DuckDB/SQLite grading, authenticated API submission, hidden redaction, source/revision rejection, attempt storage, draft/resume persistence, injected timeout handling and OpenAPI consistency. One existing Starlette/AnyIO deprecation warning.
- `node --experimental-strip-types --test tests/interview.test.mts`: initial 5 notebook tests passed.
- After adding deleted-answer recovery, `node --experimental-strip-types --test --test-name-pattern="exercise reset recovers" tests/interview.test.mts`: 1 additional targeted test passed. The full contract suite was not rerun.

Default host Node is 21.7.1. Focused Node tests used `C:/Users/julia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. External QA must put supported Node >=22.12 (preferably the prior verified Node 24) on PATH.

## Exact external QA commands

Every command below is **DEFERRED TO EXTERNAL QA** for this pass. Activate the Python environment, use supported Node, and free port 8000.

```powershell
python -m pip install -r requirements.txt -r requirements-engines.txt
npm ci
npx playwright install chromium
python scripts/verify.py --engines --frontend --browser
python scripts/startup-smoke.py
$env:DATAPASS_INSTALL_DUCKLAKE='1'
python scripts/ducklake-smoke.py
```

Individual gates, also **DEFERRED TO EXTERNAL QA**:

```powershell
python -m pytest -q
npm test
npm run typecheck
npm run build
npx playwright test tests/browser/interview.spec.ts
npm run test:browser
```

`npm test` now includes both notebook contract files. The new Playwright journey is authored but unrun: standalone Run/Submit, layouts, reveal, reload, reset/undo, failed import and narrow layout. No new screenshots, production build, full regression or browser results are claimed.

QA risk areas: Monaco state across layouts/responsive transitions; small-pane toolbar overflow/focus; custom geometry and hide/reset; case/practice switching; concurrent save conflicts; rich ipynb roundtrips; reset/clear plus reopen; stale versus historical badges; real timeout/restart rather than injected timeout; and the new browser test itself.

## Boundaries and remaining gaps

Real: local DuckDB or explicitly labelled SQLite SQL, measured time and persisted evidence. Simulated: existing Spark physical/cost metrics only, unchanged. Interview grading adds no simulated output or cloud resources.

Only two tiny internal SQL demos are installed (`demo-sum`, `demo-count`). No CodeDELeet corpus, legacy pack importer, Python/Polars/Spark judge, technique validator, ordered-row validator, multi-cell submission, grading cancellation UI or public/browser-only runtime was added. Grading uses the declared unordered comparator with fixed tolerances and existing SQL/preview/worker limits.

Root JSON retains practice/session identity. ipynb preserves notebook source, outputs, metadata and layouts but does not promise lossless practice progress/reveal/starter semantics. Undo is one operation, not persistent multi-step history. View-only hide is available on noncanonical layouts; Notebook preserves semantic order. Geometry uses existing drag/resize controls; semantic movement has keyboard-accessible buttons. Native keyboard geometry manipulation remains follow-up work.

Attempt files are durable; the initial API/browser returns the latest 200 without pagination. Workspace retention is bounded at 100 notebooks and refuses new documents rather than evicting drafts. Attempt JSON and workspace metadata are separate atomic writes, not a crash-atomic cross-file transaction. This is a local learning tool, not a hardened proctored judge.

Exact changed files: `evidence/notebook-interview-pass-1-files.txt`. Coordinator review may proceed; release promotion awaits external QA evidence.
