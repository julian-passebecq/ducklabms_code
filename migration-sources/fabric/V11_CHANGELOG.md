# V11 changelog — Reliability, failure, recovery, and operational learning

V11 keeps V10's executable shared workspace and adds a complete failure-and-recovery learning loop.

## Reliability & recovery workbench

- New Fabric **Reliability / recovery** route and curriculum module.
- Deterministic incident drills for all three guided case studies.
- Live data-contract checks with Healthy / Degraded / Broken state.
- Safe pre-incident checkpoints and restore.
- Targeted repair and quarantine tables.
- dbt build/test evidence where dbt is the appropriate quality gate.
- Explicit architecture reasoning about the wrong recovery/tool choice.
- Incident postmortem: Detection → Containment → Correction → Verification → Prevention.

## Case-study incidents

### Retail

- Injects duplicate `sale_id` and invalid negative quantity into `bronze.sales_raw`.
- dbt uniqueness/quality gate fails before promotion.
- Targeted repair deduplicates valid rows and writes rejects to `quarantine.sales_rejected`.

### Turbine

- Injects replayed `event_id` and missing gearbox temperature into `iot.turbine_events`.
- Teaches that dbt is not the primary raw-stream repair mechanism.
- Invalid/replayed events are isolated in `quarantine.turbine_events_rejected`.

### ERP

- Injects duplicate customer business keys and a poisoned future watermark.
- Also corrupts an already-existing incremental staging table to exercise rerun behavior.
- Repair deduplicates source/staging state, restores the watermark, and writes rejected customer changes to quarantine.

## Runtime-aware pipeline failures

- Pipeline Debug creates a **pre-run data checkpoint** before learning-data mutations.
- Actual runtime failures can override optimistic simulated activity status.
- A failed dbt quality gate marks the dbt activity `Failed`.
- `Succeeded` dependencies are skipped after runtime failure.
- `Failed` dependency branches execute normally for containment/recovery logic.
- Runtime root-cause messages are written into Monitor run/activity diagnostics.
- Failed runs expose **Restore pre-run data** directly from the authoring toolbar.

## Monitor and tutorial improvements

- Monitor expanded-run view identifies the first failed activity, skipped downstream impact, and the recommended recovery pattern.
- Direct links from Monitor to Pipeline and Recovery Lab.
- Final tutorial step offers a **Run failure & recovery drill** transition.
- dbt workbench exposes a READY/BLOCKED promotion gate from the latest command result.

## Compatibility

All V5–V10 regression suites remain enabled. Power BI remains intentionally deferred.
