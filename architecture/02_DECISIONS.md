# Architecture decisions

These decisions capture the current direction. Change them only when a concrete product constraint or measured evidence requires it.

## D1 — One product, one notebook truth

Keep one Datapass Studio shell and one canonical notebook/workspace model.

Do not create separate applications for Fabric, LeetCode, Spark, SQL, Power BI, Airflow, etc. Product presets and labs compose the same foundation.

## D2 — V1 before infrastructure expansion

The immediate milestone is a playable V1:

- DuckLake / DuckDB.
- Fabric-style Python + SparkLab notebook.
- Free coding layout.
- LeetCode arena.
- Optional MotherDuck path.

Oracle, Kubernetes, observability and extra services are later milestones.

## D3 — Local-first storage

DuckLake/DuckDB are the default V1 data path.

MotherDuck is optional and explicit. No silent upload, remote fallback or hidden credential requirement.

## D4 — SparkLab stays useful after real Spark arrives

SparkLab is the fast educational runtime. It is allowed to model distributed behavior, but it must label that behavior as simulated.

Later Oracle Apache Spark is a separate real execution target. Do not delete SparkLab when Oracle is added.

## D5 — One Oracle VM, not two

When Oracle is activated, use one Always Free A1 VM at approximately 2 OCPU / 12 GB rather than splitting it into two 1 OCPU / 6 GB VMs.

Expected services:

- FastAPI execution API.
- Apache Spark `local[2]`.
- Airflow with conservative LocalExecutor concurrency.
- Polars.
- dbt where useful.
- logs/history.

Heavy Spark/Polars jobs should not intentionally run concurrently on the small host.

## D6 — Airflow is the future orchestrator

Do not add Meltano or Prefect merely to fill a box.

Meltano was explicitly dropped. Prefect is not required.

Airflow is the orchestration technology chosen for Datapass when persistent orchestration is needed. The existing GitHub Actions Airflow implementation is useful as bounded test/lab evidence, but it is not the intended permanent scheduler.

## D7 — GitHub Actions is CI and disposable lab compute

GitHub Actions remains useful for:

- TypeScript/Python/build regression.
- Chromium browser smoke tests.
- real DuckLake integration smoke.
- future temporary kind/Kubernetes/Helm labs.
- bounded compatibility/integration tests.

Do not make GitHub Actions the normal user-facing Spark runtime after Oracle exists. Do not pretend an ephemeral Actions job is a persistent Airflow deployment.

Existing remote Spark/Airflow code can remain frozen while V1 is stabilized; remove or simplify it later only after its replacement is proven.

## D8 — Cloudflare is the deployment target for the web shell

Move the public React deployment target to Cloudflare.

Use **Cloudflare Workers Static Assets** for the new deployment rather than designing around Vercel/Netlify. Cloudflare currently recommends Workers as the primary application platform for new projects.

Cloudflare responsibilities:

- serve the React/Vite static assets.
- SPA routing.
- optionally provide a very small `/api/*` edge proxy/gateway later.

Cloudflare must **not** run Spark, Polars, Airflow or the existing FastAPI compute runtime.

## D9 — Cloudflare edge stays lightweight

Workers Free is an edge/gateway tier, not our data engine.

Keep Worker logic tiny: routing, headers, maybe auth bootstrap and API proxying. Heavy Python/data compute belongs on local/Oracle runtimes.

## D10 — Cloud deployment must preserve runtime truth

A Cloudflare-hosted UI must not imply the data runtime is cloud-hosted.

Until an HTTPS Datapass API origin exists, the fully functional V1 remains local. A public UI/demo build must clearly show disconnected/unavailable runtime state instead of faking execution.

## D11 — No new service without a unique job

Current hold list:

- Prefect: hold.
- Meltano: remove.
- Grafana: later if observability becomes a real requirement.
- Neon: optional later for application/progress metadata.
- Kubernetes: later as a real educational lab, not core V1 infrastructure.

The rule is simple: a new service must add a capability that the existing stack does not already provide.
