# V7 Changelog — adversarial reliability and self-review

Version: `0.8.0`  
Date: 2026-09-17

## Correctness fixes

### Bounded cron validation

- Reject weekday values outside cron's supported `0..7` domain instead of wrapping `8`/`9` modulo seven.
- Reject ambiguous wrap-around weekday ranges such as `5-1` in this bounded simulator.
- Keep `7` as the Sunday alias and continue to support simple bounded ranges such as `1-5`.

### Scenario-definition hardening

Structured case-study scenarios now reject:

- transient/permanent/late-input/sensor-timeout/bad-quality effects without a `targetTask`;
- branch effects without a branch task/target;
- branch effects without at least one non-selected direct branch (`branchSkip`);
- duplicate `branchSkip` task IDs;
- `failedDbtTest` metadata on non-`bad_quality` scenarios;
- non-positive/non-integer `sensorTimeoutPokes` or use outside `sensor_timeout`.

This prevents a scenario label from silently becoming a no-op simulation.

### Hybrid phase truthfulness

Hybrid results now expose two explicit Airflow boundary summaries:

- `runPhaseStatus`
- `testPhaseStatus`

Each can be `not_run`, `partial`, `success`, or `failed`.

The UI shows those separately from the aggregate Airflow/dbt state. This makes partial transformation success plus a later quality-wrapper failure visible instead of visually collapsing it into one ambiguous status.

If an Airflow test wrapper fails operationally before this simulator models a dbt test command, dbt test nodes remain `skipped` and the command log explains that pass/fail results were **not invented**.

## Mock project improvements

The Fulfillment SLA mock project now has two learner progress dimensions:

- architecture/design drafts per reasoning checkpoint;
- a manual acceptance-criteria self-review checklist.

The checklist is persisted per case but is explicitly labeled **self-review**, not an automatic correctness score.

## Persistence truthfulness

- Added `isLocalStorageUsable()` probing.
- Airflow and dbt editors no longer claim an edit is saved when browser storage is blocked.
- The mock workspace reports whether drafts/checks are browser-persisted or only held in the open tab.
- Added boolean-record filtering for saved self-review state.
- Storage schema version advanced from `4` to `5`.

## Regression expansion

The all-case scenario matrix now validates the promised effect as well as terminality:

- one injected transient failure and expected retry outcome;
- permanent failure with retry exhaustion;
- exact late-input/sensor-timeout poke counts;
- bad-quality target failure;
- declared branch skips;
- declared failing dbt data tests.

Additional regressions cover invalid cron weekdays/ranges, malformed scenario metadata, Hybrid operational test-wrapper failure, and blocked browser persistence.
