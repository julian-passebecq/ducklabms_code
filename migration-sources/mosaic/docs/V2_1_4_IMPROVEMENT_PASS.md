# V2.1.4 improvement / hardening pass

This pass stays notebook-first and focuses on project round-trips, Jupyter output fidelity, imported-cell integrity and Dashboard authoring.

## Implemented

### Mosaic project round-trip

- Added **Open project** for Mosaic JSON exports.
- Validates the project format before changing current state.
- Rejects duplicate block IDs and malformed projects.
- Filters stale/unknown block IDs from view layouts and block-state payloads.
- Clears incoming block IDs before restoring state, preventing an older deleted block with the same ID from leaking browser state into the imported project.
- Restores serialized results as row transport; it does not falsely recreate unavailable Arrow IPC bytes.
- Reattaches matching browser-local CSV/Parquet assets when OPFS fingerprints match the imported dataset metadata.

### Imported Jupyter integrity

- Deleting an imported code cell now also removes its saved Jupyter output child from the project.
- Removing that code cell from a view removes the grouped saved output from that view as well.
- Direct deletion of the saved-output block alone does not delete its source code cell.

### Richer saved outputs

- Added support for `application/vnd.dataresource+json`.
- Structured Jupyter data-resource outputs render as scrollable tables with row/column counts rather than raw JSON.
- Existing image/SVG/HTML/JSON/LaTeX/text/error handling remains intact.

### Dashboard authoring

- A pinned output can now be changed between **Half width** and **Full width** in Inspector.
- Full-width conversion relocates the tile to a clean row instead of overlapping existing dashboard content.
- Returning to half width uses the first-free dashboard slot algorithm.

## Regression coverage

Added `scripts/v214-hardening-test.mjs` covering project restore validation/sanitization, Jupyter group deletion, Dashboard width transitions, and structured data-resource output normalization.
