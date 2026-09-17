# V12 guided-learning and mastery architecture

## Goal

The product already had realistic authoring/runtime behavior. V12 makes the tutorial layer measurable and persistent so a learner can distinguish "I clicked through the case" from "I independently proved each step."

## State model

```text
TutorialProgress
├── caseStudyId
├── mode: Guided | Challenge
├── startedAt / updatedAt
└── steps[stepId]
    ├── attempts
    ├── failedAttempts
    ├── hintLevel 0..3
    ├── solutionRevealed
    ├── solutionApplied
    ├── validated
    ├── bestScore
    └── latest validation evidence
```

The state is persisted alongside pipeline nodes, runs, the executable workspace, and the notebook.

## Scoring

A step begins with 100 available points. Assistance and failed validations reduce the available score. Challenge mode applies larger deductions than Guided mode. A successful validation records the best score achieved for that step.

Scoring is intentionally a **learning heuristic**, not an exam or certification score.

## Hint design

The hint ladder is progressive:

- **L1** — concept and reasoning nudge;
- **L2** — direct configuration hint;
- **L3** — target configuration.

The full solution remains a separate action and is tracked independently from hints.

## Evidence loop

```text
Build/configure
    ↓
Validate
    ↓
record attempt + validator evidence
    ↓
inspect workspace / lineage / run output
    ↓
advance only after proof
```

The tutorial offers direct navigation to the surfaces where proof lives: Lakehouse, Notebook, dbt, Monitor, and Recovery.

## Migration

`normalizeTutorialProgress()` creates missing step records and ignores progress from the wrong case study. This allows V11 and older lab saves to load safely.

## Report export

`buildTutorialReport()` produces a serializable summary of mission-level and per-step evidence. The UI exports it as JSON so users can retain a record of practice attempts.
