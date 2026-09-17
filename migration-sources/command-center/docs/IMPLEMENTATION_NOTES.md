# Implementation notes

## Refinement pass

The React showcase was moved from a generic project-dashboard look toward a professional Fluent 2 portfolio/product catalog.

### Key changes

- Microsoft Cloud remains the default landing category.
- Category KPIs now reflect the current scope instead of global hard-coded totals.
- Hero decoration was replaced by a real portfolio-scope panel with featured projects and evidence counts.
- Project cards now surface repository state and public-surface state before descriptive detail.
- Project drawer is now a dossier with repository/public-surface/stage evidence and shareable project URLs.
- Right rail focuses on availability, evidence coverage, featured projects and active work; provenance/citation-like UI was removed.
- Roadmap includes public-surface/repository/release evidence for each milestone row.
- Tech Stack is a ranked usage view instead of a loose tag cloud.
- Sidebar includes category counts while preserving compact responsive behavior.
- Top bar exposes GitHub and portfolio destinations directly.

### Design constraints

- Fluent UI v9 components are used for the interactive component layer.
- Energy/oil/gas remains a data-domain identifier, not a decorative theme.
- No invented ETAs.
- Unreleased work must remain visibly distinct from public/live work.

### v0.5 reliability notes

- Evidence labels no longer imply that every live URL is a demo.
- Private repository records are informational evidence, not visitor-facing links.
- The shell now has one main landmark and a keyboard skip link.
- Offline QA is strict and includes dedicated evidence/UI-contract tests.
- Build diagnostics fail early when React/Fluent/Vite dependencies are not installed.
