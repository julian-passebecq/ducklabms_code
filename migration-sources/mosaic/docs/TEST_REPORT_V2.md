# Mosaic V2.1.7 test report

## Full source gate

`npm run verify:source` passes.

### Architecture / UX audit

**59/59 checks pass**, covering Fluent 2 shell, six reusable layouts, `.ipynb` import/export, targeted dataset navigation, notebook-order execution, collapse/profile behavior, Dashboard controls, project JSON round-trip, read-only unsupported notebook code, workspace state rehydration, typed project-state sanitation, duplicate Jupyter ID repair and empty-dataset fidelity.

### Behavior tests

Permanent tests verify:

- project/view block consistency;
- split-column insertion behavior;
- dataset SQL targeting;
- `.ipynb` Python/SQL/Markdown/saved-output import;
- height-balanced two-page layout;
- unsupported kernel/magic handling;
- collapse height restoration;
- result profiling;
- imported code/output move grouping;
- imported code deletion removes child output;
- reset preserving semantic Notebook order;
- Dashboard placement and half/full-width resizing;
- scoped project export and sanitized project import;
- malformed grid geometry clamping;
- duplicate view IDs and unknown panel types rejected;
- matching OPFS dataset reattachment;
- structured Jupyter table output normalization;
- synchronous editor persistence;
- direct nbformat 4.5 export;
- notebook/cell metadata and Markdown attachment preservation;
- raw Jupyter output metadata preservation;
- original SQL magic preservation when untouched;
- Mosaic view geometry/collapse/expanded-height round-trip through `metadata.mosaic`;
- unsupported Bash/IPython code returning as read-only on re-import;
- malformed optional project notebook metadata being dropped safely;
- non-string code state being rejected before editor restore;
- saved-output arrays being filtered to object payloads;
- stale persisted `arrow-ipc` transport being normalized to `rows`;
- intentionally empty dataset catalogs surviving project restore;
- duplicate/invalid Jupyter cell IDs being repaired deterministically;
- saved output being rebound to the repaired parent ID;
- workspace remount wiring for New / `.ipynb` / project replacement.

### Compiler checks

- **27/27 TS/TSX files** transpile without syntax diagnostics.
- strict internal TypeScript contract pass succeeds using lightweight external-library stubs.
- Vite/node TypeScript configuration gate passes.

## External build gate

The dependency-resolved build requires the npm dependency tree. If registry access is unavailable in the preparation environment, this gate cannot complete even though the internal source/type gates above pass.

No partial `node_modules`, lockfile or temporary TypeScript build-info files are included in the release archive.

Local final gate:

```bash
npm install
npm run verify:source
npm run build
npm run dev
```
