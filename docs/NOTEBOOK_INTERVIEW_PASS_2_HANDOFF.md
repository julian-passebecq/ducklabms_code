# Notebook + Interview Practice Pass 2 handoff

Implementation branch: `codex/notebook-interview-pass-2`. Root remains 0.1.0. Ready for coordinator code review; release promotion requires external QA.

## Production implementation

- Three-zone Interview view uses the shared Mosaic canvas: browser/filters/progress left, problem/editor/results center, schema/constraints/guidance/history right. Existing resizing, collapse, responsive stacking, shared source identity and neutral/Fabric/Databricks skins apply. Saved Pass 1 documents gain a browser block without replacing their source or custom geometry.
- Run remains Ctrl+Enter. Ctrl+Shift+Enter submits; Alt+Left/Right navigates while saving drafts; Alt+E focuses the answer; Alt+P/H toggles problem browser/guidance. Toolbar controls expose the same operations. Added cells stay in Interview, and semantic move controls are available there.
- Existing cell/exercise reset, clear, retry, notes preservation and source-evidence labeling are retained. Hint/reveal changes now use scoped undo; explicit solution visibility persists in root JSON and refetches the server-owned solution after reopen/undo. Solution text is not copied into notebook metadata.
- Versioned pack discovery replaces Python hard-coded definitions. Public definitions and private grading fixtures are distinct files; atomic registration rejects duplicate IDs, invalid references, unsupported adapters, invalid identity/schema/scalars and oversized fixtures. Manifest enable/disable is applied at startup.
- Shared Python, Polars and SparkLab grading adapters join SQL. Fresh per-fixture namespaces prevent ordinary variable carryover. Hidden outputs remain server-only. Real/semantic-emulation/unavailable truth is recorded through the existing attempt service.
- Rich validation adds order, duplicate policy, column contracts, row count, null semantics, tolerance, aggregate comparison and an explicit Python AST function contract.
- Full durable attempt progress is separate from paged detailed history: latest/best result, attempts, last attempted, topic/difficulty progress, wrong-only/retry filters, per-topic resume, distinct next recommendation, and existing review/confidence/perceived-difficulty persistence.
- CodeDELeet migration CLI emits validated disabled packs plus migrated/skipped/unsupported/warnings reports. No actual source corpus was found in this repository and none was fabricated.

Contract details and pack operation: `docs/EXERCISE_PACKS.md`. Exact changed files: `evidence/notebook-interview-pass-2-files.txt`.

## Minimal checks actually run

`npm run typecheck`: passed (one invocation).

`.venv/Scripts/python.exe -m pytest -q tests/test_exercise_packs.py`: **8 passed in 4.96s** (one invocation). Covers registry atomicity/disable, public/private separation, all five real seed grader paths, namespace cleanup, hidden redaction, alternative result validation modes and migration reporting. Real DuckDB and installed Polars were used.

These checks preceded final small persistence/registry/UI refinements. Those refinements were inspected but not repeatedly tested. No browser/startup/build/full regression run was performed. Raw check summary is in `evidence/notebook-interview-pass-2-checks.txt`.

## DEFERRED TO EXTERNAL QA

Use supported Node >=22.12 and the configured Python environment:

```powershell
npm run typecheck
.venv/Scripts/python.exe -m pytest -q tests/test_exercise_packs.py tests/test_interview.py
node --experimental-strip-types --test tests/interview.test.mts
.venv/Scripts/python.exe -m pytest -q
npm test
npm run build
npx playwright test tests/browser/interview.spec.ts
npm run test:browser
python scripts/verify.py --engines --frontend --browser
python scripts/startup-smoke.py
$env:DATAPASS_INSTALL_DUCKLAKE='1'
python scripts/ducklake-smoke.py
```

Priority verification: old draft upgrade and all layout/skin transitions; responsive pane overflow and keyboard focus; hidden-pane restoration; reveal/reset/undo/save/reopen; disabled-pack draft saves; full-history progress beyond 200 attempts; Python disabled/Polars missing; hidden fixture redaction on runtime errors/timeouts; fixture input immutability; current/stale/historical labeling; empty structured results and column validation; migration on real source exports when supplied.

## Remaining boundaries

- No CodeDELeet corpus import or universal raw archive parser. Source-specific normalization may be required; unsupported content is reported.
- Single input fixture relation and 200-row grading limit. Exact column schema does not compare SQL physical types. No performance/SLA/security/cost enforcement is claimed from descriptive constraints.
- No full PySpark/dbt/Airflow semantics, hostile-code sandbox, multi-cell submissions, cancellation UI or persistent multi-step undo. The existing one-operation undo now covers hint/reveal/toggle actions too.
- Pack changes require restart; there is no administrative pack upload/toggle UI. Only one active version per exercise ID is supported.
- Existing custom Pass 1 geometry is preserved, so its added browser initially sits below existing panes; Reset layout explicitly applies the new three-zone baseline. Newly created notebooks use the three-zone preset.
- Detailed history remains the latest 200; summaries scan durable attempt files. Very large histories may need indexing later. Cross-file attempt/workspace writes retain the existing atomic-file, nontransactional boundary.
- Browser appearance/focus and responsive interactions are implemented but unverified in this coding pass. All broad checks above are **DEFERRED TO EXTERNAL QA**.
