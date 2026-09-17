# Source audit — 2026-09-16

This file is the release-time freshness record for the guide. It is intentionally explicit because some uploaded repositories are historical.

## Current certification blueprints

### DP-600 — Fabric Analytics Engineer Associate

Official study guide:
https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-600

Skills measured as of **2026-07-21**:

- Maintain a data analytics solution — 25–30%
- Prepare data — 45–50%
- Implement and manage semantic models — 25–30%

Official course:
https://learn.microsoft.com/en-us/training/courses/dp-600t00

- DP-600T00-A
- Implement analytics solutions using Microsoft Fabric
- 4 days
- Advanced

Mapped current self-paced learning paths:

- Explore analytics data stores in Microsoft Fabric
- Design and transform analytics data in Microsoft Fabric
- Design and manage semantic models in Microsoft Fabric
- Prepare AI-ready analytics data in Microsoft Fabric
- Secure and govern analytics data in Microsoft Fabric

The uploaded Fabric repository also contains newer AI-ready material including Fabric IQ / ontology-oriented labs. This is treated as current source material, not merged with older DP-500 content.

### DP-700 — Fabric Data Engineer Associate

Official study guide:
https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700

Skills measured as of **2026-07-21**:

- Implement and manage an analytics solution — 30–35%
- Ingest and transform data — 30–35%
- Monitor and optimize an analytics solution — 30–35%

Official course:
https://learn.microsoft.com/en-us/training/courses/dp-700t00

- DP-700T00-A
- Implement data engineering solutions using Microsoft Fabric
- 4 days
- Intermediate

Mapped current self-paced learning paths:

- Ingest data with Microsoft Fabric
- Implement a lakehouse with Microsoft Fabric
- Implement Real-Time Intelligence with Microsoft Fabric
- Implement a data warehouse with Microsoft Fabric
- Manage a Microsoft Fabric environment

### DP-750 — Azure Databricks Data Engineer Associate

Official study guide:
https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-750

Skills measured as of **2026-03-11**:

- Set up and configure an Azure Databricks environment — 15–20%
- Secure and govern Unity Catalog objects — 15–20%
- Prepare and process data — 30–35%
- Deploy and maintain data pipelines and workloads — 30–35%

Official course:
https://learn.microsoft.com/en-us/training/courses/dp-750t00

- DP-750T00-A
- Implement data engineering solutions using Azure Databricks
- 4 days
- Intermediate

Mapped current self-paced learning paths:

- Set up and configure an Azure Databricks environment
- Secure and govern data with Unity Catalog
- Prepare and process data with Azure Databricks
- Deploy and maintain data pipelines and workloads with Azure Databricks

### PL-300 — Power BI Data Analyst Associate

Official study guide:
https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300

Skills measured as of **2026-04-20**:

- Prepare the data — 25–30%
- Model the data — 25–30%
- Visualize and analyze the data — 25–30%
- Manage and secure Power BI — 15–20%

Official course:
https://learn.microsoft.com/en-us/training/courses/pl-300t00

- PL-300T00-A
- Design and manage analytics solutions using Power BI
- 3 days
- Intermediate

## Legacy / retirement handling

### DP-203

Exam retired **2025-03-31**.

Historical study guide:
https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-203

DP-203-era Azure architecture can still be useful as reference material, but it must not be represented as the current Microsoft data-engineering certification path.

### DP-500

DP-500 courseware/certification material is retired. The uploaded DP-500 labs are retained only as explicit legacy references for Synapse / enterprise Power BI patterns.

## Azure Data Factory positioning

Current ADF documentation:
https://learn.microsoft.com/en-us/azure/data-factory/introduction

Azure Data Factory remains a documented Azure PaaS integration/orchestration service. Microsoft documentation now identifies Fabric Data Factory as the next-generation data integration experience and directs new integration users toward Fabric Data Factory. The guide therefore:

- keeps ADF as its own Azure product tree;
- explains ADF linked services, datasets, activities, triggers, parameters, and Integration Runtime;
- does not pretend ADF and Fabric Data Factory are the same operational product;
- teaches both where existing Azure estates still require ADF knowledge.

## Fluent 2 implementation

Fluent UI React v9 is the React implementation used for Fluent 2:
https://react.fluentui.dev/

This source uses `@fluentui/react-components` and Fluent light/dark themes rather than cloning Microsoft Learn CSS.

## Uploaded repository classification

| Uploaded source | Classification in app | Notes |
|---|---|---|
| `mslearn-fabric-main.zip` | Current | DP-600 / DP-700 and newer Fabric labs |
| `DP-750T00-Implement-Data-Engineering-Solutions-using-Azure-Databricks-main.zip` | Current | Current DP-750 lab sequence |
| `PL-300-Microsoft-Power-BI-Data-Analyst-Main.zip` | Current | Current PL-300 labs/demos |
| `mslearn-databricks-main.zip` | Reference | Useful Databricks exercises, not used as certification truth |
| `dp-300-database-administrator-master.zip` | Current reference domain | Azure SQL lab material; separate from Fabric/Databricks certifications |
| `DP-500-Azure-Data-Analyst-main.zip` | Legacy | Retired certification/course context |
| `mslearn-data-concepts-main.zip` | Reference only | Foundation material; not used to override current product docs |
| `dp-data-main.zip` | Reference only | Foundation / historic exercises |
| `mslearn-sql-developer-main.zip` | Reference only | SQL learning material |
| `mslearn-databricks-ml-main.zip` | Reference only | ML-specific material, outside the initial data-engineering guide core |

## Release rule

A future release should not change a certification weight, retirement status, learning path, or product-positioning statement merely because an uploaded repository says so. Re-check Microsoft Learn first, then update the local content model and verification date.

## V3 follow-up verification — PL-300 self-paced paths

Rechecked on 2026-09-16 against current Microsoft Learn training pages and the PL-300 certification/course surfaces. The application now maps five current self-paced Power BI learning paths:

- `data-analytics-microsoft` — Get started with Microsoft data analytics — 4 modules.
- `prepare-data-power-bi` — Prepare data for analysis with Power BI — 3 modules.
- `model-data-power-bi` — Model data with Power BI — 6 modules.
- `power-bi-effective` — Design effective reports in Power BI — 4 modules.
- `manage-secure-power-bi` — Manage and secure Power BI — 5 modules.

The PL-300 repository labs do not consistently declare a course code in front matter. Certification mapping therefore also uses the trusted repository identity (`PL-300 Power BI labs`). The same normalization is applied to the DP-750 repository.
