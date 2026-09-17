# Truth, safety and realism

## Truth matrix

| Area | What this root does | What it does not claim |
|---|---|---|
| SQL | Executes local SQL in the selected engine | Exact SQL Server/T-SQL parity |
| SparkLab | Parses supported AST and executes its compiled SQL on physical tables | Complete PySpark or distributed execution |
| Virtual clusters | Models supported scenario stages/partitions/skew/AQE and training costs | Measured cluster performance or real vendor invoices |
| Python | Runs real CPython in an opt-in persistent worker | Safe execution of hostile code |
| Polars | Imports and runs real Polars when installed | A fake Polars fallback |
| dbt | Resolves literal registered ref/source calls and executes SQL | dbt Core, arbitrary Jinja, full incremental/snapshot behavior |
| Workflow | Validates dependencies and executes/skips sequential tasks | Airflow scheduler or Data Factory runtime |
| BI | Computes a SQL-backed Gold KPI | DAX/VertiPaq, Direct Lake or Power BI embedding |
| DuckDB | Preferred real local storage engine, implementation unverified here | That SQLite test results prove DuckDB compatibility |
| DuckLake | Explicit extension attachment and data directory, unverified here | That schema names alone constitute a DuckLake |
| MotherDuck | Inactive future adapter | Any active connection, free-tier assumption or uploaded user data |

## Spark physical model

Only the retail broadcast truth pack is connected to the shared root's virtual performance model in this release. The physical fixture has 12 orders and 4 dimension rows. The inherited logical-scale scenario models 184,229,821 fact rows. Those are different quantities and must never be shown as if the latter were physically processed.

The model requires the immutable shipped physical input fixture to match. Altering source/silver inputs disables the scenario metric attachment. This protects provenance, but does not magically calibrate the model against a real Spark cluster. Inherited confidence percentages were removed from root responses because they were authored assumptions, not empirical validation.

The virtual profile changes only simulated resource/cost behavior, never actual SQL row semantics. Vendor money fields remain null without explicit dated price inputs. SparkLab's training euro/SCC conversion is a fictitious exercise currency rule, not an Azure or Databricks quote.

## Security boundary

Local, single user, trusted machine. Bind 127.0.0.1. Use one API worker. A random bearer token is required on protected API endpoints; browser origins/hosts are restricted. Python is disabled by default. Imported notebooks do not auto-run. No cloud credentials are required or bundled.

Submitted Python is deliberately powerful and can access files, processes and networks with the user's OS permissions. Removing token-like environment variables and placing execution in a process does not constitute a sandbox. Do not run this on a public server, expose it through a tunnel, or accept strangers' notebook code. A proper hosted deployment needs hardened isolation, quotas, per-user authorization and a different data ownership model.

Timeouts terminate the notebook worker. Python can create child processes; this release does not implement a cross-platform process-tree security boundary. There is no strict OS-wide Python memory quota. SQL has bounded output and DuckDB configuration limits, but those are not comprehensive resource isolation.

The SQL token guard is a bounded teaching interface, not a complete SQL parser/security proof. Lineage extraction recognizes simple unquoted `layer.table` FROM/JOIN references. CTEs over those names work; arbitrary dialect-specific/quoted/dynamic/view indirection is not a complete lineage system. Keep acceptance-critical cases inside the documented form until AST-based lineage is added.

Metadata and tables are persisted separately. Per-table SQL transactions protect replacement failures, and notebook documents use atomic replace; there is no crash-consistent distributed transaction across database state, lineage JSON and notebook JSON. A future recovery ledger is required before multi-user or production claims.
