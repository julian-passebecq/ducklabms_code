# Interview / LeetCode requirements — Datapass Studio

Status: architecture requirement for future implementation. This is **not** a separate application and **not** a new release by itself.

Repository: https://github.com/julian-passebecq/ducklabms_code

The shared Datapass workbench must remain suitable for a future data-engineering interview / LeetCode-style module. The existing Root 0.1.0 architecture already covers most of this through shared notebook blocks, flexible layouts, multiple kernels, RuntimeClient, result-based validation, hints/solutions and shared execution. The requirements below make the remaining expectations explicit before the notebook/core is hardened further.

## 1. Exercise is a first-class domain object

A standalone exercise must be possible without creating a complete end-to-end case study. A project case may contain exercises, but an exercise must also work independently.

The exercise contract should be able to represent at least:

```text
Exercise
├── id
├── title
├── difficulty
├── topics
├── language / kernel
├── prompt
├── starter code
├── fixtures
├── visible tests
├── hidden tests
├── hints
├── reference solution
├── explanation
└── follow-up questions
```

The exact serialized schema belongs to the shared contracts when implemented; this document defines the capability requirement rather than freezing an untested wire format.

## 2. Run and Submit are different actions

The future interview module needs an explicit distinction:

```text
Run
→ execute current code
→ show output
→ run visible tests / checks
→ support experimentation

Submit
→ capture the submitted source revision
→ execute the grading contract
→ run hidden fixtures / tests where configured
→ record an attempt
→ return pass/fail and structured check evidence
```

Both actions must use the shared execution infrastructure. The interview module must not create a second execution engine.

## 3. Attempt history is distinct from notebook and run history

Keep these concepts separate:

```text
Notebook revisions
≠
Execution history
≠
Exercise attempts
```

An exercise attempt should be able to record:

- submitted source revision / checkpoint;
- exercise and validator version;
- kernel/runtime identity;
- input/fixture versions;
- visible and hidden check outcomes;
- pass/fail state;
- measured local runtime where meaningful;
- execution error/cancellation where applicable;
- timestamp;
- optional learner difficulty/confidence/review state.

This enables later learning views such as solved, unsolved, wrong-only, retry, review and progress-by-topic without overloading notebook persistence.

## 4. Validation must support visible, hidden and edge-case fixtures

The shared validation service must be able to grade against multiple fixture classes, for example:

```text
example fixture
visible tests
hidden fixture A
hidden fixture B
edge-case fixture
```

Validation should grade actual results and declared requirements, not mere source-code keyword presence. Depending on the exercise, checks may include schema, rows, duplicate-sensitive comparison, aggregates, null behavior, ordering requirements and explicitly configured numeric tolerances.

Alternative correct solutions should pass when their results and required semantics are correct. Hard-coded or stale outputs must not pass simply because an older result exists.

## 5. Official Interview layout preset

The shared notebook/layout engine should support a named Interview / Practice preset in addition to normal notebook and study layouts.

Conceptually:

```text
┌───────────────┬─────────────────────────┬──────────────────┐
│ Problem       │ Code / Notebook         │ Explanation      │
│               │                         │                  │
│ Schema        │ SQL / Python / Spark    │ Hint             │
│ Input         │                         │ Solution         │
│ Constraints   │ Results / Tests         │ Follow-ups       │
│               │                         │ Reflection       │
└───────────────┴─────────────────────────┴──────────────────┘
```

This is a layout preset over the same document model, not a new notebook implementation. The same underlying blocks should also be renderable in normal notebook, two-page, code+explanation and product-inspired notebook experiences.

Semantic execution order must remain independent of visual geometry.

## 6. Reset and reveal operations

Interview practice needs bounded operations that ordinary notebooks do not always expose explicitly:

- reset exercise to starter state;
- reset starter code for one exercise/cell;
- clear outputs without deleting source;
- retry failed tests/checks;
- reveal hint;
- reveal reference solution;
- optionally mark for review / difficulty.

These operations must not destroy unrelated notebook or workspace content.

## 7. Problem-browser metadata

The exercise model should support lightweight navigation/filtering metadata such as:

```text
SQL
Python
Pandas
PySpark / SparkLab
dbt
Airflow
Data modeling
Pipelines
Architecture
Theory

Easy / Medium / Hard
Solved / Unsolved / Review
```

This metadata is sufficient for a later problem-browser/sidebar. Building the full browser is not a Core Integration Pass 1 requirement.

## 8. Runtime abstraction must preserve a future public-demo mode

The full local Datapass architecture remains:

```text
React
→ RuntimeClient
→ FastAPI
→ DuckDB / shared workers
→ SparkLab / Python / Polars / teaching adapters
```

Exercise definitions must not depend directly on FastAPI internals. They should depend on shared contracts and RuntimeClient so that a future public/static interview experience can use another bounded runtime adapter if deliberately implemented and tested.

One possible future public-demo path is browser-safe execution such as DuckDB-Wasm and, if justified, bounded browser Python. This is a future adapter option only; it is not part of Root 0.1.0 and must not be presented as implemented today.

## 9. No second LeetCode application architecture

Do **not** create another:

- React application shell;
- Monaco/editor framework;
- notebook format;
- workspace/catalog/database;
- execution history;
- SparkLite runtime beside SparkLab;
- dbt-only private project store;
- duplicate problem-specific persistence layer.

The future module should compose existing core services:

```text
Datapass Studio
├── Projects / Case Studies
├── Fabric / Pipelines / Warehouse
├── SparkLab
├── BI
├── Airflow / dbt
├── ML / Polars
└── Interview Practice
    ├── Problem browser
    ├── Exercises
    ├── Attempts
    └── shared Notebook Workbench
```

## 10. Relationship to previous CodeDELeet work

The previous CodeDELeet application should be treated as migration/reference material, not as another active top-level product.

When that archive is audited for migration, preserve high-value content and test assets where they are actually present and verified, especially:

- exercise/problem definitions;
- datasets and fixtures;
- expected outputs;
- correctness/result-based grading rules;
- negative/incorrect examples;
- edge cases and regression tests;
- explanations, hints and follow-up/reflection structure;
- useful SQL/Python/Pandas/Spark/dbt/ETL interview semantics;
- browser-runtime experiments that may inform a future static/public adapter.

Retire or replace duplicate shell/layout/editor/state/runtime implementations when the shared Datapass equivalents are stronger.

Do not claim migration of an old feature until its source is audited and the migrated behavior is tested in the shared root.

## 11. Core-pass guardrail

These requirements **must not interrupt Core Integration Pass 1 with a full LeetCode implementation**.

During core hardening, the requirement is compatibility:

- do not make notebook/layout contracts incompatible with standalone exercises;
- do not conflate run history, notebook revisions and future attempts;
- keep validation extensible to hidden/edge fixtures;
- preserve a named practice/interview layout path;
- keep exercise/runtime contracts independent from backend implementation details.

After the core release gates are closed, a bounded specialist pass can implement the Interview Practice module and migrate verified CodeDELeet content into it.
