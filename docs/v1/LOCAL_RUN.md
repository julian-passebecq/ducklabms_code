# Local setup and qualification

The final local release gates were exercised on Windows with Python 3.13 and Node 26.9.0. See `RELEASE_STATUS.md` and `qa/qualification/` for results and exact evidence. The subsequently supplied guided Spark endpoint passed live qualification; Run/Submit are available after session verification.

Work from the complete bundle's `source/` directory. Keep `.local/` backed up before testing an existing workspace. A fresh test data directory is preferable for first qualification. No cloud account or VM is needed for the normal local product.

## Install and build

Node must meet the repository's declared `>=22.12` engine. Use an isolated Python environment and install the full local-runtime requirements, not only the minimal API requirements. These commands are for Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dbt.txt
npm ci
npm run typecheck
npm run build
```

On macOS/Linux, replace `.\.venv\Scripts\python.exe` with `.venv/bin/python`.

Do not start a diagnostic client and call it the React app. The production UI must exist at `apps/web/dist/index.html`. If dependency resolution fails, preserve the error and fix the installation; do not replace real React/Fluent or native engines with stubs.

## First local launch

```powershell
.\.venv\Scripts\python.exe start.py --port 18080 --storage ducklake --install-ducklake --trusted-local-python --trusted-local-dbt
```

Open the token-bearing localhost URL printed by the launcher. The token is a local session credential; do not publish it. This is a local single-user application, not a public multi-user execution service.

`--install-ducklake` permits downloading the official DuckLake/SQLite DuckDB extensions. After the extensions are installed, omit that flag for normal operation. DuckLake is the canonical/default local lakehouse. `--storage duckdb` is an explicit alternate local mode. SQLite is a compatibility/testing mode, not a substitute for V1 native qualification.

The trusted flags enable code that runs with your OS-user privileges. Review Python and dbt project macros/hooks before enabling/running them. Subprocess isolation and bounded job control are **not a security sandbox**. Keep the API bound to localhost and use one Uvicorn worker.

## First useful journey

Create a named playground using the Explorer's optional name field. Use `+` or Ctrl+K to open/create canonical resources. Create a dbt project and inspect the seeded model/test files before running `build`. Open a chart board and query `warehouse.fct_sales` only after that dbt build succeeds. The dbt project, chart and notebook reuse the same workspace catalog; opening another pane does not copy them.

Create Pipeline Lab to edit the bounded sample DAG, compile it, and explicitly run it. Schedule labels are metadata only. The Local Orchestrator does not run while the app is closed. A failed/cancelled run may have completed earlier writes; inspect catalog state before rerunning.

The catalog's CSV importer creates a new `bronze.*` table, with at most 1 MB, 5,000 rows and 40 simple unique headers. Values remain VARCHAR; empty fields remain empty strings. Use explicit casts/null conversions in later SQL or DataFrame transformations.

## Re-run release checks

```powershell
$env:DATAPASS_PORT='18080'
$env:DATAPASS_DUCKLAKE_INTEGRATION='1'
npm run test:v1:models
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe scripts/v1-local-smoke.py --storage duckdb --output qa/v1/native-duckdb.json
.\.venv\Scripts\python.exe scripts/v1-local-smoke.py --storage ducklake --output qa/v1/native-ducklake.json
npx playwright install chromium
npm run test:v1:browser
npm run test:browser
```

The native smoke creates disposable fixtures, actually invokes dbt Core, reads generated matching artifacts/compiled SQL, checks the shared catalog after restart and grades native variants. Exit 2 is BLOCKED, not PASS. Use its explicit `--install-extensions` option only when necessary. The browser config defaults to DuckLake and a fresh `.local/v1-browser-proof` store. `DATAPASS_QA_PYTHON` can select an existing interpreter; `DATAPASS_QA_STORAGE=duckdb` is a separate explicit mode and does not certify DuckLake. Existing opt-in DuckLake tests also remain release gates: set `DATAPASS_DUCKLAKE_INTEGRATION=1` before running `tests/test_lakehouse_profile.py`.

`tsc -p tsconfig.v1-domain.json` is a useful smaller strict check, not a replacement for `npm run typecheck`. The M1/M2 standalone harness commands are component checks only.

## Optional guided fastapispark connection

The user-supplied `https://fastapispark.fastapicloud.dev` is the configured default and passed live qualification. Override `DATAPASS_GUIDED_SPARK_URL` in the API process environment to choose another compatible HTTPS service (or loopback HTTP development service); an empty value disables the remote capability. A service credential, when needed, belongs in `DATAPASS_GUIDED_SPARK_KEY`, not workspace documents. The endpoint was supplied by the user and qualified; this pass did not deploy or alter the remote service. The client inspects/negotiates service `datapass-fake-spark` version `0.1.0`, validates the plan and probes full/truncated/empty-result behavior before Run is enabled.

The guided UI requires consent to send curated fixture rows and your guided source. It does not silently upload arbitrary workspace tables. Remote DuckDB result rows are real bounded results; the accompanying tasks/stages/shuffle/spill/skew/duration model is explicitly simulated. No cloud pricing or Spark-cluster measurements are claimed. A configured URL alone is not qualification.

## Persistence / recovery

Durable resources, notebooks, attempts, catalog files and local-job evidence belong under the workspace data directory. Workbench JSON export is a design/reference export, **not** a complete dataset/notebook backup. Copy the full stopped application's data directory to back up a workspace. Retained M2 attachments are recovery evidence; do not delete them merely because the migration has completed. On server restart, interrupted local jobs are recorded as interrupted and are never automatically replayed.

To execute the otherwise-skipped live guided test deliberately, set `DATAPASS_GUIDED_SPARK_QA_URL` to the reviewed service and run `python -m pytest -q tests/test_guided_spark_v1.py`. This sends only the curated protocol probes/fixtures; setting a normal runtime URL alone does not opt into this network QA gate.

## Qualified environment and Charts interoperability

Port 8000 was reserved on the qualification host. `start.py --port 18080` and `DATAPASS_PORT=18080` for Vite/Playwright use another loopback port without changing execution semantics. Omit the option to keep the default 8000.

For the exact qualified Python package versions, install `qa/qualification/python-freeze.txt` into a clean Python 3.13 environment. `package-lock.json` fixes the frontend dependency graph. DuckLake/SQLite extensions are native DuckDB downloads and remain platform-specific; the native evidence records their active versions.

Optional official Charts renderer:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-charts.txt
.\.venv\Scripts\python.exe scripts/v1-local-smoke.py --storage duckdb --charts --output qa/qualification/native-release-duckdb-charts.json
```

Charts accepts a bounded single-query/single-chart SQL YAML subset: bar, line, KPI and table. Import is design only, clears previous result evidence, and never runs SQL. Run explicitly against the shared catalog, then apply the selected result. Export uses the official dbt Charts DSL; the native preview remains a distinct renderer. The official `dct` 0.8.0 CLI validated/rendered all four types against real dbt DuckDB output. Its direct dbt-profile adapter did **not** attach DuckLake and failed the optional DuckLake render check. Use the native Datapass chart renderer for the canonical DuckLake workspace; do not treat direct dct DuckLake rendering as supported.

The DAG Arena exercise grades semantic task identities, kinds, retry policies, dbt bindings and directed edges through the bounded compiler. It deliberately does not execute submitted task bodies or grade their SQL. Run checks visible criteria; Submit includes hidden criteria and persists an attempt with `design-only` truth. Pipeline Lab separately provides explicit real local execution.

## Reproduce the live guided gate

```powershell
$env:DATAPASS_GUIDED_SPARK_QA_URL='https://fastapispark.fastapicloud.dev'
.\.venv\Scripts\python.exe scripts/qualify-guided-spark.py --url https://fastapispark.fastapicloud.dev --output qa/qualification/guided-live-evidence.json
.\.venv\Scripts\python.exe -m pytest -q tests/test_guided_spark_v1.py
$env:DATAPASS_PORT='18080'
npx playwright test --config playwright.guided.config.ts
```

The live browser proof selects the guided lesson, checks session consent, verifies the service, proves Run/Submit enabled, runs the correct answer and persists a passed attempt. It also verifies that withdrawing consent disables execution. Normal use follows the same session verification flow; no manual environment configuration is needed for the supplied default endpoint. Availability may change after qualification, so a failed/expired live negotiation still fails closed.
