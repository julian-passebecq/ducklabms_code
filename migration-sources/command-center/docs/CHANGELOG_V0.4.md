# Project Command Center v0.4

## Focus

This pass upgrades the portfolio from project metadata toward technical case-study evidence and adds a dedicated QA gate for that evidence layer.

## Product improvements

- Expanded case-study coverage from 11 to 16 projects.
- All 11 featured projects now have a technical case study.
- 10 of 12 Microsoft Cloud projects now have case-study coverage.
- Added case studies for:
  - Contoso Data Fabric
  - Fluent Microsoft Suite
  - DrawCloud
  - Deepnote Interview Suite
  - Contoso Planning Studio
- Added optional `proofPoints` and `tradeoffs` to the case-study contract.
- Project dossiers now show:
  - challenge
  - approach
  - system flow
  - engineering decisions
  - technical proof
  - boundaries / trade-offs
  - current deliverable
- Evidence tab now reports the size of the case-study evidence instead of only saying that a case study exists.
- Added responsive styling for technical-proof cards.

## QA / debug improvements

- Added `scripts/case-study-smoke.mjs`.
- Added `npm run test:case-studies`.
- Main `npm test` now validates catalog data, case-study integrity, source structure and the TypeScript smoke configuration.
- Case-study test rejects unknown project IDs, incomplete flows, underspecified engineering decisions and weak featured-project coverage.

## Validation snapshot

- 24 projects
- 22 repository links
- 12 public demos
- 11 featured projects
- 16 technical case studies
- 11/11 featured projects documented
- 10/12 Microsoft Cloud projects documented
- source smoke: PASS
- TypeScript smoke: PASS
- production Vite build: not completed in this environment because npm dependency installation timed out and no `node_modules` tree is available
