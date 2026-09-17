# V4.2 Debug Test Pass

Date: 2026-09-16

## Scope

Debug-only pass on the packaged V4.1 baseline. No new study feature was added. The pass targeted route/history drift, nested click behavior, source-extractor portability, and package reproducibility.

## Defects found and fixed

### 1. Stale deep-link URL/state drift

V4.1 validated route syntax but did not canonicalize targets against the current data catalog. A removed concept/lab/snippet could therefore leave the browser on an obsolete hash while the UI displayed a fallback object. This was most visible after Back/Forward because state could already equal the fallback and no subsequent route effect had to run.

V4.2 adds `resolveGuideHash(...)` with page-specific valid-target policies and canonicalizes the address bar with `replaceState`. Regression coverage now includes stale concepts, labs, code snippets, page-only routes, and deterministic canonical hashes.

### 2. Copy click selected the code card

`CodeBlock` is nested inside clickable snippet cards. The copy button previously bubbled to the card and could change the selected snippet/deep link. Copy now stops propagation before invoking the clipboard operation.

### 3. Lab extractor was tied to the build machine

The shipped `extract_labs.py` used absolute `/mnt/data/ms_guide_workspace/...` paths for both source repositories and output. The documented re-index command was therefore not portable.

V4.2 uses project-relative paths and explicit source/output configuration, while retaining byte-identical catalog generation.

## Final gate summary

- Data integrity: 807 passed.
- Routing: 27 passed.
- Persistence: 12 passed.
- Responsive CSS: 5 passed.
- UI interaction contracts: 4 passed.
- Extractor portability: 8 passed.
- Static TypeScript/JSX structure: passed.
- Portable extractor regeneration: 155 records, byte-identical SHA-256.
- Real dependency install/build: blocked by npm registry timeout in this runtime.

## Package verification

The release ZIP was extracted into a clean directory and the entire no-network test suite was rerun from the extracted `app/` folder. All gates passed. Python cache artifacts are excluded from the package.
