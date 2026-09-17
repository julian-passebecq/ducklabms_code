# Changelog — V8

**Date:** 2026-09-17  
**Package:** 8.0.0

V8 is a stale-state and evidence-integrity release. It keeps curriculum breadth stable while making saved state, refresh history, DAX validation, Performance Analyzer evidence, and case verification more trustworthy.

## Fixed

### Performance evidence freshness
- Performance Analyzer now stores an evidence signature derived from the active source/storage architecture, query transforms, visuals and field wells, visual filters/analytics/interactions, measures/DAX objects, relationships, and report/page filters.
- Changing those objects makes prior evidence stale.
- Performance UI explicitly reports `Stale · rerun required`.
- Governed release readiness accepts performance evidence only when it matches the current report/model.

### Broken BI rescue verification
- Added a post-repair Performance Analyzer step.
- The case now teaches baseline measurement, repair, and re-measurement before release.
- Guided workflow increases from 41 to 42 steps.

### Refresh-history context
- Simulated operations store a refresh-context signature.
- Service reports `Refresh required` after the active source/storage/connection strategy changes.
- Pending Power Query changes override an old completed refresh label.
- Zero-source workspaces show `Not configured` rather than an invented refresh state.

### Blocked operations before Close & Apply
- Semantic-model operations attempted with staged Power Query/source changes are recorded as `Blocked`.
- The operation tells the learner to Close & Apply first.
- Applying afterward does not retroactively mark the blocked run successful.

### DAX case validation
- Added a current-object `daxFormula` validation contract.
- Wind rolling-trend validation no longer passes because an obsolete formula remains in historical text.

### Persistence hardening
- Workspace migration now sanitizes malformed arrays/objects for measures, DAX objects, bookmarks, interactions, relationship details, refresh history, visual details, Service/refresh nested state, and performance optimizations.
- Case-session storage now rejects malformed registry shapes and bad individual entries without breaking future saves.

## QA additions

Behavior regression coverage now includes:
- stale/current performance evidence;
- storage-mode changes invalidating performance evidence;
- refresh-context staleness;
- staged-query refresh blocking;
- current-object DAX formula validation;
- malformed case-session recovery;
- broader malformed localStorage normalization.

All five guided projects pass sequentially across **42 steps**.
