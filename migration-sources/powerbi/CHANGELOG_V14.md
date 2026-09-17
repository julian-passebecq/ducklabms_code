# Power BI Learning Studio — V14 changelog

**Date:** 2026-09-17

## Debug / improvement focus

V14 is a state-integrity and authoring-truthfulness pass on top of V13.

### Case-study resume cursor

- Added project-scoped persisted guided-step positions.
- Switching case studies resumes both workspace state and the last step.
- Restart this case clears that project's workspace and step position only.
- Global Reset lab state clears every case workspace and every case step cursor.
- If global reset happens while Case Studies is open, the active case cursor is reset instead of re-saving a stale step.
- Persisted step positions are clamped if a future release changes case length.
- Malformed progress storage is sanitized without losing valid project entries.

### Runtime semantic-object identity

- Added case-insensitive runtime measure upsert.
- Added case-insensitive DAX-object upsert by `type + name`.
- Replacing an object no longer temporarily creates duplicate identities until reload.
- TMDL Apply and normal DAX authoring now share the same hardened runtime write path.

### DAX authoring truthfulness

- Direct Lake calculated-column preview objects are blocked unless the loaded model is actually Direct Lake on a compatible OneLake source.
- Added a structural DAX Query `DEFINE MEASURE` parser.
- The Query tab now includes a `DEFINE MEASURE` learning example.
- **Update model** now persists the parsed measure into the simulated semantic model.
- Update model explicitly blocks queries that contain no supported `DEFINE MEASURE` declaration.

### Loaded-model Service connectivity

- Added loaded-model connectivity evaluation separate from staged Power Query source state.
- A first source staged in Power Query no longer makes Service connectivity appear Ready.
- After Close & Apply, Service connectivity reflects the loaded source path.
- Staging an additional private source does not overwrite the connectivity interpretation of the still-loaded model.

## Regression additions

Behavior tests now protect:

- case-specific last-step resume, clamping, project restart, malformed progress recovery, and global reset;
- case-insensitive runtime measure/DAX identity upserts;
- Direct Lake calculated-column compatibility;
- DAX Query `DEFINE MEASURE` parsing / Update model blocking;
- loaded-vs-staged Service connectivity.

All 5 cases / 45 sequential steps remain satisfiable.
