# Datapass Studio Root 0.1.0

**One learning workspace. Optional tool paths. Real local data, explicitly simulated cloud behavior.**

This is the integration foundation created from the September 17, 2026 uploads. It is not a claim that every feature from the seven original applications has already been migrated. Read `START_HERE.md`, `docs/SOURCE_AUDIT.md` and `docs/VERIFICATION.md` first.

The new root contains a React / Fluent UI 2 application, a Mosaic-derived notebook core, a local FastAPI service with persistent kernel workers, connected case studies, a shared catalog and specialist handoffs. Original application sources are retained under `migration-sources/`; they are reference material, not seven embedded apps.

## Architecture reference

The compact architecture archive for Codex and future agents is now kept directly in this repository under `architecture-reference/`:

https://github.com/julian-passebecq/ducklabms_code/tree/main/architecture-reference

It preserves the Root 0.1.0 architecture/contracts/verification files, specialist agent instructions and the later Core Architecture Contract v1 summary without requiring the historical >100 MB archive bundle.

Historical/archive repository pointer:

https://github.com/julian-passebecq/ducklake_mslab

## Current evidence

Core Integration Pass 1 (September 18, 2026) closes the real dependency, strict TypeScript, production React/Vite and local-engine gates. See `docs/VERIFICATION.md` for raw logs, exact checks and limits.

- Real Python/npm packages installed; `package-lock.json` retained.
- Python regression coverage runs on both SQLite and DuckDB; real Polars executes.
- Production Chromium journeys exercise the React/Fluent app, locally bundled Monaco worker, all layouts, notebook persistence, ipynb import/export, keyboard execution, stale lineage and distinct run scopes.
- Real DuckLake attach/write/Parquet/reopen and Windows `start.py` startup pass.
- Version remains Root 0.1.0. This pass does not claim completion of specialist products or a v0.2 release.

## Start locally

Use Python 3.11+ and Node 22.16+ (Node is needed only for the React app and TS tests). Core Pass 1 was tested on Windows with Python 3.13.1 and Node 24.19.0. Use a supported Node runtime; the host's older Node 21 is insufficient.

```sh
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```sh
source .venv/bin/activate
```

Then install and build:

```sh
python -m pip install -r requirements.txt -r requirements-engines.txt
npm ci
npm run build
```

For the full local lakehouse profile, install the official DuckLake/SQLite extensions once and start:

```sh
python start.py --storage ducklake --install-ducklake
```

Later offline starts can use `python start.py --storage ducklake`. New DuckLake workspaces use DuckDB compute, SQLite metadata and Parquet data with Datapass data inlining disabled. Plain `--storage duckdb` remains a real local compatibility mode when the DuckLake profile is not required.

Open the token-bearing local URL printed by `start.py`. Do not share that URL. There is no deployed public site in this package.

For the ML/Python/Polars cases, explicitly enable trusted local code:

```sh
python start.py --storage ducklake --trusted-local-python
```

**Trusted Python has your operating-system user's privileges. A worker process is NOT a security sandbox. Do not expose this API to a network or run untrusted notebooks.**

For a dependency-light API trial without the React bundle or optional engines:

```sh
python -m pip install -r requirements.txt
python start.py --storage sqlite
```

When `apps/web/dist` does not exist, port 8000 serves a clearly labeled **offline API diagnostic client**, not the compiled React application. The diagnostic client uses the same cases, workers and catalog; it is not a second implementation of the data engine. Its source edits are session-only. Use the React app for persistent notebook editing.

For frontend development, run `npm run dev` in a second terminal and use the port-5173 token URL printed by the backend. Vite proxies `/api` to the local backend. Always run one API worker.

## First connected case

Choose **Retail revenue lakehouse**. Run its workflow and then check the case:

`source.orders (12) -> bronze.orders (12) -> silver.orders (10) -> gold.customer_revenue (5) -> KPI revenue 4985 / orders 10 / customers 5`.

The explicit business rule excludes zero and negative amounts; it is a teaching rule, not universal revenue accounting. Changing Bronze makes dependent Silver and Gold assets stale. Failed acceptance prevents downstream workflow steps from running.

## Repository map

| Directory | Responsibility |
|---|---|
| `architecture-reference` | Compact architect/source-of-truth reference for Codex and future agents |
| `apps/web` | One FluentProvider, shell, explorer, module surfaces, notebook editor |
| `packages/notebook-core` | Domain-neutral Mosaic layout, ipynb import/export, project sanitization |
| `packages/contracts` | Root v1 shared types; generated backend OpenAPI snapshot |
| `apps/api/datapass` | Workspace documents, catalog ownership, worker lifecycle, API |
| `services/sparklab`, `services/semantic` | Reused bounded Spark compiler and virtual physical/cost model |
| `content/cases` | Eight small, connected, optional-tool learning paths |
| `migration-sources` | Retained original sources for specialist migration |
| `docs/agents` | Bounded prompts with ownership and test gates |
| `diagnostic` | No-build HTTP client, explicitly NOT the React app |
| `tests`, `evidence` | Executable checks and recorded verification limits |

## Commands

```sh
python -m pytest -q
npm test
npm run typecheck
npm run build
```

`npm run test:syntax` is a syntax check only, not a substitute for the two preceding build gates. The package intentionally does not include a fabricated npm lockfile: generate and commit one after a successful real dependency installation.

## Scope boundaries

This root does not run real distributed Spark, Azure/Fabric services, Airflow's scheduler, dbt Core, the Power BI DAX/VertiPaq engine, a Databricks cluster or a MotherDuck connection. It does run the local semantics described by its capabilities endpoint. Do not infer cloud parity from a familiar-looking interface.

The original sources have different dependency versions and independent state/runtime models. Their code is not automatically compatible merely because it uses React. Migrate behind the root contracts; do not paste their App.tsx files together.