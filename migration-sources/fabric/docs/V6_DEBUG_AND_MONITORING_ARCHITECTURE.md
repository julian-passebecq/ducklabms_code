# V6 Debug and Monitoring architecture

## Pipeline definition

```text
Pipeline
├── parameters
├── variables
├── trigger definition
├── activities
│   ├── activity-specific settings
│   └── common policy
└── dependency edges
```

Activity-specific settings remain separate from policy. Policy contains timeout, retry, retry interval, secure input/output and simulated failure.

## Expression context

Dynamic content is evaluated against a shared runtime context:

```text
ExpressionContext
├── runtime pipeline parameters
├── current variables
├── full activity graph
└── current ForEach item (when applicable)
```

V6 validates references to parameters, variables and activities before Debug, including expressions nested inside JSON parameter mappings.

## Execution model

The simulator remains deterministic and cloud-free:

1. validate graph and activity configuration
2. validate dynamic-content references
3. calculate dependency outcome plan
4. assign final activity states
5. derive retry attempts
6. calculate activity durations
7. calculate dependency-aware start offsets
8. produce activity diagnostics and metrics
9. derive critical-path pipeline duration
10. persist the run to Monitoring

Parallel root activities therefore share start offset `0`, while dependent activities begin after their longest incoming dependency path.

## Trigger simulation

Trigger definitions produce an execution label and can override pipeline parameter defaults for a test run. They do not create cloud schedules.

Fabric learning modes:
- Fixed schedule
- Interval schedule
- Event

ADF learning modes:
- Schedule
- Tumbling window
- Event

## Monitoring model

Each `PipelineRunActivity` stores:

- node id/name/type
- status
- duration
- start offset
- attempts
- input/output/error
- metrics
- secure input/output flags

This data drives both list diagnostics and Gantt visualization.

## Deliberate simulation boundary

The app teaches product concepts and authoring behavior. It does not attempt to run real Fabric/ADF cloud pipelines. MotherDuck remains an optional real SQL data path for local learning, while orchestration itself is deterministic and simulated.
