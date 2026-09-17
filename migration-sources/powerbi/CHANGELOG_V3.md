# Changelog — V3

Date: 2026-09-17

## Added

- Troubleshooting Center with 8 realistic production tickets.
- Fifth case study: Broken BI Production Rescue.
- Seeded case-study state for diagnostic scenarios.
- Pure `workspaceChecks` validation module.
- `check:state` regression suite for all case-step contracts.
- `check:syntax` parser gate for JS/JSX/MJS when dependencies are installed.
- Model health scanner.
- Refresh execution/history simulator with meaningful failure conditions.
- Copilot / AI semantic-model readiness controls.
- AI-readiness reference checklist in Operations.
- Direct Lake calculated-column preview content.
- 4 new DAX exercises, bringing the guided set to 16.
- 4 new architecture decision scenarios, bringing the set to 12.
- 3 additional August 2026 release cards.
- Selected-visual editing, duplication, and deletion on the report canvas.

## Fixed

- Nested persisted workspace objects now merge against current defaults instead of replacing newly introduced schema fields.
- Case validation logic no longer lives only inside the React component.
- A new JSX syntax gate caught and fixed invalid multiline string literals during this pass.
- Seeded cases reset back to their intended broken baseline instead of a generic clean workspace.
- Refresh diagnostics now distinguish a Service connectivity failure from a DAX/report issue.

## Current release baseline

Reverified on 2026-09-17. The newest official monthly Power BI release page available is August 2026.
