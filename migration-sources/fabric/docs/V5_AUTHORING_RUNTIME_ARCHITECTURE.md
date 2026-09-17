# V5 authoring/runtime architecture

## Objective

V5 closes the gap between a movable pipeline diagram and a useful Data Factory learning simulator. The main additions are runtime inputs/state, dynamic expressions, container activities and execution diagnostics.

## Data flow

```text
Pipeline parameter defaults
        |
        +---- Debug runtime overrides
        |             |
        v             v
      ExpressionContext <---- Pipeline variables (default/current)
        |                             ^
        |                             |
        +--> activity configuration   +---- Set Variable / Append Variable
        |
        +--> ForEach items
        +--> If / Until expression
        +--> activity-output references
```

## Expression engine

`src/lib/expressions.ts` is intentionally small and deterministic. It does not attempt to reimplement the entire Azure/Fabric expression language. It provides enough semantics for learning exercises and validates references before Debug.

Current recognized forms:

- pipeline parameters
- pipeline variables
- activity output value / firstRow
- item()
- utcNow()
- greater()
- equals()
- concat()

## Variable runtime

`applyVariableActivities()` runs after the dependency-aware debug plan is resolved. Only activities whose final state is `Succeeded` mutate variables.

- Set Variable replaces `currentValue`.
- Append Variable parses the existing Array value, appends the evaluated value, and serializes it back.
- Append Variable is rejected unless the selected variable type is Array.

## Copy activity model

The Copy properties pane is split by authoring concern:

```text
Copy
├── Source
│   ├── dataset/connection
│   ├── query
│   └── format
├── Sink
│   ├── destination
│   ├── format
│   ├── write behavior
│   └── pre-copy script
├── Mapping
│   └── column mappings
└── Settings
    ├── parallel copies
    ├── timeout
    └── retry
```

## Container activities

ForEach, If Condition and Until store deterministic child-activity sequences in the node configuration. The parent pipeline remains a DAG while the nested sequence is rendered in a compact child canvas in the properties pane.

This is deliberately simpler than recursive XYFlow graphs; a later pass can promote nested containers to dedicated editable sub-canvases if needed.

## Monitoring Gantt

Each run renders activity-duration bars on a normalized horizontal timeline. The V5 Gantt is educational rather than a performance profiler: it makes order, duration and status visible while keeping deterministic sequential timing from the simulator.

## Product alignment checked in this pass

Current Microsoft documentation was checked for:

- Fabric Set Variable activity
- Fabric Until activity
- Azure Data Factory Append Variable activity
- Fabric pipeline REST definitions for SetVariable / AppendVariable

The simulator remains a learning approximation, not a byte-for-byte reproduction of Microsoft cloud runtime behavior.
