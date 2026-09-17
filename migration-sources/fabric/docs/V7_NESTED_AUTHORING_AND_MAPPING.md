# V7 nested authoring and mapping architecture

## Nested activity storage

V6 stored nested children as a compact legacy string:

```text
Copy data|Notebook|Stored procedure
```

V7 uses a structured JSON string stored inside the existing primitive activity config model:

```json
[
  {"id":"nested-a","type":"copy","name":"Copy raw","x":80,"y":120},
  {"id":"nested-b","type":"notebook","name":"Clean silver","x":300,"y":120}
]
```

`parseNestedActivities()` accepts both formats. This avoids a breaking storage migration while enabling graph layout persistence.

## UI surfaces

Both of these write the same structured representation:

1. compact activity sequence inside Properties
2. full-screen `NestedActivityEditor`

The full-screen editor uses the shared XYFlow `LearningGraph`, so node movement/deletion and canvas interactions stay consistent with Pipeline, Eventstream, Mapping Data Flow, and Lakeflow surfaces.

## Copy Mapping model

Copy mappings are stored as JSON with:

- `autoMap`
- source name/type
- destination name/type
- stable row id

The editor accepts old `Auto map by name` and simple textual legacy mappings. Runtime diagnostics use the parsed representation to expose mapping metadata.

## Future depth

The next natural extension is to give each nested child its own full activity configuration rather than only name/type/position, then execute nested children individually in Debug and Monitoring. That should be done without allowing unsupported recursive container combinations.
