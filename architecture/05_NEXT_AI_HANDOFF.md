# Next AI handoff

## Mission

Continue the existing Datapass Studio V1. Do not redesign it.

The next agent should make the current local React product easier to launch and use, then establish Cloudflare as the web deployment target.

## Repository

`julian-passebecq/ducklabms_code`

Continue from:

`codex/real-spark-proxy-1`

Open PR:

`#5`

Do not restart from `main`.

The last functional code baseline before the architecture-doc pass is:

`5ace7654baad1bc2d2dd1254efa5abd2a55cbb3e`

It passed all three current CI jobs.

## First files to read

1. `architecture/00_START_HERE.md`
2. `architecture/01_CURRENT_ARCHITECTURE.md`
3. `architecture/02_DECISIONS.md`
4. `architecture/03_STATUS_AND_ROADMAP.md`
5. `architecture/04_CLOUDFLARE_TARGET.md`
6. `apps/web/src/playgrounds.ts`
7. `apps/web/src/workspacePresentation.ts`
8. `apps/web/src/notebook.ts`
9. `apps/web/src/App.tsx`
10. `tests/browser/core.spec.ts`

## What is already good enough to preserve

- one shared notebook/source model.
- draggable/resizable block geometry.
- saved layouts.
- shared workspace/catalog.
- DuckDB/DuckLake local truth.
- Fabric presentation.
- LeetCode presentation.
- free coding canvas.
- playground launcher.
- SparkLab fast semantic runtime.
- explicit runtime-truth badges.

Do not replace these with another notebook framework.

## Immediate next task

Implement the Cloudflare deployment scaffold without changing execution semantics.

Recommended bounded pass:

1. add `wrangler.jsonc` for `apps/web/dist`.
2. add the smallest possible deployment script.
3. keep static assets asset-first.
4. do not create an API proxy unless it has a configured HTTPS upstream.
5. show an explicit disconnected state in a Cloudflare-hosted build when no backend exists.
6. update CI/tests for the deployment config.
7. preserve local `start.py` and Vite proxy behavior.

After that, spend a pass polishing V1 UI rather than adding infrastructure.

## Product priorities after Cloudflare

1. Fabric notebook usability.
2. LeetCode arena usability.
3. free canvas ergonomics.
4. catalog/table/schema explorer.
5. one-click local trial.
6. optional MotherDuck adapter.
7. V1 freeze.
8. Oracle Spark/Airflow runtime.

## Architecture thoughts for future coding

### Keep the runtime boundary boring

The frontend should ask a runtime capability contract what is available. It should not infer cloud/local truth from the visual preset.

### Keep layout state cheap

A view can change geometry, visibility and chrome. It should not own code or runtime state.

### Prefer adapters over forks

MotherDuck, Oracle Spark and future runtimes should plug behind narrow execution interfaces. Avoid special-case notebook implementations.

### Cloudflare should stay thin

Use Cloudflare for delivery and a small gateway. It is not the data plane.

### Oracle should arrive after the product deserves it

The first Oracle work should make an already useful V1 faster/more realistic, not rescue an unfinished UI.

### Delete historical complexity only after replacement proof

There is older remote Spark/Airflow GitHub Actions work on this branch. It can be frozen and later removed, but do not delete it during an unrelated UI/Cloudflare pass unless tests prove nothing depends on it.

## Definition of success for the next agent

A user can:

- open Datapass.
- choose DuckLake, Fabric notebook, Free canvas, MotherDuck-ready SQL, or LeetCode.
- edit and run local-supported code.
- inspect tables/results.
- rearrange the workspace.
- save/reopen/reset a playground.
- understand which runtime is real, simulated or unavailable.
- deploy/view the React shell on Cloudflare without pretending the local data engine moved to Cloudflare.

That is the V1 direction.
