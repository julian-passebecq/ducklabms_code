# Fabric + Azure Data Engineering Learning Studio V21

A local React/TypeScript training workstation for **Microsoft Fabric**, **Azure Data Factory**, and **Azure Databricks**. It combines product-style authoring, production-shaped case studies, a shared executable learning workspace, orchestration simulation, reliability/recovery drills, engineering-decision practice, multi-stage challenges, and live catalog/lineage evidence.

It does **not** provision Microsoft or Databricks cloud resources. Supported SQL, lightweight notebook/Python transformations, dbt learning flows, representative pipeline/job data effects, lineage, checkpoints and quality checks execute locally. Spark/cloud infrastructure and managed-service compute remain intentionally simulated.

## V21 focus: current evidence, not just existing evidence

V20 introduced live case-study acceptance. V21 makes that acceptance **freshness-aware**.

A downstream object no longer counts as production-ready merely because it exists. If an upstream object is refreshed later, dependent Silver/Gold/lifecycle evidence becomes stale until the affected path is reprocessed.

```text
Bronze v1 -> Silver v1 -> Gold v1   = fresh

Bronze rerun -> Bronze v2
                 Silver v1          = stale
                 Gold v1            = stale transitively
```

The Production Workflow and Case Study Brief now distinguish:

- **Fresh evidence**
- **Stale evidence**
- **Not run / missing evidence**

Case acceptance drops when downstream evidence is stale and returns to 100% only after the affected path is reprocessed.

## Case-study model

Each of the three production cases contains:

- business problem and stakeholders;
- source-system estate and cadence;
- production scale vs simulator sample;
- freshness/recovery/quality/cost constraints;
- data contracts and owners;
- Fabric and Databricks implementation tracks;
- live definition of done;
- incident/root-cause/containment/recovery/prevention story.

The three cases remain:

1. Retail batch lakehouse / warehouse.
2. Turbine telemetry / operational risk.
3. ERP incremental CDC / SCD Type 2.

## Execution boundary

### Genuinely executable in the learning workspace

- supported SQL transformations and joins;
- editable notebook SQL/Python/Markdown cells;
- constrained pandas-style transformations;
- Copy / Copy Job / Dataflow representative data effects;
- Pipeline -> Notebook execution;
- representative stored-procedure effects;
- dbt source/ref/materialization/incremental/test behavior;
- Airflow tasks over the shared runtime;
- representative Auto Loader / Lakeflow / Lakeflow Jobs effects;
- Fabric + Databricks live catalogs and lineage;
- freshness-aware case-study acceptance evidence;
- quality profiles, checkpoints and restore.

### Simulated but intentionally realistic

- Apache Spark cluster execution;
- distributed executors/shuffles/cluster autoscaling;
- Fabric capacity/cloud compute;
- Databricks serverless/classic infrastructure;
- managed Auto Loader/Lakeflow/Unity Catalog services;
- managed Airflow infrastructure;
- Azure authentication/networking/Integration Runtime;
- actual cloud provisioning and billing.

## Module inventory

- Fabric modules: **16**
- Databricks modules: **9**
- ADF modules: **2**
- production case studies: **3**
- Power BI: intentionally deferred

## Run on Windows

```powershell
npm install
npm run qa
npm run qa:semantic
npm run typecheck
npm run build
npm run dev
```

## Verification performed in this sandbox

- V21 static/depth QA: **18/18 PASS**
- V21 executable freshness/consistency QA: **65/65 PASS**
- previous V5-V20 regression assertions: **812/812 PASS**
- **combined automated assertions: 895/895 PASS**
- shimmed semantic TypeScript: **66 TS/TSX files PASS**
- missing routes: **0**

## Dependency-backed build limitation

A fresh npm dependency install was attempted during V21 but did not complete in this sandbox; no `node_modules` directory was created. A genuine dependency-backed Vite production build therefore remains a connected-workstation release gate.

See `docs/V21_FRESHNESS_AND_CASE_EVIDENCE.md` for the V21 evidence model. Historical changelogs and architecture notes remain in the repository.
