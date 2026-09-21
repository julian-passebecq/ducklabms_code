# CodeDELeet V3.2 migration audit for Datapass Studio

Status: migration/reference note for the shared Datapass Studio root. This is not a request to revive CodeDELeet as a separate application.

Source archive inspected: `CodeDELeet_V3_2_Correctness_COMPLETE(1).zip` (user-provided, approximately 27 MB).

## Executive decision

CodeDELeet V3.2 contains useful **exercise-domain, curriculum, correctness, practice-session and workstation ideas/content**, but its application shell, editor stack, browser state store and private execution architecture should not become a second Datapass product.

Migrate reusable concepts/content into the shared React + Fluent UI / Mosaic notebook / RuntimeClient / FastAPI / catalog architecture.

## What is definitely valuable

### 1. Exercise/curriculum corpus

The V3.2 implementation report states that the built-in corpus contains **122 exercise definitions**. An older inventory document lists 51 earlier questions, so that inventory is historical/partial rather than the full V3.2 count.

The archive contains exercise/curriculum material across SQL, Python, Pandas, Spark/PySpark, dbt, Airflow/pipelines, BI/DAX/modeling, Git/terminal, architecture/cloud and systems topics.

Important archive paths:

- `docs/EXERCISE_INVENTORY.md`
- `src/navigation/curriculum-data.ts`
- `src/navigation/taxonomy.ts`
- `src/navigation/exercise-placement.ts`
- `src/navigation/recommendations.ts`
- `dist/packs/starter.json`
- `dist/packs/v2-specialists.json`
- `dist/packs/v3-workstations.json`
- `dist/packs/v3-zilla.json`
- `dist/packs/v31-window-foundations.json`
- `docs/v32/CURRICULUM_AUDIT.json`

Do not invent or rewrite old problem text from memory. Content migration should come from these source files when the archive is available to the coding environment.

### 2. First-class workstation/exercise contract ideas

`src/v3/contracts.ts` is a useful reference. Its `WorkstationSpec` separates:

- domain and lab;
- fixtures;
- grain;
- execution truth: local / simulation / evidence / optional-cloud;
- language variants with starter + solution + verification status;
- expected rows and relation tests;
- optional notebook, dbt project or graph;
- guided steps;
- constraints such as volume, SLA, late data, quality, security and cost.

Useful idea to preserve: **exercise definition is data, not page code**.

Datapass should implement its own shared contract rather than copy this wire format literally.

### 3. Canonical placement versus related practice

V3.2 explicitly separates:

- one canonical curriculum location for an exercise;
- many related-practice associations.

This avoids making navigation depend on whichever association happens to be discovered first.

Reference: `src/navigation/exercise-placement.ts`.

This is useful for a future Datapass problem browser because an exercise may belong to SQL + window functions + data-engineering interviews without duplicating the exercise.

### 4. Scoped resume state

V3.2 stores practice resume by topic/concept rather than one global last exercise.

Reference: `src/navigation/practice-session.ts`.

Useful behavior:

- SQL and Spark contexts can remember different exercises for the same conceptual topic;
- case-study navigation does not overwrite standalone-practice resume;
- completed exercises can still be resumed;
- resume pointers are bounded and do not evict drafts/notes.

Datapass should map this to its own persistence/attempt model, not copy the old browser store.

### 5. Explicit authored recommendations

V3.2 uses ordered authored recommendations per concept instead of choosing the first compatible exercise by import order.

Reference: `src/navigation/recommendations.ts`.

Useful distinction:

`resume != recommendation != canonical placement`.

Keep these three concepts separate.

### 6. Correctness/checking assets

Useful references:

- `src/checks.ts`
- `src/lessons/validate.ts`
- exercise fixture/expected-output packs
- V3/V3.1/V3.2 test reports and fixture evidence

The old checks are explicitly bounded teaching checks and are **not** a hidden interview judge. Datapass should preserve the useful result/fixture semantics while implementing the stronger shared visible/hidden/edge validation contract already defined in `architecture-reference/INTERVIEW_LEETCODE_REQUIREMENTS.md`.

### 7. Layout/workstation ideas

Useful references:

- `src/shell/layout-controller.ts`
- `src/shell/output-dock.ts`
- `src/shell/reading-panels.ts`
- `src/v3/workstation.ts`

V3.2 has Build / Inspect / Case modes, output docking, context panels, responsive navigation and persisted layout preferences.

Datapass should **not copy the old shell**. Use these only as consumer requirements for the stronger Mosaic-derived layout engine.

### 8. Persistence/cache lessons

Useful references:

- `src/state/lru.ts`
- `src/state/storage-budget.ts`
- V3.2 implementation and routing/progress docs

Strong idea worth preserving:

- durable draft/source state is separate from active editor cache;
- evicting an editor may lose undo history but must not lose saved source;
- import validates the merged candidate before replacing live state;
- failed import must leave existing user content unchanged.

These map well to Datapass notebook persistence.

## What should not be migrated as a second implementation

Do not migrate these as competing platform foundations:

- old CodeDELeet application shell;
- CodeMirror editor stack;
- old layout DOM implementation;
- old browser-local application store as authoritative workspace persistence;
- old private run history;
- old notebook format;
- SparkLite as a second Spark runtime beside SparkLab;
- dbtLite as an isolated second project architecture;
- DuckDB-Wasm/Pyodide runtime as the default Datapass runtime;
- duplicated curriculum/workspace routing that bypasses shared Datapass documents and RuntimeClient.

A future browser-only/public adapter may reuse lessons from the browser-runtime experiments, but only behind the shared RuntimeClient contract.

## V3.2-specific behavior worth remembering

The V3.2 correctness pass added or hardened:

- persistent practice-session resume scoped by topic/concept;
- canonical exercise placement;
- explicit focused recommendations;
- bounded editor/view caches;
- atomic import semantics;
- curriculum validation;
- routing/progress behavior that keeps Build/Inspect/Case separate from curriculum identity.

The archive also contains `docs/v32/IMPLEMENTATION.md`, `INTEGRATION.md`, `ROUTING_AND_PROGRESS.md`, `TEST_REPORT.md` and `KNOWN_LIMITATIONS.md`.

## Datapass migration target

The target should be:

```text
Interview Practice
├── Problem browser / curriculum metadata
├── ExerciseDefinition
├── ExerciseAttempt
├── visible / hidden / edge validation
├── Run
├── Submit
├── starter/reset/reveal operations
├── resume / recommendation / review metadata
└── shared Mosaic notebook workbench
    ├── Interview layout
    ├── normal notebook
    ├── two-page
    ├── code + explanation
    └── 2 + 1
```

All execution, catalog, persistence and document ownership remains shared with Datapass Studio.

## Migration priority

1. First-class exercise + attempt contracts.
2. Interview layout and starter/reset semantics in shared notebook core.
3. Run versus Submit through shared execution/validation.
4. Problem-browser metadata and resume/recommendation state.
5. Migration adapter for verified CodeDELeet exercise packs.
6. Import actual exercise/content packs only after source is available and audited.
7. Browser-only runtime adapter only later, if it is still useful for a public Netlify demo.

## Important constraint for the next Codex pass

Do not spend the pass rebuilding the old CodeDELeet UI. Use the archive findings to make the **shared Datapass notebook/workbench a better consumer for interview practice**.
