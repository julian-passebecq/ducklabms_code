# Frozen architecture decisions — focused V1

Change these only for a concrete product constraint or measured evidence.

## D1 — The flexible workbench is the product foundation

Datapass is not a collection of labs implemented as independent applications. Notebook, dbt, Pipeline Lab, modeling, charts, Arena and SparkLab compose one shell and one workspace.

## D2 — One canonical resource, many views

Tabs, panes, skins and layouts reference canonical resources. Closing/moving a view never deletes or copies its source.

## D3 — Datapass remains data-engineering focused

Git/Linux/Bash/PowerShell/SSH/Docker/IaC/Kubernetes/CI-CD curriculum belongs to a potential future sibling product, not Datapass V1.

## D4 — Local first

V1 must be useful with no cloud account. Cloud integrations are explicit adapters, never hidden fallbacks.

## D5 — DuckDB + DuckLake are the local data substrate

DuckDB is the primary analytical engine. DuckLake is the canonical/default V1 lakehouse/table profile. Iceberg is out of V1.

## D6 — pandas and Polars are first-class DataFrame learning paths

Python/pandas and Polars share the workspace/catalog. Polars is not another storage system.

## D7 — Jupyter interchange is a product strength

Preserve `.ipynb` import/export and multiple Datapass views over one notebook. Deepnote-specific direct import is not required for V1; `.ipynb` is the interchange path.

## D8 — Theme and Experience Skin are independent

Theme controls global light/dark/neutral tokens. Experience Skin controls product chrome/density/presentation such as Datapass Studio, Fabric-inspired, Databricks-inspired and Arena. Neither changes runtime ownership.

## D9 — dbt means real local dbt Core for the project mode

Keep a fast bounded dbt exercise mode, but Project mode must call reviewed local dbt Core/dbt-duckdb and consume real artifacts from the same invocation.

## D10 — Pipeline Lab uses the Datapass Local Orchestrator

V1 is Airflow-inspired for concepts/UI, but it is not Apache Airflow. Implement a small real local dependency runner for supported task types. Schedule strings are metadata; no always-on scheduler daemon is required.

## D11 — SparkLab stays guided and truth-labeled

Use bounded PySpark syntax/semantics and real bounded row results. Stages/tasks/shuffle/spill/skew remain clearly simulated unless a future real Spark target is explicitly selected.

## D12 — ConceptMotion is a reusable explanation seam

Use a shared Figure/visual resource for joins, table transforms, DAG state, lineage, partition/batching and selected Spark/Arena concepts. Do not build one-off animation engines per lab.

## D13 — MotherDuck is optional later

No credentials, upload or remote execution unless explicitly connected and reported by runtime capability truth.

## D14 — Cloudflare is deployment infrastructure, not a V1 architecture blocker

The web shell may be deployed later, but finishing the local product and native M2 integration has priority. Cloudflare never becomes the data plane.

## D15 — Freeze legacy remote Airflow/Spark experiments

Do not extend them. Keep them only until replacements are integrated and dependency tests allow safe removal.

## D16 — Do not prematurely extract a generic shared IDE framework

Finish Datapass V1 first. A future Dev/Ops sibling may reuse proven workbench components after their boundaries are stable.
