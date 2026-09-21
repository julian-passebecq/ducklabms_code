# Notebook interoperability and layout contract

## Existing capability to preserve

Datapass already has meaningful Jupyter interoperability, not a placeholder.

Import supports:

- nbformat 4;
- markdown, raw and code cells;
- cell identity/metadata;
- execution counts;
- markdown attachments;
- saved Jupyter outputs;
- SQL detection/magic stripping for supported SQL cells;
- Python/SQL execution when the corresponding local runtime is available;
- unsupported code retained read-only.

Export writes nbformat 4.5 and preserves Datapass-specific view information under a safe `metadata.mosaic` namespace.

## Generated views

The same imported notebook can be shown as:

- Notebook;
- Two-page;
- Code + explanation;
- 2 + 1;
- Dashboard;
- Free canvas.

These are views of one canonical document.

## Runtime-label rule

Import metadata should remain runtime-neutral. An imported Python cell is a Python cell; whether trusted local CPython is enabled is a runtime capability, not a property of the `.ipynb` file.

Therefore remove the stale `Pyodide` import subtitle in the root notebook core.

## Deepnote

V1 supports Deepnote interchange through `.ipynb`. Direct `.deepnote` parsing is optional later and must not delay V1.

## Continuous spread — useful later, not a current blocker

A future linked two-column/spread mode can show two synchronized viewports over one notebook sequence. It must not create two independent editors or duplicate cells.

Conceptually:

```text
canonical notebook sequence
        ↓
viewport A starts at cell N
viewport B continues after visible range of A
```

Implement only after native M2/workspace resource consolidation is stable.
