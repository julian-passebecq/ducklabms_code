# Datapass local DuckLake runtime

Status: bounded consolidation pass. This document describes the active local
architecture; it does not make MotherDuck or hosted execution mandatory.

## Canonical local path

```text
React + Fluent UI v9
        |
     FastAPI
        |
   workspace worker
        |
      DuckDB
        |
   DuckLake 1.0
   /          \
SQLite       Parquet
metadata      data
```

DuckLake is the table/lakehouse layer. DuckDB is the authoritative local
compute engine and the official DuckLake reference implementation. New
Datapass DuckLake workspaces use a SQLite metadata catalog and local Parquet
files.

The teaching profile sets `DATA_INLINING_ROW_LIMIT 0` explicitly. This is a
Datapass interoperability/observability choice: small writes remain visible as
Parquet rather than disappearing into catalog inline tables. A later advanced
lesson may enable data inlining deliberately.

## Start

Install the intended local engines:

```sh
python -m pip install -r requirements-engines.txt
```

Install the official DuckDB extensions once and start in DuckLake mode:

```sh
python start.py --storage ducklake --install-ducklake
```

After the extensions are cached, normal starts do not need network access:

```sh
python start.py --storage ducklake
```

Plain DuckDB compatibility mode remains available:

```sh
python start.py --storage duckdb
```

`auto` retains the existing robust behavior: DuckDB when the package is
installed, otherwise explicitly labeled SQLite compatibility mode. It does not
pretend that plain DuckDB or SQLite is DuckLake.

## Workspace files

For a new DuckLake workspace:

```text
data/
├── workspace.duckdb       # local DuckDB connection/session database
├── lake-metadata.sqlite   # DuckLake catalog metadata
├── lake-files/            # DuckLake-managed Parquet tree
└── asset-lineage.json     # Datapass learning freshness/provenance
```

A previous prototype may contain `lake-catalog.ducklake`. Datapass preserves
that existing metadata backend instead of silently creating a second catalog;
new workspaces use SQLite metadata.

## Security boundary

Extension installation/loading and DuckLake attachment are server-owned startup
operations. Learner SQL cannot issue `ATTACH`, `INSTALL`, `LOAD`, `COPY`,
`SECRET` or arbitrary filesystem readers. After controlled initialization,
DuckDB external access is disabled except for the workspace directory that
DuckLake requires for its metadata and Parquet files.

This remains a trusted local single-user application, not a hostile
multi-tenant SQL sandbox.

## Lakehouse evidence and maintenance

The Data surface can inspect real DuckLake physical evidence without exposing
maintenance commands to learner-authored SQL.

For physical DuckLake tables, Datapass reads:

- current Parquet data-file count and bytes from `ducklake_list_files`;
- current DuckLake snapshot id;
- bounded snapshot history from `ducklake_snapshots`;
- delete-file count;
- average/largest file sizes;
- a teaching small-file flag for files below 1 MiB.

The 1 MiB threshold is a Datapass teaching heuristic, not a DuckLake invariant.
DuckLake documentation recommends Parquet files of at least a few megabytes and
documents tiered compaction examples beginning below 1 MiB. Measured file sizes
remain distinct from that heuristic.

Compaction is an explicit server-owned operation using
`ducklake_merge_adjacent_files`. It verifies that the current logical row count
is unchanged and reports before/after file evidence. Compaction does not
immediately delete historical files that are still referenced by snapshots.

Snapshot previews execute real DuckLake time-travel queries with
`AT (VERSION => snapshot_id)`. Preview size is bounded. A snapshot that
predates a table fails explicitly.

### File pruning evidence

For simple numeric SparkLab filters such as:

```python
spark.table("silver.orders").filter(F.col("net_amount") > 0)
```

Datapass can read DuckLake's persisted per-file min/max statistics and determine
which current Parquet files are possible candidates. The resulting evidence is
labeled `measured_ducklake_zone_map_metadata`.

This means:

```text
measured:
  total current files
  candidate files after zone-map pruning
  total/candidate Parquet bytes

not measured:
  rows returned by the filter
  Spark executor I/O
  Spark task duration
  shuffle duration
  cloud cost
```

Only a deliberately bounded subset of simple numeric comparisons is recognized
for this teaching evidence. Unsupported predicates fall back to the full
measured DuckLake file set rather than inventing pruning.

## SparkLab

SparkLab does not run Apache Spark. Supported PySpark-style operations are
parsed into a bounded relational plan and DuckDB-compatible SQL for real local
semantic results. Distributed stages/tasks/shuffle/skew/spill/cost remain a
separate teaching simulation.

```text
supported PySpark-style code
          |
   SparkLab logical plan
      /             \
DuckDB/DuckLake    teaching simulator
real rows          modeled Spark stages
      \             /
       explicit evidence labels
```

Measured local timing and modeled distributed timing must never be merged.

## MotherDuck

MotherDuck remains an optional remote runtime/deployment target. There is no
hidden upload, credential prompt or network fallback in the local runtime. A
future MotherDuck adapter must preserve the same evidence/truth contract and
require explicit credentials/cost consent.

## Intentionally absent

- DataFusion is not part of this active branch.
- Tauri is not required for the web/local product.
- React Native is not used.
- Ballista/Kubernetes/real Spark clusters are not required.
- no large custom PySpark compatibility promise is made.

The frozen DataFusion spike branches remain R&D history and can be consulted for
plan/metrics UI ideas without becoming runtime dependencies.
