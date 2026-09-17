# V16 operational architecture

## Goal

Teach the operational decisions engineers make after a production run fails or a source schema changes, without pretending the local app is a managed Fabric or Databricks control plane.

## Fabric rerun model

```text
Original run
Copy ✓
  ↓
dbt ✕
  ↓
Publish skipped

Retry full run
Copy ✓ → dbt ✓ → Publish ✓

Rerun from failed activity
Copy preserved
  ↓
dbt ✓
  ↓
Publish ✓
```

The rerun record keeps `parentRunId`, `rerunMode`, and the activity used as the rerun boundary.

## Auto Loader schema-drift model

```text
Landing payload changes
        ↓
firmware_version appears
+ compatible type widening
        ↓
┌─────────────────────────────┐
│ addNewColumns              │ → restart path
│ addNewColumnsWith...       │ → restart + widening
│ failOnNewColumns           │ → fail loudly
│ rescue                     │ → _rescued_data
└─────────────────────────────┘
```

No Spark cluster executes. The simulator teaches the operational state machine and expected consequences.

## Lakeflow Jobs repair model

```text
ingest_bronze ✓
      ↓
clean_silver ✓
      ↓
quality_gate ✕
      ↓
aggregate_gold skipped

Repair
- preserve successful upstream tasks
- rerun quality_gate from the beginning
- rerun dependent skipped task
- allow repair-time parameter override
```

The app explicitly warns that repair is **not rollback**. If a failed task partially appended output before failing, a repair can duplicate data unless the task itself is idempotent.

## Parameters and task values

The Jobs simulator separates:

- job parameters: run-time input configuration;
- task values: outputs created by upstream tasks for downstream tasks.

Representative references:

```text
{{job.parameters.processing_date}}
{{job.parameters.target_layer}}
{{tasks.ingest_bronze.values.rows_ingested}}
```

## Execution boundary

### Executed locally

- run/repair state transitions;
- retry-scope calculation;
- parameter propagation;
- task values;
- schema-drift response state;
- run-history models.

### Simulated

- Microsoft Fabric managed retry execution;
- Databricks Jobs service;
- serverless/classic compute;
- Auto Loader/Spark streaming infrastructure;
- cloud checkpoint storage and billing.
