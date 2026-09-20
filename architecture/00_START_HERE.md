# Datapass Studio architecture — start here

This folder is the **current architecture source of truth** for the Datapass Studio V1 work.

## Repository and continuation point

- Repository: `julian-passebecq/ducklabms_code`
- Active branch: `codex/real-spark-proxy-1`
- Open PR: #5
- Functional code baseline immediately before this documentation pass: `5ace7654baad1bc2d2dd1254efa5abd2a55cbb3e`
- That baseline passed all three current CI jobs:
  - DuckLake runtime regression + real DuckLake smoke
  - web contracts + TypeScript + Vite build
  - Chromium V1 playground smoke

**Continue from the branch tip. Do not restart from `main`.**

## Product objective

Ship a first version that is genuinely useful to open, explore and code in **before** spending more time on Oracle infrastructure.

V1 is one React / Fluent UI 2 learning product with a shared notebook model and shared catalog. It is not a collection of independent apps.

The five V1 entry points are:

1. DuckLake / DuckDB local SQL lab.
2. Microsoft Fabric-style notebook for Python + SparkLab.
3. Free draggable/resizable coding canvas.
4. LeetCode-style interview arena.
5. MotherDuck-ready SQL playground, local-first until a real adapter is configured.

## Read next

1. `01_CURRENT_ARCHITECTURE.md` — what exists and how the pieces fit.
2. `02_DECISIONS.md` — decisions that are now frozen unless evidence changes them.
3. `03_STATUS_AND_ROADMAP.md` — what is complete and what to code next.
4. `04_CLOUDFLARE_TARGET.md` — Cloudflare migration target and constraints.
5. `05_NEXT_AI_HANDOFF.md` — concise handoff for the next coding agent.

## Non-negotiable architecture rule

Presentation is not execution.

```text
presentation preset
        ↓
notebook view / geometry
        ↓
canonical blocks + source
        ↓
kernel/runtime
        ↓
shared workspace/catalog
```

Changing from Studio to Fabric to LeetCode, or moving/resizing blocks, must not clone code, fork runtime state, or silently change semantic cell order.
