# DuckLake Data Engineering Lab V0.12

V0.12 is a **runtime-truth and notebook-execution** pass on the Fabric-inspired DuckLake / SparkLab workbench.

The central design remains deliberately split into independent evidence paths:

```text
Notebook code
    |
    +-- SQL runtime
    |      one safe read-only query
    |      -> DuckDB when available
    |      -> SQLite bounded fixture fallback
    |      -> real rows / schema / provenance
    |
    +-- PySpark Training runtime
           safe AST -> relational plan
                 |
                 +-- bounded semantic execution
                 |      real rows / schema / hashes
                 |
                 +-- virtual Spark runtime
                        stages / tasks / shuffle / AQE / cost
```

The bounded fixtures are correctness oracles, **not scale benchmarks**. Large case-study statistics drive the virtual Spark runtime independently.

## What changed in V0.12

### Live bounded SQL runtime

`SQL (DuckDB)` is now an actual runtime rather than a decorative selector. With the FastAPI backend running, one read-only SQL statement is executed against the bounded case fixture:

```http
POST /sql/run
```

The engine is reported truthfully:

- DuckDB when the optional Python package is installed;
- SQLite fixture fallback otherwise.

The response includes rows, schema, engine, dataset scope, elapsed time, query hash, result hash, and preview hash. No Spark stage/cost evidence is attached to a SQL-only execution.

### PySpark compiler fidelity

The safe PySpark subset gained several notebook patterns that are common in Fabric/Databricks work:

```python
df.select("*")

df.withColumnRenamed("old_name", "new_name")

df.join(other, ["key_a", "key_b"], "left")

F.when(F.col("amount") > 0, "positive").otherwise("other")
F.col("amount").cast("double")
F.col("status").isin("OPEN", "CLOSED")
F.col("amount").between(0, 1000)
```

A real compiler bug was fixed: `select("*")` no longer becomes the literal SQL string `"*"`; it now preserves wildcard projection and known schema correctly.

### Cost model includes driver and idle allocation

Virtual Spark cost evidence now distinguishes:

- worker allocated core-hours;
- useful task core-hours;
- driver core-hours;
- worker node-hours;
- driver memory GB-hours;
- slot utilization.

Cold-start/driver time is therefore no longer omitted from modeled usage.

### Static preview cannot silently drift from the runtime

`services/sparklab/generate_preview.py` generates:

- `services/sparklab/runtime_preview.json`
- `src/runtimePreview.ts`

from the same current virtual runtime and truth packs used by the backend. A regression test fails if the checked-in preview no longer matches the runtime.

### Finance statistics aligned

The Finance UI now uses the same calibrated values as its truth pack:

- 61.84M modeled rows;
- 9.7 GB input;
- 200 modeled shuffle partitions;
- ~41 MB median shuffle partition;
- 278 MB largest shuffle partition;
- ~6.78x skew evidence.

## Calibrated Spark missions

### Retail 03 — broadcast join

- 184.2M modeled fact rows / 26.4 GB;
- SortMergeJoin baseline when catalog size statistics are withheld;
- explicit broadcast removes the join shuffle;
- downstream customer aggregation shuffle remains.

### Retail 04 — customer-key skew

- known hot customer key;
- AQE skew handling is modeled from truth-pack partition evidence;
- repartitioning on the same hot key is treated as an anti-pattern.

### Finance 03 — ordered account window

- 61.84M modeled transactions / 9.7 GB;
- `lag` + running sum by `account_id`, ordered by `transaction_ts`;
- one exchange + in-partition sort modeled;
- a hot account window cannot be arbitrarily split without changing semantics;
- a global ordered window becomes a single-partition bottleneck.

## Truth boundary

### Real

- safe AST parsing of the supported PySpark subset;
- deterministic relational SQL compilation;
- bounded SQL execution;
- actual bounded rows and schema;
- full-result fingerprints where bounded verification is complete;
- truth-pack statistics;
- backend capability reporting.

### Dataset-grounded simulation

- workers/executors;
- stages/tasks;
- shuffle volume;
- partition skew;
- supported AQE behavior;
- spill/memory-pressure estimates;
- virtual duration;
- SparkLab/Fabric-like/Databricks-like usage estimates.

### Not claimed

- real distributed Spark cluster;
- full 184M/61.84M-row execution in the packaged demo;
- exact Fabric/Databricks scheduler behavior;
- JVM GC or network telemetry;
- vendor invoice.

## Run

Dependency-free notebook UI:

```text
standalone.html
```

SparkLab API:

```bash
uvicorn services.api.main:app --reload --port 8000
```

Optional DuckDB semantic engine:

```bash
pip install -r services/api/requirements.txt
pip install -r services/api/requirements-duckdb.txt
```

React workbench:

```bash
npm install
npm run dev
```

## Test

From a clean project root:

```bash
pytest -q
python -m compileall -q services
npx tsc -p tests/tsconfig.offline.json --noEmit
```

V0.12 release gate: **68 tests passed**.

See `docs/V0.12_RELEASE_REPORT.md` for the detailed pass.
