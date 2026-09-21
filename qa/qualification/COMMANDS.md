# Qualification commands

Executed from `D:\PROJ\datapass-v1-final-20260921\source` in PowerShell without loading the host's broken conda profile. Commands below are the dependency and final release checks, not an instruction to reapply the old handoff. Historical failed attempts remain in this directory with their original names.

## Dependency restoration

```powershell
py -3.13 -m venv .venv
npm ci --no-audit --no-fund
.venv/Scripts/python.exe -m pip install -r requirements-dbt.txt
npm install --workspace @datapass/web yaml@2.8.2 --save-exact --no-audit --no-fund
.venv/Scripts/python.exe -m pip install dbt-charts
npx playwright install chromium
.venv/Scripts/python.exe -m pip freeze
npm ls --all --json
.venv/Scripts/python.exe -m pip check
```

The delivered `package-lock.json` already includes YAML. Reproduction requires only `npm ci`, not the separate YAML addition. `requirements-charts.txt` pins the qualified optional renderer. `python-freeze.txt` contains every installed Python version and can be installed with `pip install -r qa/qualification/python-freeze.txt` on the qualified Python/platform.

## Final gates

```powershell
npm run typecheck
npm run build
npm run test:v1:models
$env:DATAPASS_DUCKLAKE_INTEGRATION='1'
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe scripts/v1-local-smoke.py --storage ducklake --output qa/qualification/native-release-ducklake.json
.venv/Scripts/python.exe scripts/v1-local-smoke.py --storage duckdb --charts --output qa/qualification/native-release-duckdb-charts.json
$env:DATAPASS_PORT='18080'
npm run test:v1:browser
npm run test:browser
git diff --check -- . ':(exclude)qa/qualification/**'
```

Captured outputs: `typecheck-release.log`, `build-release.log`, `models-final.log`, `backend-release.log`, `native-release-*.{json,log}`, `browser-release-ducklake.log`, `browser-release-duckdb.log`. The native browser JSON report is `native-browser.json` (DuckLake); screenshot and actual dbt artifact samples accompany it. The model command runs 46 + 132 = 178 tests. That initial full backend run enabled DuckLake and skipped only live-service QA; the live-enabled continuation below supersedes its backend result. Playwright starts/stops a real single-worker FastAPI server serving the Vite production build. The full config uses real DuckDB; `playwright.v1.config.ts` uses real DuckLake by default. Component-only preview tests in the full suite do not substitute for its connected/native tests.

Final targeted regression checks during repairs included:

```powershell
.venv/Scripts/python.exe -m pytest -q tests/test_pipeline_grading.py
.venv/Scripts/python.exe -m pytest -q tests/test_decimal_results.py
$env:DATAPASS_DUCKLAKE_INTEGRATION='1'
.venv/Scripts/python.exe -m pytest -q tests/test_lakehouse_profile.py
.venv/Scripts/python.exe scripts/export-openapi.py
npx playwright test tests/browser/v1-resources.spec.ts
npx playwright test tests/browser/v1-resources.spec.ts -g 'native dbt'
```

The optional direct DuckLake/dct probe was run and FAILED:

```powershell
.venv/Scripts/python.exe scripts/v1-local-smoke.py --storage ducklake --charts --output qa/qualification/native-ducklake-charts.json
```

Each `--charts` report records the exact `dct validate` and `dct render --format html --output ... --no-cache` child command, exit code and raw stdout/stderr. Temporary fixture paths in reports describe the actual run; the smoke script creates fresh paths on reproduction. The child command receives `DBT_PROFILES_DIR` and `PYTHONUTF8=1`. The four qualified HTML artifacts are `dct-duckdb-{bar,line,kpi,table}.html`.

The initial local-only pass set no live endpoint. The subsequent user request explicitly supplied and authorized the fastapispark endpoint; the following commands sent curated teaching fixtures to it. No push, deployment or modification of the remote service occurred.

Raw generated QA logs and vendor-generated HTML/artifacts retain their original bytes and line endings; the whitespace gate excludes that evidence directory.

## Final live endpoint continuation

```powershell
$env:DATAPASS_GUIDED_SPARK_QA_URL='https://fastapispark.fastapicloud.dev'
.venv/Scripts/python.exe -m pytest -q tests/test_guided_spark_v1.py
.venv/Scripts/python.exe scripts/qualify-guided-spark.py --url https://fastapispark.fastapicloud.dev --output qa/qualification/guided-live-evidence.json
$env:DATAPASS_PORT='18080'
npx playwright test --config playwright.guided.config.ts
$env:DATAPASS_DUCKLAKE_INTEGRATION='1'
.venv/Scripts/python.exe -m pytest -q
```

Outputs: `guided-live.log` (31 tests before adding the endpoint configuration regression), `guided-live-evidence.{json,log}` (raw live request/response evidence and expanded semantic probes), `guided-live-browser.{json,log,png}` (1 native production browser journey), and `backend-release-live.log` (308 passed, no skips, including the new configuration regression). The application production bundle and all prior local gates remain unchanged by this backend endpoint/configuration continuation. Explicit live browser QA is opt-in so routine local browser tests do not upload fixtures unintentionally.
