# Verification and release gates

Date: September 17, 2026. Scope: Root 0.1.0 source foundation, local single-user mode.

## Executed evidence

| Check | Result | Evidence |
|---|---|---|
| Python root + reused runtime regression suite | 75 passed, 2 skipped | `evidence/pytest-full.txt` |
| Executable TypeScript notebook and contract tests | 16 passed | `evidence/notebook-contract-tests.txt` |
| TypeScript/TSX syntax | 15 source files, zero syntax diagnostics | `evidence/typescript-syntax.txt` |
| Actual local HTTP service integration | 9 checks passed | `evidence/http-smoke.json` |
| Original uploaded SparkLab Python baseline | 52 passed before integration | `evidence/upstream-pytest.txt` |
| Python syntax compilation | Completed for new API and scripts | Reproduce with `python -m compileall -q apps/api scripts` |

Do not sum the original-baseline tests into the root test count. The HTTP checks are integration assertions, not an additional browser/UI suite. TypeScript syntax checking does not resolve dependencies or validate all types.

## What the tests demonstrate

The root executes seven complete reference workflows in actual SQLite compatibility mode, including trusted CPython regression. It verifies real row/schema/value acceptance, transitive staleness, source mutation, preview-only KPI output checks, SQL replacement rollback, supported Spark symbol persistence and notebook isolation, concurrent request serialization, process restart and infinite-loop timeout recovery, API authentication/origin rules, document revision conflicts and bounded input rejection.

The immutable reference fixture check prevents virtual Spark metrics from being attached to changed physical inputs. Python reads now participate in lineage. A graded API step cannot redirect output to an unrelated asset and reuse old successful acceptance. SQL-string filters that this bounded Spark adapter does not support return an explicit limitation instead of an obscure AttributeError.

TypeScript contract tests verify same-source identity across layouts, geometry versus semantic order, explicit semantic moves, custom practice-layout restore, source preservation, kernel-type changes, ipynb metadata/attachments/raw-output round-trips, inert imports, read-only unsupported magics, custom Spark kernel metadata, cell-specific output attachment, server-evidence notebook isolation and stale report provenance.

The actual HTTP run creates a workspace, runs all four retail steps, obtains revenue 4985 / orders 10 / customers 5, rejects an edited wrong transformation, invalidates downstream acceptance and verifies that restart preserves catalog rows/versions. It also verifies delivery of the diagnostic HTML/CSS/JS. It does not prove that a browser renders those files correctly.

## Explicitly skipped or blocked

| Gate | Status | Reason / required action |
|---|---|---|
| DuckDB execution test | SKIPPED | Package unavailable; install requirements-engines.txt and rerun |
| Polars execution test | SKIPPED | Package unavailable; no simulated substitute counted |
| Real DuckLake attach/write/reopen/Parquet test | NOT RUN | DuckDB/extension unavailable; use scripts/ducklake-smoke.py |
| npm dependency install | BLOCKED | Package-network access unavailable in this environment |
| Strict frontend typecheck | NOT RUN | Actual React/Fluent/Monaco/grid dependency types unavailable |
| Vite production build | NOT RUN | Frontend dependencies unavailable |
| React browser/UI/accessibility tests | NOT RUN | No verified compiled React bundle |
| Diagnostic browser test | BLOCKED | Installed Chromium URLBlocklist prohibits navigation; policy was not modified |
| Windows startup | NOT RUN | Implementation is intended to be portable but needs Windows validation |
| MotherDuck/cloud services/vendor price verification | OUT OF SCOPE | No remote adapters, cloud provisioning or invoice claims |

A build/browser failure has not been hidden behind a visual mockup. No screenshot of a static page is claimed to be the compiled React app. `scripts/browser-smoke.py` is supplied for an unrestricted local test environment and is labeled as a diagnostic-client test, not the React release test.

## Required promotion sequence

```sh
python -m pip install -r requirements.txt -r requirements-engines.txt
npm install
python scripts/verify.py --engines --frontend
```

Generate and retain the real npm lockfile after successful installation. Then run the actual React browser journey described in `docs/agents/09_RELEASE_QA.md`. Run DuckLake separately with an available extension. Fix failures rather than converting gates to skips.

## Known implementation limits that tests do not erase

Limited SQL dialect and AST-lineage coverage; no crash-atomic transaction across all JSON metadata/database files; no hardened hostile-code sandbox; no full Jupyter kernel protocol; no real distributed Spark; one connected virtual physical truth pack; no full dbt/Airflow/DAX engine; no streaming run progress; no collaborative multi-user deployment. These are explicit extension boundaries, not completed features.
