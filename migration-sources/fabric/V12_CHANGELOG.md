# V12 changelog — Guided learning, mastery, and durable evidence

V12 keeps the V11 executable data workspace, orchestration engine, dbt/Airflow/Spark decision training, and recovery drills. The pass concentrates on the learning workflow itself.

## Persistent tutorial progress

- Added first-class `TutorialProgress` and `TutorialStepProgress` state.
- Progress persists with each Fabric/ADF lab save.
- Older saves automatically gain missing step records without losing runtime state.
- Progress from another case study is rejected safely instead of being applied to the wrong mission.

## Guided vs Challenge modes

- **Guided** mode keeps explanatory context visible.
- **Challenge** mode hides most direct guidance until the learner requests it.
- Challenge mode uses stricter assistance/failure penalties.
- Mode switching is persisted with the mission.

## Mastery model

Each tutorial step records:

- total validation attempts;
- failed validations;
- highest hint level used;
- solution reveal/application;
- validation status;
- best score;
- latest validation message and timestamp.

The mission header now reports completion, mastery, rating, hint use, and solution use.

## Hint ladder

Hints are progressive instead of all-or-nothing:

1. concept/why nudge;
2. direct configuration hint;
3. target configuration.

The learner can therefore ask for the minimum help needed rather than immediately revealing the full solution.

## Progression gates

- `Next` remains locked until the current step validates.
- Previously validated steps remain recorded after navigation/reload.
- The final reliability/recovery drill is locked until the final core step validates.
- Completing all core steps shows a mission-complete mastery banner.

## Evidence workflow

The tutorial pane now summarizes:

- current workspace snapshot;
- changed/created table count;
- lineage edge count;
- latest data event;
- latest pipeline run state;
- validation attempts.

Quick evidence navigation links open Lakehouse, Notebook, dbt, Monitor, or Recovery without losing tutorial progress.

## Mission report

A JSON mission report can be exported with:

- case-study metadata;
- mode;
- mission summary;
- per-step concept, status, score, attempts, hint use, solution use, and latest validator evidence.

## Compatibility

All V5–V11 regression suites remain active. Power BI remains intentionally deferred.
