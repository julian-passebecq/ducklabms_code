# Datapass remote runner split

Status: active architecture decision.

Datapass keeps interactive/light execution separate from heavyweight verification.

```text
Datapass React / Fluent UI
          |
       FastAPI
          |
   +------+-----------------------+
   |                              |
   v                              v
SparkLab                      remote runners
DuckDB + simulation              |
                                  +--> fastapispark
                                  |    GitHub Actions
                                  |    real Apache Spark 4.2.0
                                  |    local[4], single host
                                  |
                                  +--> datapass-airflow-runner
                                       GitHub Actions
                                       real Airflow 3.3.2
                                       ephemeral Dag test
```

## Spark repository

Repository: `julian-passebecq/fastapispark`.

Responsibilities:

- instant bounded DuckDB execution;
- deterministic SparkLab simulation;
- optional real Apache Spark verification;
- GitHub workflow dispatch/poll/artifact handling;
- Spark event-log extraction.

Real Spark is labeled **REAL SPARK / SINGLE HOST**. The current oracle runs
Spark `local[4]` on one GitHub-hosted VM. It is not a multi-machine cluster.

The Datapass server proxies to the FastAPI Spark service using:

```text
DATAPASS_SPARK_API_URL=<FastAPI Cloud service URL>
DATAPASS_SPARK_RUNNER_KEY=<server-to-server secret>
```

The Spark service itself owns:

```text
DATAPASS_GITHUB_TOKEN=<fine-grained Actions token>
DATAPASS_RUNNER_KEY=<same server-to-server secret>
DATAPASS_SPARK_GITHUB_REPO=julian-passebecq/fastapispark
DATAPASS_SPARK_GITHUB_WORKFLOW=real-spark.yml
DATAPASS_SPARK_GITHUB_REF=main
DATAPASS_SPARK_PUBLIC_REPO=1
```

Neither GitHub token nor runner key belongs in React.

### Stable runner API

Datapass now tracks Spark verification with an opaque `job_id`, for example
`github:123456789`, instead of requiring the UI to know a GitHub workflow run
id. GitHub `run_id` is retained only as provider-specific evidence.

This is deliberate preparation for the persistent Oracle A1 host:

```text
Datapass UI
   |
Datapass API
   |
fastapispark stable job API
   +--> github:<id>   GitHub Actions, ephemeral
   +--> oracle:<id>   Oracle A1, persistent   (next backend)
```

The Oracle backend should therefore be added behind the existing FastAPI runner
contract rather than wired directly into React. Normal SparkLab simulation
remains independent of either provider.

## Airflow repository

Target repository: `julian-passebecq/datapass-airflow-runner`.

This repository does not exist yet. Until it is created, the proven Airflow
workflow remains temporarily in `ducklabms_code` and the Datapass
`AirflowRemote` adapter remains repository-configurable.

After the dedicated repository exists, move only the runner workflow/docs/tests
there and configure:

```text
DATAPASS_AIRFLOW_GITHUB_REPO=julian-passebecq/datapass-airflow-runner
DATAPASS_AIRFLOW_GITHUB_WORKFLOW=real-airflow.yml
DATAPASS_AIRFLOW_GITHUB_REF=main
```

Do not move React, workspace state, DuckLake, dbt or notebook code into the
Airflow runner repository.

Airflow is labeled **REAL AIRFLOW / EPHEMERAL**. It validates/runs a Dag with
real Airflow on a temporary GitHub VM; it is not a continuously running
scheduler.

## Why two runner repositories

Spark and Airflow have independent dependency/runtime/security contracts:

| Runner | Runtime | Main evidence |
|---|---|---|
| Spark | Java 17 + PySpark 4.2.0 | result, plans, event-log stages/tasks/shuffle/spill |
| Airflow | Python 3.12 + Airflow 3.3.2 | Dag parsing, task list, execution status, logs |

A dependency/runtime failure in one runner must not destabilize the other.

## Heavy jobs versus normal notebook execution

GitHub Actions is intentionally not the normal notebook backend.

```text
Run cell
   -> SparkLab / DuckDB / FastAPI
   -> fast feedback

Verify on real Spark
   -> GitHub Actions
   -> slower real-engine evidence

Run Airflow Dag
   -> GitHub Actions
   -> real ephemeral orchestration evidence
```

This keeps normal Datapass interaction responsive while retaining real external
oracles where they materially improve learning.

## Public-repository safety

The public runners are educational single-user execution boundaries. Never send
credentials, customer data, personal data or private company code in workflow
inputs. The browser must never receive GitHub tokens or server runner keys.
