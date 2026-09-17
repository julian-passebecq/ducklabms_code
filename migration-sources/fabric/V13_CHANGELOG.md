# V13 changelog — executable practice depth

## Added

- New **Hands-on practice** Fabric workbench.
- 14 executable exercises available per selected case study (8 visible per case: 5 shared + 3 case-specific).
- Exercise categories: Architecture decisions, SQL, Python and dbt.
- Difficulty filters: Easy, Medium and Challenge.
- Shared-workspace evidence validation for SQL/Python exercises.
- Executable dbt command practice using the existing local dbt runtime.
- Persistent practice mastery state with attempts, failed attempts, hints, solution usage and best score.
- JSON practice-report export.
- Direct navigation from an exercise to the matching product workbench.
- V13 practice curriculum module, bringing Fabric workbenches to 14.

## Engineering-decision content

- Explicit no-Spark drills for normal relational aggregation and ERP CDC/modeling.
- Explicit Spark-justified drill for multi-TB partitioned telemetry.
- dbt-vs-Spark transformation-engineering drill.
- Fabric Pipeline-vs-Airflow orchestration drills.

## Debug / fixes

- Added the typed `practice` route to the shared icon registry.
- Practice filters now automatically select a visible exercise when the current selection is filtered out.
- Architecture exercises no longer reveal the correct tool in the evidence panel before the learner validates a choice.
- `dbt compile` exercise verifies no workspace mutation.
- Foreign/stale practice progress is normalized safely as exercise catalogs evolve.

## QA

- V13 static/depth: 24/24 PASS.
- V13 executable engine: 25/25 PASS.
- Full V5–V13 assertions: 443/443 PASS.
- Semantic TypeScript: 59 TS/TSX files PASS.
- Missing routes: 0.
