# Analytics M2 in the assembled Datapass repository

Read architecture/07_ANALYTICS_M2.md first. This is the original pinned source with
M1/M2 additions, not a claim of completed production QA.

## UI without a backend

Run npm ci, then START_ANALYTICS_M2.cmd (Windows), or npm run dev and open the Vite
URL with ?preview=2. The UI-only route uses sample notebooks and no compute service.
The normal URL remains the existing connected app. ?preview=1 retains M1.

The no-install delivery preview is copied to analytics-m2-preview/index.html.

## Optional local dbt workflow

The supplied teaching project lives in examples/analytics-m2/retail-dbt. In a reviewed
virtual environment install dbt-duckdb, then inspect the dry run:

python tools/run_local_dbt.py --project examples/analytics-m2/retail-dbt --action build

Only append --execute to run reviewed local code. Install dbt-charts separately for
charts-validate/charts-render actions. These installed engine invocations were not run
in the delivery environment, and the UI's dbt Run button is not wired to this wrapper.

Import manifest.json and run_results.json from the same successful local invocation
into dbt Studio. They remain labelled imported historical evidence.

## Ownership / qualification

Analytics state is under datapass:analytics:v1 inside RootNotebook.blockState. It is
saved with the notebook and retained by the root restore function; source is not cloned
when opening a layer tab. Project JSON includes this attachment; ordinary .ipynb does
not. Resource tabs are not independent notebook documents or isolated runtime sessions.

External QA: npm run typecheck; npm test; node --test tests/ui-m1-model.test.cjs
tests/analytics-m2-model.test.cjs; npm run build; npx playwright test --config
playwright.analytics-m2.config.ts; then the existing connected backend journeys.
Native React 19/Vite/Monaco, server persistence, dbt/dct and optional cloud engines must
be qualified before a release. No Oracle, Docker, Airflow or Prefect is required for UI.
