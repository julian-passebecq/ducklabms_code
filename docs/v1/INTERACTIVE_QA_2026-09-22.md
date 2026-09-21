# Interactive local QA — 2026-09-22

Tested the actual production React UI from `D:\PROJ\ducklabms_code`, initially clean `main` at `5fd2a363f4c9dec8eef34cb8eea9a2db3eb668ae`. Started the main-worktree virtual environment with:

```powershell
.\.venv\Scripts\python.exe start.py --port 18080 --storage ducklake --trusted-local-python --trusted-local-dbt
```

Opened the exact token-bearing URL printed by the launcher in a fresh browser tab. Session credentials are excluded from this report. Created `Interactive QA 2026-09-22` and `QA standalone 2026-09-22` through the UI. All executions below were initiated through UI controls, not API substitutes. The server remains running on port 18080.

## Results

| Feature | Exact action/code | Expected | Observed | Result |
|---|---|---|---|---|
| Workspace creation | Create named Retail case and named DuckLake / DuckDB playground | Distinct workspaces, seeded catalog | Both created; standalone correctly disables Workflow and Case study | PASS |
| Workbench | Create ConceptMotion; rename `QA saved join figure`; Next; Split right; Save | Same canonical resource, independent views | Same figure ID; pane 1 frame 2/4, pane 2 frame 1/4 | PASS |
| Notebook SQL | `SELECT 6 * 7 AS answer, (SELECT COUNT(*) FROM source.orders) AS orders` | 42, 12 | Current output: 42, 12 | PASS |
| Python | `display([{ "answer": sum([10, 20, 12]) }])` | 42 | Current output: 42 | PASS |
| pandas | Example below | 42 | Current output: 42 | PASS |
| Polars | Example below | 42 | Current output: 42; source/output survive reopen | PASS |
| Workflow | Run workflow for Retail revenue lakehouse | Four successes; Bronze 12, Silver 10, Gold 5 | All match; final KPI revenue 4985, valid_orders 10, customers 5 | PASS |
| Case study | Open brief; Check case | Four-step Retail brief and real checks | Brief, dataset, tasks, truth labels and successful checks | PASS |
| Data | Open Data; inspect Gold; later inspect storage overview | Shared tables and measured DuckLake evidence | Parquet files, snapshot 53, dbt lineage and 12 catalog tables | PASS after loading-message fix |
| Runs | Open execution history after workflow and notebook runs | Persisted actual outputs with runtime labels | SQL/Python/Polars results; KPI 4985/10/5; guided results separate from simulated metrics | PASS |
| dbt Core | Review seeded fct_sales model; Run dbt build; Build evidence (14) | Seeds/models/tests succeed | 14 successful/pass results; verified invocation c96e0c65-5d64-46bc-a662-ec7de0999171; fct_sales 8 rows | PASS |
| Pipeline Lab | Create default retail_quality pipeline; Run saved pipeline | SQL task then quality task succeed | raw success, valid_orders success, one attempt each; bronze.pipeline_orders 12 rows | PASS |
| Shared runtime outputs | `SELECT (SELECT COUNT(*) FROM warehouse.fct_sales) AS dbt_rows, (SELECT COUNT(*) FROM bronze.pipeline_orders) AS pipeline_rows` | 8, 12 | 8, 12 from notebook SQL | PASS |
| Arena negative check | Count non-null values: Run `SELECT 0 AS count_values` | Visible check fails; no attempt | Failed; 0; Attempt history (0) | PASS |
| Arena Run/Submit | `SELECT COUNT(value) AS count_values FROM input` | 3; visible/hidden/edge pass | Run passed; Submit passed all three; one persisted attempt | PASS |
| Guided Spark | Consent to curated fixtures; Verify and enable; Run/Submit example below | Two positive orders; full grading passes | (1,101,420), (2,102,275); visible/hidden/two edge checks pass; one attempt | PASS |
| Save/reopen | Save notebook/workbench; reload; create standalone; switch back | Source, results, resource title, pane frames retained | Figure frames 2/4 and 1/4; saved Polars source and 42; Arena previously solved with one passed attempt | PASS |
| Repeated navigation | Three cycles of Workbench → Notebook → Workflow → Data → Runs → Arena → Case study | All 21 destinations render, same workspace | All pass; no fatal render state or unexpected workspace reset | PASS |
| Editor mode round trip | Initialize Monaco; plain editor: `SELECT 42 AS editor_round_trip`; Monaco; plain editor; Run | Same source in both editors, result 42 | Same source and current output 42 after fix | PASS after fix |

### Exact pandas code

```python
import pandas as pd
df = pd.DataFrame({"amount": [10, 20, 12]})
display(pd.DataFrame({"answer": [int(df["amount"].sum())]}))
```

### Exact Polars code

```python
import polars as pl
display(pl.DataFrame({"amount": [10, 20, 12]}).select(pl.col("amount").sum().alias("answer")))
```

### Exact Pipeline Lab source

```python
pipeline("retail_quality", schedule="@daily")
raw = sql("raw", "CREATE TABLE IF NOT EXISTS bronze.pipeline_orders AS SELECT * FROM source.orders")
check = quality("valid_orders", "SELECT * FROM bronze.pipeline_orders WHERE order_id IS NULL")
raw >> check
```

### Exact guided Spark source

```python
df = spark.table("orders")
df = df.filter("net_amount > 0")
df = df.select("order_id", "customer_id", "net_amount")
```

Guided execution uses the configured remote bounded DuckDB service; Spark stages, duration and credits remain explicitly simulated. This is not a real distributed Spark cluster.

## Defects and minimal repairs

Created `codex/ducklake-evidence-loading` from current main only after observing a defect. No architecture changed.

1. `apps/web/src/plugins.tsx`: Data initially reported DuckLake evidence unavailable while the request was still pending. Added an explicit loading state; confirmed loading transitions to actual metadata in the browser.
2. `apps/web/src/MonacoAdapter.tsx`: a retained Monaco model displayed old source after changes in the plain editor. Synchronize the model from the current canonical value on mount. Reproduced with the shared-output count query, then verified the fix using the editor_round_trip query, both editor modes and real execution. Added a targeted browser regression in `tests/browser/core.spec.ts`.

## Diagnostics and verification limits

- Production build including TypeScript checking passed after each distinct fix. Final log: ignored `.local/interactive-qa-20260922/build.log`. Existing large-chunk advisory remains.
- No failed `/api/*` responses or FastAPI exceptions observed. Server stderr contains the existing ArtifactBundle `schema` warning.
- One old Monaco asset returned 404 during an in-place production rebuild while an old page was still open; the browser recorded the corresponding dynamic-import error. Reloading the current bundle resolved it; subsequent Monaco mount, edit and execution passed with no new console error.
- Some browser automation clicks at a changing narrow layout landed on sidebar items. Retried using fresh accessibility state and visible targets; these were not classified as application defects. No source loss was observed.
- Exact launcher stdout/stderr remain in ignored `.local/interactive-qa-20260922/`. Stdout contains the private session URL and must not be committed or published.
- The interactive matrix above is fresh evidence. Historical release-suite counts are not claimed as rerun here.
- Automated regression execution is **DEFERRED TO EXTERNAL QA**. Run the new focused regression on a separate port with the repository browser configuration, followed by broader suites if desired:

```powershell
$env:DATAPASS_PORT='18081'
npx playwright test tests/browser/core.spec.ts --grep 'Monaco restores canonical source'
npm run test:browser
npm run test:v1:browser
```

The server on 18080 is deliberately left available for continued use.
