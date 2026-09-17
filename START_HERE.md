# Start here: the integration baseline

## The decision

Stop developing independent top-level applications. Continue specialist work **inside one versioned root**. A case study chooses its tools; a tool does not own its own project database, notebook format, authentication or run history.

This package implements Root 0.1.0. It establishes the shared services and a small connected curriculum; it is not the finished combined product. Core Integration Pass 1 closes the real React/DuckDB gates; see docs/VERIFICATION.md for the September 18 evidence and remaining scope limits.

## Read in this order

1. `README.md`: startup and honest scope.
2. `docs/SOURCE_AUDIT.md`: what was reused, retained or excluded.
3. `docs/ARCHITECTURE.md` and `docs/MODULE_CONTRACT.md`: ownership boundaries.
4. `docs/VERIFICATION.md`: executed tests versus unverified release gates.
5. `docs/agents/00_COORDINATION.md`: which specialist prompt to use next.

## Reproducible core acceptance journey

Build the React app with the real dependencies, launch with DuckDB, create a Retail revenue lakehouse workspace, run the four steps, save/reopen, switch all notebook layouts, export/import ipynb, then mutate an upstream table and verify that downstream acceptance fails until recomputed. Record screenshots of the actual React app, not the diagnostic client.

## Do not lose the existing work

Original app source is retained under `migration-sources/`. These folders are intentionally not imported into the root bundle. They include old claims, screenshots references and release reports from their respective authors; those claims are not new validation of this root. Images, generated build output, caches and font files were excluded. The two upstream Microsoft monorepos were not copied into this package.

## Keep this non-negotiable rule

Every visible runtime result must say what actually executed. Every virtual duration, partition, worker, cost or failure must say that it is simulated. Unsupported syntax must fail clearly rather than produce a plausible-looking answer.
