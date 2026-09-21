# Datapass V1 acceptance gates

A V1 candidate is complete only when the following are true on the final source candidate.

## Product journey

Without any required cloud service, the user can:

1. create/open a named workspace;
2. open resources in tabs/panes and rearrange the workspace;
3. import a `.ipynb` and use Notebook/Two-page/Code+explanation/2+1/Dashboard/Free Canvas layouts;
4. export a valid `.ipynb` while preserving supported notebook content/metadata;
5. load/import local data and inspect catalog/schema/table data;
6. run real local SQL through DuckDB/DuckLake;
7. run trusted local Python/pandas when enabled;
8. run real local Polars when installed;
9. create/edit a real dbt project and execute dbt Core locally;
10. inspect dbt compiled SQL/tests/run status/artifacts/lineage;
11. design a star schema and complete SCD learning flows;
12. create charts from real result snapshots with provenance/stale state;
13. author a pipeline, see the DAG update, and run supported local tasks;
14. see retries/failure propagation/logs/task states from the Datapass Local Orchestrator;
15. solve Arena exercises with shared semantic fixtures across multiple languages where supported;
16. run a curated SparkLab exercise with real bounded result + separately labeled simulated distributed behavior;
17. open a ConceptMotion visual explanation alongside code/exercise/resource;
18. close/reopen the workspace while retaining durable resources, drafts, attempts and layouts;
19. switch Fabric-inspired / Databricks-inspired / Arena / Studio skins without changing runtime/content ownership;
20. always distinguish real, imported, design-only, emulated, simulated and unavailable evidence.

## Technical gates

At minimum, on the final candidate:

- dependency install succeeds;
- TypeScript/typecheck succeeds;
- production Vite build succeeds;
- focused frontend/unit tests succeed;
- backend Python tests covering changed paths succeed;
- notebook ipynb round-trip tests succeed;
- workspace resource migration tests succeed;
- dbt runner tests and one real local dbt smoke succeed if dbt is part of the release candidate;
- Pipeline compiler/runner tests succeed;
- SparkLab protocol/grading tests succeed;
- native Chromium/Playwright primary journeys succeed.

Record exact commands and raw pass/fail counts. Never convert an unrun gate into a claimed pass.

## Scope gate

The final V1 must not require or advertise these as part of normal Datapass execution:

- Iceberg;
- Oracle;
- real Airflow scheduler;
- Kubernetes;
- IaC/Terraform/OpenTofu;
- generic terminal/Linux/Git curricula;
- real distributed Spark.
