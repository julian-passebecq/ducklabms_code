# Source provenance and migration record

## Final qualification continuation — 2026-09-21

This pass used only `Datapass_V1_Implemented_Candidate_2026-09-21.zip` as its implementation source. It did not reapply any old handoff or obtain another Datapass checkout. Restoring the modes in its supplied manifest reproduced candidate tree `e48875e891042c9e3f3bb25e9e6ee681afc05130` exactly. Local snapshot commit `9a33e94b8aff4dccef875f4df3a061891afe3d6a` records that tree; it is **not** the original GitHub commit.

The archive root includes the final source manifest, input/output hashes, local Git/tree identities, candidate-to-final patch and a complete changed-file list. `RELEASE_STATUS.md` supersedes the old candidate blockers below. The final pass installed real dependencies, completed DAG Arena design grading and Charts YAML import, and fixed dbt discovery, Windows artifact paths, decimal results, notebook resource registration, asynchronous workspace revision races and guided Run availability. No GitHub push or deployment occurred.

A subsequent user request supplied `https://fastapispark.fastapicloud.dev`. Live compatibility, extended result grading and a production-browser session passed; the endpoint is configured by default without bypassing session consent or version/semantic verification. Remote service code was not modified.

The remainder of this document is the retained candidate assembly record.


## Exact source

Repository: `julian-passebecq/ducklabms_code`

Branch: `codex/real-spark-proxy-1`

Base commit: `abb0345a78836508f6024d79710a46973cbed9d6`

Base Git tree: `74b36a228b268637d256c790ff03d1fa51a22ea9`

The uploaded full repository ZIP has the exact commit as its GitHub archive comment. After restoring its archived executable modes, its entire computed Git tree matched the GitHub commit's tree. The candidate was not reconstructed from connector snippets and did not start from main or a PR base. GitHub was used for reads only.

Input archives (SHA-256):

- `ducklabms_code-codex-real-spark-proxy-1.zip`: `f34f6ec11a5198cadc43ffd74743bad34541424542a45b34e648376881491b54`
- `Datapass_V1_PRO_FINAL_HANDOFF_2026-09-21(1).zip`: `a1a45a678954bafbb6eab1bac6d0d309545c015421e2e251006432b2ec636751`

The source archive does not contain the original `.git` ancestry. A local baseline snapshot was created solely for reproducible diffs/tree comparison. Its local commit must not be represented as the GitHub commit. The delivery records the final candidate tree and an archive SHA-256 rather than inventing a pushed remote commit.

## Assembly order

1. Read the final handoff master prompt and supporting architecture/current-state/acceptance materials.
2. Extract and verify the exact complete base.
3. Apply Pre-Pro cleanup architecture overlay and semantic code/document patches.
4. Read and assemble Analytics M2 once (it already includes M1).
5. M2's assembler guarded an architecture file whose blob had intentionally changed in step 3. The exact code baseline guards were preserved; the cleaned architecture file was restored after assembly instead of undoing cleanup or changing the base. `Analytics_M2_ASSEMBLY.json` retains the assembler record.
6. Implement workspace ownership first, then resource hosts/skins, dbt, pipeline/orchestrator, shared exercises, guided client, figure seam, catalog/persistence polish and final QA.

Dependency installation blocked the native part of Phase 0. Work proceeded on the materialized exact source with focused tests and fail-closed runtime capabilities. This is an explicit qualification deviation, not a claim that the missing native Phase 0 gates passed. Final completion remains blocked.

## Ownership migration

`apps/web/src/foundation/workspaceResources.ts` migrates the legacy `datapass:analytics:v1` notebook attachment into canonical workspace resources. Equivalent content is deduplicated across notebooks, collisions are checked, existing IDs/views remain stable and replay is idempotent. Attachments are retained for recovery. Malformed content gets an explicit recovery journal entry and is not replaced with sample data.

The root workbench keeps additive `resource_schema_version: 2` while preserving existing schema/document identities. Project files, model/SCD data, chart query/snapshot and pipeline source belong to resources. Pane layout, selected editor layer/file, focus/positions, theme/skin and figure playback belong to views/UI. `LabProject` is a temporary editor projection; it is not a second persistent source. Closing a pane does not delete its resource.

The server checks saved workspace/resource revisions before local runs. Real-local chart rows must match an authenticated run from the same workspace/resource. Imported evidence cannot upgrade itself to local execution. Runtime jobs own their logs/artifacts under the workspace and reference exact resource checkpoints. They do not create another catalog.

## Corrective fixes found during implementation

- Node's retained type-stripping tests needed explicit `.ts` imports for TypeScript-relative modules.
- Two Pydantic relationship classes collided in generated OpenAPI. Analytics now uses `AnalyticsRelationship`; OpenAPI was regenerated and its determinism test passes.
- A local-job completion race reported terminal state before releasing the active slot; finalization now releases it atomically.
- Native chart snapshots now retain input versions and empty-result schema; tracked upstream changes can invalidate preview.
- CSV worker validation errors are surfaced as client errors, not runtime outages.
- Named case/playground creation preserves an explicitly supplied title.
- The fastapispark 0.1.0 compiler can silently lose chained operations; a local bounded AST guard and exact remote-plan comparison prevent that ambiguity in the curated client.

## Referenced external source, not vendored runtime

The fastapispark repository was inspected at commit `80ebbbcaf58b1d1922d014a83c9aab49943a81e1`. This is the inspected contract revision, not proof of a running deployment. The ConceptMotion product contract was inspected in `julian-passebecq/react_ms_fluent_2_framework`; no donor SDK code/assets were copied. The four figure families in this candidate are original bounded implementations.

## What did not change

No new DevOps sibling product, database provider requirement, distributed scheduler/cluster, generic terminal, or remote infrastructure was added. Historical remote files were retained rather than blindly removed. The normal UI now routes to the local learning/runtime path. There was no push, merge, public deployment or live remote run.
