# Notebook specialist - preserve the generic engine

Read START_HERE.md, docs/SOURCE_AUDIT.md, docs/MODULE_CONTRACT.md, docs/NOTEBOOK_RUNTIME_CONTRACT.md and docs/VERIFICATION.md first. Work inside this root, not a new standalone application. Preserve the shared catalog, workspace identity, notebook format and RuntimeClient. Do not create another FluentProvider, browser dataset store or execution engine. Return implementation, changed files, tests, screenshots where relevant, known limitations and an updated migration ledger. Do not stop at a plan.

Own packages/notebook-core and focused notebook components only, after coordinating shared changes with the root integrator. Use migration-sources/mosaic as the source baseline. Do not put Fabric, dbt or Power BI logic in the notebook core.

Improve practical layout freedom: resizable editor/explanation/output regions, two-page reading, 2+1 interview layout, accessible drag/reorder controls and per-view reset. Semantic execution order must stay independent of geometry. Preserve custom practice layouts through root save/reopen. Add deletion with explicit scope (view-only versus entire block), undo and safe import/export error handling.

Fix source-checkpoint hydration so a saved result is clearly current, stale or historical based on server evidence and asset versions. Do not trust imported output as a passed check. Keep raw HTML inert. Test rich ipynb metadata, attachments, unsupported magics, code/output grouping and cross-view edits. Render the same notebook in Fabric-like and neutral skins without duplicating source.
