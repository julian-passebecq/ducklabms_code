# Module contract v1

Authoritative files: `packages/contracts/src/index.ts`, `packages/contracts/openapi.json`, `apps/web/src/plugins.tsx`, `apps/api/datapass/api.py`.

## A module owns

Its domain panels, tool-specific editor/inspector, explanations, bounded compiler/adapter, task definitions, supported/unsupported syntax documentation, and regression fixtures. It may contribute a teaching skin and new case steps.

## A module does not own

A second FluentProvider, top-level application shell, notebook document format, database singleton, workspace identifier, localStorage database, authentication token, kernel manager, result truth labels or shared progress store. It must not read another app's state through an iframe or scrape its rendered DOM.

## Current executable interfaces

`ModuleManifest` contains id/title/kind/persona/status/contract_version. The root `ToolPlugin` registry supplies available surfaces and a renderer receiving `ToolContext`. `RuntimeClient` supplies execute/catalog/restart. Root React components own the UI calls; specialist modules receive services via context rather than import a global service singleton.

The current manifest registry exposes foundation surfaces. It is not a hot-install plugin system. The next registry pass should add explicit per-module panels and case registration, while preserving contract_version=1 or providing a versioned migration.

## Case definition

A JSON case declares id, version, title, concepts, physical data, modules and ordered step specifications. Each step declares id, module, language, editable code, solution, task, hint, dependency IDs, optional output_asset, and a server-owned acceptance rule. There is no rule requiring every tool in every case.

The root validates unknown dependencies and cycles. Unknown workflow overrides fail rather than being ignored. A task executes using the root kernel and publishes the full result, not the preview. A failed execution or failed check skips dependent tasks. The current runner is sequential and dependency-aware; it does not implement Airflow scheduling, retries, task mapping or ADF activity semantics.

## Integration example

```ts
const run = await runtime.execute(workspace.id, {
  notebook_id: notebook.id,
  cell_id: 'clean',
  step_id: 'clean',
  language: 'sparklab',
  code: editedCellSource,
  output_asset: 'silver.orders',
  profile: selectedVirtualProfile,
  aqe: true,
});
```

Use the returned execution ID, source hash, session generation, result, catalog versions, checks and simulated metrics. Never manufacture a successful `Execution` from local sample rows. A request cannot submit its own acceptance specification. A graded step must use its declared output asset; use a separate ungraded cell to explore.

## Specialist contribution checklist

One bounded feature; one root-owned runtime path; a supported-syntax matrix; positive and negative tests; stale-data behavior; save/reopen behavior; appropriate truth labels; no dependency duplication; an updated migration ledger. Return a changed-file list and raw test evidence. Do not rewrite shared contracts without an explicit integration proposal.
