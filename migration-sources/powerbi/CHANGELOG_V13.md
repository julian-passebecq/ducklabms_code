# Power BI Learning Studio V13 — 2026-09-17

V13 is a loaded-model semantics and authoring-truthfulness pass. It strengthens the distinction between staged Power Query state, a loaded semantic model, and a Direct Lake path, while making TMDL Apply perform a real simulator mutation.

## Loaded scenario identity now follows the loaded model

In free-play mode, staging a new source could previously change Report, Model, Service, and DAX scenario labels before Close & Apply. For example, merely adding OneLake could switch a still-loaded Sales model to Wind UI terminology.

V13 keeps scenario identity on the last applied source snapshot while Power Query changes are pending. The new scenario becomes active only when the source snapshot is loaded.

## Direct Lake is validated as architecture, not just wording

The Wind Operations case now has an explicit Direct Lake storage step. The curriculum increases from 44 to **45 guided steps**.

For a compatible OneLake source with no staged Power Query transformations, choosing Direct Lake now establishes the loaded semantic-model path without pretending that Power Query Close & Apply is required. If Power Query transformations are staged, V13 deliberately refuses to auto-apply them.

## Shared loaded-semantic-model boundary

A new shared `hasLoadedSemanticModel()` contract is used across authoring surfaces:

- Report visual creation is disabled until a semantic model is loaded;
- the Report Data pane shows no model fields before load;
- Model View shows an explicit no-model state and disables relationship/date authoring before load;
- DAX Apply/Run is disabled before load;
- TMDL Apply is disabled before load;
- staging deletion of the final query continues to preserve the last loaded model until Close & Apply commits the deletion.

This aligns Report/Model/DAX/TMDL behavior with the loaded-vs-staged rules already used by Data View and Service.

## TMDL Apply is now real simulator state

TMDL View previously said “Applied in simulator” without changing the workspace. V13 adds a deliberately small learning parser for TMDL measure declarations.

- Preview validates a supported `measure 'Name' = expression` declaration.
- Apply writes the parsed measure into semantic-model state.
- invalid/unsupported scripts are blocked with an explicit message.
- other TMDL metadata remains preview-only and is labeled as such.

Because applied TMDL measures enter the same measure state as DAX-authored measures, they also participate in performance-evidence signatures and model inspection.

## Regression additions

V13 adds direct tests for:

- staged source changes not switching loaded scenario identity;
- scenario change after Close & Apply;
- Direct Lake loading of a compatible OneLake path;
- refusal to auto-apply staged Power Query transformations when Direct Lake is selected;
- blank/staged/applied/final-deletion loaded-model boundaries;
- TMDL measure parsing and invalid-script rejection;
- the new explicit Direct Lake case-study validator.
