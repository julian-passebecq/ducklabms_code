# Microsoft Data Guide — Fluent 2 React Study Workspace

A study application for the Microsoft data stack that reorganizes Microsoft Learn material around **architecture decisions, concepts, code, certification objectives, and hands-on labs**.

Verified content baseline: **2026-09-16**.

## Why this exists

Microsoft Learn is authoritative, but its course/module structure is not always the best mental model for a data engineer. This app separates four distinct views of the same material:

1. **Platform map** — Fabric, Azure, Azure Databricks, Power BI.
2. **Knowledge tree** — product → area → concept → definition / comparison / use case.
3. **Certification map** — exam weights → official course → self-paced learning paths.
4. **Practice map** — concept → code pattern → structured lab → production debrief.

Retired material is never mixed invisibly into current study flows.

## Main UX

- Microsoft Fabric-inspired launchpad.
- Fluent UI React v9 / Fluent 2 (`@fluentui/react-components` 9.74.7) as the interaction and theme foundation.
- Global cross-app command search across concepts, decision guides, certifications, labs, and code (`Ctrl+K` / `Cmd+K`).
- Fluent `Tree` sidebar for platform → area → concept hierarchy, with a DP-600 / DP-700 / DP-750 / PL-300 certification lens.
- **Two-page study mode** for concepts, architecture decisions, and labs.
- Single-page fallback for narrow screens.
- Light/dark themes driven by Fluent theme tokens rather than a separate hand-built palette.
- Certification deconstruction for DP-600, DP-700, DP-750, and PL-300.
- DP-203 and DP-500 visibly isolated as legacy references.
- Instructor-led course card + self-paced learning-path map.
- Code pattern book (PySpark, SQL, DAX, KQL, Power Query M, pipeline expressions, Unity Catalog grants).
- Fluent `Dropdown` lab filters and 155 indexed labs/exercises from the uploaded Microsoft repositories.
- Lab reader extracts goals, section flow, selected code, and adds architecture/debrief prompts.
- Freshness/source registry with Current / Reference / Legacy status.
- Persistent bookmarks, understood concepts, and completed labs stored locally in the browser.
- URL deep links for concepts, decision guides, certifications, labs, and individual code snippets, with browser back/forward synchronization.
- Direct concept ↔ decision ↔ lab ↔ code ↔ certification navigation.
- Theme and two-page preferences persist locally between sessions.
- Decision Center compares common Microsoft architecture choices such as Lakehouse vs Warehouse vs Eventhouse, Pipeline vs Dataflow Gen2 vs Notebook, Fabric Data Factory vs ADF vs Databricks ingestion, and layered governance boundaries.
- Command search and page-local filtering now share token-aware, order-independent multi-word search semantics.

## V4.4 debug/search consistency pass — 2026-09-17

V4.4 reconstructs the recorded V4.3 source fixes on top of the available V4.2 release and extends them with a centralized search layer. It fixes command-palette keyboard wraparound, stops code-card selection from resetting the language tab, adds an explicit empty certification-search state, and makes multi-word filtering consistent across concepts, decisions, certifications, labs, code, and global search. Search ranking, release portability, and UI/state contracts are now permanent gates in `npm test`.


## V4.2 debug/portability pass — 2026-09-16

V4.2 fixes stale/invalid deep-link canonicalization, prevents code-copy clicks from also selecting the parent snippet, and makes the lab re-indexer portable outside the ChatGPT build workspace. The extractor now uses project-relative defaults, accepts `--sources-root` / `--output`, supports `MDG_SOURCES_ROOT`, detects normal or double-nested GitHub archive layouts, and offers `--strict` missing-source validation.

## V4.1 reliability pass — 2026-09-16

V4.1 hardens persisted study state and fixes a mobile Fluent navigation specificity regression. It adds dedicated persistence and responsive CSS regression tests without changing the content catalog or product architecture.

## V4 study-workstation pass — 2026-09-16

V4 adds a dedicated **Decision Center**, certification-lens concept navigation, keyboard command search, persistent display preferences, code deep links, and browser-history-safe routing. It also removes a mobile navigation assumption that previously hard-coded six rail items.

## Fluent 2 UI pass — 2026-09-16

The first UI version used Fluent components selectively. The current pass makes Fluent the actual shell foundation:

- Primary navigation is built with Fluent `Button`, `Tooltip`, and Microsoft Fluent System Icons.
- The concept explorer uses Fluent `Tree` / `TreeItem` / `TreeItemLayout` for the three-level hierarchy.
- Lab filtering uses Fluent `Dropdown` / `Option` controls instead of native selects.
- Certification weights use Fluent `ProgressBar` and a four-step study loop (understand → see → build → verify).
- The app surfaces a Fabric-style productivity command strip on Home.
- Custom CSS now maps neutral surfaces, strokes, foregrounds, brand color, and shadows to Fluent theme tokens.
- The custom two-page reader remains intentionally custom because it is the main value-add beyond Microsoft Learn.

## Current content inventory

The generated lab index contains 155 records:

- Microsoft Fabric: 48 current labs
- Azure Databricks DP-750: 15 current labs
- Azure Databricks reference exercises: 30
- Power BI: 26 current labs/demos
- Azure SQL / DP-300: 19 current labs
- DP-500 / Power BI + Synapse: 17 legacy labs

The concept guide currently provides a curated core ontology for Fabric, Azure integration, Databricks, Power BI, and shared lakehouse concepts. The content model is intentionally data-driven so it can be expanded without rewriting the UI.

## Run locally

```bash
npm install
npm run dev
```

Validation and production build:

```bash
npm test
npm run build
npm run preview
```

## Important freshness policy

`src/data/content.ts` contains the curated current certification/concept data and `sourceRegistry`.

`src/data/labs.generated.json` is generated from extracted Microsoft training repositories. The extractor is portable and does not depend on this build environment.

Install the optional re-index dependency, extract the supported repositories under `./sources`, then run:

```bash
python -m pip install -r requirements-reindex.txt
python scripts/extract_labs.py --strict
```

You can keep the repositories elsewhere:

```bash
python scripts/extract_labs.py --sources-root /path/to/microsoft-training-repos --strict
```

Or set `MDG_SOURCES_ROOT`. `--output` can be used to write a comparison catalog without touching the committed file. Both normal GitHub ZIP extraction (`sources/<repo>/...`) and the double-nested layout (`sources/<repo>/<repo>/...`) are detected.

The generated JSON is committed, so Python is **not** required to run the React application. Python/PyYAML are only needed when re-indexing source archives.

Before changing certification weights, course mappings, or product positioning, verify the official Microsoft Learn source and update the `verified` / `skillsAsOf` dates.

## Source-status rules

- **Current** — current official certification/product material checked against Microsoft Learn.
- **Reference** — still technically useful, but not the primary current certification source.
- **Legacy** — retired certification/course or superseded guidance; available only with explicit visual warning.

## Current official training mapped in the app

- DP-600T00-A — Implement analytics solutions using Microsoft Fabric — 4 days — Advanced.
- DP-700T00-A — Implement data engineering solutions using Microsoft Fabric — 4 days — Intermediate.
- DP-750T00-A — Implement data engineering solutions using Azure Databricks — 4 days — Intermediate.
- PL-300T00-A — Design and manage analytics solutions using Power BI — 3 days — Intermediate.

See `SOURCE_AUDIT_2026-09-16.md` for the current certification and retirement checks.

## Architecture

```text
src/
├── App.tsx                    # application shell and all primary views
├── styles.css                 # Fluent-inspired app layout and responsive book view
├── main.tsx
├── lib/
│   ├── routes.ts              # pure hash-route parser/builder for deep links and history
│   ├── persistence.ts         # safe localStorage parsing/filtering contracts
│   └── search.ts              # token-aware matching, ranking, keyboard-index movement
└── data/
    ├── content.ts             # concepts, exams, learning paths, code patterns, source registry
    └── labs.generated.json    # normalized lab catalog generated from uploaded repos

scripts/
├── extract_labs.py            # deterministic source archive → lab index parser
├── data-integrity.mts         # catalog/reference/certification/decision integrity gate
├── routes-test.mts            # route encode/decode/canonicalization contract tests
├── persistence-test.mts       # corrupted/stale localStorage regression tests
├── css-contracts-test.mts     # responsive Fluent rail/search contracts
├── ui-contracts-test.mts      # click propagation + route synchronization contracts
├── search-test.mts            # search ranking/token/keyboard-index regression tests
├── extractor-contracts-test.mts # portable re-indexer path/configuration contracts
├── release-contracts-test.mts # packaging/version/machine-path portability checks
├── tsconfig.static.json       # dependency-free TypeScript/JSX structure gate
└── type-stubs.d.ts            # local declarations used only by the static gate
```

## Product distinction built into the home page

```text
Fabric native
Sources → Data Factory / Eventstream → OneLake
        → Lakehouse / Warehouse / Eventhouse → Semantic model / AI

Azure composable
Sources → Azure Data Factory / Event Hubs → ADLS Gen2
        → Databricks / SQL engines → Power BI / applications

Azure Databricks
Sources → Lakeflow Connect / Auto Loader → Delta tables
        → Unity Catalog + Jobs → BI / ML / AI
```

This distinction is intentional: Azure Data Factory remains a separate Azure service and operational model, while Fabric Data Factory is the Fabric-native integration experience.
