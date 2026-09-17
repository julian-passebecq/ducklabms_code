# V20 changelog — production case-study briefs + acceptance evidence

## Why this pass

V19 made more product surfaces share the same durable workspace. V20 makes the **case studies themselves** first-class engineering artifacts instead of treating them mainly as tutorial step lists.

## Added

- New `case-study` workbench available from both Microsoft Fabric and Azure Databricks navigation.
- Production case-study brief for all three scenarios:
  - Retail batch lakehouse / warehouse.
  - Turbine telemetry / operational risk.
  - ERP incremental CDC / SCD Type 2.
- Each brief now includes:
  - business problem;
  - stakeholders;
  - source systems;
  - production scale vs simulator sample;
  - freshness / recovery / quality / cost constraints;
  - data contracts and owners;
  - explicit acceptance criteria;
  - incident, root cause, containment, recovery, prevention.
- Side-by-side Fabric and Azure Databricks implementation tracks reuse the existing production lifecycle engine.
- New live acceptance engine (`caseStudyEvidence.ts`) evaluates the shared workspace instead of static checkboxes.
- Acceptance requires learner-created runtime evidence; seeded case-study tables and the baseline checkpoint do not count.
- Fabric and Databricks hubs now open the production case-study brief directly.

## Acceptance model

Each case has five live gates:

1. ingestion / landing evidence;
2. curated transformation evidence;
3. serving output evidence;
4. emitted lineage evidence;
5. non-baseline recovery checkpoint.

A fresh seeded case therefore starts at **0%**, while either the complete Fabric or complete Databricks production track can reach **100%**.

## Debug fixes

- Added global semantic CSS tokens used by the new case-study surface (`--surface`, `--surface-2`, `--brand-soft`, `--brand-border`, `--success-soft`, and related tokens). Without these definitions, several new declarations would silently fall back to browser defaults.
- Added regression protection so seed tables cannot falsely satisfy the case definition of done.

## QA

- V20 static/depth QA: 26/26 PASS.
- V20 executable case-study QA: 42/42 PASS.
- Full V5–V20 stack: 812/812 PASS.
- Shimmed semantic TypeScript: 66 TS/TSX files PASS.
- npm dependency install remains externally blocked in this sandbox by `EAI_AGAIN registry.npmjs.org`.
