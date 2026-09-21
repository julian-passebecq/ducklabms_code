# References checked September 21, 2026

These are integration references, not evidence that an external engine was run.

- dbt local DuckDB/MotherDuck profiles: https://docs.getdbt.com/docs/local/connect-data-platform/duckdb-setup
- dbt pricing and Core: https://www.getdbt.com/pricing
  Developer currently lists one developer, one project, 3,000 successful model builds/month.
  API access is listed under Starter extras; do not assume the free plan is an embeddable
  Datapass job API. Check target/adapter compatibility separately. GitLab is not needed
  to run a local dbt project, and moving this GitHub repository is not proposed.
- dbt Core source: https://github.com/dbt-labs/dbt-core
- dbt Charts: https://github.com/dbt-labs/dbt-charts
  Checked source describes a beta Python dct CLI, SQL/YAML boards, built-in DuckDB,
  validation/render/serve, and profile reuse. Python 3.10-3.13 stated in its README.
  This is a dashboard project, not Helm charts. Native Datapass preview is NOT dct.
- dbt Charts syntax/profile contract: https://github.com/dbt-labs/dbt-charts/blob/52119bef3b80781cdbfbc548b27708712e845401/src/dbt_charts/DBT_CHARTS_SYNTAX.md
- dbt UI reference: https://github.com/data-diving/dbt-ui
  A separate application architecture, not a ready-made React component to embed.
  Referenced for project editing/lineage workflows; its app/runtime is not bundled.
- MotherDuck pricing: https://motherduck.com/product/pricing/
  Lite currently starts at $0, with 10 GB and 10 hours/month of Pulse compute.
  This is quota-limited, not unlimited free runtime. No account was configured.
- Prefect pricing: https://www.prefect.io/pricing
  Hobby currently lists 2 users, 1 workspace, 5 deployments, and 500 serverless
  execution minutes/month. The pasted 20,000-task-run summary is not the contract
  used here. Prefect remains deferred, regardless of free-tier availability.
- DuckDB Iceberg overview: https://duckdb.org/docs/stable/core_extensions/iceberg/overview
  Metadata-path reads and REST-catalog-backed writes have different requirements.
  Verify extension version, catalog, auth and storage before adding a write exercise.
- Dedicated guided Spark service: https://github.com/julian-passebecq/fastapispark
  README and main.py read. Stateless compile/execute protocol with DuckDB results
  and separately simulated metrics. No deployment or API invocation in this pass.
- Future Airflow UI reference only: https://github.com/astronomer/airflow-ui

Pricing is a dated observation, not a guarantee. No new cloud account, deployment,
CI runner, credential, repository, VM, or scheduler is created by this package.
