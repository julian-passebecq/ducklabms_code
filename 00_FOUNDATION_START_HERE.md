# Datapass Studio - Modular Root Foundation Pass 1

**Continue `julian-passebecq/ducklabms_code`. Do not create a new application.**

Implementation baseline:
- Branch: `integration/sparklab-runtime-pass-1`
- Commit: `dee5b0da0fe1cec4a9bd24179fe63cbf46bba7a3`
- Verified tree: `d10e3e7a34c21291bf0130d18a306bebab9d3cb2`

Delivery branch: `codex/modular-root-foundation-pass-1-result`.
The existing `codex/modular-root-foundation-pass-1` planning branch was not reset.
`main` and `codex/pipelines-warehouse-pass-1` were not used as implementation bases.

This package is the complete existing source plus a bounded foundation implementation,
not an overlay, prototype replacement or new repository. `.local` user data, dependencies
and generated build output are deliberately excluded. Keep your existing `.local`
directory when applying these source files. Do not upload the ZIP file itself as the
application: its contents are the repository files.

## Implemented

Resource registry and versioned resource/view references; one to three app-level
panes with independent tabs, orientation, width and focus; one shared notebook editor
with reference-only duplicate views; a shared ReactFlow canvas for editable workflow,
lineage and data-model designs; graph inspectors and validation; catalog/evidence
views using existing root state; validated import/export; optimistic workspace
persistence; local bounded undo/redo; explicit design/real/emulated/simulated truth.

The original Notebook, Monaco, Interview, exercise grading, SparkLab runtime, catalog,
case workflows and `.ipynb` contracts remain in place. All graph examples are authored
designs, not executions. No real scheduler, dbt CLI, DAX engine or cloud executor was added.

## Run

Follow `README.md` for the existing Python environment and optional engines, then:

```sh
npm ci
npm run build
python start.py
```

Use the token-bearing URL printed by `start.py`, open/create a workspace and choose
**Workbench** in the activity rail. Use **Link existing notebook** for a saved/current
notebook, then **Split pane**. The graph examples are under **Add a design**.
Save uses the same local workspace as the original application.

## Review before promotion

- `docs/foundation/CONTRACT_FREEZE.md`: current boundaries and deliberately deferred fields.
- `docs/foundation/DONOR_AUDIT.md`: actual source audited and mechanics extracted.
- `docs/foundation/QA_HANDOFF.md`: evidence, commands and outstanding release checks.
- `docs/foundation/workbench.schema.json`: generated supported import schema.
- `verification/foundation-pass-1/`: real narrow test/build logs and browser blocker.

**Status: implementation candidate; not release-qualified.**
18 focused TypeScript tests and 24 Python/API tests passed; typecheck and build passed.
Browser navigation was blocked by the execution environment before application checks.
Broad regression and browser/release QA are DEFERRED TO EXTERNAL QA. No previous release
matrix is being reused as evidence for this candidate.
