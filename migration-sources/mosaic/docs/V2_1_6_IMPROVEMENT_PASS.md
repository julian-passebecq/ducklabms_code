# V2.1.6 debug / improvement pass

## Scope

Notebook-first hardening with emphasis on Jupyter round-trip fidelity rather than new runtimes.

## Improvements

- Added direct `.ipynb` export alongside full Mosaic project JSON export.
- Preserved notebook/cell metadata, attachments and stable Jupyter cell IDs.
- Preserved raw saved-output payloads when imported from Jupyter.
- Edited Python/SQL/Markdown source exports correctly.
- Untouched SQL cells retain their original `%sql` / `%%sql` syntax.
- New Mosaic SQL cells export as `%%sql` code cells.
- Mosaic spatial view metadata is namespaced under `metadata.mosaic` and restored on re-import.
- Collapse state and remembered expanded height round-trip for represented notebook cells.
- `.ipynb` export is limited to the semantic Notebook document; project-only presentation blocks stay in Mosaic project JSON.
- Unsupported imported shell/IPython code is now actually read-only in the Mosaic UI while still exporting as its original code cell.
- Added clear UI distinction between **Export .ipynb** and **Export project**.

## Debug findings

The prior importer described unsupported code cells as read-only but still rendered them through an editable Markdown panel. V2.1.6 passes an explicit `readOnly` contract to that panel and starts it in preview mode.

A second boundary issue was addressed during export design: serializing every project code block into `.ipynb` would make dashboard/split-only experiments silently become notebook cells. The exporter now follows Notebook semantic order and only exports that document. The full project JSON remains the complete Mosaic representation.
