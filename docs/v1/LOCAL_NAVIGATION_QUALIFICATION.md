# Local navigation qualification — 2026-09-21

Base: `origin/main` at `b547bfa51cf8f94862569604107ac097f45f47a7` (merged PR #6).
Working branch: `codex/local-v1-fix`. Existing worktree:
`D:\PROJ\datapass-v1-publish-20260921`; it was clean before switching branches.

## Reproduced defect and fix

Hovering/clicking the activity rail reproduced the white flash and apparently
ignored navigation in the real localhost React application. Fluent UI copies
the provider's `dp-appearance` class to its tooltip portal. The class's
`min-height:100vh` made that absolutely positioned portal fill the viewport,
paint a white background and intercept clicks. DOM hit-testing confirmed the
portal above the Arena button; the selected section stayed Workbench. This was
not a page reload or an API connection failure.

`apps/web/src/studio/workspace/studio.css` now applies viewport sizing and root
painting only to `.dp-appearance[data-theme]`. Fluent's portal does not copy
that attribute. Tooltips remain enabled; their portal now measures zero height
and does not mask or intercept the application.

## Actual environment and launch

Python 3.13.1 in a newly created `.venv`; Node 26.9.0. Installed
`requirements-dbt.txt` and the npm lockfile with `npm ci`.

```powershell
.\.venv\Scripts\python.exe start.py --port 18080 --storage ducklake --install-ducklake --trusted-local-python --trusted-local-dbt
```

Opened the launcher's exact token-bearing `http://127.0.0.1:18080/` URL in the
Codex browser. The session credential is deliberately excluded from this report.
FastAPI serves `/api/*` and mounts the built `apps/web/dist` at `/`.
`apps/web/dist/index.html` exists; the browser loaded the hashed React and Monaco
assets, not the diagnostic client. The server was left running.

## Interactive qualification after rebuilding

| Section/action | Observed result |
|---|---|
| Workbench | Resource views, palette, rename and save worked. |
| Arena | Search/open worked; Count non-null values returned 3. Run passed; Submit passed visible, hidden and edge checks and persisted one attempt. |
| Notebook | Real Monaco loaded; source edits survived navigation and save. Attached DuckLake execution output rendered. |
| Workflow | All four Retail steps succeeded using the real local runtime. |
| Data | Six shared tables; Bronze 12 rows, Silver 10, Gold 5; DuckLake snapshot 47 and measured Parquet file evidence rendered. |
| Runs | Four workflow executions rendered; final KPI was revenue 4985, valid_orders 10, customers 5. Spark simulation remained separately labeled. |
| Case study | Retail brief, dataset, learning steps and execution truth rendered. |
| Workspace/resource creation | Created named Retail and standalone DuckLake workspaces, plus a canonical ConceptMotion figure; renamed the figure and advanced to frame 2. |
| Persistence | Reload restored the figure title, selected resource and frame 2. Switching to the standalone workspace and back restored the figure and saved Arena attempt. |
| Repeated rail navigation | Three complete seven-section cycles; every requested section stayed selected, workspace identity remained intact, no fatal render state or `runtime_not_connected`. |

The final UI did not reproduce the white overlay, flashing/reset loop or
unexpected full-page navigation. The new standalone workspace correctly disables
the case-only Workflow and Case study rail entries; those were qualified in the
Retail workspace.

## Checks and diagnostics

- `npm ci`: PASS. npm reported one moderate existing YAML advisory; no automatic
  dependency upgrade or force operation was performed.
- `.\.venv\Scripts\python.exe -m pip check`: PASS.
- `npm run typecheck`: PASS after the fix.
- `npm run build`: PASS after the fix; existing large-chunk advisory remains.
- `.\.venv\Scripts\python.exe -m pytest -q`: **304 passed, 4 skipped**, 2 warnings.
  The skips are three explicitly opt-in DuckLake integration tests and the live
  guided-service test. They are not counted as passed. The actual browser
  qualification above used DuckLake successfully.
- No failed `/api/*` responses, `runtime_not_connected`, React fatal error,
  backend exception or data-loss symptom was observed.
- One nonfatal Monaco `Canceled: Canceled` unhandled promise was captured during
  rapid editor editing/unmount. Source maps locate it in Monaco 0.52.2's word
  highlighter Delayer disposal. It did not recur in the subsequent normal
  navigation, Arena execution and persistence checks. This dependency diagnostic
  remains; it was not suppressed or relabeled as fixed.
- Initial `/favicon.ico` request returned 404. Backend/test warnings are the
  existing ArtifactBundle `schema` field warning and AnyIO deprecation.

Local raw logs remain in ignored `.local/local-v1-qa/`: `typecheck.log`,
`build.log`, `pytest.log`, `server.stdout.log`, `server.stderr.log`, `server.pid`.
The server stdout includes the private local session URL and must not be committed.

This qualifies the requested local navigation/execution/persistence journey,
not every optional V1 integration. Broad existing Playwright suites, live guided
Spark and opt-in maintenance/partition integration are **DEFERRED TO EXTERNAL QA**:

```powershell
$env:DATAPASS_PORT='18081' # keep the user's running app on 18080
npm run test:v1:browser
npm run test:browser
$env:DATAPASS_DUCKLAKE_INTEGRATION='1'
.\.venv\Scripts\python.exe -m pytest -q tests/test_lakehouse_profile.py
```

Live guided Spark qualification remains the separate opt-in procedure in
`LOCAL_RUN.md`. No cloud deployment or remote runtime qualification was performed.
