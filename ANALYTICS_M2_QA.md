> Implementation update: cleanup + M2 and subsequent V1 code are already applied. This document retains design/component-delivery context. For current execution and qualification truth, read `docs/v1/RELEASE_STATUS.md` from the repository root.

# Analytics M2 qualification record

Date: September 21, 2026. This record covers the new delivery, not the older green
GitHub CI baseline. No GitHub write, merge or deployment was performed.

## Executed checks

| Check | Actual result | Evidence / scope |
| --- | --- | --- |
| Node model/editor/analytics tests | 111 passed, 0 failed | `evidence/m2/unit.log`; 57 retained M1 tests plus 54 analytics tests |
| Python assembler and optional local-tool tests | 30 passed, 0 failed | `evidence/m2/python.log`; 17 archive/assembler and 13 local-tool/sample tests |
| Chromium component interactions | 49 passed, 0 failed | `evidence/m2/browser-components.json`; actual supplied components in an isolated about:blank mount |
| Uncaught page errors / outgoing requests | 0 / 0 | Same component report |
| Strict TypeScript for seven independent analytics modules | Passed | `evidence/m2/typecheck-model.log` is empty on successful exit |
| TypeScript/TSX syntax/transpile diagnostics | 26 inputs, 0 errors | `evidence/m2/syntax.json`; not a full React semantic typecheck |

The browser journey covers source retention during layer changes, file-path rejection,
artifact matching, read-only compiled SQL, historical/skipped status labels, dbt source
export, draft lineage, model/card movement and column mappings, SCD replay/as-of boundaries,
chart sum/mean behavior and stale query snapshots, resource tabs, split/collapse/focus,
themes, command palette ownership, blocked-storage error retention and narrow layouts.

The fixture's chart total is 3,855. This is calculated from supplied sample rows, not
claimed as the result of a dbt/SQL run. Teaching run_results uses skipped statuses.

## What these checks do NOT prove

**DEFERRED TO EXTERNAL QA:** complete pinned-repository assembly using real downloaded
source; npm ci; full React 19/Fluent/Monaco semantic typecheck; Vite production build;
native browser storage save/reload and download/reimport; existing backend integration;
real dbt-duckdb build; actual dct validation/render; DuckLake concurrency; MotherDuck;
remote guided Spark; deployment/authentication.

The host blocks browser HTTP and file navigation. The installed agent-browser CLI is
unavailable. Chromium/Playwright therefore mounted trusted local component bundles into
about:blank; no navigation restrictions were bypassed. Browser storage is unavailable in
that context, so the tests verify error retention, not durable localStorage persistence.
Screenshots show that warning honestly. They are not evidence of a deployed application.

The offline demo uses a React 18 compatibility bundle recovered from a supplied AtlasNote
archive. Production remains on the repository's React 19 dependencies. See
THIRD_PARTY_NOTICES.md and the runtime provenance JSON. A compatibility-component pass
is not proof that React 19 + Fluent + Monaco integration passes.

Assembler tests use controlled synthetic source/anchor fixtures and a known main.tsx
blob. Six original file hashes are guarded in the real assembler. This is not a claim
that every file in a user-supplied source ZIP has been verified against the entire Git tree.
The assembler will stop rather than apply changes to unexpected guarded source.

The local dbt CLI wrapper was tested in dry-run mode and with mocked subprocess calls.
No actual dbt/dct executable was installed or invoked. The sample models and wrappers
are a prepared integration path, not a certified runtime. Review dbt source/macros/hooks
before running: they can access the local machine and configured credentials.

## Reproduce the package checks

Requires Node with TypeScript resolvable by require(), Python, and Playwright/Chromium
for the component-only journey. No package installation is done automatically.

```sh
node --test tests/model.test.cjs tests/analytics.test.cjs
python -m unittest discover -s tests -p 'test_*.py' -v
node tools/check_syntax.cjs
node tools/build_preview.cjs
python tests/analytics_browser.py
```

`TYPESCRIPT_PATH` can point to an installed TypeScript module when it is not local.
The browser script is an environment-specific component harness, not the native suite.

```sh
tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM overlay/apps/web/src/studio/analytics/types.ts overlay/apps/web/src/studio/analytics/validation.ts overlay/apps/web/src/studio/analytics/dbt.ts overlay/apps/web/src/studio/analytics/modeling.ts overlay/apps/web/src/studio/analytics/charts.ts overlay/apps/web/src/studio/analytics/project.ts overlay/apps/web/src/studio/analytics/guidedSpark.ts
```

## External native qualification in the assembled repo

```sh
npm ci
npm run typecheck
npm test
node --test tests/ui-m1-model.test.cjs tests/analytics-m2-model.test.cjs
npm run build
npx playwright test --config playwright.analytics-m2.config.ts
```

Also run the existing connected notebook/arena/backend journeys on the local API.
The new native test is authored but unrun; it is intentionally not counted among the
49 component checks. Confirm analytics attachment preservation through server save,
restoreNotebook, reopen and JSON export/reimport; the generic Mosaic importer remains
cell-only by design. Project JSON carries analytics; ordinary .ipynb does not.

## Implementation fixes during this pass

- Fixed the inherited React 16 no-hooks offline harness by using the supplied React 18
  compatibility runtime; did not change the production dependency lockfile.
- Preserved the analytics attachment explicitly at the root notebook restore boundary;
  otherwise the generic cell-state sanitizer would have silently discarded it.
- Bounded attachment commits to 1.2 MB; kept the existing whole-notebook limit unchanged.
- Made chart grouping type-sensitive and mean KPI aggregation row-weighted; changing
  SQL invalidates the displayed snapshot rather than pretending the query ran.
- Made relationship column selectors unambiguous for IDs containing separators.
- Rejected unsafe source paths and inconsistent imported invocation IDs without replacing
  current edits; one command palette handles Ctrl+K in the managed notebook shell.
- Corrected harness assertions for the documented initial 52% divider and actual default
  graph selection. No failing final assertions were suppressed.
