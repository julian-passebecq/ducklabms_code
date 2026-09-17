# V16 changelog — operational reruns, repair runs, and schema-drift drills

V16 deepens how the existing Fabric and Azure Databricks case studies behave **after something goes wrong**. It does not add another product area and it does not add real Spark. The focus is operational realism: retry scope, repair safety, schema drift, run history, parameters, task values, queueing, and concurrency.

## Fabric Monitoring Hub realism

Pipeline run history now supports representative operational actions:

- **Retry full run**;
- **Rerun from failed activity**;
- **Rerun from selected activity**.

Rerun records persist:

- parent run id;
- rerun mode;
- rerun starting activity;
- preserved-upstream vs re-executed activity evidence.

When a scoped rerun starts after upstream activities, successful upstream work is shown as preserved rather than misleadingly executed again.

## Azure Databricks Auto Loader drift incident

The Auto Loader workbench now has a deterministic schema-drift drill. The incoming representative payload adds `firmware_version` and widens `temperature`.

The simulator distinguishes:

- `addNewColumns` → schema state evolves, restart required;
- `addNewColumnsWithTypeWidening` → additive schema + compatible type widening, restart path;
- `failOnNewColumns` → strict contract failure;
- `rescue` → unexpected payload captured in `_rescued_data` while target schema remains stable.

The UI explicitly teaches that rescued data is **contained**, not automatically trustworthy downstream data.

## Lakeflow Jobs operational realism

The Jobs workbench now models:

- job parameters;
- dynamic job-parameter references;
- upstream task values;
- file/table/schedule/model/continuous/manual trigger choices;
- retry settings;
- queueing;
- maximum concurrent runs;
- run-matrix history;
- failed + skipped task repair;
- parameter override during repair;
- idempotency risk when tasks append partial output.

Repair semantics are intentionally explicit: successful upstream tasks are preserved while failed/skipped tasks rerun from the beginning.

## Debug fixes / cleanup

- Updated the Databricks home copy from “eight” to **nine** interactive workbenches.
- Added typed Fabric retry metadata to persisted pipeline runs while remaining backward compatible with V15 run records.
- Added reusable operational simulation functions instead of embedding recovery rules only in components.

## QA

- V16 static/depth checks: **18/18 PASS**
- V16 operational engine checks: **19/19 PASS**
- previous V5-V15 assertions: **559/559 PASS**
- combined automated assertions: **596/596 PASS**
- shimmed semantic TypeScript: **64 TS/TSX files PASS**
- missing routes: **0**
- Fabric modules: **16**
- Databricks modules: **9**
- ADF modules: **2**
- guided case studies: **3**

A fresh npm dependency install was attempted again and timed out before producing `node_modules`; the dependency-backed Vite build remains an external connected-machine gate.
