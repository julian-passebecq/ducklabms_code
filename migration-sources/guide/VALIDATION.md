# V4.4 Validation

Date: 2026-09-17

## Full dependency-free suite

`npm test` passes from the V4.4 source tree with:

- Data integrity: **807** checks
- Routing contracts: **27** checks
- Persistence contracts: **12** checks
- Responsive CSS contracts: **5** checks
- UI/state/search contracts: **16** checks
- Search contracts: **12** checks
- Extractor portability contracts: **8** checks
- Release contracts: **12** checks
- Dependency-free TypeScript/JSX static gate: **PASS**

Total explicit assertions before the static compiler gate: **899**.

## Deterministic lab regeneration

The extractor was run in strict mode against the six uploaded Microsoft training repositories. It regenerated **155** lab/exercise records and matched the committed catalog byte-for-byte.

```text
SHA-256
572fc7eb845c49bea517fa3c63e9387b4444473e8542295f35e4d5c7ec22264a
```

Catalog inventory remains:

- 155 labs/exercises
- 1,007 structured sections
- 108 Current
- 30 Reference
- 17 Legacy

## Dependency-resolved build gate

`npm install --no-audit --no-fund` was attempted in this runtime and timed out before creating `node_modules` or a lockfile. A subsequent `npm run build` therefore fails on missing React/Fluent/Vite dependencies. No dependency-resolved production build can be certified in this environment.

On a networked Node 22+ machine run:

```bash
npm install
npm test
npm run build
```
