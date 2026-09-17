# MotherDuck-specific labs

MotherDuck is the cloud execution/managed-service part of the Studio, not a
synonym for DuckLake.

V0.2 reserves two MotherDuck-specific advanced labs:

1. **Managed DuckLake** — compare local DuckLake development with a managed
   DuckLake database and explicit execution provenance.
2. **Flights** — compare a scheduled Python Flight with the equivalent Airflow
   ingestion/orchestration workflow. Airflow remains the main orchestration
   curriculum because its retry/backfill/dependency concepts transfer broadly.

Potential later lab: compare the project's Evidence consumer with a native
MotherDuck Dive while keeping Evidence as the stable cross-environment KPI
surface.

Never commit MotherDuck tokens or cloud credentials.
