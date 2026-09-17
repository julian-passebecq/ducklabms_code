# V9 architecture — engineering decisions and Airflow

## Learning boundary

V9 deliberately separates four concepts:

```text
Transformation language/project   Compute scale         Orchestration
-------------------------------   -------------------   --------------------
SQL                               local/warehouse       Fabric Pipeline
Python/pandas                     local/lightweight     Apache Airflow Job
dbt                               SQL engine
Spark                             distributed (simulated)
```

A tool can appear inside another tool without owning the same responsibility. Example:

```text
Airflow DAG
  -> Fabric Pipeline
      -> Notebook
      -> dbt Job
      -> Spark Job Definition
```

Airflow owns the outer DAG. Pipeline owns Fabric-native activity orchestration. dbt owns model dependencies/tests. Spark owns distributed compute for a task when scale justifies it.

## Airflow learning runtime

`src/lib/airflowRuntime.ts` defines:

- `AirflowDagDefinition`
- task and edge definitions
- Python DAG generation
- supported-code parsing
- DAG validation / cycle detection
- topological execution
- shared-workspace task effects

The supported educational task kinds are:

- Copy Job
- Notebook
- dbt Job
- Fabric Pipeline
- Spark Job Definition
- SQL quality check

The generated code uses a `FabricRunItemOperator`-style pattern for Fabric items. Arbitrary Python is intentionally not executed.

## Shared execution path

```text
Airflow task
   |
   +-- Copy Job ------> executePipelineLearningData()
   +-- Notebook ------> executeNotebook()
   +-- dbt Job -------> runDbtCommand()
   +-- Pipeline ------> executePipelineLearningData(authored nodes)
   +-- SQL check -----> executeWorkspaceSql()
   +-- Spark Job -----> representative local table + simulated Spark semantics
```

This keeps learning data state coherent without building a cloud scheduler or Spark cluster.

## dbt command semantics

`runDbtCommand()` now handles:

- build: materialize + tests
- run: materialize only
- compile: compile SQL only, no workspace mutation
- test: test existing outputs only
- select/exclude patterns
- fail-fast behavior
- thread/full-refresh metadata in logs

The selector grammar is intentionally a learning subset, not a complete dbt CLI parser.

## Engineering decision lab

`ToolChoiceStudio` asks the learner to choose a first-fit technology for scenarios and returns reasoning rather than syntax trivia.

Core rules taught:

1. Prefer direct SQL for simple relational transformations.
2. Use dbt when SQL transformations become a maintained model graph with tests and lineage.
3. Use Python/pandas for custom logic when data volume is manageable.
4. Use Spark when distributed scale or Spark-specific processing actually matters.
5. Use Fabric Pipeline for visual Fabric-native orchestration.
6. Use Airflow for code-first Python DAG orchestration.
7. Do not use dbt, Spark, Pipeline, or Airflow merely because they exist.

## Explicit non-goals

V9 does not implement:

- arbitrary Python execution
- Apache Airflow scheduler/webserver/metadata DB
- real Fabric authentication
- real Fabric item REST execution
- real Spark execution
- complete dbt selector syntax/packages/macros/snapshots

These are represented only to the depth required for realistic guided data-engineering practice.
