# Architecture reference — Datapass Studio

This folder is the compact, GitHub-safe architecture reference for the living code repository.

**Living code repository:** https://github.com/julian-passebecq/ducklabms_code

**Historical/archive repository:** https://github.com/julian-passebecq/ducklake_mslab

The archive package assembled during consolidation included large upstream/reference ZIPs, including files over GitHub's normal 100 MB single-file limit. The purpose of this folder is therefore to keep the architecturally important text, contracts, verification evidence and specialist instructions directly beside the code without requiring the large archive.

The Root 0.1.0 material in `CURRENT/` is preserved architecture/evidence. Additional requirement documents in this folder record later explicitly requested constraints without turning them into unverified implementation claims.

## Architecture in one view

```text
Case study / standalone exercise
    |
React + Fluent UI 2 root
workspace / explorer / tool experiences / run history / interview practice
    |
Mosaic-derived generic notebook + flexible layout system
    |
RuntimeClient / shared contracts
    |
FastAPI control plane
    |
workspace execution/runtime workers
SQL | SparkLab | trusted Python | Polars | bounded teaching adapters
    |
shared workspace catalog
source / bronze / silver / gold / warehouse / features / metrics
    |
DuckDB preferred local engine
DuckLake explicit opt-in
SQLite only an explicitly labeled compatibility fallback
MotherDuck optional/future
```

The specialist surfaces — Fabric/Data Factory, warehouse, Airflow/dbt, Power BI, Databricks-inspired ML and future Interview Practice — extend this common root. They do not own separate project databases, notebook formats, run histories or private copies of datasets.

## Non-negotiable separations

The established design keeps these dimensions independent:

1. **Case / exercise** — the problem, inputs, outputs and learning objectives.
2. **Tool experience** — product-inspired labels, ribbon, panels and controls.
3. **Document** — notebook, pipeline, model, report definition or other editable source.
4. **Layout** — where editors, outputs, explanations, diagrams and results appear.
5. **Runtime** — SQL, SparkLab, Python, Polars or other supported execution adapter.

A Fabric-inspired notebook can therefore use the same notebook document and SparkLab runtime as another tool experience without duplicating source or state. A future interview exercise can use the same workbench with a dedicated practice layout rather than another notebook application.

## Interview / LeetCode compatibility

Read `INTERVIEW_LEETCODE_REQUIREMENTS.md` before changing notebook, validation, persistence or runtime contracts.

The future Interview Practice module must be able to support standalone exercises, starter code, Run vs Submit, visible/hidden result-based tests, attempt history distinct from notebook revisions and generic run history, reset/reveal operations, problem-browser metadata and a named interview/practice layout. It must reuse the shared notebook/runtime/validation architecture rather than becoming a second application.

These are compatibility requirements during Core Integration Pass 1; they are not a request to interrupt the core pass with a full interview module implementation.

Direct file: https://github.com/julian-passebecq/ducklabms_code/blob/main/architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md

## Execution truth boundary

The root distinguishes:

- real locally computed outputs;
- bounded semantic emulation such as supported Spark-like transformations;
- explicitly simulated physical/distributed metrics, timing and training cost;
- unsupported behavior, which must fail clearly instead of returning plausible fabricated results.

## Shared data and lineage

Each workspace owns one catalog. Transformations publish shared assets into it. Downstream modules read those actual assets. Publishing a new upstream version can make downstream outputs stale even when older stored rows still exist.

## Notebook model

Notebook source, semantic execution order, visual layout and runtime session are separate concerns. Moving a cell in a visual layout must not silently change semantic execution order. `.ipynb` import/export preserves notebook data without auto-executing imported code.

## Runtime ownership

The API/control plane owns execution mechanics, worker lifecycle, timeout/restart behavior, outputs and run evidence. Specialist modules own the semantics of their supported tool workflows but must submit work through the shared execution/catalog infrastructure.

## Current implementation baseline

**Root 0.1.0** is the implementation baseline currently in this repository.

The later **Core Architecture Contract v1** refined/froze architectural direction; it did not by itself create a v0.2 code release.

## Current release gates

The preserved verification record says the earlier environment had passing Python, TypeScript contract and HTTP integration checks, but the following were still explicit gates for a real promotion pass:

- actual dependency installation;
- strict TypeScript typecheck;
- Vite production build;
- real React/browser validation;
- actual DuckDB execution/persistence;
- actual DuckLake smoke path where available;
- actual Polars path where available;
- Windows startup validation;
- connected save/reopen/staleness/notebook round-trip verification.

See `CURRENT/VERIFICATION.md` for the exact preserved wording and evidence.

## Read order

1. `CURRENT/START_HERE.md`
2. `CURRENT/ARCHITECTURE.md`
3. `CURRENT/MODULE_CONTRACT.md`
4. `CURRENT/NOTEBOOK_RUNTIME_CONTRACT.md`
5. `INTERVIEW_LEETCODE_REQUIREMENTS.md`
6. `CURRENT/SOURCE_AUDIT.md`
7. `CURRENT/TRUTH_AND_SECURITY.md`
8. `CURRENT/CASE_COVERAGE.md`
9. `CURRENT/ROADMAP.md`
10. `CURRENT/VERIFICATION.md`
11. `AGENTS/00_COORDINATION.md`

## Preserved specialist instructions

`AGENTS/` contains the bounded instructions already written for:

- root integration;
- notebook/Mosaic;
- SparkLab;
- pipelines/warehouse;
- Airflow/dbt;
- Power BI;
- Databricks-style ML/Polars;
- guide/curriculum;
- independent release QA.

## Source-project migration material

The actual retained source trees remain under `migration-sources/` in the repository. They are intentionally migration inputs rather than separately running top-level products.

Direct source location: https://github.com/julian-passebecq/ducklabms_code/tree/main/migration-sources

## Large archive note

The historical mega archive itself is not required for normal Codex work. If a future task needs archaeological/reference material beyond what is preserved here, use the archive repository URL above or the separately retained local archive. Do not copy giant upstream Fluent UI ZIPs into the live code tree.
