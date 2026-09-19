# Foundation pass 1: verification and external QA

## Recorded evidence

| Check | Actual status |
| --- | --- |
| Baseline source tree | Matched `d10e3e7a34c21291bf0130d18a306bebab9d3cb2` before edits |
| TypeScript compilation | PASS (`npm run typecheck`) |
| Production compilation/bundle | PASS (`npm run build`; includes typecheck) |
| Focused pure TypeScript tests | PASS: 18 tests |
| Focused Pydantic / Documents / API tests | PASS: 24 tests |
| Browser split-pane save/reopen smoke | BLOCKED by environment: `ERR_BLOCKED_BY_ADMINISTRATOR` on local HTTP navigation. No application browser assertions executed. |
| Broad inherited regression, real DuckDB/Spark execution and release QA | DEFERRED TO EXTERNAL QA |

Logs and the shared fixture live under `verification/foundation-pass-1/` and
`tests/fixtures/foundation.json`. Build warnings about large Monaco/main chunks remain;
a successful build is not evidence of acceptable load performance or browser behavior.

## Reproduce focused checks

```sh
npm ci
npm run typecheck
node --experimental-strip-types --test tests/foundation.test.mts
python -m pytest -q tests/test_foundation.py
npm run build
```

Use the existing Python requirements/setup instructions. No new Python dependency was
added by the foundation. The dependency-export CI run only resolved packages; it did
not run product QA and must not be described as a passing release pipeline.

## Run the targeted browser smoke in an allowed local environment

Start the existing API against an isolated test data directory, with the built UI:

```sh
DATAPASS_TOKEN=foundation-smoke DATAPASS_STORAGE=sqlite DATAPASS_DATA_DIR=.local/foundation-smoke python -m uvicorn apps.api.datapass.api:app --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
CHROMIUM_PATH=/path/to/chromium node scripts/foundation-browser-smoke.mjs
```

On Windows set the environment variables with PowerShell `$env:NAME='value'`.
Use a permitted browser/environment; do not bypass administrator policy. The script
creates a fresh case workspace in that isolated server, checks split notebook views,
adds workflow/lineage designs, saves, and reopens. It requires the repository's
`@playwright/test` dependency or an explicit compatible `PLAYWRIGHT_MODULE` path.

## External regression and release commands

```sh
npm test
python -m pytest
npm run test:browser
```

Follow the existing repository release instructions for its Python extras, DuckDB,
Polars and trusted-local Python configuration. These commands were NOT run as broad
suites in this coding pass. Existing test counts from previous releases are not
reused as evidence for the changed tree.

## Priority manual scenarios

1. Case and standalone Interview workspaces: existing Run vs Submit, attempts, hidden
   fixture privacy, source reset, .ipynb import/export and historical result hydration.
2. Two or three views of one notebook: exactly one live canonical editor, focus transfer,
   typing preservation, different notebook switching, closed tabs and undo/redo.
3. Workflow/lineage/model design editing: duplicate/dangling/cyclic connections, model
   column removal, selection synchronization, per-view geometry and viewport restoration.
4. Save conflict from another browser tab: unsaved graph source retained, safe export,
   no overwrite of notebook, practice metadata, attempt files or run history.
5. Import invalid JSON/schema/oversize/foreign notebook references while a workspace
   or draft changes: reject without execution or partial replacement.
6. Keyboard tab navigation, focus management, narrow screens, high zoom, reduced motion,
   minimized/restored panes, browser reload and browser storage denial.
7. Real DuckDB and SparkLab results: row equality independent of runtime profile,
   accurate truth labels, unchanged shared catalog freshness and existing acceptance tests.

## Known limits / not release-qualified

This is an implementation candidate, not a production-ready release. Full scheduler,
Airflow/dbt execution, provider activity palettes, column-level SQL lineage, DAX,
ML and MotherDuck execution are not part of this pass. Schemas describe supported
foundation fields only. Browser behavior and wider regression remain unverified here.
