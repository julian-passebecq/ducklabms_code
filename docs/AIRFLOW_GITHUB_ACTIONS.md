# Remote Airflow on GitHub Actions

Status: bounded Pass 1.

Datapass does not run Apache Airflow on the user's computer and does not
operate a permanent Airflow server. The Airflow surface in React dispatches a
short-lived GitHub Actions job that installs the pinned Airflow release,
initializes ephemeral SQLite metadata and executes `airflow dags test`.

```text
React / Fluent Airflow surface
            |
            v
         FastAPI
   server-only GitHub token
            |
            v
      workflow_dispatch
            |
            v
 GitHub-hosted Ubuntu runner
            |
     Apache Airflow 3.3.2
            |
       dags test
            |
 result.json + bounded log
            |
            v
        Datapass UI
```

## Truth boundary

This is **real remote Airflow execution** for a Dag test. It is not a
persistent Airflow scheduler:

- no always-on scheduler is claimed;
- no scheduled run is waiting after the GitHub job exits;
- no persistent Airflow metadata database is retained;
- task dependencies, Dag parsing and task execution are handled by real
  Airflow during the job;
- the GitHub run state and Airflow log are real evidence;
- the Fluent UI is Datapass's own presentation, not the Apache Airflow UI.

Use Microsoft Fabric itself for Fabric/Data Factory pipeline practice. Datapass
does not build a competing generic pipeline authoring/runtime surface.

## Server configuration

The FastAPI host needs these environment variables:

```text
DATAPASS_GITHUB_TOKEN=<fine-grained token>
DATAPASS_AIRFLOW_GITHUB_REPO=julian-passebecq/ducklabms_code
DATAPASS_AIRFLOW_GITHUB_WORKFLOW=datapass-airflow-remote.yml
DATAPASS_AIRFLOW_GITHUB_REF=main
DATAPASS_AIRFLOW_PUBLIC_REPO=1
```

The token stays on the server. For the execution repository it needs GitHub
Actions read/write access so FastAPI can dispatch a workflow, poll its run and
download the small result artifact. Do not put this token in React, browser
storage, a Dag or a notebook.

GitHub only accepts `workflow_dispatch` when the workflow file exists on the
repository default branch. Therefore interactive dispatch becomes available
after this workflow is merged to the configured default branch.

## Public-repository safety

The current target repository is public. Submitted educational Dag source,
GitHub job metadata, logs and artifacts must therefore be treated as public
material.

Never submit:

- passwords, API keys or access tokens;
- customer/personal data;
- private company code;
- secret connection strings.

The remote job does not check out repository contents and does not explicitly
pass repository secrets or `GITHUB_TOKEN` to learner code. OIDC/token
environment variables are removed before the Dag test. The job is also bounded
by a 12-minute workflow timeout, with the Dag test itself capped at 300 seconds.

This is a single-user educational runner, not a public arbitrary-code service.
A future multi-user hosted product needs a stronger sandbox, authentication,
abuse controls and a private execution boundary.

## Pinned runtime

```text
Apache Airflow 3.3.2
Python 3.12
ubuntu-latest GitHub-hosted runner
airflow db migrate
airflow dags test
```

Airflow is installed with Apache's version-specific constraints file. The
workflow runs `pip check` before execution.

## Result contract

The artifact is retained for three days and contains:

```text
result.json
dag-test.log
tasks.txt
```

Datapass returns at most the tail of the Airflow log through FastAPI, keeping
the browser payload bounded.

## Scope after the product simplification

Active orchestration/modeling experiences:

1. Fabric-style notebook + DuckLake/SparkLab.
2. dbt models/lineage, with dbt Charts work as a future focused pass.
3. Airflow Dag authoring/visualization in React, with optional real remote
   execution through this GitHub Actions adapter.

Data Factory remains reference/curriculum material only; it is no longer an
active Datapass runtime/module.
