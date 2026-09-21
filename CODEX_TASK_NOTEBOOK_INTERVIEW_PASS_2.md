# Codex task — Notebook + Interview Practice Pass 2

Repository: https://github.com/julian-passebecq/ducklabms_code
Working branch: `codex/notebook-interview-pass-2`
Base: `integration/notebook-interview-pass-1`

This is a **coding pass**, not a QA pass.

## Read first

1. `AGENTS.md`
2. `CODEX_TASK_NOTEBOOK_INTERVIEW_PASS_1.md`
3. `docs/NOTEBOOK_INTERVIEW_PASS_1_HANDOFF.md`
4. `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md`
5. `architecture-reference/CODEDELEET_V32_MIGRATION_AUDIT.md`
6. `docs/agents/02_NOTEBOOK_MOSAIC.md`
7. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`

Do not redesign the architecture. Pro already settled it.

## Coding-budget rule

Spend this session writing as much useful production code as possible.

- Do **not** run full Python, browser, integration, DuckLake, startup, or release suites.
- Do **not** rerun broad tests after every change.
- Only run a tiny targeted test, typecheck, or build check when it is necessary to safely continue coding.
- Mark all broad verification `DEFERRED TO EXTERNAL QA`.
- Do not use a Medium/higher-cost secondary agent without explicit user confirmation.
- If one feature is blocked, continue with another bounded implementation area instead of stopping the pass.

## Main objective

Turn the shared notebook/interview foundation from Pass 1 into a much more complete **data-engineering LeetCode + notebook workbench** while preserving the same shared Datapass document/runtime/catalog architecture.

## A. Improve Interview workspace UX substantially

Implement a strong three-zone Interview workbench inside the existing shell:

- left: problem browser / curriculum / filters / progress;
- center: shared notebook/editor + results;
- right: schema, constraints, hints, explanation, solution, follow-ups, attempt history.

Requirements:

- zones must use the shared Mosaic layout system;
- panes are resizable/collapsible;
- layout persistence uses the existing notebook/view model;
- narrow screens remain usable;
- switching Interview/Notebook/Two-page/Code+Explanation/2+1 does not recreate source;
- do not create a parallel layout engine.

Add useful keyboard/productivity behaviors where they fit naturally:
- Run current cell;
- Submit exercise;
- next/previous exercise;
- focus editor;
- toggle explanation/problem panes.

## B. Build a proper exercise content-pack layer

Replace the current hard-coded-demo-only registry architecture with a reusable loader/registry able to consume versioned exercise packs.

Implement:

- pack manifest/version;
- exercise definitions separated from server-only grading fixtures;
- pack validation;
- duplicate-ID/version rejection;
- canonical placement + related associations;
- recommendations;
- tags/difficulty/topics;
- runtime capability requirements;
- migration/source provenance;
- content-pack enable/disable or discovery through one root registry.

Keep hidden fixtures and reference answers server-side.

If actual CodeDELeet V3.2 source packs are available in the local workspace, create a migration adapter and import verified definitions programmatically.

If they are **not** available, do not stop. Implement the adapter/loader and use the existing internal demos as fixtures. Do not invent CodeDELeet problem text.

## C. Add a CodeDELeet migration adapter

Implement a bounded adapter for the useful V3.2 concepts documented in `CODEDELEET_V32_MIGRATION_AUDIT.md`.

Map when present:

- old exercise/workstation IDs;
- domain/lab/taxonomy;
- starter/solution variants;
- fixtures/expected outputs;
- canonical curriculum placement;
- related practice;
- recommendations;
- hints/explanations/follow-ups;
- execution truth labels;
- constraints such as volume/SLA/quality/security/cost.

Output must be the new Datapass ExerciseDefinition/content-pack format.

Do not preserve old shell/editor/runtime state models.

Add a migration report structure listing:
- migrated;
- skipped;
- unsupported;
- warnings.

## D. Extend grading beyond SQL where practical

Keep the shared Run/Submit service and add more useful grading adapters without creating new engines.

Priority:

1. Python
2. Polars
3. SparkLab semantic exercises

Use existing shared runtimes.

The grader should:
- run source against server-owned fixtures;
- compare structured results;
- preserve visible/hidden/edge separation;
- never ship hidden expected values to the client;
- capture runtime/truth metadata;
- record attempts through the same ExerciseAttempt model.

If one adapter is significantly blocked, implement the next one rather than stopping.

Do not pretend unsupported full PySpark/dbt/Airflow semantics exist.

## E. Add richer validation modes

Extend the shared exercise validator so exercises can declare combinations of:

- exact schema;
- duplicate-sensitive rows;
- ordered/unordered rows;
- aggregates;
- null semantics;
- numeric tolerance;
- required columns;
- forbidden extra columns;
- row count;
- simple technique/contract requirements only where they can be checked truthfully.

Avoid grading by superficial keyword search unless a requirement is explicitly source-structural and documented.

Alternative correct solutions must pass.

## F. Improve problem/progress model

Implement useful Interview Practice state on top of the existing attempt data:

- solved / unsolved / review;
- latest result;
- attempt count;
- last attempted;
- best status;
- topic progress;
- difficulty progress;
- wrong-only / retry filters;
- resume per topic;
- next recommended exercise separate from resume;
- review/confidence/perceived-difficulty persistence.

Keep attempt history separate from notebook revisions and generic run history.

## G. Improve notebook exercise operations

Deepen shared notebook behavior, not a LeetCode-only fork:

- reset one answer cell;
- reset whole exercise;
- clear result/check evidence;
- retry visible checks;
- reveal next hint;
- explicit solution reveal;
- previous/next exercise while saving current draft;
- preserve personal notes;
- better scoped undo for these operations;
- stale/current/historical result labeling;
- make reset/reveal state survive appropriate save/reopen boundaries;
- ensure editor model/view state is reused across layout changes.

Where practical, improve block add/remove/reorder for Interview mode without breaking normal notebooks.

## H. Schema/data context panels

Add useful data-engineering context to Interview exercises:

- input table/schema preview;
- sample rows;
- constraints;
- expected output schema where it is public;
- lineage/context references when the exercise is derived from a case;
- runtime/kernel badge;
- truth label (real / semantic-emulation / simulated / unsupported).

Use shared catalog/runtime metadata. Do not build a separate browser dataset store.

## I. Preserve product-style notebook skins

Ensure the same exercise/notebook can render under:

- neutral Datapass;
- Fabric-inspired notebook skin;
- Databricks-inspired notebook skin.

These are presentation/tool experiences over the same document, not separate notebook implementations.

Improve skin-level chrome only where it directly helps this pass; do not start full Fabric/Databricks specialist migration yet.

## J. Minimal internal seed set

Do not manually rewrite the full CodeDELeet corpus.

It is acceptable to keep/add only a tiny internal seed pack sufficient to exercise:
- SQL;
- Python;
- Polars;
- SparkLab;
- visible/hidden/edge checks;
- ordered/unordered comparison;
- null/duplicate cases.

Clearly label these `internal-demo` and not migrated CodeDELeet content.

## Out of scope

Do not:
- redesign Core Architecture Contract v1;
- create another React app;
- create another notebook or editor framework;
- create another database/catalog/store;
- create SparkLite beside SparkLab;
- create a new private run history;
- run broad QA;
- polish unrelated Power BI/Airflow/dbt/Fabric features;
- call the result v0.2 automatically.

## Minimal checks only

During coding, use only checks necessary to continue safely, for example:
- one TypeScript typecheck after a large typed refactor;
- one focused backend test file for the new pack/grader contract;
- one focused notebook test file for new operations.

Do not run Playwright/full regression unless a specific browser/runtime defect blocks implementation.

Everything else is `DEFERRED TO EXTERNAL QA`.

## Completion handoff

Commit implementation to `codex/notebook-interview-pass-2`.

Report:
- major production features implemented;
- exact changed files;
- exercise/content-pack contract changes;
- grading adapters added;
- notebook/workbench improvements;
- CodeDELeet migration adapter status;
- minimal checks actually run;
- broad checks deferred;
- remaining implementation gaps;
- whether the branch is ready for coordinator review.

Do not stop at a plan. Implement the pass.
