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

### Storage fidelity

When DuckLake is active, Datapass reads real table-file evidence from
`ducklake_list_files` and real commit history from `ducklake_snapshots`.
SparkLab may use measured Parquet bytes and file counts as scan/partition input
assumptions, but it still does not claim real Spark execution or real pruning
selectivity.

Datapass also reports a small-file advisory. The current threshold (8 MiB) is
an explicit teaching heuristic; DuckLake documentation only recommends Parquet
files of at least a few megabytes. The UI can recommend
`ducklake_merge_adjacent_files`, but normal application use never runs
maintenance automatically.

The integration gate verifies that explicit DuckLake file compaction reduces
the number of physical files while preserving both the current table result
and historical `AT (VERSION => ...)` reads.

### Partitioning and pruning

DuckLake stores partition definitions in catalog metadata and associates data
files with partition values. Datapass exposes that information in the Catalog
surface so learners can see the difference between a logical table and its
physical file layout.

The first pruning model is intentionally narrow:

- the filter must be the first operation on the source DataFrame;
- it must be a simple equality predicate;
- the filtered column must be a current `identity` DuckLake partition key;
- files written under older/different partition specs are retained as
  candidates rather than incorrectly pruned;
- the candidate file/byte counts are labeled catalog planning evidence, not
  runtime scan telemetry.

For example, a partitioned `bronze.events` table queried with
`F.col("event_date") == "2026-01-02"` can use exact DuckLake partition values
to reduce SparkLab's modeled source files and input bytes. Filters on
`year/month/day/hour`, bucket partitions, arbitrary range predicates and
zone-map statistics remain future fidelity work unless separately proven.

This mirrors the real DuckLake concept without claiming that SparkLab ran
Apache Spark or measured DuckDB's actual I/O counters.

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
