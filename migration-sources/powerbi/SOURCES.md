# Source notes

The application separates durable Power BI concepts from release-specific behavior. Microsoft documentation remains authoritative when the product UI changes.

## Supplied learning source

- User-supplied MicrosoftLearning **PL-300 Microsoft Power BI Data Analyst** repository snapshot. The supplied labs cover Get Data, Power Query, semantic modeling, DAX/filter context/time intelligence, visual calculations, report design, drillthrough/bookmarks, analytics, RLS, dashboards, and refresh.

## Microsoft Learn references used for current behavior

- What's new in Power BI
  https://learn.microsoft.com/en-us/power-bi/fundamentals/whats-new
- Previous monthly Power BI updates
  https://learn.microsoft.com/en-us/power-bi/fundamentals/desktop-latest-update-archive
- Report View in Power BI Desktop
  https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-view
- Format pane
  https://learn.microsoft.com/en-us/power-bi/visuals/service-getting-started-with-color-formatting-and-axis-properties
- Report themes
  https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-themes
- On-object interaction
  https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-on-object-interaction
- Get data in Power BI Desktop
  https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-data-sources
- Power BI data connection documentation
  https://learn.microsoft.com/en-us/power-bi/connect-data/
- Scheduled refresh
  https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-scheduled-refresh
- Incremental refresh
  https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview
- Model relationships
  https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-relationships-understand
- Calculation options
  https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-calculations-options
- Visual calculations
  https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-visual-calculations-overview
- DAX user-defined functions
  https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-user-defined-functions-overview
- TMDL view
  https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-tmdl-view
- Accessibility guidance
  https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports
- Performance Analyzer
  https://learn.microsoft.com/en-us/power-bi/create-reports/performance-analyzer

- Standalone Copilot experience in Power BI (preview)
  https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-chat-with-data-standalone
- Use Copilot with semantic models
  https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-semantic-models

## Latest release baseline represented in the UI

V12 retains the product baseline reverified on 2026-09-17: the latest official Power BI monthly-update page available at that verification point was **August 2026**. V12 is a simulator correctness/state hardening pass and does not introduce unsupported newer release claims. The app represents, among other items:

- August 2026: modern visual defaults and Theme pane GA; date picker slicer GA; OneLake file URL support; granular semantic-model refresh controls; Direct Lake calculated columns preview; external-change/PBIP authoring improvements.
- July 2026: TMDL View on the web preview and continuing authoring improvements.
- June 2026: DAX user-defined functions GA.
- May 2026: visual calculations GA and newer Get Data experience work.
- March 2026: Direct Lake on OneLake GA.

Release-specific cards in the app are educational summaries. Use the linked Microsoft Learn pages for exact tenant/region/preview availability.

## V9 note — 2026-09-17

V9 adds no new release-specific Microsoft product assertions. The release is a simulator correctness/state-integrity pass; existing Microsoft Learn references and the previously verified monthly baseline remain unchanged.

## V10 note — 2026-09-17

V10 adds no new release-specific Microsoft product assertions. The pass strengthens simulator state migration, loaded-vs-staged Power Query semantics, refresh evidence, case-session reset/recovery, and governed release validation. Existing Microsoft Learn references and the previously verified monthly baseline remain unchanged.

## V11 note — 2026-09-17

V11 adds no new release-specific Microsoft product assertions. The pass focuses on staged Power Query deletion semantics, relationship identity/migration correctness, destructive relationship editing, and operational-state hardening. Existing Microsoft Learn references and the previously verified monthly baseline remain unchanged.


## V12 note — 2026-09-17

V12 adds no new release-specific Microsoft product assertions. The pass focuses on destructive relationship recovery, star-schema release consistency, loaded-model Data view behavior, refresh-strategy/storage compatibility, evidence freshness, and migration hardening. Existing Microsoft Learn references and the previously verified monthly baseline remain unchanged.

## V13 note — 2026-09-17

V13 adds no new release-specific Microsoft product assertions. It preserves the previously verified Power BI baseline and focuses on simulator semantics: loaded-vs-staged source identity, explicit Direct Lake architecture validation, loaded-model authoring boundaries, and a small TMDL measure-apply learning parser. Existing Microsoft Learn references remain unchanged.

## V14 source-note

V14 adds no new release-specific Microsoft Power BI claims. It changes simulator state behavior only: case navigation persistence, runtime semantic-object identity, Direct Lake learning guards, DAX Query `DEFINE MEASURE` state updates, and loaded-model Service connectivity. Existing Microsoft Learn references and the previously verified August 2026 baseline remain the source basis.
