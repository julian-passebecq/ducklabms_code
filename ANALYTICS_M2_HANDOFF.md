> Implementation update: cleanup + M2 and subsequent V1 code are already applied. This document retains design/component-delivery context. For current execution and qualification truth, read `docs/v1/RELEASE_STATUS.md` from the repository root.

# Next agent: qualify, connect, do not restart

Use julian-passebecq/ducklabms_code, branch codex/real-spark-proxy-1 (PR #5), exact
baseline abb0345a78836508f6024d79710a46973cbed9d6. This package includes M1 and M2.
Run its assembler to produce a NEW candidate; do not apply it to main or overwrite
uncommitted work. No GitHub commit/push/deploy occurred in this coding pass.

Read START_HERE.md, QA_STATUS.md, REFERENCES.md and architecture/07_ANALYTICS_M2.md.
The new scope supersedes mandatory Oracle/Airflow planning. Keep code effort focused
on the app: notebook, dbt, model/lineage/SCD, charts, optional local runtime.

First qualify actual React 19 dependencies, TypeScript and Vite. Run M2 native browser
save/reload tests and connected notebook tests. Pay special attention to root restore
preserving blockState['datapass:analytics:v1'], inactive pane data, API size limits,
original canonical cell order, no fabricated executions, and focus/Monaco cleanup.
Do not bypass the generic Mosaic sanitizer globally; the preservation hook belongs
only in the root notebook adapter.

Next run the sample with real dbt-duckdb and dbt-charts/dct. Fix compatibility based
on actual errors, capture exact versions and authentic artifacts, and keep artifact
pairs from the same invocation. The offline browser tests were component-only and
Python tests never invoked dbt/dct; do not relabel them as engine acceptance.

A later local runner bridge should be a small bounded addition to the existing
FastAPI control plane with workspace ownership, source revision, explicit execution,
process lifecycle/file-lock coordination, artifacts and catalog refresh. Do not mount
dbt-ui as a second independent app or run arbitrary code on a public endpoint.

Guide fake Spark through versioned lesson fixtures and verified supported operations
against julian-passebecq/fastapispark. M2 only has a request/lesson preparation contract;
it must not be advertised as a connected PySpark kernel or secure general code sandbox.

Workspace-wide analytics resources, ordinary notebook tabs and continuous two-column
reading need explicit state/reference work. M2 has per-notebook analytics attachments
and resource-view tabs. Keep this limit clear rather than cloning private catalog state.

No Oracle VM, Airflow, Prefect, Docker, GitLab migration or new database in the next
qualification pass. No network/credential operation merely for the sake of a free tier.
