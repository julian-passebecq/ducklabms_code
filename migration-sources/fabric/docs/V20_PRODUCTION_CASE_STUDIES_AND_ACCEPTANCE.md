# V20 — production case studies and live acceptance

## Objective

The learning studio should feel like an engineer joining a project, not like a catalog of product widgets. V20 therefore gives each existing scenario a production-shaped brief before the learner opens Pipeline, Notebook, dbt, Lakeflow, SQL, Monitor, or Recovery.

## Case-study contract

Each `CaseStudy` can now carry a `CaseStudyBrief` with:

- `businessProblem`
- `stakeholders`
- `sourceSystems`
- `serviceLevels`
- `dataContracts`
- `acceptanceCriteria`
- `incident`

The three existing datasets remain unchanged. The new brief wraps them with context and operational constraints rather than adding a fourth arbitrary dataset.

## Product tracks

The case-study workbench reuses `productionPlan()` and `productionCompletedStages()` to show the same business problem through two implementation tracks.

### Microsoft Fabric

Typical path:

```text
Design
  -> Govern / Lakehouse context
  -> Copy Job / Pipeline ingestion
  -> SQL / dbt / Python / Spark only where justified
  -> Fabric Pipeline orchestration
  -> Warehouse / Lakehouse SQL serving
  -> Monitor / lineage / checkpoint
```

### Azure Databricks

Typical path:

```text
Design compute/storage
  -> Unity Catalog
  -> Auto Loader / landing volume
  -> Lakeflow Silver/Gold
  -> Lakeflow Jobs
  -> SQL Warehouse
  -> Jobs / lineage / recovery evidence
```

The simulator executes representative local data effects. Managed cloud services, cluster infrastructure, capacity, billing, and true distributed Spark execution remain simulated.

## Live definition of done

`caseStudyEvidence.ts` converts the workspace into case-level acceptance evidence.

Important rule:

```text
Case-study seed tables != learner evidence
Baseline checkpoint      != recovery evidence
```

A table only satisfies a case acceptance gate when its `runtimeSource` is not `Case-study seed`.

This prevents a fresh case from displaying false completion because the starter workspace contains example Bronze/Silver/Warehouse tables for exploration.

## Case summaries

### Retail

- Hourly file ingestion.
- Relational transformation and star-schema serving.
- Default to SQL/dbt/lightweight Python, not Spark.
- Incident: duplicate sale plus negative quantity.
- Recovery: quarantine, correct, rerun transformation/publish path, reconcile totals.

### Turbine

- Continuous telemetry plus multi-TB production history.
- Spark is justified for the production-scale distributed feature path, while compact downstream serving remains SQL-friendly.
- Incident: replay + firmware schema drift + missing sensor value.
- Recovery: rescue/quarantine unexpected payloads, update contract, restart from checkpoint, deduplicate by event key.

### ERP

- Metadata-driven incremental extraction.
- Watermarks, dbt/incremental SQL, SCD Type 2, idempotent reruns.
- Spark is not the default solution.
- Incident: premature watermark advance plus duplicate customer changes.
- Recovery: restore safe state, repair staging, rerun dbt/SCD2, advance watermark last.

## QA guarantees

V20 executable tests prove for every case:

- a fresh seed scores 0/5 acceptance gates;
- the baseline checkpoint does not satisfy recovery;
- the full Fabric production lifecycle reaches 5/5 acceptance and 7/7 lifecycle stages;
- the full Databricks production lifecycle reaches 5/5 acceptance and 7/7 lifecycle stages;
- both tracks emit lineage and create a real recovery checkpoint.
