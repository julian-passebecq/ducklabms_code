# Rust / DataFusion engine spike 1

## Status

Experimental, opt-in, additive. It does **not** replace the existing Python/FastAPI root runtime in this pass.

The spike introduces a Rust workspace with:

- `datapass-engine`: DataFusion 55 SQL + Parquet execution, logical plan, physical plan, measured operator metrics and bounded JSON row preview.
- `datapass-lakehouse`: real `datafusion-ducklake` 0.8 + SQLite metadata + local Parquet smoke path.
- a versioned JSON stdin/stdout protocol (`protocol_version = 1`) suitable for the current FastAPI adapter and a later Tauri command/sidecar boundary.

## Why this boundary

The UI, notebook document format, workspace catalog, Interview module and SparkLab contracts are not rewritten. Rust is introduced as an execution adapter and must prove correctness/performance before becoming the default runtime.

The existing FastAPI API remains the control plane. `DATAPASS_RUST_ENGINE_BIN` explicitly opts a local installation into the Rust spike. Without it, `/api/engines/rust` reports unavailable and all inherited runtimes behave exactly as before.

## Truth model

Rust query timing is **measured local time** and is labelled `real_local`. It is not a Fabric/Databricks/Spark cluster estimate. SparkLab modeled stages/costs remain separate evidence.

## Security / filesystem boundary

The experimental API accepts only workspace-relative Parquet paths. The Python adapter resolves them under the current workspace `data/` directory before invoking the local binary. It does not expose arbitrary absolute paths through the HTTP API.

The Rust executable itself is a local process and can access files available to the OS user. This is consistent with Datapass Studio's trusted-local execution model and is not a sandbox.

## Current protocol

Requests are one JSON object via stdin (or the first command-line argument for diagnostics):

```json
{"kind":"probe"}
```

```json
{
  "kind":"query",
  "sql":"SELECT * FROM events LIMIT 10",
  "sources":[{"name":"events","path":"/resolved/local/events.parquet"}],
  "max_rows":200,
  "target_partitions":4
}
```

```json
{"kind":"ducklake_smoke","root":"/tmp/datapass-ducklake-smoke"}
```

Responses are envelopes with `protocol_version`, `ok`, `payload` and `error`.

## Deliberately deferred

- No Tauri shell in this pass.
- No replacement of DuckDB.
- No Sail/Ballista integration yet.
- No SparkLab semantic migration yet.
- No Arrow IPC transport yet; JSON is acceptable for the bounded preview protocol, not the eventual large-result hot path.
- No claim that DataFusion is faster than DuckDB until the benchmark harness runs on representative Datapass workloads.
- No production support claim for `datafusion-ducklake`; the upstream project currently describes its API surface as alpha.

## Narrow checks

```sh
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
python -m pytest -q tests/test_rust_engine_adapter.py
```

## External QA / next pass

External QA should additionally run the inherited regression suites and benchmark equivalent DuckDB/DataFusion workloads at multiple data sizes. If correctness is stable, the next bounded engineering pass should add an Arrow IPC result path and a SparkLab plan adapter before considering Sail or Ballista.
