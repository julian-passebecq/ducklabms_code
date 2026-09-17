# V7 Adversarial Reliability / Teaching-Truth Audit

Date: 2026-09-17  
Package version: `0.8.0`

## Release gates

| Gate | Result | What is checked |
|---|---|---|
| TypeScript | PASS | project typecheck through `tsconfig.build.json` |
| Airflow semantic suite | PASS | retries, retry exhaustion, sensors, timeout, branching, trigger rules, `upstream_failed`, leaf-state run result and DAG validation |
| Airflow long-sensor guard | PASS | 130-poke scenario completes without a false deadlock guard |
| Schedule suite | PASS | bounded cron parsing, invalid weekday/range rejection and weekday/weekend data intervals |
| dbt compiler suite | PASS | refs, sources, seeds, macros, incremental context, ephemeral inlining and unsupported-Jinja rejection |
| dbt command suite | PASS | run/test/build distinctions, selectors, contracts, relationships, snapshots and upstream-test gating |
| Hybrid suite | PASS | successful/failed/partial run scopes, test-gate phases and no invented dbt test result after operational wrapper failure |
| Guided mock-project suite | PASS | reference architecture, failure scenarios, seed/incremental compilation, publish gating, drafts and self-review persistence primitives |
| Scenario intent validation | PASS | failure/branch/quality scenarios must contain coherent injection metadata |
| Scenario effect matrix | PASS | every bundled structured scenario both terminates and exhibits its advertised effect |
| Persistence suite | PASS | string/boolean record filtering, usable-storage probing, restore primitives and blocked-storage fallback |
| Case-study validation | PASS | DAG/model dependencies, tests, snapshots, contracts, scenario intent and Hybrid failure-scope consistency |
| Dead-control/state audit | PASS | controls are wired; case/scenario switches clear transient state; selector behavior stays bounded |
| Accessibility/static audit | PASS | graph/explorer/dialog semantics plus unique SVG markers and non-dead lineage nodes |
| Production build | PASS | local compiled source/CSS and pinned import-map build emitted to `dist/` |
| Static SPA smoke | PASS | `/airflow`, `/dbt`, `/hybrid`, mock self-review, phase summaries, snapshot/graph/runtime modules and CSS |
| Full Chromium visual mount | ENVIRONMENT-LIMITED | sandbox still lacks locally installable React/Fluent packages and cannot retrieve the pinned browser modules, so a fully mounted visual pass is not claimed |

## Main V7 findings

### 1. Cron weekday values could be silently normalized

The bounded parser accepted values such as weekday `8` by applying `% 7`. V7 rejects values outside `0..7` and rejects wrap-around ranges in the bounded grammar instead of inventing semantics.

### 2. Structured scenarios could be valid but do nothing

A transient/permanent/bad-quality scenario without a target could pass case validation and simply execute a normal run. V7 requires effect-specific target metadata and validates branch/sensor/test-injection parameters.

### 3. Terminal-state testing was not sufficient

The previous matrix proved that scenarios finished, but not that their named failure/retry/branch behavior occurred. V7 asserts the observable scenario effect across all structured cases.

### 4. Hybrid aggregate status could hide an incomplete quality phase

A successful dbt transformation followed by an operational failure in the Airflow test wrapper left dbt model status successful—which is truthful—but the UI had no separate phase indicator. V7 exposes run-scope and test-gate phase summaries and logs when tests were not modeled rather than inventing results.

### 5. Browser persistence copy could overstate durability

Editors and mock notes said they were saved locally even if `localStorage` was blocked. V7 probes and tracks persistence success and explicitly reports memory-only behavior.

### 6. Mock practice now supports deliberate self-review

Acceptance criteria are now checkable after the learner compares their design with the reference. The app does not call this a score or automatic grade.

## Deliberate limitations

1. React and Fluent UI remain pinned through `esm.sh`; this package still needs browser network access to mount those UI dependencies.
2. Airflow execution is structured deterministic simulation, not arbitrary Python or a real scheduler/executor.
3. Only a bounded trigger-rule/timetable subset is modeled.
4. The dbt compiler supports the constructs required by the lessons and rejects unsupported Jinja.
5. dbt contracts model projected column names, not adapter-specific physical constraints/types.
6. Snapshots model deterministic two-observation SCD2 behavior rather than warehouse adapter execution.
7. Data tests are scenario outcomes, not queries executed against a warehouse.
8. Mock answers and acceptance checks are learner notes/self-review, not automatic architecture grading.
