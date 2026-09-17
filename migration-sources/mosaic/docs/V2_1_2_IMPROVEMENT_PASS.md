# V2.1.2 debug / improvement pass

Focus: notebook ergonomics and stronger behavior-level regression coverage without expanding Mosaic into another domain application.

## Improvements

- collapsible blocks per view;
- collapse remembers the user's latest expanded height;
- reset-layout expands blocks and restores baseline geometry;
- collapsed blocks are temporarily non-resizable so the compact header remains stable;
- Table blocks now expose **Table | Profile** modes;
- Profile shows inferred/schema type, null/empty count, distinct count and a sample value;
- profiling is explicitly labeled as preview-based when the shared result is truncated;
- imported Jupyter saved-output blocks can be pinned to and removed from Dashboard;
- result table copy now reports the displayed row count honestly rather than always saying "first 100 rows";
- TypeScript node-build config fixed (`allowImportingTsExtensions` now has `noEmit: true`).

## Debugging / tests

- collapse/expand geometry is exercised as a pure behavior test;
- manual block height restoration is verified;
- profile counts/types are exercised on real fixture data;
- Vite config gets a dedicated stubbed TypeScript gate extending the real `tsconfig.node.json`;
- existing `.ipynb`, model, syntax and internal-type gates remain enabled.

## External build gate

The environment still times out during `npm install`, so the dependency-resolved Vite build cannot be completed here. The failed build attempt did expose and lead to the fix of the node TypeScript configuration defect above. No partial `node_modules`, lockfile, or emitted build artifacts are packaged.
