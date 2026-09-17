# Validation — v0.5

## Automated offline suite

Run:

```bash
npm test
```

Current result: **PASS**.

The suite now covers six gates:

1. **Catalog integrity** — IDs, statuses, categories, required metadata and URL syntax.
2. **Case-study integrity** — valid project references, substantive challenge/solution/flow/engineering/deliverable structures, and coverage thresholds.
3. **Evidence semantics** — public-surface labels, repository-record semantics, private-repository CTA suppression, and legacy filter migration contracts.
4. **Source smoke** — TS/TSX transpilation, relative-import resolution, CSS balance and reliability markers.
5. **UI contract smoke** — landmark structure, skip link, mobile filter visibility, explicit featured semantics, native button safety, selection accessibility and debug hygiene.
6. **Strict TypeScript smoke** — application code checks against local module stubs with `strict` and `noImplicitAny` enabled.

## Current snapshot

```text
Catalog: 24 projects | 22 repo links | 12 public surfaces | 11 featured | 12 Microsoft Cloud
Catalog smoke test: PASS

Case studies: 16 documented | 11/11 featured covered | 10/12 Microsoft Cloud covered
Case-study smoke test: PASS

Evidence semantics: 12 public surfaces | 22 repository records | 15 actionable repository links
Evidence smoke test: PASS

Source smoke test: PASS (17 TypeScript/TSX files, CSS balanced)
UI contract smoke test: PASS
Strict TypeScript compiler smoke test: PASS
```

## Production build check

`npm run build` is guarded by a dependency preflight.

In the current execution environment:

```text
node_modules: missing
MISSING react
MISSING react-dom
MISSING @fluentui/react-components
MISSING vite
MISSING @vitejs/plugin-react
PASS typescript (global installation)
```

The build therefore exits cleanly with:

```text
Build preflight: BLOCKED
Missing installed dependencies: react, react-dom, @fluentui/react-components, vite, @vitejs/plugin-react
Run npm install in the project directory, then rerun npm run build.
```

This is an environment/dependency-installation block; the production Vite build is **not** recorded as passed.

## Commands for a machine with package access

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Then manually verify project deep links, Back/Forward drawer state, category/status/evidence filters, mobile navigation, dossier tabs, public-surface actions and keyboard navigation.
