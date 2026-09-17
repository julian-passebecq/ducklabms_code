# SparkLab specialist - semantic truth before visual realism

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own services/sparklab and bounded adapter changes coordinated with apps/api/datapass/execution.py. Use migration-sources/sparklab for existing truth packs and tests. Keep parser, semantic execution, physical simulation and cost as distinct layers.

First document the exact supported PySpark syntax and errors. Add real-PySpark oracle comparison fixtures for nulls, joins, duplicate column names, integer/decimal aggregates, ordering, groupBy, window functions and lazy transformations versus actions. Do not implement unsupported syntax by returning expected answers. Preserve per-notebook symbols and reject Python and/or on Columns.

Connect one additional truth pack end to end: actual shared catalog input, immutable fixture validation, real result acceptance, independently labeled virtual stages and deterministic cost model. Changing a virtual profile must never change result rows. No real-vendor price claims without dated supplied inputs. Add incorrect-but-plausible code, skew and broadcast counterexamples. Record which metrics are assumptions and which have real benchmark calibration.
