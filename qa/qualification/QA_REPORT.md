# Datapass V1 — final implementation and qualification

**2026-09-21 — PASS for the local V1 release profile.** Live guided Spark at the user-supplied `https://fastapispark.fastapicloud.dev` is **PASS**: protocol probes, real grading and a production-browser Run/Submit journey passed. The endpoint is configured by default; session consent/verification enables Run and Submit. Optional direct `dct` rendering against a DuckLake dbt profile **FAILS** with the installed external adapter and is not a supported V1 path. This is a complete edited implementation with real qualification, not a handoff-only archive or a claim that every optional integration passed.

The authoritative input was `Datapass_V1_Implemented_Candidate_2026-09-21.zip`. Its complete `source/` was edited in place after inspecting the requested documentation. The candidate source tree was verified as `e48875e891042c9e3f3bb25e9e6ee681afc05130`. No restart from GitHub/main, old overlay replay, push or deployment occurred. The root `GIT_INFO.json`, `SOURCE_MANIFEST.json`, `CHANGED_FILES.txt` and binary patch identify the final tree and each change.

## Release gates

All evidence links below are relative to the delivered `source/qa/qualification/` directory. Earlier failure logs are retained for audit; the final logs named in this table supersede those attempts.

| # | Gate | Status | Exact evidence / scope |
|---|---|---|---|
| 1 | Frontend/backend dependencies | PASS | `npm-ci.log`, `pip-install.log`, `yaml-install.log`, `dct-install.log`, `pip-check.log`; lockfile plus `python-freeze.txt` and `npm-tree.json` |
| 2 | Full TypeScript + production build | PASS | `typecheck-release.log`, `build-release.log`; real React/Fluent/Vite production bundle; no stubs |
| 3 | Complete backend suite | PASS | `backend-release-live.log`: **308 passed, 0 skipped**, DuckLake integration and the supplied live endpoint enabled |
| 4 | Real local DuckDB | PASS | `native-release-duckdb-charts.json`, connected production browser suite |
| 5 | Canonical DuckLake | PASS | `native-release-ducklake.json`: SQLite metadata + actual Parquet; restart/catalog proof; 5 native browser journeys |
| 6 | Python/pandas | PASS | Native smoke + imported notebook browser execution; returned answer 42 from real pandas |
| 7 | First-class Polars | PASS | Native smoke + Polars notebook cell browser execution; real installed Polars, no pandas relabeling |
| 8 | dbt Core + dbt-duckdb | PASS | Actual subprocess builds in both storage modes, 3 smoke seed/model/test steps; browser starter project builds 14 nodes/tests |
| 9 | dbt artifacts/compiled SQL/lineage | PASS | Matching invocation IDs and tests; Windows artifact path fix; `artifacts/{duckdb,ducklake}/` contains actual manifests, results, compiled SQL, job records and saved resource document |
| 10 | Resource/View/Pane persistence + migration | PASS | `models-final.log` covers migration idempotence/deduplication/recovery; browser proves one figure resource behind independent views/panes, save/reopen, resource persistence |
| 11 | Jupyter import/export + layouts | PASS | Full connected browser round-trip preserves cells/results; invalid import recovery, notebook/practice/alternate layouts and free-canvas geometry; native imported SQL/pandas/Polars cells |
| 12 | Data Model / star schema / SCD 1/2/3 | PASS | Pure model tests plus native browser star schema, DDL preview, all 3 SCD modes and persisted choice; these are authored/design teaching resources |
| 13 | Charts interoperability | PASS (bounded scope) | Native YAML import/export/re-execution browser round-trip on both engines. Official `dct` **0.8.0** validates/renders bar, line, KPI and table against real DuckDB/dbt output; `native-release-duckdb-charts.json` and four `dct-duckdb-*.html` files |
| 14 | Pipeline Lab / Local Orchestrator | PASS | Backend compiler, local job/retry/cancellation/checkpoint tests; native browser runs the saved 2-task SQL/quality pipeline in both engines and shows execution evidence |
| 15 | Unified Arena, including DAG design | PASS | New bounded compiler/IR grading adapter, 8 focused DAG tests included in full suite, browser Run/Submit/hidden checks/attempt persistence; DAG truth is explicitly `design-only` |
| 16 | Guided Spark live qualification | PASS | `guided-live-evidence.json`: live service/version/compiler, full/truncated/empty-result and grading probes; `guided-live-browser.log`: 1 passed, Run and Submit enabled and successful, attempt/provider evidence persisted |
| 17 | ConceptMotion-style resources | PASS (original adapter) | Figure/model tests and native browser shared figure/view independence, semantic frames, skins/themes and reopen; no claim of a certified external ConceptMotion SDK |
| 18 | Native browser principal flows | PASS | `browser-release-duckdb.log`: **13 passed**. `browser-release-ducklake.log` + `native-browser.json`: **5 passed**. DuckLake reruns a native subset. A separate `guided-live-browser.log` adds **1 passed** live-service journey |
| 19 | Discovered runtime/UX/build defects | PASS | Repairs listed below; both native storage journeys and full regression green |
| 20 | Final release evidence | PASS (local profile) | 178 frontend/model tests; 308 backend tests; native dbt/engines; full build; 13 + 5 local browser executions plus 1 live guided journey; root hashes/manifests/patch and raw QA records |
| — | Optional direct dct → DuckLake profile | FAIL / unsupported | `native-ducklake-charts.json`: external adapter opens the DuckDB path without attaching DuckLake, then fails `SET search_path` for `warehouse`. Native Datapass DuckLake charts pass |

The original no-endpoint report (306 passed, 1 skipped) is superseded by the live-enabled backend run (308 passed, no skips), including one new endpoint-configuration test. Earlier local browser tests still verify that consent/qualification is required; they do not permanently disable the configured service. The 178 frontend/model total is **46 + 132** from the two commands in `npm run test:v1:models`; these include the notebook, contracts, foundation, resource migration, model/SCD, figures and Charts tests. Backend/focused counts overlap and must not be summed.

## Implemented and fixed

- Completed Arena structural DAG grading through the existing bounded compiler. Task IDs/kinds, retry policies, dbt references and directed edges are graded; formatting, aliases and declaration order do not matter. Run uses visible checks, Submit includes hidden checks and stores a separate attempt. Task bodies are not executed by the grader.
- Added bounded dbt Charts YAML import, with unsupported options/remote sources/aliases rejected and prior execution evidence cleared. Export now conforms to the actual official renderer, including KPI syntax. Imported SQL executes only through the explicit shared-catalog action.
- Fixed real dbt plugin discovery: executing `dbt_worker.py` by path exposed Datapass adapter files as false top-level `dbt_*` plugins. The worker now removes only its own source directory before importing dbt.
- Normalized Windows dbt manifest paths so compiled SQL and source files match. Added a regression test.
- Serialized safely representable DuckDB DECIMAL results as JSON numbers so real revenue charts render. Higher-precision decimals remain strings rather than silently rounding; non-finite decimals become null.
- Registered newly created/imported notebooks as canonical workspace resources and persisted generated case notebooks before opening their resource view. Fixed stale owner closures during Arena creation.
- Prevented delayed runtime refreshes from replacing a newer workspace revision. Prevented applying a chart result while another run is starting or when its SQL differs from the current draft.
- Applied guided-service availability to all execution buttons and notebook shortcuts, with session qualification expiry. The user subsequently supplied a live endpoint, which passed qualification and is now configured. Run and Submit are enabled after session consent/verification; there is no permanent compatibility block.
- Removed the remaining Pydantic `ModelTable` schema-name collision and made OpenAPI export line endings deterministic.
- Added configurable loopback port support to launcher, Vite proxy and browser qualification. The host reserves port 8000; qualification used 18080.
- Updated retained browser selectors to the implemented Arena/shared-layout UI and added real dbt/chart/pipeline/SCD, DAG Arena, native kernel and YAML round-trip journeys. Added an explicit live guided browser journey against the supplied fastapispark service. Historical evidence files were preserved.

## Truth boundaries and remaining limitations

The workspace owns one canonical resource; views and panes refer to it. Notebook source, resources, layouts, attempts and execution history remain distinct. Saving/opening another pane does not execute code or duplicate a dbt/model/pipeline resource. Imported artifacts remain imported; only server-validated local jobs establish real-local provenance. Native dbt project execution is real dbt Core. The small Arena dbt/Spark variants retain their explicit bounded semantic-emulation identity. DAG Arena grading, Data Model/SCD and figure frames are design/teaching semantics, not measured runtime results. Spark cluster metrics remain simulated.

The supplied fastapispark endpoint passed live qualification on 2026-09-21. Qualification is point-in-time, expires after ten minutes within a running session, and is checked again for version drift before each Run. It does not attest a deployed source commit or turn simulated distributed metrics into real Spark measurements. The environment variable `DATAPASS_GUIDED_SPARK_URL` can override the configured endpoint; setting it to an empty string disables remote capability. Direct external dct DuckLake rendering is unsupported with the qualified adapter; use native Charts for canonical DuckLake workspaces. YAML interoperability is intentionally a single SQL query/chart subset, not arbitrary dbt Charts projects, macros, remote data sources or custom rendering. The FigureResource adapter is original Datapass code, not a vendored/certified `@conceptmotion/*` package.

The Local Orchestrator is manual/sequential and local; schedule labels are metadata, and it does not run while Datapass is closed. Python/dbt run as the local OS user after explicit trusted-local opt-in; subprocess isolation is not a security sandbox. Some high-precision DECIMAL values remain strings and are not automatically numeric chart measures; use an explicit SQL cast when approximate visualization is intended.

Build succeeds with a large-chunk advisory (Monaco and the main UI). Backend has two non-failing upstream/schema warnings (AnyIO deprecation and ArtifactBundle's existing `schema` field). No runtime/build failure is hidden behind those warnings. Local and live guided qualification were on Windows/Python 3.13/Node 26.9.0/Chromium; other operating systems and browsers were not certified.

No Iceberg, Oracle VM, real Airflow scheduler, Prefect, Kubernetes, required Docker, distributed Spark, terminal/PTY, SSH, Git/Linux curriculum, IaC or generic CI/CD curriculum was added or revived. Frozen historical material is retained as reference.

## Reproduction and contents

See `qa/qualification/COMMANDS.md` for exact install/test/build/browser commands and `docs/v1/LOCAL_RUN.md` for launch instructions. Qualified versions: DuckDB 1.5.5, pandas 3.0.6, Polars 1.44.2, dbt Core 1.11.15, dbt-duckdb 1.11.0, dbt Charts 0.8.0; all transitive Python versions are frozen in the evidence. DuckLake extension identity is recorded in the native report.

The ZIP contains the **complete edited source**, all retained original repository files, raw current/historical QA logs, browser screenshots, official-renderer HTML, and actual local dbt artifact samples. Generated dependency folders, virtual environment, private local workspaces, caches, `.git` working directory and reproducible production `dist` are excluded. The Git bundle at archive root preserves the local baseline/final commits separately. Rebuild using the lockfile/frozen dependencies; this is not a binaries/installer archive. Root source manifest hashes cover every shipped source file, and `SHA256SUMS.txt` beside the final ZIP hashes the archive.
