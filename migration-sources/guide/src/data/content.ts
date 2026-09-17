export type Platform = 'Fabric' | 'Azure' | 'Azure Databricks' | 'Power BI' | 'Shared'
export type Freshness = 'current' | 'reference' | 'legacy'

export type Concept = {
  id: string
  platform: Platform
  area: string
  title: string
  short: string
  definition: string
  mentalModel: string
  useWhen: string[]
  avoidWhen?: string[]
  compare?: string[]
  examRefs: string[]
  code?: string[]
  labKeywords?: string[]
  status?: Freshness
}


export type DecisionGuide = {
  id: string
  title: string
  question: string
  summary: string
  examRefs: string[]
  options: {
    conceptId: string
    label: string
    bestFor: string
    watchFor: string
    signal: string
  }[]
  ruleOfThumb: string
}

export type Snippet = {
  id: string
  language: string
  title: string
  conceptIds: string[]
  note: string
  code: string
}

export type Exam = {
  code: string
  title: string
  role: string
  platform: string
  status: Freshness
  verified: string
  skillsAsOf: string
  sourceUrl: string
  summary: string
  instructorCourse?: { code: string; title: string; duration: string; level: string; url: string }
  skills: { name: string; weight: string; detail: string[] }[]
}

export type LearningPath = {
  title: string
  modules: number
  level: string
  role: string
  summary: string
  url: string
  certification: string[]
}

export const exams: Exam[] = [
  {
    code: 'DP-600',
    title: 'Fabric Analytics Engineer Associate',
    role: 'Analytics Engineer',
    platform: 'Microsoft Fabric',
    status: 'current',
    verified: '2026-09-16',
    skillsAsOf: '2026-07-21',
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-600',
    summary: 'Design, create, secure, and maintain enterprise analytics assets in Fabric, with a strong emphasis on data preparation and semantic models.',
    instructorCourse: { code: 'DP-600T00-A', title: 'Implement analytics solutions using Microsoft Fabric', duration: '4 days', level: 'Advanced', url: 'https://learn.microsoft.com/en-us/training/courses/dp-600t00' },
    skills: [
      { name: 'Maintain a data analytics solution', weight: '25–30%', detail: ['Security and governance', 'Git / PBIP / deployment pipelines', 'Impact analysis and XMLA lifecycle'] },
      { name: 'Prepare data', weight: '45–50%', detail: ['OneLake discovery and ingestion', 'SQL/KQL/DAX querying', 'Transformations and dimensional modeling'] },
      { name: 'Implement and manage semantic models', weight: '25–30%', detail: ['Storage modes and Direct Lake', 'Advanced DAX and calculation groups', 'Enterprise model performance'] },
    ],
  },
  {
    code: 'DP-700',
    title: 'Fabric Data Engineer Associate',
    role: 'Data Engineer',
    platform: 'Microsoft Fabric',
    status: 'current',
    verified: '2026-09-16',
    skillsAsOf: '2026-07-21',
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700',
    summary: 'Build and operate Fabric data engineering solutions across ingestion, transformation, orchestration, security, streaming, monitoring, and optimization.',
    instructorCourse: { code: 'DP-700T00-A', title: 'Implement data engineering solutions using Microsoft Fabric', duration: '4 days', level: 'Intermediate', url: 'https://learn.microsoft.com/en-us/training/courses/dp-700t00' },
    skills: [
      { name: 'Implement and manage an analytics solution', weight: '30–35%', detail: ['Workspace settings', 'Lifecycle and governance', 'Pipelines, notebooks, schedules and triggers'] },
      { name: 'Ingest and transform data', weight: '30–35%', detail: ['Batch and incremental loads', 'Dataflows Gen2 / PySpark / SQL / KQL', 'Streaming and Eventstreams'] },
      { name: 'Monitor and optimize an analytics solution', weight: '30–35%', detail: ['Monitor ingestion and transformations', 'Troubleshoot Fabric items', 'Optimize performance and reliability'] },
    ],
  },
  {
    code: 'DP-750',
    title: 'Azure Databricks Data Engineer Associate',
    role: 'Data Engineer',
    platform: 'Azure Databricks',
    status: 'current',
    verified: '2026-09-16',
    skillsAsOf: '2026-03-11',
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-750',
    summary: 'Azure Databricks data engineering: compute, Unity Catalog, ingestion, transformation, data quality, Lakeflow, SDLC, monitoring, and optimization.',
    instructorCourse: { code: 'DP-750T00-A', title: 'Implement data engineering solutions using Azure Databricks', duration: '4 days', level: 'Intermediate', url: 'https://learn.microsoft.com/en-us/training/courses/dp-750t00' },
    skills: [
      { name: 'Set up and configure an Azure Databricks environment', weight: '15–20%', detail: ['Compute types and performance settings', 'Catalogs, schemas, volumes and tables', 'Genie instructions for data discovery'] },
      { name: 'Secure and govern Unity Catalog objects', weight: '15–20%', detail: ['Privileges, RLS and column controls', 'ABAC, masks, lineage and audit', 'Delta Sharing and identity'] },
      { name: 'Prepare and process data', weight: '30–35%', detail: ['Modeling and ingestion choices', 'Lakeflow Connect, SQL, notebooks and streaming', 'Quality rules and schema drift'] },
      { name: 'Deploy and maintain pipelines and workloads', weight: '30–35%', detail: ['Lakeflow Jobs and declarative pipelines', 'Asset Bundles and testing', 'Spark troubleshooting and Delta optimization'] },
    ],
  },
  {
    code: 'PL-300',
    title: 'Power BI Data Analyst Associate',
    role: 'Data Analyst',
    platform: 'Power BI',
    status: 'current',
    verified: '2026-09-16',
    skillsAsOf: '2026-04-20',
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300',
    summary: 'Prepare, model, visualize, analyze, manage, and secure data with Power BI.',
    instructorCourse: { code: 'PL-300T00-A', title: 'Design and manage analytics solutions using Power BI', duration: '3 days', level: 'Intermediate', url: 'https://learn.microsoft.com/en-us/training/courses/pl-300t00' },
    skills: [
      { name: 'Prepare the data', weight: '25–30%', detail: ['Connect and profile data', 'Power Query transformations', 'Data quality and loading'] },
      { name: 'Model the data', weight: '25–30%', detail: ['Relationships and star schema', 'DAX calculations', 'Model performance'] },
      { name: 'Visualize and analyze the data', weight: '25–30%', detail: ['Reports and interactions', 'Analytics and storytelling', 'Usability and Copilot-assisted reporting'] },
      { name: 'Manage and secure Power BI', weight: '15–20%', detail: ['Workspaces and assets', 'Refresh and distribution', 'RLS and governance'] },
    ],
  },
  {
    code: 'DP-203',
    title: 'Azure Data Engineer Associate',
    role: 'Data Engineer',
    platform: 'Azure',
    status: 'legacy',
    verified: '2026-09-16',
    skillsAsOf: 'Retired 2025-03-31',
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-203',
    summary: 'Retired certification. Keep its labs only as Azure architecture references; use DP-700 for the current Fabric data-engineering certification path.',
    skills: [],
  },
  {
    code: 'DP-500',
    title: 'Azure Enterprise Data Analyst Associate',
    role: 'Data Analyst',
    platform: 'Azure + Power BI',
    status: 'legacy',
    verified: '2026-09-16',
    skillsAsOf: 'Course retired 2024-04-30',
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-enterprise-data-analyst-associate/renew/',
    summary: 'Retired certification/course. Useful labs remain as historical references for Synapse and enterprise Power BI patterns, but should not drive current exam study.',
    skills: [],
  },
]

export const learningPaths: LearningPath[] = [
  {
    title: 'Explore analytics data stores in Microsoft Fabric', modules: 5, level: 'Beginner', role: 'Data Analyst · Data Engineer', certification: ['DP-600'],
    summary: 'OneLake, lakehouses, warehouses, eventhouses, and choosing the right analytical store.',
    url: 'https://learn.microsoft.com/en-us/training/paths/explore-analytics-data-stores/'
  },
  {
    title: 'Design and transform analytics data in Microsoft Fabric', modules: 5, level: 'Intermediate', role: 'Data Analyst · Data Engineer', certification: ['DP-600'],
    summary: 'Dimensional design and transformations with Dataflows Gen2, notebooks, Spark, and T-SQL.',
    url: 'https://learn.microsoft.com/en-us/training/paths/design-transform-analytics-data/'
  },
  {
    title: 'Design and manage semantic models in Microsoft Fabric', modules: 5, level: 'Intermediate', role: 'Data Analyst', certification: ['DP-600'],
    summary: 'DAX, scale, performance, model security, and semantic-model lifecycle management.',
    url: 'https://learn.microsoft.com/en-us/training/paths/design-manage-semantic-models-fabric/'
  },
  {
    title: 'Prepare AI-ready analytics data in Microsoft Fabric', modules: 3, level: 'Intermediate', role: 'Data Analyst · Data Engineer', certification: ['DP-600'],
    summary: 'Prepare semantic models for AI, understand Fabric IQ, and build ontologies for agent consumption.',
    url: 'https://learn.microsoft.com/en-us/training/paths/prepare-ai-ready-analytics-data/'
  },
  {
    title: 'Secure and govern analytics data in Microsoft Fabric', modules: 3, level: 'Intermediate', role: 'Data Analyst · Data Engineer', certification: ['DP-600'],
    summary: 'Workspace/item/OneLake access, warehouse security, classification, endorsement, and governance.',
    url: 'https://learn.microsoft.com/en-us/training/paths/secure-govern-analytics-data/'
  },
  {
    title: 'Ingest data with Microsoft Fabric', modules: 4, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-700'],
    summary: 'Core ingestion patterns for Fabric Data Engineering and DP-700.',
    url: 'https://learn.microsoft.com/en-us/training/paths/ingest-data-with-microsoft-fabric/'
  },
  {
    title: 'Implement a lakehouse with Microsoft Fabric', modules: 7, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-700'],
    summary: 'Lakehouse storage, Spark, Delta Lake, transformations, ingestion, and orchestration.',
    url: 'https://learn.microsoft.com/en-us/training/paths/implement-lakehouse-microsoft-fabric/'
  },
  {
    title: 'Implement Real-Time Intelligence with Microsoft Fabric', modules: 5, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-700'],
    summary: 'Eventstreams, Eventhouse, KQL, real-time dashboards, and streaming-oriented analytical patterns.',
    url: 'https://learn.microsoft.com/en-us/training/paths/explore-real-time-analytics-microsoft-fabric/'
  },
  {
    title: 'Implement a data warehouse with Microsoft Fabric', modules: 7, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-700'],
    summary: 'Warehouse design, ingestion, T-SQL transformation, dimensional modeling, loading, security, and monitoring.',
    url: 'https://learn.microsoft.com/en-us/training/paths/work-with-data-warehouses-using-microsoft-fabric/'
  },
  {
    title: 'Manage a Microsoft Fabric environment', modules: 4, level: 'Intermediate', role: 'Data Engineer · Administrator', certification: ['DP-700'],
    summary: 'Workspace administration, governance, lifecycle, security, and operational management for Fabric solutions.',
    url: 'https://learn.microsoft.com/en-us/training/paths/manage-microsoft-fabric-environment/'
  },
  {
    title: 'Set up and configure an Azure Databricks environment', modules: 5, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-750'],
    summary: 'Workspace architecture, compute, integrations, data organization, and Unity Catalog foundations.',
    url: 'https://learn.microsoft.com/en-us/training/paths/azure-databricks-data-engineer-set-up-configure-environment/'
  },
  {
    title: 'Secure and govern data with Unity Catalog', modules: 2, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-750'],
    summary: 'Unity Catalog privileges, access controls, lineage, sharing, and governed data-product patterns.',
    url: 'https://learn.microsoft.com/en-us/training/paths/azure-databricks-data-engineer-secure-govern-unity-catalog/'
  },
  {
    title: 'Prepare and process data with Azure Databricks', modules: 4, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-750'],
    summary: 'Data modeling, ingestion, transformations, data quality, and lakehouse engineering with Unity Catalog.',
    url: 'https://learn.microsoft.com/en-us/training/paths/azure-databricks-data-engineer-prepare-process-data/'
  },
  {
    title: 'Deploy and maintain data pipelines and workloads with Azure Databricks', modules: 4, level: 'Intermediate', role: 'Data Engineer', certification: ['DP-750'],
    summary: 'Lakeflow pipelines/jobs, orchestration, Git, Asset Bundles, monitoring, and optimization.',
    url: 'https://learn.microsoft.com/en-us/training/paths/azure-databricks-data-engineer-deploy-maintain-data-pipelines-workloads/'
  },
  {
    title: 'Get started with Microsoft data analytics', modules: 4, level: 'Intermediate', role: 'Data Analyst', certification: ['PL-300'],
    summary: 'Data analytics roles, Power BI foundations, end-to-end Fabric analytics, and Copilot-assisted Power BI workflows.',
    url: 'https://learn.microsoft.com/en-us/training/paths/data-analytics-microsoft/'
  },
  {
    title: 'Prepare data for analysis with Power BI', modules: 3, level: 'Intermediate', role: 'Data Analyst', certification: ['PL-300'],
    summary: 'Connect, profile, clean, transform, and load data with Power Query while choosing appropriate model connectivity.',
    url: 'https://learn.microsoft.com/en-us/training/paths/prepare-data-power-bi/'
  },
  {
    title: 'Model data with Power BI', modules: 6, level: 'Intermediate', role: 'Data Analyst', certification: ['PL-300'],
    summary: 'Semantic model design, relationships, DAX calculations, time intelligence, and performance optimization.',
    url: 'https://learn.microsoft.com/en-us/training/paths/model-data-power-bi/'
  },
  {
    title: 'Design effective reports in Power BI', modules: 4, level: 'Intermediate', role: 'Data Analyst · Business Analyst', certification: ['PL-300'],
    summary: 'Report requirements, visual design, user experience, storytelling, and analytical techniques in Power BI.',
    url: 'https://learn.microsoft.com/en-us/training/paths/power-bi-effective/'
  },
  {
    title: 'Manage and secure Power BI', modules: 5, level: 'Intermediate', role: 'Data Analyst', certification: ['PL-300'],
    summary: 'Workspaces, distribution, refresh, governance, and security for managed Power BI content.',
    url: 'https://learn.microsoft.com/en-us/training/paths/manage-secure-power-bi/'
  },
]


export const decisionGuides: DecisionGuide[] = [
  {
    id: 'fabric-store',
    title: 'Lakehouse vs Warehouse vs Eventhouse',
    question: 'Which Fabric analytical store should I choose?',
    summary: 'Start from the dominant workload: open-file/Spark engineering, relational SQL analytics, or high-volume event/time-series analysis.',
    examRefs: ['DP-600', 'DP-700'],
    options: [
      { conceptId: 'lakehouse', label: 'Fabric Lakehouse', bestFor: 'Open-format engineering, Spark, Delta tables, files, and medallion-style pipelines.', watchFor: 'Do not choose it only because “lakehouse” sounds modern; SQL-first teams may be better served by Warehouse.', signal: 'Files + Delta + Spark are first-class.' },
      { conceptId: 'warehouse', label: 'Fabric Warehouse', bestFor: 'Relational analytics, dimensional models, T-SQL development, and SQL-first BI teams.', watchFor: 'It is not the default answer when raw files and Spark transformations dominate the workload.', signal: 'T-SQL + relational modeling are first-class.' },
      { conceptId: 'eventhouse', label: 'Eventhouse', bestFor: 'Telemetry, logs, IoT, clickstreams, time-series, and low-latency event analytics with KQL.', watchFor: 'Do not use it as a generic replacement for a lakehouse or warehouse.', signal: 'Fast event ingestion + KQL exploration.' },
    ],
    ruleOfThumb: 'Choose the engine that matches the dominant access pattern; OneLake lets the wider Fabric estate remain connected without forcing every workload into one store.'
  },
  {
    id: 'fabric-transform',
    title: 'Pipeline vs Dataflow Gen2 vs Notebook',
    question: 'Where should Fabric transformation and orchestration logic live?',
    summary: 'Separate orchestration from transformation. Pipelines coordinate work; Dataflow Gen2 handles Power Query-shaped transformations; notebooks handle code-first Spark/Python logic.',
    examRefs: ['DP-600', 'DP-700'],
    options: [
      { conceptId: 'fabric-pipeline', label: 'Fabric pipeline', bestFor: 'Copy activity, dependencies, parameters, retries, schedules, triggers, and cross-step orchestration.', watchFor: 'A pipeline should not become a hiding place for complex transformation logic.', signal: 'The main question is “what runs when?”' },
      { conceptId: 'dataflow-gen2', label: 'Dataflow Gen2', bestFor: 'Low-code tabular shaping with Power Query and analyst-friendly reusable transformations.', watchFor: 'Large Spark-native or highly programmatic workloads are usually better in notebooks.', signal: 'The transformation maps naturally to Power Query steps.' },
      { conceptId: 'fabric-notebook', label: 'Fabric notebook', bestFor: 'PySpark, Spark SQL, Python, reusable engineering code, complex data logic, and experimentation.', watchFor: 'Notebook code still needs orchestration, observability, and production discipline around it.', signal: 'The main question is “what code transforms the data?”' },
    ],
    ruleOfThumb: 'Use pipelines to orchestrate, Dataflow Gen2 for Power Query-shaped low-code work, and notebooks for code-first engineering.'
  },
  {
    id: 'integration-platform',
    title: 'Fabric Data Factory vs Azure Data Factory vs Databricks ingestion',
    question: 'Which integration/orchestration surface belongs in the architecture?',
    summary: 'The right choice depends on the platform boundary. Fabric Data Factory is Fabric-native, Azure Data Factory remains Azure PaaS integration/orchestration, and Databricks ingestion is strongest when the target operating model is the Databricks lakehouse.',
    examRefs: ['DP-700', 'DP-750'],
    options: [
      { conceptId: 'fabric-pipeline', label: 'Fabric Data Factory', bestFor: 'Fabric-native ingestion and orchestration around OneLake, Fabric items, notebooks, and Dataflows Gen2.', watchFor: 'Do not assume every existing Azure integration workload must move simply because Fabric exists.', signal: 'The analytics estate is centered on Fabric.' },
      { conceptId: 'adf', label: 'Azure Data Factory', bestFor: 'Azure PaaS integration, hybrid connectivity, existing ADF estates, and orchestration across Azure/external systems.', watchFor: 'For new Fabric-centric analytics solutions, compare against Fabric Data Factory instead of defaulting to ADF from habit.', signal: 'The architecture is composable Azure rather than Fabric SaaS.' },
      { conceptId: 'lakeflow-connect', label: 'Lakeflow / Auto Loader', bestFor: 'Managed ingestion into a Databricks lakehouse, incremental file ingestion, streaming, and Unity Catalog-governed pipelines.', watchFor: 'Databricks ingestion is not a generic substitute for every enterprise integration/orchestration requirement.', signal: 'The operational center of gravity is Databricks.' },
    ],
    ruleOfThumb: 'Pick the orchestration plane that matches the system you operate day to day; cross-platform integration is possible, but operational ownership should stay explicit.'
  },
  {
    id: 'governance-boundary',
    title: 'Fabric governance vs Azure identity vs Unity Catalog',
    question: 'Where does governance actually live?',
    summary: 'Governance is layered. Identity comes from Microsoft Entra ID, Fabric applies workspace/item/OneLake controls, and Databricks Unity Catalog governs Databricks data and AI assets.',
    examRefs: ['DP-600', 'DP-700', 'DP-750'],
    options: [
      { conceptId: 'entra', label: 'Microsoft Entra ID', bestFor: 'Users, groups, service principals, managed identities, authentication, and identity lifecycle.', watchFor: 'Identity is necessary but does not replace data-object authorization inside Fabric or Databricks.', signal: 'The question is “who or what is this principal?”' },
      { conceptId: 'onelake', label: 'Fabric / OneLake controls', bestFor: 'Fabric workspace and item boundaries, OneLake data access, and Fabric-native governance workflows.', watchFor: 'Workspace membership, item permissions, and data-level security solve different layers of access.', signal: 'The governed asset is a Fabric item or OneLake data.' },
      { conceptId: 'unity-catalog', label: 'Unity Catalog', bestFor: 'Central Databricks permissions, lineage, catalogs/schemas/tables, volumes, sharing, and governed data/AI assets.', watchFor: 'It does not replace Azure identity; it consumes identities and applies Databricks authorization/governance.', signal: 'The governed asset is inside the Databricks control/data plane.' },
    ],
    ruleOfThumb: 'Think identity first, then platform authorization, then data-object governance. Avoid treating those three layers as interchangeable.'
  },
]

export const concepts: Concept[] = [
  {
    id: 'onelake', platform: 'Fabric', area: 'Storage & architecture', title: 'OneLake', short: 'Tenant-wide logical data lake for Fabric.',
    definition: 'OneLake is the unified logical storage layer for Microsoft Fabric. Fabric items such as lakehouses and warehouses expose data through the same OneLake foundation, reducing the need to create separate data-lake silos.',
    mentalModel: 'Think “OneDrive for enterprise analytics data”: one logical lake, many workspaces and analytical experiences.',
    useWhen: ['You want a shared storage foundation across Fabric workloads', 'You need shortcuts instead of copying data', 'You want discovery through the OneLake catalog'],
    compare: ['ADLS Gen2 is the Azure storage service; OneLake is Fabric’s SaaS data-lake layer.', 'A workspace is an organizational/security boundary, not the storage technology itself.'],
    examRefs: ['DP-600 · prepare data', 'DP-700 · workspace / security / ingestion'], labKeywords: ['OneLake', 'lakehouse', 'shortcut']
  },
  {
    id: 'shortcut', platform: 'Fabric', area: 'Storage & architecture', title: 'OneLake shortcut', short: 'Virtual reference to data without copying it.',
    definition: 'A OneLake shortcut makes data stored elsewhere appear in OneLake paths so Fabric engines can work with it without a conventional copy operation.',
    mentalModel: 'A governed pointer, not another ETL duplicate.',
    useWhen: ['Data already exists in another supported location', 'You want faster onboarding and less duplication', 'Multiple workloads should share the same source data'],
    avoidWhen: ['You need an isolated physical copy for compliance, transformation, or performance reasons'],
    examRefs: ['DP-600 · get data', 'DP-700 · batch ingestion / Real-Time Intelligence'], labKeywords: ['shortcut']
  },
  {
    id: 'lakehouse', platform: 'Fabric', area: 'Storage & architecture', title: 'Fabric Lakehouse', short: 'Data-lake storage with table semantics and SQL/Spark access.',
    definition: 'A Fabric lakehouse combines OneLake file storage with managed Delta tables and analytical access through Spark and a SQL analytics endpoint.',
    mentalModel: 'Files + Delta tables + Spark + SQL, managed as one Fabric item.',
    useWhen: ['Engineering teams need Spark and open table formats', 'Raw and curated files coexist with structured tables', 'You want medallion-style transformations'],
    compare: ['Warehouse is SQL-first and relational-first.', 'Lakehouse is file/open-format and Spark-friendly.'],
    examRefs: ['DP-600 · choose data stores', 'DP-700 · lakehouse / transformations'], code: ['pyspark-medallion', 'sql-delta-merge'], labKeywords: ['lakehouse', 'delta']
  },
  {
    id: 'warehouse', platform: 'Fabric', area: 'Storage & architecture', title: 'Fabric Warehouse', short: 'SQL-first analytical warehouse in Fabric.',
    definition: 'Fabric Warehouse provides a relational analytics experience with T-SQL, dimensional modeling, security, and a managed Fabric SaaS operational model.',
    mentalModel: 'A Fabric-native analytical warehouse for teams that want SQL-first modeling and consumption.',
    useWhen: ['The workload is strongly relational and T-SQL oriented', 'BI teams expect dimensional schemas and warehouse semantics', 'SQL security and stored-programming patterns matter'],
    compare: ['Lakehouse is better when Spark/files are first-class.', 'SQL database in Fabric is oriented toward operational/transactional application patterns rather than only analytics.'],
    examRefs: ['DP-600 · prepare data', 'DP-700 · data warehouse'], code: ['sql-star-schema'], labKeywords: ['warehouse']
  },
  {
    id: 'eventhouse', platform: 'Fabric', area: 'Real-Time Intelligence', title: 'Eventhouse', short: 'Real-time analytical store optimized for event data and KQL.',
    definition: 'Eventhouse is the Real-Time Intelligence storage and analytics experience for high-volume event, telemetry, time-series, and log-style data, commonly queried with KQL.',
    mentalModel: 'Fast event analytics + KQL + streaming-oriented storage.',
    useWhen: ['Telemetry, logs, IoT or clickstreams arrive continuously', 'Low-latency exploration is important', 'KQL is the natural query language'],
    compare: ['Warehouse is relational analytics.', 'Lakehouse is broad file/table engineering.', 'Eventhouse is optimized for data in motion and event analytics.'],
    examRefs: ['DP-600 · OneLake/Eventhouse querying', 'DP-700 · streaming and monitoring'], code: ['kql-window'], labKeywords: ['Real-Time', 'KQL', 'Eventhouse']
  },
  {
    id: 'fabric-pipeline', platform: 'Fabric', area: 'Data Factory', title: 'Fabric Data Factory pipeline', short: 'Low-code orchestration and data movement inside Fabric.',
    definition: 'A Fabric pipeline orchestrates data movement and multi-step workflows using activities, parameters, expressions, schedules, and event-driven triggers.',
    mentalModel: 'Control plane for “what runs, in what order, with what parameters”.',
    useWhen: ['You need Copy activity or cross-system data movement', 'You need visual orchestration around notebooks/dataflows', 'Dependencies, retries, schedules, or triggers matter'],
    compare: ['A notebook contains code and compute logic.', 'Dataflow Gen2 focuses on Power Query transformations.', 'Azure Data Factory is the separate Azure PaaS predecessor/service.'],
    examRefs: ['DP-700 · orchestrate processes', 'DP-600 · maintain solution'], code: ['pipeline-expression'], labKeywords: ['pipeline', 'ingest']
  },
  {
    id: 'dataflow-gen2', platform: 'Fabric', area: 'Data Factory', title: 'Dataflow Gen2', short: 'Low-code Power Query transformation in Fabric.',
    definition: 'Dataflow Gen2 uses the Power Query experience to ingest, clean, shape, and load data into Fabric destinations with a low-code authoring model.',
    mentalModel: 'Power Query as a reusable cloud transformation asset.',
    useWhen: ['Transformations fit tabular Power Query patterns', 'Analysts need a visual low-code authoring experience', 'Query folding can push work to sources'],
    avoidWhen: ['Very large Spark-native processing or complex engineering logic is a better fit for notebooks'],
    examRefs: ['DP-600 · transform data', 'DP-700 · choose transformation tool'], code: ['m-clean'], labKeywords: ['Dataflow', 'Power Query']
  },
  {
    id: 'fabric-notebook', platform: 'Fabric', area: 'Data engineering', title: 'Fabric notebook', short: 'Interactive Spark notebook for engineering and data science.',
    definition: 'Fabric notebooks provide an interactive code environment, commonly using PySpark, Spark SQL, Python, and lakehouse data for transformation and analysis.',
    mentalModel: 'Code-first transformation surface with managed Spark compute.',
    useWhen: ['Transformations are complex or Spark-native', 'You need reusable Python/PySpark logic', 'You want engineering and experimentation in one artifact'],
    compare: ['Pipeline = orchestration.', 'Notebook = code execution.', 'Dataflow Gen2 = Power Query transformation.'],
    examRefs: ['DP-700 · PySpark / orchestration', 'DP-600 · transform data'], code: ['pyspark-medallion'], labKeywords: ['Spark', 'notebook']
  },
  {
    id: 'delta-lake', platform: 'Shared', area: 'Lakehouse fundamentals', title: 'Delta Lake', short: 'Transactional open table format on object storage.',
    definition: 'Delta Lake adds transaction logs, schema controls, time-aware operations, and reliable table semantics to Parquet-based lake storage.',
    mentalModel: 'Parquet files plus a transaction log that turns files into reliable tables.',
    useWhen: ['You need ACID-style table behavior in a lake', 'Incremental MERGE/UPSERT patterns matter', 'Spark and lakehouse engines should share table state'],
    examRefs: ['DP-700 · lakehouse transformations', 'DP-750 · table formats and optimization'], code: ['sql-delta-merge', 'delta-optimize'], labKeywords: ['Delta']
  },
  {
    id: 'medallion', platform: 'Shared', area: 'Lakehouse fundamentals', title: 'Medallion architecture', short: 'Bronze → Silver → Gold quality layers.',
    definition: 'A medallion architecture separates raw ingestion, cleaned/conformed data, and consumption-ready aggregates or business entities into progressively refined layers.',
    mentalModel: 'Bronze preserves; Silver standardizes; Gold serves.',
    useWhen: ['You want explicit quality and responsibility boundaries', 'Reprocessing raw history is important', 'Different consumers need stable curated layers'],
    examRefs: ['DP-700 · loading patterns', 'DP-750 · pipelines and modeling'], code: ['pyspark-medallion'], labKeywords: ['medallion', 'bronze', 'silver', 'gold']
  },
  {
    id: 'semantic-model', platform: 'Power BI', area: 'Semantic layer', title: 'Semantic model', short: 'Business-ready analytical model consumed by Power BI and Fabric.',
    definition: 'A semantic model defines tables, relationships, measures, hierarchies, security, metadata, and storage behavior so consumers work with governed business concepts rather than raw source structures.',
    mentalModel: 'The contract between physical data and business questions.',
    useWhen: ['Metrics need one governed definition', 'Reports should reuse a shared model', 'Business semantics, security, and performance need central control'],
    examRefs: ['DP-600 · 25–30% semantic models', 'PL-300 · model data'], code: ['dax-margin'], labKeywords: ['semantic model', 'DAX']
  },
  {
    id: 'direct-lake', platform: 'Fabric', area: 'Semantic layer', title: 'Direct Lake', short: 'Semantic-model storage mode that reads Fabric data without classic import copies.',
    definition: 'Direct Lake is a Fabric semantic-model storage mode designed to deliver Import-like performance while reading Fabric-managed data directly from OneLake-backed structures.',
    mentalModel: 'Avoid a separate imported model copy while retaining a fast analytical experience.',
    useWhen: ['The source is Fabric/OneLake and the model should minimize duplication', 'Large data volumes make traditional import refresh less attractive'],
    compare: ['Import copies data into the semantic model.', 'DirectQuery sends queries to the source engine.', 'Direct Lake reads Fabric data through a specialized storage path.'],
    examRefs: ['DP-600 · enterprise semantic models'], labKeywords: ['Direct Lake', 'semantic model']
  },
  {
    id: 'dax', platform: 'Power BI', area: 'Semantic layer', title: 'DAX', short: 'Formula language for semantic-model calculations.',
    definition: 'Data Analysis Expressions (DAX) defines measures, calculated columns, calculated tables, calculation logic, and filter-context behavior in Power BI semantic models.',
    mentalModel: 'A context-driven analytical expression language, not row-by-row SQL.',
    useWhen: ['You are defining reusable business metrics', 'Calculations must respond to report filters and relationships'],
    compare: ['Power Query M transforms data before/while loading.', 'DAX calculates over the semantic model at query time or model processing time.'],
    examRefs: ['DP-600 · semantic models', 'PL-300 · modeling'], code: ['dax-margin'], labKeywords: ['DAX']
  },
  {
    id: 'fabric-iq', platform: 'Fabric', area: 'AI-ready semantics', title: 'Fabric IQ', short: 'Business vocabulary and intelligence layer for human and AI consumption.',
    definition: 'Fabric IQ is a Fabric intelligence layer that connects governed business concepts to data so people and AI agents can reason using consistent enterprise vocabulary.',
    mentalModel: 'A business-concept layer above raw schemas and individual reports.',
    useWhen: ['Multiple teams and agents need shared business meaning', 'You want business entities and relationships independent of a single report'],
    examRefs: ['DP-600 · AI-ready analytics learning path'], labKeywords: ['ontology', 'AI']
  },
  {
    id: 'ontology', platform: 'Fabric', area: 'AI-ready semantics', title: 'Ontology', short: 'Business entities, properties, and relationships bound to data.',
    definition: 'An ontology models real business concepts and relationships, then binds them to underlying data so agents and users can navigate meaning rather than table names.',
    mentalModel: 'Customer → places → Order is a business graph; tables are just implementations underneath.',
    useWhen: ['AI agents need stable business context', 'Business concepts span multiple physical datasets', 'You want graph-like semantic navigation'],
    examRefs: ['DP-600 · AI-ready learning path'], labKeywords: ['ontology']
  },
  {
    id: 'adf', platform: 'Azure', area: 'Data integration', title: 'Azure Data Factory', short: 'Azure PaaS service for cloud data integration and orchestration.',
    definition: 'Azure Data Factory (ADF) is an Azure service for building data-driven workflows that move and transform data using pipelines, activities, triggers, integration runtimes, and connectors.',
    mentalModel: 'Azure orchestration/control plane around data movement and external compute.',
    useWhen: ['Existing Azure estates use ADF', 'Hybrid integration runtime or Azure-native integration patterns are required', 'Databricks, SQL, storage, and external systems need orchestration'],
    compare: ['Fabric Data Factory is Microsoft’s newer Fabric-native data integration experience.', 'ADF remains a separate Azure resource and operational model.'],
    examRefs: ['DP-750 · familiar with ADF'], code: ['adf-expression'], labKeywords: ['Data Factory']
  },
  {
    id: 'adf-linked-service', platform: 'Azure', area: 'Data integration', title: 'ADF linked service', short: 'Connection definition to a data store or compute target.',
    definition: 'A linked service describes connection information for an external resource used by Azure Data Factory, conceptually similar to a connection string plus authentication and service metadata.',
    mentalModel: '“How do I connect to it?”',
    useWhen: ['A pipeline needs to reach storage, databases, Databricks, APIs, or compute'],
    compare: ['Dataset = what data/location/shape is referenced.', 'Linked service = how ADF connects to the system.'],
    examRefs: ['Azure data engineering reference'], code: ['adf-expression']
  },
  {
    id: 'adf-dataset', platform: 'Azure', area: 'Data integration', title: 'ADF dataset', short: 'Named description of data used by an activity.',
    definition: 'An ADF dataset describes the data structure or location an activity reads from or writes to, while the linked service supplies the connection to the underlying system.',
    mentalModel: 'Linked service = connection; dataset = data address/schema; activity = action.',
    useWhen: ['Copy or transformation activities need reusable source/sink definitions'],
    examRefs: ['Azure data engineering reference']
  },
  {
    id: 'adf-ir', platform: 'Azure', area: 'Data integration', title: 'Integration Runtime', short: 'ADF execution/connectivity infrastructure.',
    definition: 'The Integration Runtime (IR) provides the compute/connectivity bridge used by ADF for data movement, activity dispatch, and hybrid connectivity scenarios.',
    mentalModel: 'The runtime that makes the connection and work possible.',
    useWhen: ['You need cloud, self-hosted, or network-specific data movement', 'On-premises sources must connect securely to Azure pipelines'],
    examRefs: ['Azure data engineering reference']
  },
  {
    id: 'adls', platform: 'Azure', area: 'Storage', title: 'Azure Data Lake Storage Gen2', short: 'Azure object storage with hierarchical namespace for analytics.',
    definition: 'ADLS Gen2 is Azure Blob Storage with data-lake capabilities such as hierarchical namespace and filesystem-style organization, widely used as durable storage for analytics platforms.',
    mentalModel: 'Azure storage account optimized for lake-style analytical organization.',
    useWhen: ['You need an Azure-native durable data lake', 'Databricks or ADF should access open files directly'],
    compare: ['OneLake is Fabric’s SaaS unified lake layer; ADLS Gen2 is an Azure storage resource you provision and govern.'],
    examRefs: ['Azure platform reference', 'DP-750 supporting architecture']
  },
  {
    id: 'azure-databricks', platform: 'Azure Databricks', area: 'Platform', title: 'Azure Databricks', short: 'Managed Databricks lakehouse platform integrated with Azure.',
    definition: 'Azure Databricks is the Azure-integrated Databricks platform for data engineering, analytics, streaming, governance, and AI using Spark, Delta Lake, Unity Catalog, and Lakeflow services.',
    mentalModel: 'Lakehouse engineering platform with its own compute, governance, jobs, and developer lifecycle.',
    useWhen: ['Large-scale Spark/Python/SQL engineering is central', 'Unity Catalog governance is required', 'Complex batch/streaming pipelines need a mature engineering platform'],
    compare: ['Fabric notebooks are part of Fabric SaaS; Azure Databricks is a distinct Azure workspace/platform.'],
    examRefs: ['DP-750 · entire blueprint'], code: ['pyspark-medallion', 'delta-optimize'], labKeywords: ['Azure Databricks']
  },
  {
    id: 'unity-catalog', platform: 'Azure Databricks', area: 'Governance', title: 'Unity Catalog', short: 'Central governance layer for Databricks data and AI assets.',
    definition: 'Unity Catalog provides hierarchical organization, access control, discovery, lineage, auditing, and governance across catalogs, schemas, tables, views, volumes, and related Databricks assets.',
    mentalModel: 'Metastore → Catalog → Schema → Table/View/Volume, with centralized permissions and lineage.',
    useWhen: ['You need governed multi-workspace data access', 'Fine-grained privileges and lineage matter', 'Managed/external data should share a common governance model'],
    examRefs: ['DP-750 · setup + governance'], code: ['uc-grants'], labKeywords: ['Unity Catalog', 'catalog', 'schema']
  },
  {
    id: 'lakeflow-connect', platform: 'Azure Databricks', area: 'Ingestion', title: 'Lakeflow Connect', short: 'Managed connectors for ingesting data into Databricks.',
    definition: 'Lakeflow Connect provides managed ingestion connectors and pipelines that bring data from operational sources into Databricks with less custom connector code.',
    mentalModel: 'Managed ingestion into the lakehouse.',
    useWhen: ['A supported source should be ingested with managed connector behavior', 'You want batch/streaming ingestion with less custom notebook code'],
    compare: ['ADF can orchestrate and move data across Azure systems.', 'Lakeflow Connect is Databricks-native ingestion.'],
    examRefs: ['DP-750 · prepare and process data']
  },
  {
    id: 'auto-loader', platform: 'Azure Databricks', area: 'Ingestion', title: 'Auto Loader', short: 'Incremental file ingestion for cloud object storage.',
    definition: 'Auto Loader incrementally discovers and processes new files from cloud object storage using Structured Streaming patterns, with scalable file discovery and schema handling.',
    mentalModel: 'Continuously ingest only new files rather than rescanning everything.',
    useWhen: ['Files arrive incrementally in object storage', 'You need scalable streaming-style file ingestion'],
    examRefs: ['DP-750 · Lakeflow Spark Declarative Pipelines / ingestion'], code: ['autoload-stream']
  },
  {
    id: 'lakeflow-pipelines', platform: 'Azure Databricks', area: 'Pipelines', title: 'Lakeflow Spark Declarative Pipelines', short: 'Declarative batch/streaming data pipelines in Databricks.',
    definition: 'Lakeflow Spark Declarative Pipelines let engineers declare reliable data transformations and quality expectations while Databricks manages pipeline execution and dependencies.',
    mentalModel: 'Declare datasets and rules; let the platform manage the pipeline graph.',
    useWhen: ['You want managed batch/streaming pipeline semantics', 'Data quality expectations are first-class', 'The pipeline benefits from declarative dependency management'],
    compare: ['Lakeflow Jobs orchestrates tasks/workflows.', 'Declarative Pipelines define managed data transformations.'],
    examRefs: ['DP-750 · 30–35% deploy and maintain'], code: ['pipeline-expectation'], labKeywords: ['pipeline']
  },
  {
    id: 'lakeflow-jobs', platform: 'Azure Databricks', area: 'Pipelines', title: 'Lakeflow Jobs', short: 'Databricks workflow orchestration for notebooks, pipelines, and tasks.',
    definition: 'Lakeflow Jobs orchestrates multi-task production workflows with dependencies, parameters, schedules, triggers, retries, notifications, and operational monitoring.',
    mentalModel: 'Production DAG/orchestrator inside Databricks.',
    useWhen: ['Notebook/pipeline tasks must run in a controlled dependency graph', 'Retries, alerts, schedules, file triggers, or parameters matter'],
    examRefs: ['DP-750 · deploy and maintain'], labKeywords: ['Lakeflow Jobs', 'job']
  },
  {
    id: 'asset-bundles', platform: 'Azure Databricks', area: 'Dev lifecycle', title: 'Databricks Asset Bundles', short: 'Source-controlled packaging and deployment for Databricks resources.',
    definition: 'Databricks Asset Bundles provide a declarative project/package format for defining and deploying Databricks resources across environments using source control and CI/CD practices.',
    mentalModel: 'Infrastructure/application packaging for Databricks projects.',
    useWhen: ['Dev/test/prod deployments must be repeatable', 'Jobs and pipelines should be source controlled and deployed through automation'],
    examRefs: ['DP-750 · SDLC'], labKeywords: ['lifecycle', 'deploy']
  },
  {
    id: 'photon', platform: 'Azure Databricks', area: 'Compute & performance', title: 'Photon', short: 'Databricks vectorized execution engine for SQL/DataFrame workloads.',
    definition: 'Photon is Databricks’ native vectorized execution engine designed to accelerate many SQL and DataFrame workloads and improve price-performance.',
    mentalModel: 'A faster execution engine under supported Spark/SQL operations.',
    useWhen: ['Supported analytical SQL/DataFrame workloads benefit from accelerated execution'],
    examRefs: ['DP-750 · compute feature settings']
  },
  {
    id: 'event-hubs', platform: 'Azure', area: 'Streaming', title: 'Azure Event Hubs', short: 'High-throughput event ingestion service for streaming data.',
    definition: 'Azure Event Hubs is a managed event-ingestion service for large volumes of telemetry and streaming events, commonly feeding Stream Analytics, Databricks, Fabric, or custom consumers.',
    mentalModel: 'A scalable event intake layer, not the analytical database itself.',
    useWhen: ['Applications or devices emit high-volume streams', 'Multiple downstream consumers need event ingestion'],
    examRefs: ['DP-750 · streaming ingestion']
  },
  {
    id: 'entra', platform: 'Azure', area: 'Security', title: 'Microsoft Entra ID', short: 'Identity provider for users, groups, service principals, and managed identities.',
    definition: 'Microsoft Entra ID supplies cloud identity and authentication used across Azure, Fabric, and Databricks integrations, including users, groups, applications, service principals, and managed identities.',
    mentalModel: 'Who/what is the identity before permissions decide what it can do.',
    useWhen: ['Services need non-human authentication', 'RBAC/group-based access must be managed centrally'],
    examRefs: ['DP-750 · identity and resource access']
  },
  {
    id: 'key-vault', platform: 'Azure', area: 'Security', title: 'Azure Key Vault', short: 'Managed service for secrets, keys, and certificates.',
    definition: 'Azure Key Vault stores and controls access to secrets, cryptographic keys, and certificates so applications and data platforms do not embed sensitive credentials in code.',
    mentalModel: 'Keep secrets out of notebooks and configuration files.',
    useWhen: ['Credentials or secrets must be centrally secured and rotated'],
    examRefs: ['DP-750 · access Key Vault secrets']
  },
  {
    id: 'azure-monitor', platform: 'Azure', area: 'Operations', title: 'Azure Monitor', short: 'Azure observability platform for metrics, logs, alerts, and diagnostics.',
    definition: 'Azure Monitor collects and analyzes metrics, logs, and diagnostic signals across Azure resources and can power alerts and operational investigations.',
    mentalModel: 'Central Azure observability plane.',
    useWhen: ['You need cross-resource monitoring and alerting', 'Databricks logs should stream to Log Analytics'],
    examRefs: ['DP-750 · monitoring and alerts']
  },
  {
    id: 'power-query', platform: 'Power BI', area: 'Data preparation', title: 'Power Query / M', short: 'Data connection and transformation engine used by Power BI and Dataflows.',
    definition: 'Power Query provides a declarative transformation experience backed by the M language for connecting, cleaning, combining, and shaping data before it enters the analytical model.',
    mentalModel: 'Shape data before DAX/model calculations.',
    useWhen: ['Source data needs repeatable tabular cleaning', 'Query folding can push transformations to the source'],
    compare: ['M transforms data; DAX defines analytical model calculations.'],
    examRefs: ['PL-300 · prepare data', 'DP-600 · Dataflows Gen2'], code: ['m-clean'], labKeywords: ['Power Query', 'transform']
  },
  {
    id: 'star-schema', platform: 'Shared', area: 'Modeling', title: 'Star schema', short: 'Fact tables connected to descriptive dimensions.',
    definition: 'A star schema separates measurable business events in fact tables from descriptive entities in dimension tables, simplifying analytical queries and improving semantic-model usability.',
    mentalModel: 'Facts answer “how much/how many”; dimensions answer “by what/when/who/where”.',
    useWhen: ['Analytics need predictable filtering and aggregation', 'Semantic models or warehouses need clear business relationships'],
    examRefs: ['DP-600 · prepare data / semantic models', 'PL-300 · model data', 'DP-750 · modeling'], code: ['sql-star-schema']
  },
]

export const snippets: Snippet[] = [
  {
    id: 'pyspark-medallion', language: 'PySpark', title: 'Bronze → Silver transformation', conceptIds: ['lakehouse', 'fabric-notebook', 'medallion', 'azure-databricks'],
    note: 'A compact example of cleaning and deduplicating raw lakehouse data before writing a curated Delta table.',
    code: `from pyspark.sql import functions as F\n\nbronze = spark.read.table("bronze.bookings")\n\nsilver = (\n    bronze\n    .dropDuplicates(["booking_id"])\n    .filter(F.col("rate_per_night") > 0)\n    .withColumn("booking_date", F.to_date("booking_date"))\n    .withColumn("revenue", F.col("nights") * F.col("rate_per_night"))\n)\n\n(silver.write\n    .format("delta")\n    .mode("overwrite")\n    .saveAsTable("silver.bookings"))`
  },
  {
    id: 'sql-delta-merge', language: 'SQL', title: 'Delta MERGE upsert', conceptIds: ['delta-lake', 'lakehouse', 'azure-databricks'],
    note: 'Use MERGE for incremental upserts when a stable business key identifies rows.',
    code: `MERGE INTO silver.customer AS target\nUSING staging.customer AS source\nON target.customer_id = source.customer_id\nWHEN MATCHED THEN UPDATE SET *\nWHEN NOT MATCHED THEN INSERT *;`
  },
  {
    id: 'sql-star-schema', language: 'T-SQL', title: 'Fact/dimension query pattern', conceptIds: ['star-schema', 'warehouse'],
    note: 'A star schema keeps business measures in the fact and descriptive filtering attributes in dimensions.',
    code: `SELECT\n    d.CalendarYear,\n    p.Category,\n    SUM(f.SalesAmount) AS SalesAmount\nFROM dbo.FactSales AS f\nJOIN dbo.DimDate AS d\n  ON f.DateKey = d.DateKey\nJOIN dbo.DimProduct AS p\n  ON f.ProductKey = p.ProductKey\nGROUP BY d.CalendarYear, p.Category;`
  },
  {
    id: 'kql-window', language: 'KQL', title: 'Aggregate event data into time windows', conceptIds: ['eventhouse'],
    note: 'KQL is natural for event/time-series exploration in Fabric Real-Time Intelligence.',
    code: `Telemetry\n| where Timestamp > ago(1h)\n| summarize AvgTemp = avg(Temperature), Events = count()\n    by bin(Timestamp, 5m), DeviceId\n| order by Timestamp desc`
  },
  {
    id: 'dax-margin', language: 'DAX', title: 'Filter-aware margin measure', conceptIds: ['dax', 'semantic-model'],
    note: 'Measures are evaluated in filter context and are the preferred place for reusable business calculations.',
    code: `Revenue := SUM ( Sales[Revenue] )\n\nMargin :=\nVAR RevenueValue = [Revenue]\nVAR CostValue = SUM ( Sales[Cost] )\nRETURN\n    DIVIDE ( RevenueValue - CostValue, RevenueValue )`
  },
  {
    id: 'm-clean', language: 'Power Query M', title: 'Typed and filtered Power Query step', conceptIds: ['power-query', 'dataflow-gen2'],
    note: 'Keep transformations foldable where possible when the source supports query folding.',
    code: `let\n    Source = Sql.Database("server", "sales"),\n    Orders = Source{[Schema="dbo",Item="Orders"]}[Data],\n    Typed = Table.TransformColumnTypes(Orders, {{"OrderDate", type date}}),\n    Valid = Table.SelectRows(Typed, each [Amount] > 0)\nin\n    Valid`
  },
  {
    id: 'pipeline-expression', language: 'Fabric expression', title: 'Parameterized pipeline path', conceptIds: ['fabric-pipeline'],
    note: 'Use parameters and dynamic expressions so one pipeline can process multiple partitions or entities.',
    code: `@concat(\n  'landing/',\n  pipeline().parameters.entity,\n  '/date=',\n  formatDateTime(utcNow(), 'yyyy-MM-dd')\n)`
  },
  {
    id: 'adf-expression', language: 'ADF expression', title: 'Dynamic source path', conceptIds: ['adf', 'adf-linked-service'],
    note: 'ADF expressions let pipeline metadata and parameters drive reusable source/sink behavior.',
    code: `@concat(\n  'raw/',\n  pipeline().parameters.sourceSystem,\n  '/',\n  formatDateTime(trigger().startTime, 'yyyy/MM/dd')\n)`
  },
  {
    id: 'uc-grants', language: 'Databricks SQL', title: 'Unity Catalog privileges', conceptIds: ['unity-catalog'],
    note: 'Grant the minimum privileges required at the appropriate securable level.',
    code: `GRANT USE CATALOG ON CATALOG analytics TO data_engineers;\nGRANT USE SCHEMA ON SCHEMA analytics.silver TO data_engineers;\nGRANT SELECT ON TABLE analytics.silver.orders TO bi_readers;`
  },
  {
    id: 'autoload-stream', language: 'PySpark', title: 'Auto Loader file ingestion', conceptIds: ['auto-loader'],
    note: 'Auto Loader scales incremental file discovery and can evolve schemas under controlled policies.',
    code: `stream = (spark.readStream\n  .format("cloudFiles")\n  .option("cloudFiles.format", "json")\n  .option("cloudFiles.schemaLocation", checkpoint_schema)\n  .load(source_path))\n\n(stream.writeStream\n  .option("checkpointLocation", checkpoint_path)\n  .trigger(availableNow=True)\n  .toTable("bronze.events"))`
  },
  {
    id: 'pipeline-expectation', language: 'Python', title: 'Declarative data-quality expectation', conceptIds: ['lakeflow-pipelines'],
    note: 'Expectations express quality contracts directly in the managed data pipeline.',
    code: `@dp.table(name="silver_orders")\n@dp.expect_or_drop("valid_order", "order_id IS NOT NULL")\ndef silver_orders():\n    return spark.readStream.table("bronze_orders")`
  },
  {
    id: 'delta-optimize', language: 'SQL', title: 'Optimize a Delta table', conceptIds: ['delta-lake', 'azure-databricks'],
    note: 'Optimization strategy depends on workload, table size, clustering strategy, and runtime features.',
    code: `OPTIMIZE analytics.silver.events;\n\nVACUUM analytics.silver.events RETAIN 168 HOURS;`
  },
]

export const sourceRegistry = [
  { name: 'DP-600 study guide', status: 'current' as const, checked: '2026-09-16', note: 'Skills measured as of 2026-07-21', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-600' },
  { name: 'DP-700 study guide', status: 'current' as const, checked: '2026-09-16', note: 'Skills measured as of 2026-07-21', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700' },
  { name: 'DP-750 study guide', status: 'current' as const, checked: '2026-09-16', note: 'Skills measured as of 2026-03-11; page updated 2026-07-13', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-750' },
  { name: 'PL-300 study guide', status: 'current' as const, checked: '2026-09-16', note: 'Skills measured as of 2026-04-20', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300' },
  { name: 'Azure Data Factory documentation', status: 'current' as const, checked: '2026-09-16', note: 'Microsoft now points new integration users toward Fabric Data Factory while retaining ADF documentation.', url: 'https://learn.microsoft.com/en-us/azure/data-factory/introduction' },
  { name: 'Microsoft Fabric interactive labs archive', status: 'current' as const, checked: '2026-09-16', note: 'Uploaded source contains DP-600/DP-700 plus newer IQ, ontology and AI-ready labs.' },
  { name: 'DP-750 Azure Databricks labs archive', status: 'current' as const, checked: '2026-09-16', note: 'Uploaded source maps closely to the current DP-750 domains.' },
  { name: 'DP-500 archive', status: 'legacy' as const, checked: '2026-09-16', note: 'Course retired 2024-04-30; labs are reference only.' },
  { name: 'DP-203 study guide', status: 'legacy' as const, checked: '2026-09-16', note: 'Exam retired 2025-03-31.' },
]
