# Power BI Learning Studio V12 — 2026-09-17

V12 is a semantic-correctness and destructive-recovery pass. It does not expand the course count; it makes existing modeling, refresh, migration, and loaded-model behavior more faithful.

## Fixed relationship recovery after destructive edits

The Model trainer previously selected the next relationship by relationship count. If a middle relationship was deleted from a complete model, the trainer could recommend a relationship that already existed and leave the missing path impossible to restore through the guided control.

V12 now finds the first missing recommended relationship by identity. Deleting `Region → Sales`, for example, makes the trainer recommend `Region → Sales` again even when later relationships still exist.

## Governed star-schema gate now matches its wording

The governed release review already rejected inactive, bidirectional, and many-to-many core paths, but a one-to-one relationship could still pass even though the exercise explicitly teaches dimension-to-fact star-schema relationships.

V12 requires at least two active one-to-many / many-to-one paths and rejects one-to-one core paths in this governed training contract. Model Health reports the same mismatch.

## Refresh strategy and storage mode compatibility

V12 adds an explicit architecture guard for clearly contradictory combinations:

- Direct Lake + Scheduled Import / Incremental refresh is rejected;
- DirectQuery + Import-style Incremental/Scheduled refresh is rejected;
- Import accepts normal Import refresh strategies;
- Composite remains intentionally flexible because individual tables may use different storage behaviors.

This is in addition to the existing connector/storage compatibility checks.

## Data view now reflects the loaded model

A blank workspace no longer displays representative Sales rows in Data view. Data view stays empty until Power Query has a source snapshot loaded through Close & Apply. Staged query changes remain visible as pending while Data view continues to represent the last loaded snapshot.

## Power Query empty-state truthfulness

With no query selected/created:

- the formula bar displays a neutral `Select or create a query` state;
- transform ribbon actions are disabled;
- profiling and Applied Steps remain hidden/empty as introduced in earlier passes.

## Evidence integrity improvements

- Enabling/disabling RLS invalidates previous Performance Analyzer evidence.
- Marking the Date table invalidates previous Performance Analyzer evidence.
- Legacy refresh-history entries that predate configuration signatures are no longer treated as proof of current refresh state; the Service surface requires a new operation.

## Migration hardening

- Refresh schedule values are now enum-normalized to the simulator's actual UI options.
- Unsupported granular refresh actions are removed; valid table-level actions survive.
- Duplicate measures are deduplicated case-insensitively, keeping the latest definition.
- Duplicate DAX objects are deduplicated by object type + name, without collapsing different object types that share a name.

## Regression additions

V12 adds direct tests for:

- missing-middle relationship restoration;
- one-to-one governed release rejection;
- RLS and Date-table performance-evidence invalidation;
- unsigned legacy refresh evidence;
- storage/refresh-strategy mismatches;
- invalid refresh schedule/action migration;
- duplicate measure/DAX migration;
- Data view loaded-model gating;
- Power Query formula/ribbon empty state.
