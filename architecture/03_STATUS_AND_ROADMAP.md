# Implemented candidate status - 2026-09-21

Authoritative implementation and qualification report: `../docs/v1/RELEASE_STATUS.md`.

The exact base is `codex/real-spark-proxy-1 @ abb0345a78836508f6024d79710a46973cbed9d6`. Cleanup and M2 are already assembled, followed by canonical workspace resources, resource hosts, local dbt jobs, safe pipeline compilation/manual execution, shared Arena scenarios, a gated guided client, four figure families and catalog/presentation polish.

Do not repeat assembly or ownership migration. The remaining critical work is native dependency/type/build/browser qualification, real dbt/DuckLake/Polars execution proof, live guided-service qualification, and the explicit functional limitations recorded in the report (DAG-Arena grading, qualified dct import/renderer interoperability, and shared ConceptMotion SDK integration depth).

Focused results: 172 frontend/contract/model tests passed; 140 backend changed-path tests passed with 3 explicit skips. Full backend: 234 passed, 12 failed, 43 errors, 8 skipped. Missing native dependencies cause the failing native paths; the suite is not green. Full UI type/build/browser proof is absent. No V1 completion claim is justified.

Normal product scope remains local-first. Cloudflare, MotherDuck and a DevOps sibling are not completion prerequisites. Legacy remote Airflow/Spark files are reference-only, not the V1 direction.
