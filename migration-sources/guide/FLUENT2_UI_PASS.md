# Fluent 2 UI improvement pass

Date: 2026-09-16
Release: 0.2.0

## Goal

Make Fluent UI React v9 the actual interaction and theme foundation while keeping the guide's custom value-add: a Fabric-inspired home, a deep knowledge hierarchy, and a two-page concept/lab reader.

## Changes

### App shell
- Replaced letter/glyph navigation with Fluent Buttons, Tooltips, and Fluent System Icons.
- Changed the primary rail from a custom dark shell to a theme-aware Fluent neutral surface.
- Added a Fabric-style Home command strip for study, labs, and freshness.

### Concept explorer
- Replaced custom `details` / button hierarchy with Fluent `Tree`, `TreeItem`, and `TreeItemLayout`.
- Hierarchy is now explicitly Platform → Area → Concept.
- Added previous/next concept navigation and an index pager.

### Theme system
- Neutral backgrounds, strokes, foregrounds, brand color, and shadows now resolve from Fluent theme tokens.
- Light/dark modes therefore share the same component/theme vocabulary.
- Product identity colors remain deliberate product accents rather than replacing Fluent neutral theming.

### Certifications
- Weight ranges are now rendered with Fluent ProgressBar components.
- Added an explicit study loop: Understand → See it → Build it → Verify.
- Certification cards continue to separate current and legacy credentials.

### Labs
- Replaced native HTML selects with Fluent Dropdown / Option controls.
- Added a visible matching-result count inside the filter surface.
- Kept the custom two-page lab reader because it is a core product differentiator.

### Accessibility / UX
- Active primary navigation uses `aria-current="page"`.
- Tooltips support compact navigation labels.
- The concept hierarchy uses a component designed for nested navigation rather than a flat list.
- Responsive rules keep the book spread stacked below tablet widths.

## Validation

- Static TypeScript/JSX parse passed with local dependency stubs.
- Brace balance passed for TSX and CSS.
- Content index still contains 155 exercises / 1,007 structured sections.
- Dependency-resolved `npm install` / Vite build could not be run in this execution environment because npm registry access timed out.
