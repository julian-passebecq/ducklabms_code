# Power BI Learning Studio — V15 status

**V15 debug/improvement pass completed on 2026-09-17.**

## Release state

- Package version: **15.0.0**
- Guided cases: **5**
- Guided steps: **45**
- Decision scenarios: **12**
- Troubleshooting tickets: **8**
- DAX exercises: **16**
- Connector/source patterns: **23**
- Visual types: **20**

## V15 focus

1. Keep relationship diagram geometry tied to relationship identity after delete/reorder operations.
2. Render relationship endpoint markers from the real configured cardinality.
3. Clamp Power Query local selection after destructive query edits and select newly added queries deterministically.
4. Prevent Report, Performance Analyzer, Service, and the status bar from implying a loaded model when none exists.
5. Stop existing report visuals from rendering healthy sample values after the semantic model is removed.
6. Prune unknown persisted top-level and nested state keys during migration instead of carrying obsolete state forward.

## QA state

All dependency-independent V15 release gates pass after the final source changes. See `TEST_REPORT.md` and the final QA log.

A real `npm install --no-audit --no-fund` attempt exceeded the sandbox execution window. The lingering process was terminated and partial npm artifacts were removed. `vite build` was therefore not run, so a production browser bundle is not claimed in this environment. `BUILD_WINDOWS.cmd` remains the local full-build path.

## Product baseline

V15 introduces no new release-specific Microsoft Power BI claims. It preserves the Microsoft Learn baseline documented in `SOURCES.md` and concentrates on simulator correctness and regression hardening.
