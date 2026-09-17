# Changelog — V9

**Date:** 2026-09-17  
**Package:** 9.0.0

V9 is a state-integrity and cross-surface consistency release. Curriculum breadth stays stable while reset behavior, Power Query empty-state fidelity, persisted scalar migration, model release gates, refresh status rendering, Service connectivity messaging, and performance-evidence semantics are hardened.

## Fixed

### Event-safe global reset
- The navigation reset button no longer passes React's click event into `resetWorkspace` as if it were workspace override data.
- Reset now always executes through an explicit zero-argument wrapper.
- This prevents DOM/SyntheticEvent properties from polluting the workspace and avoids serialization failures during reset persistence.

### Power Query empty-state fidelity
- Column-quality/distribution profiling is hidden until a real query exists.
- `Source` / `Navigation` Applied Steps are no longer shown for a workspace with zero queries.
- The empty Query Settings state now explicitly reports `No query steps yet`.

### Refresh status consistency
- `Blocked` semantic-model operations now render as warnings rather than successful operations.
- The Refresh surface displays both the last operation and the **current semantic-model status**, so a historically completed operation cannot visually mask a later `Refresh required` state.
- Service connection settings now derive readiness from the same source/gateway/credential logic as the Refresh surface rather than inferring readiness from the gateway toggle alone.

### Stronger governed model contract
- Governed release readiness now requires at least two active core relationships.
- Broad bidirectional paths remain release blockers.
- Unexplained many-to-many core relationships now block the governed star-schema training release.
- Model Health explicitly warns when fewer than two core relationships are active.

### Persisted scalar-state hardening
Workspace migration now sanitizes malformed scalar/enumeration values, not only arrays/objects:
- storage mode;
- `onObject`, Date-table and RLS booleans;
- relationship cardinality, direction and active state;
- gateway/credential/incremental flags;
- refresh schedule/action strings;
- Service endorsement/deployment-stage enums and booleans;
- Performance Analyzer flags/timestamps/signatures;
- refresh-history scalar fields.

Impossible persisted Copilot state is also repaired: `copilotApproved` cannot survive migration unless both business descriptions and AI preparation are enabled.

### Performance evidence now follows the loaded model
- Performance evidence uses the **applied** Power Query source/step snapshot, not staged edits that have not gone through Close & Apply.
- Staged query edits therefore do not falsely invalidate evidence for the still-loaded semantic model.
- Close & Apply changes the loaded signature and correctly makes the previous evidence stale.
- Query-map keys and loaded sources are canonicalized to avoid false staleness from irrelevant ordering.
- Report theme and visual title/tooltip rendering changes now invalidate old performance evidence because they can alter display/render characteristics.

## QA additions

V9 adds regression assertions for:
- event-safe reset binding;
- no-query profiling/Applied-Step guards;
- warning rendering for blocked refresh operations;
- invalid/inactive/many-to-many governed relationship paths;
- malformed scalar localStorage migration;
- impossible persisted Copilot approval;
- theme/title/tooltip performance-evidence staleness;
- staged-versus-applied Power Query performance signatures.

All five guided projects remain sequentially satisfiable across **42 steps**.
