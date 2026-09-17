# V13 executable practice and exercise-depth architecture

## Goal

V8–V12 made the workspace executable, recoverable and measurable. V13 uses that infrastructure to create repeatable hands-on drills rather than adding another product simulator.

## Exercise model

```text
PracticeExercise
├── difficulty: Easy | Medium | Challenge
├── kind: decision | sql | python | dbt
├── objective / prompt
├── starter / hint / solution
├── expected evidence contract
├── matching product workbench
└── optional target table/schema contract
```

A run produces `PracticeRunResult` with:

- updated shared workspace;
- pass/fail;
- learner-facing message;
- runtime evidence;
- command/output log.

## Execution boundary

### SQL

Uses `executeWorkspaceSql()`. The exercise only passes after the expected table and required columns/row count exist.

### Python

Uses `executePythonLearning()`, the constrained pandas-style runtime. It validates the actual written workspace table.

### dbt

Uses `defaultDbtProject()` + `runDbtCommand()`. Build/run/test/compile retain the V8–V12 semantics. Compile-only practice explicitly checks that the workspace snapshot is unchanged.

### Architecture decisions

These do not mutate data. They validate the primary tool choice and return an explanation/anti-pattern. The answer-specific evidence is hidden until after validation so the decision is not leaked by the UI.

## Mastery state

Each exercise records:

- attempts;
- failed attempts;
- hints used (0–3);
- solution reveal;
- completion;
- best score;
- latest message/evidence.

Scores reward independent completion. Assistance and retries lower the score, with stronger penalties for Challenge exercises.

Practice state is intentionally separate from the case-study tutorial state so a learner can reset/retry drills without losing the main mission.

## Current practice coverage

Shared drills teach:

- SQL vs Spark for a small relational workload;
- dbt vs Spark for a maintained SQL model DAG;
- Fabric Pipeline for Fabric-native visual orchestration;
- Airflow for code-first DAG orchestration;
- dbt compile semantics without data mutation.

Retail adds:

- SQL grouped aggregation;
- Python cleaning/deduplication;
- dbt build + tests.

Turbine adds:

- SQL aggregation on the representative sample;
- local Python feature engineering;
- a production-scale scenario where Spark is justified.

ERP adds:

- incremental SQL materialization;
- dbt incremental/build behavior;
- an explicit no-Spark decision for metadata-driven relational CDC.

## Future depth

The next useful extensions are not new engines. They are additional exercise packs: joins, window-like patterns, dbt failing tests/fixes, incremental rerun challenges, pipeline expression drills, and integrated multi-surface challenges that begin in Notebook/dbt and finish with Monitor/Recovery evidence.
