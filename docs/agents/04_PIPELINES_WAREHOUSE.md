# ADF/Fabric pipeline and warehouse specialist

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own a new tool module for pipeline authoring and a separate database/warehouse teaching surface. Read migration-sources/fabric for the existing PipelineStudio/Canvas, notebook and warehouse lessons. Preserve root data ownership and execution history.

Implement one focused case: registered source-database stored procedure with typed parameters -> Copy activity -> Bronze -> notebook transformation -> Gold. A database owns stored procedures; ADF/Fabric Data Factory invokes them. A named, allowlisted local procedure adapter is acceptable when clearly labeled, but arbitrary T-SQL must not be presented as executed SQL Server code.

Migrate a Fluent activity palette, dependency canvas, activity inspector, parameters and run/output panel. Every node maps to a root task with declared inputs/outputs; manual notebook runs and pipeline runs must see the same assets. Test retries/idempotency, partial failures, dependency cycles, parameter validation and downstream staleness. Keep Azure Data Factory and Fabric Data Factory labels distinct where behavior differs. Do not recreate notebook or storage internals.
