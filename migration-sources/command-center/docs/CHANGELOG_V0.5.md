# Changelog — v0.5 stabilization pass

## Evidence semantics

- Replaced the overloaded **Public demo** concept with **Public surface** across active UI.
- Project-specific labels such as `Framework site`, `Related preview`, and `Unpacked Chrome extension` are now preserved instead of being flattened into “demo”.
- Replaced **Source linked** with **Repository recorded** where the catalog may contain private repository metadata.
- Private repository records remain visible as evidence, but visitor-facing GitHub CTAs are suppressed.
- Old shared URLs using `evidence=Public demo` or `evidence=Source linked` migrate to the new filter names automatically.

## Navigation and accessibility

- Added one consistent `<main>` landmark for Projects, Roadmap, Tech Stack, and About.
- Removed the nested-main structure from the Projects dashboard.
- Added a keyboard skip link to the main portfolio content.
- Added `aria-current` to selected sidebar destinations.
- Added `aria-pressed` to technology and category selection controls.
- Added `type="button"` to all native application buttons.
- Preserved mobile evidence/sort controls by removing the obsolete CSS rule that hid them.

## Search and URL reliability

- Case-study proof points and trade-offs are now searchable.
- Whitespace-only search no longer activates filter-reset state.
- Unknown `?project=` IDs are removed during URL canonicalization.
- Right-rail “Featured” content now contains only projects explicitly marked featured.

## QA / build diagnostics

- Tightened the offline TypeScript smoke gate to `strict` + `noImplicitAny`.
- Improved local module stubs so Fluent callback handlers remain type-checked offline.
- Added `test:evidence` for evidence-label, private-repository, and legacy-filter contracts.
- Added `test:ui-contract` for landmarks, responsive controls, native-button safety, selection semantics, and debug hygiene.
- Added `npm run doctor` for dependency diagnostics.
- Added a build preflight so `npm run build` reports missing dependencies directly rather than emitting hundreds of secondary JSX/module errors.

## Current QA snapshot

- 24 projects
- 22 repository records
- 15 actionable repository links
- 12 public surfaces
- 16 structured case studies
- 11/11 featured projects with case-study coverage
- 10/12 Microsoft Cloud projects with case-study coverage
