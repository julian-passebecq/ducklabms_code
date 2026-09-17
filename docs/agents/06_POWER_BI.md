# Power BI specialist - bind the semantic model to root assets

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own the Power BI learning module. Use migration-sources/powerbi for existing model, DAX, report, refresh and lesson features. Root Gold/warehouse tables are the only authoritative data sources.

Deliver one complete star-schema KPI case: fact/dimension selection, relationships, model view, a small explicit DAX subset, report visuals and refresh/freshness evidence. The existing root SQL KPI is an integration seam, not a DAX engine. Do not present every DAX expression as supported. Test filter context, row context, CALCULATE transitions, relationship direction, ambiguous paths and BLANK behavior for whatever subset is claimed.

Use Fluent panels/ribbons and the common notebook for explanations/code, but keep the semantic model distinct from SQL transforms. Model/report refresh must consume asset versions and visibly invalidate stale reports. No hardcoded successful KPI cards. Do not replace the notebook core with a bespoke BI lesson layout engine. Preserve unsupported/teaching/real distinctions in every panel.
