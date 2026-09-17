# Project Command Center v0.3 — Improvement / Debug Pass

## Navigation and state

- Added browser Back/Forward synchronization for project dossiers.
- Added robust direct-project deep-link handling.
- URL state now preserves category, view, status, evidence, sort and search filters.
- Search focus returns users from Roadmap/Tech Stack to the searchable project catalog.

## Portfolio UX

- Added evidence filter: All evidence / Public demo / Source linked / Featured.
- Added live status counts directly inside status tabs.
- Expanded top category toolbar from five categories to all eight.
- KPI row now reflects the actual filtered result set.
- Right rail now reflects the same filtered result set.
- Added related-project recommendations inside the project dossier.
- Category chips in the dossier now navigate directly to that category.
- Added catalog snapshot date to the top-bar context.

## Accessibility / responsive

- Reworked card interaction to avoid a giant nested pseudo-button.
- Added explicit focus-visible states to custom navigation controls.
- Preserved sort/evidence controls on mobile.
- Preserved theme switching on mobile.
- Added reduced-motion support.
- Added `/` search shortcut and Escape-to-clear behavior.

## Reliability / tests

- Added catalog integrity smoke test.
- Added source/transpile/import/CSS smoke test.
- Added TypeScript compiler smoke configuration with local module stubs.
- Added `npm test` scripts.
- Fixed the `tsconfig.node.json` TS5096 build-mode configuration error.
