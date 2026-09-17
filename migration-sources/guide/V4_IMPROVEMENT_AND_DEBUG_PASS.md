# Microsoft Data Guide V4 — improvement and debug pass

Date: 2026-09-16  
Version: 0.4.0

## Product improvements

### 1. Decision Center

A new `Decide` workspace turns common Microsoft product confusion into explicit architecture decisions instead of separate documentation pages.

Current guides:

- Fabric Lakehouse vs Warehouse vs Eventhouse
- Fabric Pipeline vs Dataflow Gen2 vs Notebook
- Fabric Data Factory vs Azure Data Factory vs Databricks ingestion
- Fabric governance vs Microsoft Entra ID vs Unity Catalog

Each decision uses the same two-page interaction model as the rest of the guide:

- left page: question, mental shortcut, fast signals, exam lens,
- right page: option-by-option best fit, failure mode, and direct concept links.

Certification pages now cross-link to their relevant decision guides.

### 2. Certification lens inside the concept tree

The concept explorer can now be filtered to:

- all concepts,
- DP-600,
- DP-700,
- DP-750,
- PL-300.

Previous/next navigation follows the filtered certification sequence instead of jumping outside the selected exam scope.

### 3. Keyboard-first global search

`Ctrl+K` / `Cmd+K` focuses global search from anywhere in the application.

Search now resolves five entity types:

- concepts,
- architecture decisions,
- certifications,
- labs,
- code patterns.

The code result marker was also fixed from a literal escaped `&lt;/&gt;` string to the intended `</>` label.

### 4. Deep links completed

Deep-link state now covers:

- `#concepts/<concept-id>`
- `#decisions/<decision-id>`
- `#certifications/<exam-code>`
- `#labs/<lab-id>`
- `#code/<snippet-id>`

A pure route codec lives in `src/lib/routes.ts`.

### 5. Browser back/forward support

V3 updated the URL with `replaceState`, which meant study navigation did not create useful browser history.

V4 now:

- pushes study-target changes into browser history,
- listens for `popstate` / `hashchange`,
- restores the matching concept, decision, exam, lab, or code snippet,
- safely falls back when a route target is invalid.

### 6. Persistent display preferences

The application now stores:

- light/dark preference,
- one-page/two-page preference,

in browser `localStorage`, alongside the existing bookmarks, understood concepts, and completed labs.

### 7. Code pattern deep-linking

Global search can open a specific code pattern instead of only opening the Code page with a text filter.

The selected snippet:

- receives an explicit visual selection state,
- scrolls into view,
- is encoded in the route,
- can be revisited with browser history.

### 8. Clipboard fallback

Code copy first uses the Clipboard API. If browser/security context restrictions block it, the guide now falls back to a temporary textarea copy path.

## Debug findings fixed

### Mobile rail hard-coded for six items

V3 had this responsive rule:

```css
grid-template-columns: repeat(6, 1fr);
```

Adding the new Decision Center would have produced seven navigation items inside a six-column mobile contract.

**Fix:** mobile navigation now uses horizontally adaptive grid columns with overflow rather than a fixed item count.

### URL navigation was not reversible

Deep links existed in V3, but route updates used `history.replaceState`, so normal study navigation did not build browser history.

**Fix:** route writes now use `pushState`; back/forward events synchronize application state.

### Code search was not a true deep link

V3 search navigated to Code by setting the global text query, which could be lost or conflict with a language filter.

**Fix:** code snippets have their own route target and selection state.

### Display preference reset

Dark mode and two-page mode reset on every reload.

**Fix:** both settings now persist, with safe handling when browser storage is unavailable.

## Validation added / expanded

### Data and relationship integrity

`npm run test:data` now checks **807 contracts**.

The V4 additions include:

- unique decision-guide IDs,
- minimum comparison cardinality,
- unique option concept IDs per decision,
- decision option → existing concept references,
- decision guide → known certification references,
- non-empty decision rules of thumb,
- every concept that advertises `labKeywords` resolves to at least one Current lab.

Catalog invariants remain:

- 155 labs/exercises,
- 1,007 structured sections,
- 108 Current,
- 30 Reference,
- 17 Legacy.

### Route contracts

`scripts/routes-test.mts` adds **21 routing checks** covering:

- default/fallback routes,
- concept/decision/code targets,
- encoded lab IDs,
- malformed URI safety,
- page round-trips with and without encoded targets.

### Static TypeScript / JSX gate

`npm run test:static` still passes using local no-network declaration stubs.

### Deterministic extraction gate

The lab catalog was hashed, regenerated, and hashed again.

Before and after SHA-256:

```text
572fc7eb845c49bea517fa3c63e9387b4444473e8542295f35e4d5c7ec22264a
```

Result: deterministic re-index passed.

### Dependency pin verification

The release pins were rechecked against the npm package registry via external web verification on 2026-09-16:

- `@fluentui/react-components` 9.74.7
- `@fluentui/react-icons` 2.0.341
- `react` 19.3.0
- `vite` 8.3.0

## Remaining environment gate

The container still cannot complete `npm install`; registry access times out. `node_modules` is therefore absent.

`npm run build` was attempted and fails at TypeScript module resolution for React / Fluent UI / JSX runtime before Vite can bundle. This is the expected dependency-missing failure, not a failure of the dependency-free static gate.

Run the real production gate on a networked Node 22+ machine:

```bash
npm install
npm test
npm run build
npm run dev
```
