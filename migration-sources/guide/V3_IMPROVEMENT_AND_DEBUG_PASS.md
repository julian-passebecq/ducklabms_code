# Microsoft Data Guide V3 — improvement and debug pass

Date: 2026-09-16
Version: 0.3.0

## Product improvements

### 1. Global command search

The top search field is now truly global instead of only filtering the current page.

Search results can resolve directly to:

- concepts,
- certifications,
- structured labs,
- code patterns.

The search surface has a dismiss scrim, Escape handling, type labels, result metadata, and direct navigation.

### 2. Persistent study state

The browser stores three lightweight study sets in `localStorage`:

- understood concepts,
- bookmarked concepts,
- completed labs.

The Home page now exposes study progress, and bookmarks become a resume/review list rather than a dead counter.

### 3. Cross-linked knowledge graph

The guide now behaves like one study system:

- certification → mapped concepts,
- certification → mapped current labs,
- concept → relevant lab,
- lab → related concepts,
- code pattern → concept,
- Home bookmark → concept.

This removes the previous silo behavior between the Concepts, Certifications, Labs, and Code views.

### 4. Deep links

The current study target is reflected in the URL hash:

- `#concepts/<concept-id>`
- `#certifications/<exam-code>`
- `#labs/<lab-id>`

A copied URL can therefore reopen a specific concept, certification, or lab.

### 5. Certification coverage diagnostics

Current certification pages now show the number of:

- guide concepts,
- current labs,
- official learning paths.

Coverage in this build:

| Certification | Concepts | Current labs | Learning paths |
|---|---:|---:|---:|
| DP-600 | 15 | 17 | 5 |
| DP-700 | 10 | 15 | 5 |
| DP-750 | 17 | 15 | 4 |
| PL-300 | 4 | 26 | 5 |

### 6. PL-300 self-paced training completed

The certification map now includes the current Power BI self-paced paths:

- Get started with Microsoft data analytics — 4 modules
- Prepare data for analysis with Power BI — 3 modules
- Model data with Power BI — 6 modules
- Design effective reports in Power BI — 4 modules
- Manage and secure Power BI — 5 modules

These were checked against current Microsoft Learn pages on 2026-09-16.

### 7. Lab certification normalization

Fabric repositories already expose course codes in front matter. DP-750 and PL-300 lab repositories do not consistently do so.

The app now derives certification membership from both:

1. lab front-matter `courses`, and
2. the repository/source identity.

As a result, DP-750 and PL-300 no longer incorrectly show zero mapped labs and are now available in the lab certification filter.

## Debug findings fixed

### Duplicate lab ID

Two PL-300 files used the same stem `00-setup.md` in different folders, causing the generated ID `power-bi:00-setup` to collide.

**Fix:** generated lab IDs now include the normalized repository-relative path rather than only the filename stem.

### Nullable course metadata

Six newer Fabric labs used `courses: null`. The application expected an array.

**Fix:** the extractor now normalizes `null`, scalar, and non-list category/course metadata into safe arrays.

### Mouse-only platform cards

Home platform cards had click behavior but no keyboard equivalent.

**Fix:** cards now expose button semantics, keyboard focus, Enter/Space activation, and an accessible label.

### Search accessibility

The global search now has an explicit accessible label and search result options use listbox/option semantics.

## Validation added

`npm test` now runs two dependency-free gates:

```bash
npm run test:data
npm run test:static
```

### Data integrity gate

`scripts/data-integrity.mts` checks:

- unique concept IDs,
- unique snippet IDs,
- unique exam codes,
- unique lab IDs,
- unique source names,
- snippet → concept references,
- concept → snippet references,
- learning-path → exam references,
- official Microsoft Learn path URLs,
- required current and legacy certification status,
- parseable skill weights,
- current certification concept coverage,
- current certification lab coverage,
- current certification learning-path coverage,
- lab identity fields,
- freshness enum values,
- structured section arrays,
- course arrays,
- exact catalog totals.

Current result: **751 checks passed**.

### Static TypeScript / JSX gate

`scripts/tsconfig.static.json` plus local type stubs validates application TypeScript/JSX structure even in an environment where npm dependencies cannot be downloaded.

Current result: **passed**.

### Deterministic extraction gate

The generated lab catalog was hashed, regenerated, and hashed again.

Both SHA-256 values:

```text
572fc7eb845c49bea517fa3c63e9387b4444473e8542295f35e4d5c7ec22264a
```

Result: **deterministic re-index passed**.

## Remaining environment gate

`npm run build` still cannot be truthfully completed in this runtime because `node_modules` cannot be installed: DNS access to `registry.npmjs.org` returns `EAI_AGAIN`.

The production gate on a networked machine remains:

```bash
npm install
npm test
npm run build
npm run dev
```

The failed local `npm run build` is caused by missing React/Fluent/Vite packages, not by a failure of the new dependency-free static or data tests.
