# Verification report — Power BI Learning Studio V15

**Date:** 2026-09-17

## Result

All dependency-independent V15 release gates pass before packaging.

### Content gate

**PASS**

Checks curriculum/source registries and required content contracts.

### Deep release contract

**PASS**

Verifies package version `15.0.0`, stable curriculum/reference coverage, 5 cases / 45 steps, relationship-diagram identity/cardinality behavior, loaded-model Report/Performance/Service boundaries, Power Query destructive-selection recovery, persisted-state pruning, and all prior query/model/refresh/performance/migration contracts.

### Pure case-state contracts

**PASS — 5 cases / 45 steps**

### Sequential workflow contracts

**PASS — 5 cases / 45 steps**

### Behavior regression suite

**PASS**

V15 adds assertions for:

- relationship diagram slot resolution by relationship identity;
- one-to-many, many-to-one, one-to-one, and many-to-many endpoint markers;
- prior loaded/staged, refresh, performance, case-session, Direct Lake, DAX/TMDL, Copilot, and release-readiness contracts remaining green.

### Migration regression suite

**PASS**

V15 adds assertions that normalization removes:

- arbitrary unknown top-level persisted keys;
- unknown visual-detail keys;
- unknown DAX-object keys;
- unknown performance-state keys.

All earlier malformed collection/scalar, relationship identity, duplicate semantic-object, refresh-enum, and orphan-query recovery tests remain covered.

### JavaScript / JSX / MJS syntax

**PASS — 22 files**

### CSS parser

**PASS**

The exact final rule count is recorded in the final QA log.

### npm / Vite build attempt

**NOT VERIFIED IN THIS SANDBOX**

A real `npm install --no-audit --no-fund` attempt exceeded the sandbox execution window. The lingering install process was terminated and partial `node_modules` / lockfile artifacts were removed afterward. `vite build` was therefore not run, and this report does not claim a production browser bundle. Run `BUILD_WINDOWS.cmd` on a normal connected development machine.
