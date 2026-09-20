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

## File layout, pruning and snapshots

DuckLake exposes real file and snapshot metadata. Datapass reads that metadata
for teaching evidence:

- current Parquet file count and total bytes;
- average/minimum/maximum file size;
- delete-file count;
- current catalog snapshot and snapshot count;
- a Datapass small-file signal using an **8 MiB teaching threshold**.

The 8 MiB value is not a DuckLake validity rule. DuckLake documentation
recommends Parquet files be at least a few MiB and provides
`ducklake_merge_adjacent_files` for explicit compaction. Datapass currently
reports the maintenance opportunity but does not run compaction automatically.

DuckLake can prune files using file-level column statistics/zone maps when a
predicate permits it. SparkLab therefore labels a filter immediately above a
DuckLake scan as a **pruning opportunity**. It does not claim an actual
files-scanned or files-pruned count because Datapass does not currently collect
that scan telemetry.

Every DuckLake write belongs to a snapshot. Snapshot identifiers shown in the
catalog are measured metadata, not SparkLab simulation output. Time travel and
snapshot-specific exercises are a subsequent bounded teaching pass.

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
