# Status and roadmap

## Verified current state

Functional code baseline before this architecture documentation:

`5ace7654baad1bc2d2dd1254efa5abd2a55cbb3e`

GitHub Actions run `35545166620` completed successfully for all current jobs:

- `ducklake-runtime` — PASS.
- `web-contract` — PASS.
- `playground-browser-smoke` — PASS.

PR #5 is open on `codex/real-spark-proxy-1`.

## V1 functionality already present

- React 19 + Fluent UI 2 shell.
- shared workspace/catalog.
- persistent notebook documents.
- real DuckDB execution.
- real DuckLake integration profile and Parquet/reopen smoke.
- real Polars local kernel when installed.
- trusted-local Python kernel.
- SparkLab PySpark semantic subset and simulated distributed metrics.
- draggable/resizable notebook canvas.
- saved notebook layouts.
- Studio / Fabric / LeetCode presentation presets.
- Fabric notebook tree.
- free coding canvas.
- LeetCode exercise arena and persistence.
- local table/catalog explorer.
- MotherDuck-ready playground with explicit disconnected truth.
- playground reset-to-starter action.
- production Vite build and Chromium smoke coverage.

## Important incomplete pieces

- MotherDuck remote adapter is not implemented.
- Cloudflare deployment is not implemented yet.
- Oracle real Spark/Airflow runtime is not deployed yet.
- public/multi-user authentication is not implemented.
- the current token model is local single-user.
- SparkLab is not real distributed Spark.
- existing GitHub remote Spark/Airflow paths are not the chosen final production runtimes.

## Next coding order

### Pass A — Cloudflare deployment scaffold

1. Add Cloudflare Wrangler configuration for `apps/web/dist`.
2. Use SPA static asset routing.
3. Add a minimal edge Worker only if required.
4. Keep `/api/*` unavailable or explicitly disconnected until a real HTTPS API origin is configured.
5. Add a Cloudflare build/deploy script and document required account setup.
6. Do not break `start.py` or local Vite development.

### Pass B — V1 usability polish

Prioritize actual use over more architecture work:

- simplify the playground landing page.
- improve Fabric notebook visual fidelity and notebook tree behavior.
- improve LeetCode problem/editor/results ergonomics.
- improve free canvas controls and reset/undo feedback.
- improve catalog/table/schema browsing.
- make runtime truth visible but compact.
- remove stale/duplicated controls exposed by historical integrations.

### Pass C — one-click local trial

Target a user flow close to:

```bash
python start.py --storage ducklake --trusted-local-python
```

with clear first-run DuckLake extension installation instructions.

The goal is that a new coding agent/user can spend 20–30 minutes using the product without understanding the historical migration work.

### Pass D — optional MotherDuck adapter

Only after local V1 is stable:

- explicit user opt-in.
- explicit credential configuration.
- explicit remote/local badge.
- no automatic upload.
- bounded preview/query behavior.
- tests proving local mode remains unchanged when MotherDuck is absent.

### Pass E — freeze V1 candidate

Run:

- Python regression.
- real DuckLake smoke.
- contract tests.
- TypeScript.
- Vite production build.
- focused Chromium journeys for all V1 entry points.

Then tag/document one exact candidate.

### Pass F — Oracle

After V1 acceptance:

- provision Java + Spark.
- deploy FastAPI service.
- add Airflow.
- run Polars/dbt as needed.
- expose API over HTTPS.
- point Cloudflare `/api/*` gateway to Oracle.
- keep local runtime available.

## Things not to do in the next pass

- do not restart the application architecture.
- do not split the product into separate repos/apps.
- do not add Prefect/Meltano.
- do not add another database merely because it is free.
- do not make MotherDuck mandatory.
- do not spend the next pass rebuilding real Spark before the React V1 is pleasant to use.
