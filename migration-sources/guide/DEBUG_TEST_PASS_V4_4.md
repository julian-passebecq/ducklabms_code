# V4.4 Debug + Improvement Pass

Date: 2026-09-17

## Baseline recovery

The retained V4.3 archive was unavailable in the active runtime, so this pass recovered from the actual V4.2 release ZIP, re-applied the recorded V4.3 source fixes, and then continued with new V4.4 improvements and tests.

## Re-applied V4.3 fixes

- Certification-lens concept detail now resolves from the visible concept set immediately.
- Decision and certification detail remain routed-selection authoritative while search filters only narrow their picker lists.
- Deep-linked code snippets remain visible even when language/search filters would otherwise exclude them.
- Global search ranks the full candidate set before truncating results.
- Command palette supports Arrow Up/Down, Enter, Escape, active-option ARIA state, and a polite live-region announcement.

## V4.4 improvement

Search semantics are now consistent across the command palette and page-local filters. Multi-word queries are token-aware and order-independent (for example, `lake direct` can match `Direct Lake`) while still requiring every query token to be present. Ranking is centralized in `src/lib/search.ts` and remains deterministic.

## Regression gates

Run `npm test`.

The suite covers data integrity, routing, persistence, responsive CSS, UI/state/search contracts, search ranking, extractor portability, release portability, and the dependency-free TypeScript/JSX gate.

## Additional defects fixed during V4.4

- Arrow Up from an unselected command palette previously landed on the second-last result. Keyboard index movement is now centralized and correctly enters at the last result when moving upward from no selection.
- Selecting a code snippet while a language tab was active reset the code book to `All`. That reset is removed; deep-linked/selected snippets are injected into the visible set without destroying the user's language filter.
- Certification filtering now has an explicit empty state instead of leaving a blank picker column.

## Final results

- Data integrity: 807
- Routes: 27
- Persistence: 12
- Responsive CSS: 5
- UI/state/search: 16
- Search: 12
- Extractor portability: 8
- Release: 12
- Static TypeScript/JSX: pass

Total explicit checks: 899.

Strict regeneration from the six uploaded source repositories is byte-identical to the committed lab catalog (SHA-256 `572fc7eb845c49bea517fa3c63e9387b4444473e8542295f35e4d5c7ec22264a`).

A real npm dependency install was attempted but timed out before creating `node_modules`; the dependency-resolved Vite build therefore remains environment-blocked.
