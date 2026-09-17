# V9 changelog — engineering judgment + Airflow

## Added

### Engineering decision lab

- New `toolchoice` workbench.
- Guided scenarios compare SQL, dbt, Python/pandas, Spark, Fabric Pipeline, and Airflow.
- Explicit anti-pattern guidance teaches when Spark is unnecessary.
- Distinguishes transformation choices from orchestration choices.
- Case-study-aware default scenario selection.

### Apache Airflow Job simulator

- New `airflow` workbench and Fabric navigation entry.
- DAG graph built on the shared XYFlow/LearningGraph engine.
- Editable DAG Python learning subset.
- Graph -> code generation.
- Code -> graph parsing.
- DAG id, schedule, catchup, task dependencies, cycle validation.
- Fabric-style tasks for Copy Job, Notebook, dbt Job, Pipeline, Spark Job Definition, and SQL checks.
- Local task logs and run status.
- Airflow tasks reuse the shared V8 learning workspace.
- Notebook/dbt/Copy/Pipeline/SQL tasks can produce real learning-data effects.
- Spark tasks remain explicitly simulated but can write representative downstream data.

### dbt depth

- Added `dbt build`, `dbt run`, `dbt compile`, and `dbt test` command semantics.
- Added model select/exclude patterns.
- Added full-refresh, fail-fast, and thread controls.
- Pipeline dbt Job activity exposes the same settings.
- Pipeline learning runtime now honors dbt command behavior instead of always calling build.
- Added explicit empty-selection failure behavior.

### Spark scope clarification

- Spark Job Definition workbench now explains the production-scale assumption and local representative execution boundary.
- Guidance explicitly prefers SQL/dbt or lightweight Python when distributed compute is not justified.

### Curriculum

Fabric curriculum expanded from 9 to 12 modules:

- SQL · dbt · Python · Spark decisions
- dbt Jobs
- Apache Airflow Jobs

## QA

New V9 suites:

- `scripts/qa-v9.mjs`: 27/27 PASS
- `scripts/qa-engine-v9.mjs`: 16/16 PASS

Combined V5-V9 automated assertions: 227/227 PASS.

Semantic TypeScript QA: 53 TS/TSX files PASS.

Curriculum/routes QA: PASS, 0 missing routes, 12 Fabric modules / 8 Databricks / 2 ADF / 3 case studies.
