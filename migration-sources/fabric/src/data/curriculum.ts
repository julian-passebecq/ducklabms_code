import type { LearningModule } from '../types/app';

export const fabricModules: LearningModule[] = [
  {
    id: 'fabric-lakehouse', title: 'Lakehouse + OneLake', product: 'Fabric', level: 'Foundation',
    summary: 'Create a lakehouse, land files, register Delta tables, query through Spark and the SQL analytics endpoint, and create OneLake shortcuts.',
    concepts: ['OneLake', 'Lakehouse', 'Files vs Tables', 'Delta Lake', 'Shortcuts', 'SQL analytics endpoint'],
    actions: ['Create lakehouse', 'Upload source file', 'Load to Delta table', 'Create shortcut', 'Query with SQL'],
    sourceRefs: ['mslearn-fabric: 01-lakehouse.md', '25-discover-onelake.md']
  },
  {
    id: 'fabric-spark', title: 'Spark + Notebook engineering', product: 'Fabric', level: 'Core',
    summary: 'Use Fabric notebooks for DataFrame transformations, partitioned writes, SQL cells, medallion processing, and reusable engineering code.',
    concepts: ['PySpark DataFrames', 'Spark SQL', 'Partitions', 'Delta writes', 'Notebook execution', 'Medallion architecture'],
    actions: ['Attach lakehouse', 'Run PySpark cells', 'Transform bronze to silver', 'Write gold tables', 'Inspect output'],
    sourceRefs: ['mslearn-fabric: 02-analyze-spark.md', '03b-medallion-lakehouse.md', '26c-transform-data-notebooks.md']
  },
  {
    id: 'fabric-tool-choice', title: 'SQL · dbt · Python · Spark decisions', product: 'Fabric', level: 'Core',
    summary: 'Practice engineering judgment: choose the simplest transformation tool that fits the data shape, scale, maintainability and runtime requirements.',
    concepts: ['SQL first', 'dbt modeling', 'Python/pandas', 'Spark scale', 'Anti-patterns', 'Workload fit'],
    actions: ['Read scenario', 'Choose tool', 'Explain tradeoff', 'Identify over-engineering', 'Open matching workbench'],
    sourceRefs: ['V9 engineering decision lab', 'Current Microsoft Fabric notebook/dbt/Spark guidance']
  },
  {
    id: 'fabric-practice', title: 'Hands-on engineering practice', product: 'Fabric', level: 'Core',
    summary: 'Solve executable SQL, Python and dbt exercises plus architecture-choice drills against the shared case-study workspace.',
    concepts: ['Executable evidence', 'SQL practice', 'Python practice', 'dbt commands', 'Tool choice', 'Mastery scoring'],
    actions: ['Choose exercise', 'Write code', 'Run locally', 'Validate evidence', 'Use hints sparingly', 'Export mastery report'],
    sourceRefs: ['V13 executable practice engine', 'V8-V12 shared runtime and mastery systems']
  },
  {
    id: 'fabric-challenge', title: 'End-to-end engineering challenges', product: 'Fabric', level: 'Advanced',
    summary: 'Prove multi-stage outcomes across Notebook/SQL/dbt/Pipeline/Monitor/Recovery using observable data and run evidence rather than answer matching.',
    concepts: ['Cross-surface state', 'Evidence contracts', 'Pipeline proof', 'Run diagnostics', 'Recovery readiness', 'Tool ownership'],
    actions: ['Create data evidence', 'Build dbt models', 'Design pipeline', 'Run and monitor', 'Inspect lineage/state', 'Prove recoverability'],
    sourceRefs: ['V14 multi-stage challenge engine', 'V8-V13 shared runtime, monitoring, reliability, and practice systems']
  },
  {
    id: 'fabric-production', title: 'Production workflow simulator', product: 'Fabric', level: 'Advanced',
    summary: 'Run one case through real-life Fabric item choices: Copy Job/Pipeline, Lakehouse, Notebook or dbt, optional Spark, serving, monitoring, lineage, and recovery.',
    concepts: ['Item boundaries', 'Copy Job vs Copy activity', 'Workspace default vs Environment', 'Notebook vs Spark Job Definition', 'Pipeline vs Airflow', 'Operations'],
    actions: ['Choose architecture', 'Land data', 'Transform with the right engine', 'Orchestrate', 'Serve', 'Monitor and checkpoint'],
    sourceRefs: ['Current Microsoft Fabric Data Engineering, Copy Job, Environment, Spark Job Definition, dbt Job, and Airflow documentation', 'V15 production workflow simulator']
  },
  {
    id: 'fabric-dbt', title: 'dbt Jobs', product: 'Fabric', level: 'Core',
    summary: 'Build SQL transformation projects with ref() dependencies, tests, model selection, run/build/compile/test commands, and pipeline orchestration.',
    concepts: ['dbt Job', 'ref()', 'Model DAG', 'Tests', 'Selection', 'Materialization'],
    actions: ['Edit model SQL', 'Compile refs', 'Run models', 'Build + test', 'Select/exclude nodes', 'Orchestrate from pipeline'],
    sourceRefs: ['Microsoft Learn current dbt Job docs', 'V8 executable dbt runtime']
  },
  {
    id: 'fabric-data-factory', title: 'Data Factory pipelines', product: 'Fabric', level: 'Core',
    summary: 'Build orchestration pipelines, configure Copy activity and Copy Job, call notebooks/dataflows, pass parameters, validate, debug, and monitor.',
    concepts: ['Pipeline DAG', 'Copy activity', 'Copy Job', 'Parameters', 'Dependencies', 'Debug', 'Monitoring'],
    actions: ['Add activity', 'Configure source/sink', 'Connect dependencies', 'Validate', 'Debug run', 'Inspect output'],
    sourceRefs: ['mslearn-fabric: 04-ingest-pipeline.md', 'Microsoft Learn current Data Factory docs']
  },
  {
    id: 'fabric-dataflow', title: 'Dataflow Gen2', product: 'Fabric', level: 'Core',
    summary: 'Use the Power Query experience for visual ingestion and transformation, configure destinations, and orchestrate the dataflow from pipelines.',
    concepts: ['Power Query', 'Query steps', 'Schema', 'Merge', 'Group', 'Data destinations', 'Fast Copy'],
    actions: ['Connect source', 'Apply transformations', 'Inspect schema', 'Set destination', 'Publish', 'Call from pipeline'],
    sourceRefs: ['mslearn-fabric: 05-dataflows-gen2.md', '26b-transform-data-dataflows.md']
  },
  {
    id: 'fabric-warehouse', title: 'Warehouse + T-SQL', product: 'Fabric', level: 'Core',
    summary: 'Model warehouse tables, load facts and dimensions, write reusable views and stored procedures, and practice dimensional modeling and SCD patterns.',
    concepts: ['Warehouse', 'T-SQL', 'Star schema', 'Fact/dimension', 'Stored procedure', 'SCD Type 1/2'],
    actions: ['Create tables', 'Load staging data', 'Build dimensions', 'Create procedure', 'Run SCD merge', 'Query star schema'],
    sourceRefs: ['mslearn-fabric: 06-data-warehouse.md', '06a-data-warehouse-load.md', '26-design-dimensional-models.md', '26d-transform-data-tsql.md']
  },
  {
    id: 'fabric-realtime', title: 'Real-Time Intelligence', product: 'Fabric', level: 'Advanced',
    summary: 'Ingest events with Eventstream, store them in Eventhouse/KQL Database, query with KQL, and trigger actions with Activator.',
    concepts: ['Real-Time hub', 'Eventstream', 'Eventhouse', 'KQL database', 'KQL queryset', 'Activator'],
    actions: ['Create eventstream', 'Add source', 'Add transform', 'Route destination', 'Query KQL', 'Create alert rule'],
    sourceRefs: ['mslearn-fabric: 07-real-time-Intelligence.md', '09-real-time-analytics-eventstream.md', '12-query-data-in-kql-database.md']
  },
  {
    id: 'fabric-runtime', title: 'Environments + Spark Job Definitions', product: 'Fabric', level: 'Advanced',
    summary: 'Understand how Fabric separates code, runtime libraries, compute settings, and repeatable Spark jobs.',
    concepts: ['Environment item', 'Spark runtime', 'Libraries', 'Compute configuration', 'Spark Job Definition', 'Scheduling'],
    actions: ['Create environment', 'Add library', 'Attach environment', 'Create Spark job', 'Set arguments', 'Run job'],
    sourceRefs: ['Microsoft Learn current Fabric Data Engineering docs']
  },
  {
    id: 'fabric-airflow', title: 'Apache Airflow Jobs', product: 'Fabric', level: 'Advanced',
    summary: 'Practice Python DAG orchestration in Fabric, trigger Fabric items, inspect task dependencies, schedules and logs, and compare Airflow with visual pipelines.',
    concepts: ['DAG', 'FabricRunItemOperator', 'Task dependencies', 'Schedules', 'Managed Airflow', 'Code-first orchestration'],
    actions: ['Edit DAG code', 'Build graph', 'Trigger Notebook/dbt/Copy/Pipeline', 'Run DAG', 'Inspect task logs', 'Compare with Pipeline'],
    sourceRefs: ['Microsoft Learn current Apache Airflow Jobs docs']
  },
  {
    id: 'fabric-recovery', title: 'Reliability + recovery engineering', product: 'Fabric', level: 'Advanced',
    summary: 'Inject realistic bad data and state corruption, diagnose quality failures, use checkpoints, prove dbt tests, and rerun only the affected path.',
    concepts: ['Data contracts', 'Quality gates', 'Failure containment', 'Checkpoint/restore', 'Idempotent rerun', 'Root-cause analysis'],
    actions: ['Inject incident', 'Run quality checks', 'Inspect dbt failure', 'Apply targeted repair', 'Restore checkpoint', 'Prove recovery'],
    sourceRefs: ['V10 executable workspace + recovery lab', 'Production reliability patterns taught through the Fabric case studies']
  },
  {
    id: 'fabric-governance', title: 'Security + governance + lineage', product: 'Fabric', level: 'Advanced',
    summary: 'Practice workspace roles, item permissions, OneLake security, endorsement, catalog discovery, lineage, and impact analysis.',
    concepts: ['Workspace roles', 'Item permissions', 'OneLake security', 'OneLake catalog', 'Lineage', 'Impact analysis'],
    actions: ['Assign role', 'Configure item access', 'Apply data security', 'Endorse item', 'Trace lineage'],
    sourceRefs: ['mslearn-fabric: 19-secure-data-access.md', '19b-govern-analytics-data.md', '25-discover-onelake.md']
  },
  {
    id: 'fabric-ops', title: 'Monitoring + CI/CD', product: 'Fabric', level: 'Advanced',
    summary: 'Observe pipeline/dataflow/notebook runs, inspect failures, and understand deployment pipelines and source-control lifecycle.',
    concepts: ['Monitoring hub', 'Run history', 'Diagnostics', 'Deployment pipelines', 'Git integration', 'Environment promotion'],
    actions: ['Filter runs', 'Inspect activity output', 'Open item history', 'Create deployment stages', 'Promote content'],
    sourceRefs: ['mslearn-fabric: 18-monitor-hub.md', '21-implement-cicd.md']
  }
];

export const databricksModules: LearningModule[] = [
  {
    id: 'dbx-production', title: 'Production lakehouse case study', product: 'Azure Databricks', level: 'Advanced',
    summary: 'Practice a realistic Databricks operating path from Unity Catalog landing volumes through Auto Loader, Lakeflow pipelines, Jobs, SQL Warehouse, lineage, and performance diagnostics.',
    concepts: ['Managed vs external assets', 'Volumes', 'Serverless compute', 'Auto Loader', 'Schema evolution', 'Lakeflow expectations', 'Job repair', 'SQL Warehouse'],
    actions: ['Design compute/storage', 'Configure governed landing', 'Run incremental ingest', 'Build declarative Silver/Gold', 'Orchestrate job', 'Serve SQL', 'Operate'],
    sourceRefs: ['Current Azure Databricks Unity Catalog, Auto Loader, Lakeflow pipelines, Jobs, compute, and SQL Warehouse documentation', 'V15 production workflow simulator']
  },
  {
    id: 'dbx-workspace', title: 'Workspace + notebooks', product: 'Azure Databricks', level: 'Foundation',
    summary: 'Navigate the workspace, create notebooks, attach compute, and use Spark DataFrames and SQL.',
    concepts: ['Workspace', 'Notebook', 'Spark session', 'DataFrame', 'Serverless compute'],
    actions: ['Open workspace', 'Create notebook', 'Select compute', 'Run Spark code', 'Inspect result'],
    sourceRefs: ['mslearn-databricks: LA-01-Explore-Azure-Databricks.md', 'DP-750 Lab 01/02']
  },
  {
    id: 'dbx-unity', title: 'Unity Catalog', product: 'Azure Databricks', level: 'Core',
    summary: 'Organize and govern catalogs, schemas, tables, volumes, permissions, lineage, row filters, and column masks.',
    concepts: ['Metastore', 'Catalog', 'Schema', 'Managed/external table', 'Volumes', 'GRANT', 'Lineage'],
    actions: ['Create catalog', 'Create schema', 'Create table', 'Grant permissions', 'Inspect lineage', 'Apply row/column policy'],
    sourceRefs: ['mslearn-databricks: UC-01/UC-03', 'DP-750 Labs 03-06']
  },
  {
    id: 'dbx-delta', title: 'Delta Lake + medallion', product: 'Azure Databricks', level: 'Core',
    summary: 'Practice ACID Delta tables, updates, history/time travel, OPTIMIZE concepts, and bronze/silver/gold transformations.',
    concepts: ['Delta Lake', 'ACID', 'MERGE', 'Time travel', 'OPTIMIZE', 'Medallion'],
    actions: ['Create Delta table', 'Update rows', 'Inspect history', 'Time travel', 'Build silver/gold'],
    sourceRefs: ['mslearn-databricks: LA-04-Explore-Delta-Lake.md', 'DP-750 Lab 10']
  },
  {
    id: 'dbx-streaming', title: 'Auto Loader + streaming', product: 'Azure Databricks', level: 'Advanced',
    summary: 'Build incremental file ingestion with Auto Loader and Structured Streaming, including checkpoints and schema evolution.',
    concepts: ['Auto Loader', 'cloudFiles', 'Structured Streaming', 'Checkpoint', 'Schema evolution', 'Streaming table'],
    actions: ['Configure source', 'Set checkpoint', 'Start stream', 'Handle schema drift', 'Write Delta table'],
    sourceRefs: ['mslearn-databricks: DE-01/DE-02/DE-03', 'DP-750 Labs 07-09']
  },
  {
    id: 'dbx-pipelines', title: 'Lakeflow pipelines', product: 'Azure Databricks', level: 'Advanced',
    summary: 'Define declarative batch/streaming pipelines with streaming tables, materialized views, expectations, and automatic dependency management.',
    concepts: ['Lakeflow pipelines', 'Streaming table', 'Materialized view', 'Expectations', 'Declarative DAG'],
    actions: ['Create pipeline', 'Add bronze flow', 'Add quality checks', 'Create silver/gold', 'Run update', 'Inspect event log'],
    sourceRefs: ['mslearn-databricks: LA-05-Build-data-pipeline.md', 'DP-750 Labs 07/09']
  },
  {
    id: 'dbx-jobs', title: 'Lakeflow Jobs', product: 'Azure Databricks', level: 'Advanced',
    summary: 'Orchestrate notebook, SQL, pipeline, condition and for-each tasks with schedules, file-arrival triggers, retries and notifications.',
    concepts: ['Jobs DAG', 'Tasks', 'Dependencies', 'If/else', 'For each', 'Trigger', 'Retries', 'Notifications'],
    actions: ['Create job', 'Add tasks', 'Wire dependencies', 'Add trigger', 'Configure retry', 'Run and monitor'],
    sourceRefs: ['mslearn-databricks: LA-06-Build-workflow.md', 'DP-750 Labs 10/11']
  },
  {
    id: 'dbx-sql', title: 'SQL Warehouse', product: 'Azure Databricks', level: 'Core',
    summary: 'Use SQL warehouse compute, query Unity Catalog tables, and understand serverless SQL serving.',
    concepts: ['SQL Warehouse', 'Serverless SQL', 'Query editor', 'Unity Catalog', 'Warehouse sizing'],
    actions: ['Start warehouse', 'Run query', 'Create schema/table', 'Inspect query profile'],
    sourceRefs: ['mslearn-databricks: DE-07-Use-SQL-warehouse.md']
  },
  {
    id: 'dbx-ops', title: 'Monitoring + optimization', product: 'Azure Databricks', level: 'Advanced',
    summary: 'Read job run history and Spark UI signals for skew, shuffle, failed stages, inefficient joins, and compute bottlenecks.',
    concepts: ['Spark UI', 'Stages', 'Tasks', 'Shuffle', 'Skew', 'Query profile', 'System tables'],
    actions: ['Open run', 'Inspect stage', 'Compare shuffle/input', 'Find skew', 'Review retry/failure'],
    sourceRefs: ['DP-750 Lab 13']
  }
];

export const adfModules: LearningModule[] = [
  {
    id: 'adf-author', title: 'ADF authoring + orchestration', product: 'Azure Data Factory', level: 'Core',
    summary: 'Build classic ADF pipelines with linked services, datasets, activities, parameters, triggers, Integration Runtime, debug, and monitor.',
    concepts: ['Linked service', 'Dataset', 'Pipeline', 'Activity', 'Integration Runtime', 'Trigger', 'Monitor'],
    actions: ['Create linked service', 'Create dataset', 'Add activity', 'Configure parameters', 'Debug', 'Trigger', 'Monitor'],
    sourceRefs: ['Existing V1 ADF simulator', 'mslearn-databricks: DE-08-Run-notebook-Data-Factory.md']
  },
  {
    id: 'adf-databricks', title: 'ADF → Azure Databricks integration', product: 'Azure Data Factory', level: 'Advanced',
    summary: 'Learn the control-plane handoff where ADF orchestrates a Databricks notebook while Databricks performs Spark/Delta transformation.',
    concepts: ['ADF linked service', 'Databricks notebook activity', 'Parameters', 'Compute handoff', 'Run output'],
    actions: ['Create Databricks linked service', 'Add notebook activity', 'Pass parameters', 'Run pipeline', 'Inspect Databricks output'],
    sourceRefs: ['mslearn-databricks: DE-08-Run-notebook-Data-Factory.md']
  }
];
