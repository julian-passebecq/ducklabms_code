# Verification and release gates

Notebook + Interview Practice Pass 1 adds implementation after the core evidence below. Its narrow checks are in `NOTEBOOK_INTERVIEW_PASS_1_HANDOFF.md` and `evidence/notebook-interview-pass-1-checks.txt`. All broad regression, browser, build and release revalidation for that pass is **DEFERRED TO EXTERNAL QA**. The historical core results below do not certify this new pass.

Date: September 18, 2026 (Europe/Zurich). Scope: Core Integration Pass 1, existing Root 0.1.0, Windows local single-user mode. Branch: `codex/core-integration-pass-1`. No new implementation release number is declared.

## Executed gates

| Gate | Actual result | Raw evidence |
|---|---|---|
| Python dependency installation | PASS, real DuckDB 1.5.5 and Polars 1.44.2 installed | `evidence/core-pass-1-pip-install.txt`, `core-pass-1-python-versions.txt` |
| npm dependency installation and lockfile | PASS, 182 packages audited, zero vulnerabilities at install time; real `package-lock.json` | `evidence/core-pass-1-npm-install-supported.txt`, `core-pass-1-npm-versions.txt` |
| Strict TypeScript | PASS, `tsc --noEmit`, no diagnostics | `evidence/core-pass-1-typecheck.txt` |
| Production Vite build | PASS, Vite 6.4.3, local Monaco worker included | `evidence/core-pass-1-build.txt` |
| Python regression suite | **117 passed, zero skipped**, one dependency deprecation warning | `evidence/core-pass-1-pytest.txt` |
| TypeScript notebook/contracts | **18 passed**, including the original 16 | `evidence/core-pass-1-contracts.txt` |
| Production React browser journeys | **2 passed**, Chromium 153 through Playwright 1.63; no page errors in connected journey | `evidence/core-pass-1-browser.txt`, three `core-pass-1-react-*.png` images |
| Actual DuckDB | PASS: reference workflows, persistence/restart, stale/recompute, SQL rollback, worker timeout and workspace isolation | Python, browser and HTTP evidence above/below |
| Actual Polars | PASS: optional-engine case executes with installed Polars | `test_real_polars_when_installed` in Python log |
| Actual DuckLake | PASS: attach, Retail workflow, physical Parquet file, close/reopen and revenue 4985 | `evidence/core-pass-1-ducklake.txt` |
| Windows launcher and real HTTP | PASS: `start.py --storage duckdb`, token-authenticated API, production React assets, **9 HTTP checks** | `evidence/core-pass-1-startup-http.txt`, `evidence/http-smoke.json` |
| Python syntax compilation | PASS: `python -m compileall -q apps/api scripts` | No diagnostics |

Test environment: Python 3.13.1, Node 24.19.0, React 19.3.0, Fluent UI React 9.74.7, TypeScript 5.9.3. Exact installed dependencies are recorded in the version logs and npm lockfile. Initial installation exposed the host's unsupported Node 21; subsequent installation and gate execution used Node 24.19.0. Initial Python failures are retained in `core-pass-1-pytest-initial.txt` and superseded by the passing log.

## What was exercised

The backend's shared engine fixture now runs the same regression cases on SQLite and real DuckDB. Seven connected reference workflows, real row/schema/value acceptance, bad transformations, incompatible schemas, transactional replacement rollback, SQL restrictions, Spark/Python state, notebook isolation, stale lineage and recomputation execute on both. Worker tests exercise real processes for concurrent request serialization, restart and infinite-loop timeout recovery in both modes. A separate DuckDB test verifies workspace table and variable isolation. API tests verify authentication, origin restrictions, registered output assets and optimistic revision conflicts. Windows atomic-file retry coverage verifies that transient locks recover and persistent errors leave the old document intact.

The browser serves `apps/web/dist` from FastAPI on the supported port 8000. It creates Retail workspaces, loads the actual Monaco editor and its bundled worker, obtains revenue **4985 / orders 10 / customers 5**, switches Practice, Notebook, Two-page, Code + explanation, 2 + 1, Dashboard and Free canvas, resizes a block, saves and reloads source and practice geometry. It exports and imports ipynb, verifies cell identities and executable source, confirms import does not execute, runs an imported case workflow and checks four cell-attached outputs. Corrupt import retains the existing notebook. Contract tests additionally cover metadata/attachments/inert HTML, unsupported magics and duplicate project identities.

The second browser journey uses Ctrl+Enter, repairs invalid SQL, changes cell kernel without losing source, verifies unsaved edits disable workspace switching, compares results across virtual profiles, mutates Bronze, observes stale Gold, recomputes, and restarts. An added notebook cell republishes Bronze: Run Notebook executes it and invalidates Gold, while Run Workflow runs only the four registered dependency tasks and restores freshness. Run One records only its selected cell. Keyboard focus and the 600-pixel responsive workspace navigation are checked. These are targeted keyboard/responsive checks, not a claim of a full accessibility audit or every browser/device combination.

Screenshots show the production client, not the diagnostic page:

- `evidence/core-pass-1-react-retail.png`: actual DuckDB-backed Retail KPI and shared assets.
- `evidence/core-pass-1-react-notebook.png`: actual notebook editors and evidence after runtime recovery.
- `evidence/core-pass-1-react-narrow.png`: narrow viewport with the same notebook source.

## Fixes and ownership

- Mutable local layout builders now satisfy the real grid library's readonly public layout type.
- Metadata writes retain atomic replacement and retry bounded Windows sharing locks.
- DuckLake creates workspace data directories and allowlists only its own data path before disabling external access.
- The reused semantic executor test expects the actual installed engine instead of hardcoding SQLite.
- Workflow results attach to imported cell identities through registered step IDs, including reopened server evidence; selecting case steps resolves their imported blocks.
- Import confirmation survives the save operation. Narrow layouts stack existing blocks without changing saved geometry; the explorer is reachable through a workspace toggle.
- Static per-module panels receive root-owned workspace/notebook IDs, runtime services and catalog inspection. No new provider, catalog, database abstraction, notebook engine or specialist app was introduced.

Exact changed files: `evidence/core-pass-1-files.txt`. Migration ledger: `docs/SOURCE_AUDIT.md`. Archived September 17 verification remains historical under `architecture-reference/CURRENT/VERIFICATION.md`; old evidence files are not added to current test totals.

## Reproduce

Use Python 3.11+ and supported Node 22.16+ with the virtual environment active. Port 8000 must be free for browser/startup tests.

```sh
python -m pip install -r requirements.txt -r requirements-engines.txt
npm ci
npx playwright install chromium
python scripts/verify.py --engines --frontend --browser
python scripts/startup-smoke.py
```

DuckLake is a separate, explicit extension-download smoke gate:

```powershell
$env:DATAPASS_INSTALL_DUCKLAKE='1'
python scripts/ducklake-smoke.py
```

`verify.py` runs Python, TypeScript contracts, strict typecheck, build, then browser tests. The browser harness starts its own real API and uses `.local/browser-pass`; screenshots and raw gate logs are retained separately. `startup-smoke.py` starts the actual launcher in temporary storage, runs the HTTP checks, stops its workers and exits without logging its random token.

## Boundaries and unresolved items

No blocking Core Pass 1 gate remains. Vite reports large chunks (including lazy Monaco); bundle-size optimization remains follow-up work. Starlette's test client reports an AnyIO alias deprecation; tests pass. No public deployment or cloud provisioning was performed.

Real: local DuckDB/SQLite SQL, bounded SparkLab semantics over actual catalog rows, opted-in trusted CPython/Polars, measured local execution time, real DuckLake storage in its explicit mode. Simulated: virtual Spark workers/partitions/durations/shuffle/costs only for the supported immutable truth pack; these are not real clusters or invoices. Profile changes do not change physical results. Unsupported: full PySpark/Jupyter protocol, arbitrary SQL external I/O, full T-SQL/DAX/dbt/Airflow/ADF semantics, MotherDuck, multi-user service and hardened hostile-code isolation.

Existing limits remain: bounded SQL parsing/lineage, no crash-atomic transaction across JSON metadata and database files, preview/publication limits, no streaming run progress, and trusted Python has the local user's privileges. Original specialist features remain unmigrated as documented in the source audit. Passing local gates does not turn Root 0.1.0 into v0.2.
