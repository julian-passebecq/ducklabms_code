# V4.1 Debug Test Pass — 2026-09-16

This is a reliability-only pass over V4. No new product surface was added.

## Defects fixed

### 1. Persisted study state could be corrupted or stale

V4 restored any JSON value from localStorage directly into a `Set`. A JSON string could therefore become a character set, and removed concept/lab IDs could continue to inflate progress counters.

Fix:
- Added `src/lib/persistence.ts`.
- Persisted sets now accept arrays only.
- Non-string values are discarded.
- Concept/lab IDs are filtered against the current catalog.
- Duplicate IDs collapse naturally.
- Invalid boolean values fall back to the configured default.

### 2. Mobile Fluent navigation overrides lost on CSS specificity

The desktop active selector `.railItem.fui-Button.active` was more specific than the mobile `.railItem.active` rule. The intended mobile top indicator could therefore retain the desktop left indicator. The mobile font-size override had the same specificity problem.

Fix:
- Mobile rules now use `.railItem.fui-Button` and `.railItem.fui-Button.active`.
- The active indicator uses the Fluent-derived `var(--brand)` token.

## Added regression gates

- `test:persistence`: 12 persistence/state contracts.
- `test:css`: 5 responsive CSS contracts.
- Existing data, routing, and static TypeScript/JSX gates retained.

## Final no-network result

- Data integrity: 807 checks passed.
- Routing: 21 checks passed.
- Persistence: 12 checks passed.
- Responsive CSS: 5 checks passed.
- Static TypeScript/JSX validation: passed.
- Lab catalog: 155 labs / 1,007 sections.
- Freshness: 108 current / 30 reference / 17 legacy.
- Catalog SHA-256 remains `572fc7eb845c49bea517fa3c63e9387b4444473e8542295f35e4d5c7ec22264a`.

## Environment limitation

The real dependency-resolved Vite build is still not executable in this runtime because `npm install` cannot reach the npm registry. The install attempt timed out. `npm run build` therefore reports missing React/Fluent packages, not a proven application-source regression.
