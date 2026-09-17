# Project Command Center — React + Microsoft Fluent UI 2

A professional React portfolio for Julian Passebecq's Microsoft Cloud, data engineering, AI developer tooling, visualization, learning and industry-data projects.

## Product direction

- **Microsoft Cloud is the default landing category.**
- Built with Fluent UI v9 / Fluent 2 React components.
- Restrained product UI: no decorative maps, flags, mountain scenes or unrelated illustration.
- Energy/oil/gas is represented as a **data domain**, with small domain identifiers rather than themed scenery.
- Project evidence is explicit: repository availability, public-surface availability, delivery status, technology, release/stage and next milestone.
- Delivery semantics remain distinct: `Live`, `In progress`, `Prototype`, `Planned`, `Concept`, `Legacy`.
- ETA labels preserve the actual level of certainty in the catalog instead of inventing dates.

## Main surfaces

1. **Microsoft Cloud portfolio dashboard** — default view with category KPIs and featured work.
2. **Project catalog** — search, all eight categories, status counts, evidence filters and sorting.
3. **Evidence-first project cards** — repository state, public-surface state, stack, capabilities and current stage.
4. **Project dossier drawer** — overview, categories, repository/public-surface/stage evidence, capabilities, technology, release line and next milestone.
5. **Related-project navigation** — dossier recommendations are ranked from shared stack/category overlap.
6. **Shareable application state** — project, category, view, search, status, evidence and sort state are encoded in the URL where useful.
7. **Browser history support** — opening a dossier creates a history entry; Back/Forward correctly opens or closes it.
8. **Roadmap** — delivery-state board with next milestones and repository/public-surface/release evidence.
9. **Tech Stack** — ranked technology usage with project coverage and drill-down.
10. **Responsive Fluent shell** — desktop sidebar/right rail, compact tablet navigation and mobile layout.
11. **Persistent light/dark mode** — theme follows the saved preference and initially respects system preference.
12. **Keyboard support** — `/` focuses catalog search; Escape clears an active search input.

## Current catalog

The source currently contains:

- 24 project records
- 22 repository links
- 12 public web surfaces
- 8 project categories
- 11 featured projects
- 12 projects tagged Microsoft Cloud

All counts displayed in the UI are derived from the catalog rather than hard-coded dashboard numbers.

## Data model

The complete project catalog is centralized in:

```text
src/data/projects.ts
```

Add or edit a project there. Dashboard KPIs, navigation counts, filters, roadmap groups and technology rankings are calculated from the dataset.

## Install and run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Tests

The repository now includes repeatable smoke tests:

```bash
npm test
```

This executes:

- `test:catalog` — project IDs, categories, statuses, required fields and URL syntax.
- `test:case-studies` — case-study structure and featured/Microsoft Cloud coverage.
- `test:evidence` — public-surface and repository-record semantics, private-repo actions and legacy-filter migration.
- `test:source` — TS/TSX syntax transpilation, relative-import resolution, CSS-brace balance and reliability markers.
- `test:ui-contract` — landmarks, mobile controls, button safety, selection semantics and debug hygiene.
- `test:typecheck-smoke` — strict internal TypeScript contract check with local module stubs, useful when package installation is unavailable.

Dependency diagnostics:

```bash
npm run doctor
```

`npm run build` now performs a dependency preflight before TypeScript/Vite so a missing install is reported directly.

After dependencies are installed, also run:

```bash
npm run typecheck
npm run build
```

## Netlify

`netlify.toml` is included. Build command: `npm run build`; publish directory: `dist`.

## Catalog maintenance

The initial project dataset was reconstructed from the project archives available in the workspace. Repository/deployment/status fields are intentionally plain editable data so the portfolio can be refreshed as projects change.


## Technical case studies

The project dossier includes a structured case-study layer for the strongest projects: challenge, approach, system flow, engineering decisions, technical proof, explicit boundaries/trade-offs and current deliverable. The catalog currently contains 16 documented case studies, covering every featured project.

QA now includes `npm run test:case-studies` in the main `npm test` command.

## v0.5 stabilization

The v0.5 pass tightened portfolio evidence semantics: URLs are described as **public surfaces** rather than automatically called demos, private repository records no longer expose visitor-facing GitHub CTAs, older evidence-filter URLs migrate automatically, and project-specific surface labels are preserved. Accessibility now includes a single main landmark, skip navigation, explicit selection semantics and guarded mobile filter controls. See `docs/CHANGELOG_V0.5.md`.
