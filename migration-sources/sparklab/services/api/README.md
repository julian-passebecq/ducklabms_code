# SparkLab V0.12 FastAPI backend

The API never `exec()`s submitted notebook Python. It parses a whitelisted PySpark-like subset with Python `ast`, compiles supported relational semantics, executes bounded read-only correctness queries where fixtures exist, and independently runs the virtual Spark scheduler only for calibrated truth packs.

```bash
uvicorn services.api.main:app --reload --port 8000
```

The standalone HTML can connect to this API when opened as `file://`; CORS permits the local `null` origin for that training workflow.

## Endpoints

- `GET /health`
- `GET /capabilities`
- `GET /profiles`
- `GET /exercises`
- `POST /compile`
- `POST /simulate`
- `POST /grade`
- `POST /notebook/run`
- **`POST /sql/run`**
- `GET /workspace/simulate?capacity_cores=128`

## PySpark Training path

```text
submitted PySpark subset
        -> safe AST
        -> SparkLab relational SQL
        -> bounded semantic engine when a fixture exists
        -> actual rows + schema + fingerprints
        -> truth-pack comparison

        + independently

        -> calibrated virtual Spark
        -> stages / tasks / shuffle / AQE / cost
```

`semantic_engine=auto` prefers DuckDB when the optional package is installed and falls back to SQLite otherwise.

## SQL runtime path

`POST /sql/run` executes **one read-only SELECT/CTE statement** against the bounded fixture for the selected case.

It returns real bounded execution provenance but deliberately returns no Spark simulation or Spark cost evidence. This prevents SQL execution from being misrepresented as a Spark job.

Example request:

```json
{
  "sql": "SELECT customer_id, SUM(net_amount) AS revenue FROM silver.orders GROUP BY customer_id",
  "case": "retail",
  "semantic_engine": "auto",
  "limit": 50
}
```

## Capability reporting

`GET /capabilities` reports the actual runtime state, including:

- SQLite bounded oracle availability;
- optional DuckDB availability;
- which engine `auto` will choose;
- absence of a real Spark cluster/full dataset adapter.

The application does not claim DuckDB execution when the package is unavailable.

## Truth boundary

- parser + relational compiler: deterministic for the supported subset;
- bounded result rows: real query execution;
- calibrated mission physical behavior: virtual Spark;
- executor/network/wall-clock/cloud usage: modeled estimates;
- full DuckLake/MotherDuck case-study execution: not connected yet.

Docker remains optional packaging. Kubernetes is intentionally excluded: virtual workers/executors are scheduler entities, not containers pretending to form a Spark cluster.
