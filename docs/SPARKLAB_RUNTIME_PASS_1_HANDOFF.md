# SparkLab Runtime Pass 1 — implementation handoff

Branch: `codex/sparklab-runtime-pass-1`. Root remains 0.1.0. Ready for coordinator **code review**, with broad verification **DEFERRED TO EXTERNAL QA**. No secondary agent was used.

## Implemented

- Safe semantics: semi/anti join aliases, full/right key preservation and USING-key output ordering, explicit Spark NULL ordering, `sort`, bounded label-only DataFrame `alias`, `eqNullSafe`, list projections/grouping/sorting, empty-subset dedupe, partition/limit bounds, safe decimal type grammar, ordered-window diagnostics, and final DataFrame-expression preview. Existing select/filter/withColumn/drop/groupBy/aggregates/coalesce/when/ROWS windows remain available. Shared catalog schemas refresh before compilation. New support metadata is returned by capabilities and rendered in runtime help.
- Versioned profile data: existing IDs retained; Small added; driver/executor resources, partition targets, broadcast threshold, AQE default, startup/scheduler/IO assumptions and fictional credit rate. Legacy vendor-inspired profile names now explicitly identify teaching labels. Profile endpoint publishes executor aliases and total virtual cores.
- Plan-driven physical simulation replaces the root adapter's fixed retail job. It walks both join branches and generates structured logical nodes, dependency IDs, teaching stages, task previews, partition counts, assumed input/output cardinalities and bytes, shuffle/broadcast/sort/aggregation/window evidence, skew/spill, duration percentiles, stragglers, utilization and overhead. It reuses the existing deterministic task scheduler. AQE coalesces buckets and splits skewed shuffle-join partitions, never a hot ordered/grouped key. Explicit repartition is retained. No cache reuse or codegen fusion is claimed.
- Notebook UI: existing runtime strip offers profiles/AQE and compact expandable resources/truth/support information. Shared result output adds logical/physical/jobs/stages/tasks/shuffle/cost/truth tabs. The SparkLab module also registers its run inspector through the existing graph surface. Result rows remain in the shared Result view.
- Additional truth pack: `finance_account_window_03` now runs end to end through the `spark-window` case, shared catalog publication, immutable fixture comparison, real row acceptance, correct window solution, global-window and reverse-time counterexamples, profile comparison and AQE comparison. The eight physical rows are distinct from authored 9.7 GiB / 61,840,000-row assumptions. Mutated inputs withhold scenario metrics. The existing retail truth pack remains connected and honors its missing catalog-statistics broadcast counterexample.
- Datapass Credits: `core_hours × profile rate + 0.02 × memory_GB_hours + 0.05 × shuffle_GB + 0.12 × spill_GB`. Contributor breakdowns and all profile/AQE comparisons reuse the same plan/statistics. Allocated slots include idle tails; driver includes startup; worker startup allocation is not charged. No currency or vendor prices appear in the new run inspector. Legacy cost adapters are retained for compatibility outside this root path.
- Interview: new authored finance-window exercise uses the existing pack registry, worker, grading and attempt infrastructure. Visible/hidden/empty fixtures remain in server grading data. Profile/AQE options propagate through ExerciseRequest. Visible runs attach simulation; hidden runs/results are not returned. Correctness remains `semantic-emulation` and depends on rows, never credits. Floating fixture literals now use explicit DOUBLE to avoid DuckDB DECIMAL-to-string mismatches.
- Optional oracle: checked-in fixtures and `scripts/sparklab-oracle.py` compare local DuckDB semantics against externally available PySpark for nulls, duplicate-sensitive joins, grouping/aggregate values, ordering, windows and renamed duplicate columns. The harness executes trusted developer fixture source, not application submissions. No Spark installation was attempted.

## Essential checks actually run

1. `.venv/Scripts/python.exe -m pytest services/sparklab/tests/test_runtime_pass1.py -q`
   Initial output: `2 failed, 7 passed in 6.00s`. Both failures identified DOUBLE fixture literals inferred as DuckDB DECIMAL and serialized as strings.
2. `npm run typecheck`
   Output: `tsc --noEmit`; exit 0.
3. A tiny diagnostic inspected the first physical/expected finance row and the affected grading results. It confirmed the numeric-type mismatch; fixture generation was corrected.
4. `.venv/Scripts/python.exe -m pytest services/sparklab/tests/test_runtime_pass1.py -q -k 'finance_pack or shared_exercise'`
   After correction: `2 passed, 7 deselected in 2.26s`.
5. `.venv/Scripts/python.exe -m pytest services/sparklab/tests/test_runtime_pass1.py -q -k 'legacy_pack'`
   Output: `1 passed, 9 deselected in 1.58s`. This verifies the original retail workflow still models and explicit empty-subset dedupe returns one row.

`git diff --check` also completed without whitespace errors.

Ten targeted cases passed across these bounded invocations, not a claim that the full file or repository suite was rerun after every edit. OpenAPI and the retained runtime-preview JSON were regenerated directly, without running a suite or writing into migration sources.

## Deferred checks and exact commands

All items below are **DEFERRED TO EXTERNAL QA**:

```powershell
.venv/Scripts/python.exe -m pytest services/sparklab/tests/test_runtime_pass1.py -q
.venv/Scripts/python.exe -m pytest
npm test
npm run typecheck
npm run build
npm run test:browser
.venv/Scripts/python.exe scripts/verify.py --engines --frontend --browser
.venv/Scripts/python.exe scripts/startup-smoke.py
$env:DATAPASS_INSTALL_DUCKLAKE='1'
.venv/Scripts/python.exe scripts/ducklake-smoke.py
# In an external environment with PySpark and a compatible JVM:
python scripts/sparklab-oracle.py --fixtures services/sparklab/oracle.json
```

Use the repository-supported Node version (22.16+); the session's default Node reported 21.7.1, though the targeted TypeScript check succeeded. Browser QA should exercise all inspector tabs, narrow layouts, keyboard navigation, saved/reopened evidence, both case workflows, Small/Generic and AQE comparisons, mutated-fixture withholding, and visible versus hidden exercise results. Storage QA should compare DuckDB and explicit SQLite compatibility behavior, numeric aggregates and windows. Confirm the regenerated OpenAPI contract and old scheduler/preview regression expectations.

## Boundaries that remain

`selectExpr`, SQL-string filters, arbitrary Python/UDFs, predicate or qualified-column joins, ambiguous duplicate non-key columns, streaming, filesystem access, and embedded collect/show/count actions are rejected. Notebook Run is the explicit preview action over lazy transformations. Use `groupBy().agg(F.count("*").alias("count"))` for a count result. DataFrame alias is a label, not qualified-column resolution. Dedupe survivors and tied window ordering are unspecified. Decimal/ANSI/cast behavior and aggregate output types are not full PySpark parity; the oracle does not certify type parity. Prefer explicitly aliased expressions.

Physical metrics are an authored model: generic inputs use actual catalog row counts with assumed 128 bytes/row; truth packs supply fictional scale. Intermediate rows/bytes carry forward without selectivity estimation. Each logical operator is a serial teaching stage; no codegen fusion, exact real Spark DAG, dynamic runtime calibration or cache reuse is claimed. Errors in physical modeling produce unavailable evidence without replacing a successful semantic result. Profile selection is root-session UI state; saved runs retain their chosen profile, but reopening does not restore a selected profile preference.

The original advanced standalone simulator/UI remains retained, not merged as another application. Exact changed files are listed in `evidence/sparklab-runtime-pass-1-files.txt`.
