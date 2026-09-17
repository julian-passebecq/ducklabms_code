# V2.1.5 debug / improvement pass

This pass remains notebook-first and focuses on project/import resilience.

## Fixes

- removed a duplicated imported-notebook title in the Project explorer;
- project JSON restore now rejects unknown panel types and duplicate view IDs;
- visible block IDs and layout entries are deduplicated during restore;
- malformed React Grid Layout geometry is clamped to safe 12-column coordinates;
- visible blocks missing geometry are recovered at the bottom of the view rather than disappearing;
- missing default layouts are reconstructed from sanitized geometry;
- stale/unknown layout references remain filtered;
- Jupyter saved-output grouping now follows the declared parent cell ID rather than blindly attaching to the previous block.

## Why this matters

Mosaic project JSON is user-controlled input. A project that passes a loose JSON shape check can still contain duplicate grid IDs, NaN/negative geometry or unknown block types that destabilize the workspace. V2.1.5 sanitizes that boundary before state reaches React Grid Layout.

## Build environment

`npm install` was attempted again but did not complete within the available network timeout. Partial dependency artifacts were removed before packaging.
