# Power BI Learning Studio — V11 changelog

**Date:** 2026-09-17

V11 is a focused state-integrity and destructive-edit pass on top of V10.

## Fixed: staged deletion of the last Power Query source

The Service semantic-model status previously checked the current source list before checking whether Power Query had unapplied changes. If the learner staged deletion of the last source, the loaded semantic model still existed until **Close & Apply**, but Service incorrectly displayed **Not configured**.

V11 now prioritizes the staged transition and reports **Pending changes** until Close & Apply commits the deletion. The governed release guidance likewise tells the learner to Close & Apply rather than incorrectly telling them to reconnect a source.

## Fixed: relationship metadata can no longer drift after reordering

Saved relationship metadata is now matched by relationship name first, with positional fallback only for older states that do not contain names. This prevents a reordered persisted relationship array from attaching the wrong:

- cardinality;
- filter direction;
- active/inactive state

to another relationship.

The same name-aware matching is used by runtime model-health logic, not only by migration.

## Added: destructive relationship editing

Model view now supports **Delete selected relationship**.

Deletion:

- removes exactly the selected relationship;
- removes its corresponding metadata;
- preserves metadata on surviving relationships;
- safely adjusts the selected relationship index;
- changes the Performance Analyzer model signature, so older performance evidence becomes stale as expected.

## Stronger workspace recovery

V11 normalization additionally:

- removes duplicate source identities while preserving order;
- removes duplicate relationship identities while preserving order;
- normalizes unknown persisted refresh-history statuses instead of allowing unsupported operational states to leak into Service.

## Regression coverage added

New behavior/migration tests cover:

- staged deletion of the last loaded query;
- Service status during that staged transition;
- governed release guidance during that transition;
- relationship metadata reordering by name;
- relationship deletion and surviving metadata;
- performance-signature invalidation after relationship deletion;
- duplicate source/relationship recovery;
- unsupported refresh-history statuses.

The curriculum size remains **5 cases / 44 guided steps**; V11 changes simulator correctness, not course inflation.
