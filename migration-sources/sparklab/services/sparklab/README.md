# SparkLab V0.12 compatibility layer

SparkLab is an educational PySpark compatibility and distributed-runtime simulator. It is **not Apache Spark**.

One supported PySpark-style notebook expression can produce two independent forms of evidence:

1. **Semantic evidence** — a relational plan/SQL representation that can be executed against a bounded fixture (and later the real DuckDB/DuckLake case data).
2. **Distributed-learning evidence** — partition counts, stage topology, shuffle boundaries, skew, supported AQE behavior, memory/spill pressure and virtual cost derived from case-specific truth packs.

## Supported training patterns

The subset intentionally focuses on common DE notebook work rather than cloning the whole PySpark API. It includes areas such as:

- table/read access;
- `select`, wildcard `select("*")`, `filter`/`where`;
- `withColumn`, `withColumnRenamed`, `drop`;
- `dropDuplicates`, `distinct`;
- single- and multi-key joins;
- group/aggregate;
- broadcast hints;
- repartition/coalesce;
- common scalar expressions, `when/otherwise`, `cast`, `isin`, `between`;
- ordered windows including `lag`, running aggregates and explicit row frames.

Submitted code is parsed through a whitelist; arbitrary Python execution is not used.

## Cost/runtime accounting

V0.12 virtual jobs expose both useful work and allocated capacity:

- task core-hours;
- worker allocated core-hours;
- driver core-hours;
- worker node-hours;
- memory GB-hours including the driver;
- cluster slot utilization.

This prevents cold-start/driver time and idle allocation from disappearing from cost lessons.

## Static preview generation

Run:

```bash
python services/sparklab/generate_preview.py
```

to regenerate:

```text
services/sparklab/runtime_preview.json
src/runtimePreview.ts
```

A default regression test checks that these checked-in previews still match the current runtime implementation.

## Truth boundary

- **real/deterministic:** parser, supported relational semantics, bounded-fixture results, truth-pack statistics;
- **dataset-grounded simulation:** Spark stages/tasks, shuffle, skew, AQE, spill pressure, virtual duration and cost;
- **not emulated:** JVM GC, actual executor death, real network shuffle, proprietary Fabric/Databricks scheduling, or cloud wall-clock performance.
