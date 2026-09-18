# Codex task — Notebook + Interview Practice Pass 1

Repository: https://github.com/julian-passebecq/ducklabms_code

Working branch: `codex/notebook-interview-pass-1`

Base: merged `main` after Core Integration Pass 1.

This branch is exclusively owned by the active Codex coding run. Do not expect the coordinator to push competing commits to it while the run is active.

## Read first

1. `AGENTS.md`
2. `architecture-reference/README.md`
3. `architecture-reference/CORE_ARCHITECTURE_CONTRACT_V1.md`
4. `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md`
5. `architecture-reference/CODEDELEET_V32_MIGRATION_AUDIT.md`
6. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`
7. `docs/MODULE_CONTRACT.md`
8. `docs/agents/02_NOTEBOOK_MOSAIC.md`
9. `docs/VERIFICATION.md`
10. inspect `migration-sources/mosaic` only where it provides stronger existing notebook behavior

Do not redesign the overall architecture. Pro already fixed the shared architecture. This pass is implementation work.

## Primary objective

Deepen the shared Mosaic-derived notebook/workbench so it is an excellent foundation for:

- normal notebook work;
- Fabric/Databricks-inspired notebook experiences;
- study/explanation layouts;
- **Interview / LeetCode-style practice**.

The Interview consumer is now a first-class design constraint, not a separate app.

Do not create a second React shell, second notebook engine, second editor system, second workspace store, second catalog or second execution service.

## Code-first budget

Follow `AGENTS.md` strictly.

- Spend the session primarily writing/integrating production code.
- Batch related changes.
- Run only minimal tests/typechecks/smokes that are essential to keep coding safely.
- Broad Python/TypeScript/Playwright/regression/release testing is **DEFERRED TO EXTERNAL QA**.
- List exact deferred QA commands and risk areas at handoff.
- Never claim an unrun check passed.
- Do not use a Medium/higher-cost secondary agent without explicit user confirmation. Escalation should be exceptional.

## Required implementation emphasis

### A. Make Exercise and Attempt first-class shared contracts

Add shared, versionable contracts for standalone interview exercises and attempts without coupling them to a full case study.

The contract should support the capabilities already required by the architect:

- stable exercise ID/version;
- title/difficulty/topics/tags;
- compatible kernel/language/runtime;
- prompt and optional structured sections such as schema/input/constraints;
- starter source;
- fixture/version references;
- visible checks;
- hidden/edge check references without exposing hidden expected answers to the client;
- hints;
- reference solution/reveal metadata;
- explanation;
- follow-up/reflection prompts;
- canonical curriculum placement plus related associations;
- optional recommendation metadata.

Attempt history must remain distinct from notebook revision history and generic execution history.

An attempt should capture enough identity/evidence to know exactly what source revision, exercise version, validator version, fixtures and runtime were submitted.

Do not freeze an awkward schema merely to mimic CodeDELeet V3.2. Use the shared Datapass contracts and architecture.

### B. Implement a real Interview layout preset in the shared notebook engine

Implement/improve a named Interview / Practice preset using the **same document model**.

It should support practical arrangements such as:

- problem/context pane;
- code/notebook pane;
- output/tests pane;
- explanation/hint/solution/follow-up pane;
- 2 + 1 / code + explanation / two-page variants where useful.

Requirements:

- visual geometry must not alter semantic execution order;
- layout changes must not duplicate source;
- source edits must survive view switches;
- user-adjusted geometry should persist;
- narrow/responsive behavior should remain usable;
- the same document must still render in neutral and product-inspired notebook skins.

Use existing Mosaic work instead of creating a new layout framework.

### C. Starter/reset/reveal semantics

Implement reusable notebook/exercise operations for:

- reset one exercise/cell to starter source;
- reset an exercise as a bounded unit without damaging unrelated notebook content;
- clear output without deleting source;
- retry failed visible checks;
- reveal hint;
- reveal reference solution through explicit user action;
- mark review/difficulty/confidence metadata where the shared contract naturally supports it.

Make source/reset identity explicit enough that imported/restored notebooks do not accidentally treat an old output as current proof.

### D. Separate Run from Submit

Preserve normal notebook execution as **Run**.

Add a shared **Submit** path for exercise grading that:

- captures the submitted source/revision;
- executes through existing shared runtime services;
- invokes the shared validation/grading contract;
- can include visible + hidden + edge fixture classes;
- records an ExerciseAttempt;
- returns structured pass/fail evidence;
- does not duplicate RuntimeClient/execution infrastructure.

Do not implement hidden tests entirely in the browser/client payload.

Keep execution truth labels: real local result vs semantic emulation vs simulation vs unavailable.

### E. Add the minimal Interview Practice product surface

Implement enough UI to prove the shared architecture works as an interview consumer, without rebuilding CodeDELeet.

A useful minimum:

- an Interview Practice entry/surface inside the existing Datapass shell;
- lightweight problem list/browser driven by shared exercise metadata;
- filters/status hooks for topic, difficulty, solved/unsolved/review where data exists;
- selecting an exercise opens the shared Interview notebook layout;
- Run and Submit are distinct controls;
- visible results/checks and attempt status are shown;
- hint/solution/reset actions use the shared operations.

Keep this bounded. Do not migrate 122 old problems by hand and do not invent missing CodeDELeet problem text.

### F. Preserve CodeDELeet's strongest ideas without copying its architecture

Use `architecture-reference/CODEDELEET_V32_MIGRATION_AUDIT.md`.

In particular preserve the useful distinctions:

- canonical placement != related-practice association;
- resume != recommendation;
- standalone practice resume != case-study session state;
- durable source/draft != active editor cache;
- failed import must not destroy current source.

If useful, implement a small normalized migration adapter/schema mapping layer for future CodeDELeet pack imports, but do not fabricate old exercise content and do not make the old pack format authoritative.

### G. Notebook practicality still matters outside Interview mode

While implementing the above, deepen the generic notebook behavior already assigned in `02_NOTEBOOK_MOSAIC.md` where the current code still needs it:

- deletion with explicit scope (view-only vs whole block);
- undo where practical and correctly scoped;
- safe import failure behavior;
- current/stale/historical output state;
- rich ipynb metadata/attachments preservation;
- unsupported magics remain inert/explicit;
- code/output grouping and cross-view edits;
- editor model/state should not be recreated unnecessarily during layout changes.

Do not spend the pass polishing unrelated specialist panels.

## Seed content rule

Do not invent CodeDELeet content.

If the old archive is not directly accessible in the coding environment, build the infrastructure and use only existing Datapass content or deliberately tiny test/sample exercise definitions created solely to exercise the new contract.

Mark those samples as internal/demo fixtures rather than claiming them as migrated CodeDELeet questions.

## Out of scope

Do not:

- redesign Core Architecture Contract v1;
- create another app;
- replace FastAPI/DuckDB/shared workers;
- create SparkLite beside SparkLab;
- create a browser-only runtime as the main implementation;
- migrate full Power BI/Airflow/dbt/Fabric specialist feature sets;
- manually transcribe the 122-problem CodeDELeet corpus;
- claim Netlify/public runtime parity in this pass.

## Completion handoff

Commit all implementation to `codex/notebook-interview-pass-1`.

Report:

- exact features implemented;
- exact files changed;
- any shared contract changes;
- any CodeDELeet concepts migrated versus merely referenced;
- essential narrow checks actually run;
- all broad checks marked `DEFERRED TO EXTERNAL QA`;
- exact external QA commands;
- real / simulated / unsupported boundaries;
- remaining notebook/Interview gaps;
- whether the branch is ready for coordinator review.

Do not call this v0.2 automatically. The version remains Root 0.1.0 unless a deliberate tested release boundary is established.
