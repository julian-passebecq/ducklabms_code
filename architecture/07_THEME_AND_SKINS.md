# Theme and Experience Skin

Current code has Fluent light at the root plus notebook `skin` and `presentation` concepts. V1 should make the distinction explicit rather than multiplying application shells.

## Theme

Theme controls global color/token mode only:

- Fluent Light
- Neutral Light
- Dark

A future system-theme option is fine but not required for the migration.

## Experience Skin

Skin controls density/chrome/visual conventions:

- Datapass Studio
- Fabric-inspired
- Databricks-inspired
- Arena

Skin may affect:

- sidebar/tree density;
- tab shape;
- notebook header treatment;
- command-bar density;
- code/result chrome;
- accent tokens;
- contextual vendor/reference icons where legally appropriate.

Skin must not affect:

- resource identity;
- source code;
- catalog ownership;
- execution target;
- notebook semantic order;
- grading semantics.

## Implementation direction

Prefer semantic CSS/design tokens instead of hard-coded vendor-specific selectors spread across the app:

```text
--dp-canvas-bg
--dp-panel-bg
--dp-sidebar-bg
--dp-border
--dp-text
--dp-muted
--dp-accent
--dp-code-bg
--dp-tab-active
--dp-tree-selection
--dp-success
--dp-warning
--dp-danger
```

Keep FluentProvider theme selection separate from Datapass Experience Skin state.

## Vendor truth

Fabric-inspired and Databricks-inspired are presentation modes only. Use official vendor product icons only for contextual training/reference where permitted; never use them as Datapass branding or imply the vendor runtime is executing.
