import type { CaseStudy, DataWorkspace, WorkspaceTable } from '../types/app';
import { createWorkspaceCheckpoint, workspaceObjectFreshness, workspaceObjectWriteSnapshot } from './workspaceInsights';
import { findWorkspaceTable, upsertWorkspaceTable } from './dataRuntime';

export type ProductionPlatform = 'fabric' | 'databricks';
export type ProductionStageId = 'design' | 'govern' | 'ingest' | 'transform' | 'orchestrate' | 'serve' | 'operate';

export interface ProductionStage {
  id: ProductionStageId;
  title: string;
  tool: string;
  productionBehavior: string;
  learningBehavior: string;
  evidence: string;
}

export interface ProductionPlan {
  title: string;
  productionScale: string;
  decision: string;
  avoid: string;
  stages: ProductionStage[];
}

export interface StageRunResult {
  workspace: DataWorkspace;
  message: string;
  touchedTables: string[];
  metrics: Record<string, string | number>;
}

const cloneRows = (table?: WorkspaceTable) => (table?.rows ?? []).map((row) => ({ ...row }));
const tableName = (workspace: DataWorkspace, names: string[]): WorkspaceTable | undefined => names.map((name) => findWorkspaceTable(workspace, name)).find(Boolean);

export function productionPlan(caseStudy: CaseStudy, platform: ProductionPlatform): ProductionPlan {
  if (platform === 'fabric') {
    return {
      title: `${caseStudy.title} · Fabric production workflow`,
      productionScale: caseStudy.engineeringDecision?.productionScale ?? caseStudy.scenario,
      decision: caseStudy.engineeringDecision?.preferred ?? 'Use the simplest Fabric engine that fits the workload, then orchestrate it explicitly.',
      avoid: caseStudy.engineeringDecision?.avoid ?? 'Do not add Spark or Airflow unless scale or orchestration complexity justifies them.',
      stages: [
        { id: 'design', title: 'Choose the operating pattern', tool: 'Architecture decision', productionBehavior: 'Separate movement, transformation, orchestration, serving, and operations before choosing Fabric items.', learningBehavior: 'Review the selected case and commit to Copy Job / Pipeline / SQL / dbt / Python / Spark only where each belongs.', evidence: 'A case-specific tool decision is visible.' },
        { id: 'govern', title: 'Prepare governed runtime', tool: 'Lakehouse + Environment', productionBehavior: 'Use a Lakehouse as the shared data context. Attach a published Environment only when notebooks/Spark jobs need reusable libraries or Spark settings.', learningBehavior: 'The app shows environment attachment, default Lakehouse, and why Workspace default is often enough.', evidence: 'Runtime choice and Lakehouse context are recorded.' },
        { id: 'ingest', title: 'Land source data', tool: caseStudy.id === 'erp-incremental' ? 'Copy Job · incremental' : 'Copy Job / Copy activity', productionBehavior: 'Use Copy Job for data movement-only workloads; use a Copy activity when movement is one step inside a larger pipeline.', learningBehavior: 'Representative source rows are copied into a real local Bronze/staging table.', evidence: 'A Fabric Bronze/staging table exists in the shared workspace.' },
        { id: 'transform', title: 'Transform with the right engine', tool: caseStudy.id === 'turbine-realtime' ? 'Notebook / Spark semantics' : 'SQL · dbt · Python', productionBehavior: caseStudy.id === 'turbine-realtime' ? 'Use Spark only for the production-scale distributed telemetry scenario; keep the training sample local.' : 'Prefer SQL/dbt for relational modeling and lightweight Python for custom logic; do not introduce Spark by default.', learningBehavior: 'The local runtime performs the representative transformation and shows the production equivalent.', evidence: 'A Silver or conformed table is created.' },
        { id: 'orchestrate', title: 'Orchestrate production items', tool: 'Fabric Pipeline', productionBehavior: 'Chain Copy Job/Copy, Notebook, dbt Job, Spark Job Definition, stored procedures, conditions, retries, and notifications. Use Airflow only when code-first DAG ownership is intentional.', learningBehavior: 'A production-shaped run audit is written with dependencies and case-specific task ownership.', evidence: 'The run audit shows the expected activity sequence.' },
        { id: 'serve', title: 'Publish a serving result', tool: 'Warehouse / Lakehouse SQL', productionBehavior: 'Materialize the smallest useful serving table or warehouse model and validate it with SQL/dbt tests.', learningBehavior: 'The case produces a small Gold/serving table that can be inspected everywhere in the app.', evidence: 'A Gold/warehouse result exists.' },
        { id: 'operate', title: 'Operate and recover', tool: 'Monitoring hub + lineage + checkpoint', productionBehavior: 'Inspect run history, activity diagnostics, lineage, failures, and deployment state. Preserve a safe recovery point before risky reruns.', learningBehavior: 'The app records an operational checkpoint and run evidence without simulating cloud infrastructure.', evidence: 'Checkpoint and run-history evidence exist.' },
      ],
    };
  }

  return {
    title: `${caseStudy.title} · Databricks production workflow`,
    productionScale: caseStudy.engineeringDecision?.productionScale ?? caseStudy.scenario,
    decision: caseStudy.id === 'turbine-realtime'
      ? 'Use declarative ingestion/quality plus Spark semantics where the telemetry scale genuinely benefits from distributed processing.'
      : 'Use Unity Catalog-governed tables, declarative ingestion/transformations, SQL/dbt where appropriate, and Spark only when workload scale requires it.',
    avoid: caseStudy.id === 'turbine-realtime'
      ? 'Do not confuse the local sample with the production scale; the Spark UI and distributed metrics are simulated.'
      : 'Do not make every Databricks transformation a hand-written PySpark notebook.',
    stages: [
      { id: 'design', title: 'Choose data + compute boundaries', tool: 'Workspace architecture', productionBehavior: 'Choose managed tables for governed data, volumes for file landing, serverless notebook/jobs compute when appropriate, and SQL Warehouse for SQL serving.', learningBehavior: 'The workbench explains which compute plane owns each action; compute itself remains simulated.', evidence: 'Compute and storage choices are visible.' },
      { id: 'govern', title: 'Govern landing and tables', tool: 'Unity Catalog', productionBehavior: 'Register a landing volume, keep curated tables as managed Unity Catalog tables, and grant least-privilege catalog/schema/table access.', learningBehavior: 'The simulator shows catalog.schema.object, managed/external assets, grants, and lineage boundaries.', evidence: 'Catalog + volume + managed-table plan is configured.' },
      { id: 'ingest', title: 'Incrementally ingest files', tool: 'Auto Loader', productionBehavior: 'Use cloudFiles with a checkpoint/schema location and an explicit schema-evolution strategy; route unexpected fields to rescued data when appropriate.', learningBehavior: 'Representative source rows are idempotently loaded into a Bronze managed table.', evidence: 'Bronze table, checkpoint, and schema policy are visible.' },
      { id: 'transform', title: 'Build declarative Silver/Gold', tool: 'Lakeflow pipelines', productionBehavior: 'Use streaming tables for append/incremental ingestion, materialized views for joins/aggregations, expectations for warn/drop/fail quality behavior, and AUTO CDC for CDC/SCD cases.', learningBehavior: 'The local runtime materializes representative Silver/Gold tables while the UI exposes real production semantics.', evidence: 'Silver/Gold tables and quality metrics exist.' },
      { id: 'orchestrate', title: 'Schedule and repair workflows', tool: 'Lakeflow Jobs', productionBehavior: 'Use notebook/pipeline/dbt/SQL tasks, dependencies, serverless jobs compute, file/table/schedule triggers, retries, and repair failed/skipped tasks.', learningBehavior: 'A simulated run records task status, trigger, retry policy, and repair-run semantics.', evidence: 'A job-run audit exists.' },
      { id: 'serve', title: 'Serve governed SQL', tool: 'Serverless SQL Warehouse', productionBehavior: 'Query Unity Catalog tables through SQL Warehouse and inspect query/profile evidence; use SQL compute instead of notebook Spark for SQL-only consumption.', learningBehavior: 'A real local SQL query validates the final Gold result.', evidence: 'SQL serving audit exists.' },
      { id: 'operate', title: 'Observe lineage and performance', tool: 'Jobs UI + Catalog lineage + Spark UI', productionBehavior: 'Use run timelines, lineage, expectations/event logs, query profiles, and Spark UI only for Spark workloads. Diagnose skew/shuffle rather than optimizing blindly.', learningBehavior: 'The app writes an operations checkpoint and exposes production-shaped metrics without claiming real cluster execution.', evidence: 'Operational checkpoint and lineage exist.' },
    ],
  };
}

function sourceForCase(workspace: DataWorkspace, caseStudy: CaseStudy): WorkspaceTable | undefined {
  if (caseStudy.id === 'retail-medallion') return tableName(workspace, ['raw.sales_csv', 'bronze.sales_raw']);
  if (caseStudy.id === 'turbine-realtime') return tableName(workspace, ['iot.turbine_events']);
  return tableName(workspace, ['erp.sales_order']);
}

function customerSource(workspace: DataWorkspace): WorkspaceTable | undefined {
  return tableName(workspace, ['erp.customer', 'staging.customer_incremental']);
}

function dailySales(rows: Record<string, any>[]): Record<string, any>[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const date = String(row.sale_date ?? row.sale_ts ?? row.order_date ?? row.modified_at ?? '2026-09-16').slice(0, 10);
    const value = Number(row.net_sales ?? row.amount ?? ((Number(row.qty ?? 0) * Number(row.unit_price ?? 0))) ?? 0);
    totals.set(date, (totals.get(date) ?? 0) + value);
  }
  return Array.from(totals, ([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));
}

function turbineFeatures(rows: Record<string, any>[]) {
  return rows.map((row) => {
    const tempDelta = Number(row.gearbox_temp_c ?? 65) - 65;
    const vibration = Number(row.vibration_mm_s ?? 0);
    const risk = Math.max(0, Math.min(0.99, Number((vibration / 12 + Math.max(tempDelta, 0) / 60).toFixed(2))));
    return { ...row, temperature_delta: tempDelta, risk_score: risk };
  });
}

function upsertAudit(workspace: DataWorkspace, platform: ProductionPlatform, caseStudy: CaseStudy, stage: ProductionStageId, details: string) {
  const existing = findWorkspaceTable(workspace, `ops.${platform}_run_audit`);
  const rows = cloneRows(existing);
  rows.push({ case_study: caseStudy.id, stage, status: 'Succeeded', details, run_kind: 'Learning simulation', evidence_snapshot: workspace.snapshot + 1, ts: new Date().toISOString() });
  return upsertWorkspaceTable(workspace, `ops.${platform}_run_audit`, rows, { layer: 'warehouse', source: `${platform} production workflow`, actor: `${platform} production workflow`, operation: 'operational audit' });
}

export type ProductionStageEvidenceStatus = 'missing' | 'fresh' | 'stale';

export interface ProductionStageEvidence {
  stage: ProductionStageId;
  status: ProductionStageEvidenceStatus;
  snapshot: number;
  object?: string;
  reason?: string;
}

function productionStageObjects(caseStudy: CaseStudy, platform: ProductionPlatform, stage: ProductionStageId): string[] {
  if (platform === 'fabric') {
    if (stage === 'ingest') return caseStudy.id === 'retail-medallion' ? ['bronze.fabric_sales_raw'] : caseStudy.id === 'turbine-realtime' ? ['bronze.fabric_turbine_events'] : ['staging.fabric_sales_order_incremental', 'staging.fabric_customer_incremental'];
    if (stage === 'transform') return [caseStudy.id === 'retail-medallion' ? 'silver.fabric_sales_clean' : caseStudy.id === 'turbine-realtime' ? 'silver.fabric_turbine_features' : 'staging.fabric_customer_changes'];
    if (stage === 'serve') return [caseStudy.id === 'retail-medallion' ? 'gold.fabric_daily_sales' : caseStudy.id === 'turbine-realtime' ? 'gold.fabric_turbine_risk' : 'dw.fabric_dim_customer_current'];
  } else {
    if (stage === 'ingest') return caseStudy.id === 'retail-medallion' ? ['bronze.dbx_sales_raw'] : caseStudy.id === 'turbine-realtime' ? ['bronze.dbx_turbine_events'] : ['bronze.dbx_sales_order_changes', 'bronze.dbx_customer_changes'];
    if (stage === 'transform') return [caseStudy.id === 'retail-medallion' ? 'silver.dbx_sales_clean' : caseStudy.id === 'turbine-realtime' ? 'silver.dbx_turbine_features' : 'silver.dbx_customer_cdc'];
    if (stage === 'serve') return [caseStudy.id === 'retail-medallion' ? 'gold.dbx_daily_sales' : caseStudy.id === 'turbine-realtime' ? 'gold.dbx_turbine_risk' : 'gold.dbx_customer_current'];
  }
  return [];
}

function auditStageSnapshot(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform, stage: ProductionStageId): number {
  const audit = findWorkspaceTable(workspace, `ops.${platform}_run_audit`);
  const rows = (audit?.rows ?? []).filter((row) => row.case_study === caseStudy.id && row.stage === stage && row.status === 'Succeeded');
  const latest = rows.at(-1);
  if (!latest) return 0;
  const stored = Number(latest.evidence_snapshot ?? 0);
  return Number.isFinite(stored) && stored > 0 ? stored : workspaceObjectWriteSnapshot(workspace, `ops.${platform}_run_audit`);
}

function checkpointStageSnapshot(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform): number {
  const prefix = platform === 'fabric' ? 'Fabric production checkpoint' : 'Databricks production checkpoint';
  return workspace.checkpoints.filter((item) => item.label.includes(prefix) && item.label.includes(caseStudy.title)).reduce((max, item) => Math.max(max, item.snapshot), 0);
}

export function productionStageEvidence(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform, stage: ProductionStageId): ProductionStageEvidence {
  const order: ProductionStageId[] = ['design', 'govern', 'ingest', 'transform', 'orchestrate', 'serve', 'operate'];
  const objects = productionStageObjects(caseStudy, platform, stage);
  let snapshot = 0;
  let ownStaleReason = '';
  let object: string | undefined;
  if (objects.length) {
    const evidence = objects.map((name) => workspaceObjectFreshness(workspace, name));
    const missing = evidence.find((item) => item.status === 'missing');
    if (missing) return { stage, status: 'missing', snapshot: 0, object: missing.object };
    snapshot = Math.max(...evidence.map((item) => item.writeSnapshot));
    const stale = evidence.find((item) => item.status === 'stale');
    object = objects.join(' + ');
    if (stale) ownStaleReason = stale.staleBecause.join('; ') || `${stale.object} is older than its upstream inputs.`;
  } else if (stage === 'operate') {
    snapshot = checkpointStageSnapshot(workspace, caseStudy, platform);
    if (!snapshot) return { stage, status: 'missing', snapshot: 0 };
  } else {
    snapshot = auditStageSnapshot(workspace, caseStudy, platform, stage);
    if (!snapshot) return { stage, status: 'missing', snapshot: 0 };
  }

  const index = order.indexOf(stage);
  const laterPrerequisite = order.slice(0, index)
    .map((prior) => ({ prior, evidence: productionStageEvidenceShallow(workspace, caseStudy, platform, prior) }))
    .filter((item) => item.evidence.snapshot > snapshot)
    .sort((a, b) => b.evidence.snapshot - a.evidence.snapshot)[0];
  if (ownStaleReason) return { stage, status: 'stale', snapshot, object, reason: ownStaleReason };
  if (laterPrerequisite) return { stage, status: 'stale', snapshot, object, reason: `${laterPrerequisite.prior} was refreshed at snapshot ${laterPrerequisite.evidence.snapshot}, after this stage at snapshot ${snapshot}.` };
  return { stage, status: 'fresh', snapshot, object };
}

function productionStageEvidenceShallow(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform, stage: ProductionStageId): ProductionStageEvidence {
  const objects = productionStageObjects(caseStudy, platform, stage);
  if (objects.length) {
    const tables = objects.map((object) => ({ object, table: findWorkspaceTable(workspace, object) }));
    const missing = tables.find((item) => !item.table);
    if (missing) return { stage, status: 'missing', snapshot: 0, object: missing.object };
    return { stage, status: 'fresh', snapshot: Math.max(...objects.map((object) => workspaceObjectWriteSnapshot(workspace, object))), object: objects.join(' + ') };
  }
  if (stage === 'operate') {
    const snapshot = checkpointStageSnapshot(workspace, caseStudy, platform);
    return snapshot ? { stage, status: 'fresh', snapshot } : { stage, status: 'missing', snapshot: 0 };
  }
  const snapshot = auditStageSnapshot(workspace, caseStudy, platform, stage);
  return snapshot ? { stage, status: 'fresh', snapshot } : { stage, status: 'missing', snapshot: 0 };
}

export function productionLifecycleEvidence(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform): ProductionStageEvidence[] {
  const order: ProductionStageId[] = ['design', 'govern', 'ingest', 'transform', 'orchestrate', 'serve', 'operate'];
  return order.map((stage) => productionStageEvidence(workspace, caseStudy, platform, stage));
}

export function productionStageCompleted(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform, stage: ProductionStageId): boolean {
  return productionStageEvidence(workspace, caseStudy, platform, stage).status === 'fresh';
}

export function productionCompletedStages(workspace: DataWorkspace, caseStudy: CaseStudy, platform: ProductionPlatform): ProductionStageId[] {
  return productionLifecycleEvidence(workspace, caseStudy, platform).filter((item) => item.status === 'fresh').map((item) => item.stage);
}

export function runFabricProductionStage(workspace: DataWorkspace, caseStudy: CaseStudy, stage: ProductionStageId): StageRunResult {
  let next = workspace;
  const touched: string[] = [];
  if (stage === 'design' || stage === 'govern') {
    next = upsertAudit(next, 'fabric', caseStudy, stage, stage === 'design' ? 'Tool boundaries accepted.' : 'Lakehouse context + environment policy configured.');
    touched.push('ops.fabric_run_audit');
  } else if (stage === 'ingest') {
    if (caseStudy.id === 'erp-incremental') {
      const orders = tableName(next, ['erp.sales_order']);
      const customers = tableName(next, ['erp.customer']);
      next = upsertWorkspaceTable(next, 'staging.fabric_sales_order_incremental', cloneRows(orders), { layer: 'source', source: 'Fabric Copy Job · incremental', sources: orders ? [`${orders.schema}.${orders.name}`] : [], actor: 'Copy Job', operation: 'incremental order copy using watermark' });
      next = upsertWorkspaceTable(next, 'staging.fabric_customer_incremental', cloneRows(customers), { layer: 'source', source: 'Fabric Copy Job · incremental', sources: customers ? [`${customers.schema}.${customers.name}`] : [], actor: 'Copy Job', operation: 'incremental customer copy using watermark' });
      touched.push('staging.fabric_sales_order_incremental', 'staging.fabric_customer_incremental');
    } else {
      const source = sourceForCase(next, caseStudy);
      const target = caseStudy.id === 'turbine-realtime' ? 'bronze.fabric_turbine_events' : 'bronze.fabric_sales_raw';
      next = upsertWorkspaceTable(next, target, cloneRows(source), { layer: 'bronze', source: 'Fabric Copy Job', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Copy Job', operation: 'batch copy' });
      touched.push(target);
    }
  } else if (stage === 'transform') {
    if (caseStudy.id === 'retail-medallion') {
      const source = tableName(next, ['bronze.fabric_sales_raw', 'raw.sales_csv']);
      const rows = cloneRows(source).filter((row) => Number(row.qty ?? 0) > 0 && Number(row.unit_price ?? 0) >= 0).map((row) => ({ ...row, net_sales: Number(row.qty ?? 0) * Number(row.unit_price ?? 0), sale_date: String(row.sale_ts ?? '').slice(0, 10) }));
      next = upsertWorkspaceTable(next, 'silver.fabric_sales_clean', rows, { layer: 'silver', source: 'Fabric Notebook · local Python', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Notebook', operation: 'clean + enrich' });
      touched.push('silver.fabric_sales_clean');
    } else if (caseStudy.id === 'turbine-realtime') {
      const source = tableName(next, ['bronze.fabric_turbine_events', 'iot.turbine_events']);
      next = upsertWorkspaceTable(next, 'silver.fabric_turbine_features', turbineFeatures(cloneRows(source)), { layer: 'silver', source: 'Fabric Notebook · simulated PySpark production semantics', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Notebook / Spark semantics', operation: 'distributed feature engineering (simulated)' });
      touched.push('silver.fabric_turbine_features');
    } else {
      const orders = tableName(next, ['staging.fabric_sales_order_incremental', 'erp.sales_order']);
      const customers = tableName(next, ['staging.fabric_customer_incremental', 'staging.customer_incremental', 'erp.customer']);
      const rows = cloneRows(customers).map((row) => ({ ...row, model_run: 'dbt build', is_valid: Boolean(row.customer_id) }));
      next = upsertWorkspaceTable(next, 'staging.fabric_customer_changes', rows, { layer: 'silver', source: 'Fabric dbt Job', sources: [orders, customers].filter(Boolean).map((t) => `${t!.schema}.${t!.name}`), actor: 'dbt Job', operation: 'incremental relational model' });
      touched.push('staging.fabric_customer_changes');
    }
  } else if (stage === 'orchestrate') {
    next = upsertAudit(next, 'fabric', caseStudy, stage, caseStudy.id === 'turbine-realtime' ? 'Pipeline: Copy/Event ingestion → Notebook(Spark semantics) → condition → alert.' : caseStudy.id === 'erp-incremental' ? 'Pipeline: Lookup → ForEach → Copy Job → dbt Job → SCD2 procedure.' : 'Pipeline: Copy → Notebook → dbt/Dataflow → Warehouse merge.');
    touched.push('ops.fabric_run_audit');
  } else if (stage === 'serve') {
    if (caseStudy.id === 'retail-medallion') {
      const source = tableName(next, ['silver.fabric_sales_clean', 'silver.sales_clean', 'raw.sales_csv']);
      next = upsertWorkspaceTable(next, 'gold.fabric_daily_sales', dailySales(cloneRows(source)), { layer: 'gold', source: 'Fabric Warehouse/dbt serving model', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Warehouse / dbt', operation: 'aggregate serving model' });
      touched.push('gold.fabric_daily_sales');
    } else if (caseStudy.id === 'turbine-realtime') {
      const source = tableName(next, ['silver.fabric_turbine_features', 'iot.turbine_events']);
      const rows = cloneRows(source).map((row) => ({ turbine_id: row.turbine_id, risk_score: row.risk_score ?? 0, alert: Number(row.risk_score ?? 0) >= 0.75 }));
      next = upsertWorkspaceTable(next, 'gold.fabric_turbine_risk', rows, { layer: 'gold', source: 'Fabric serving table', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'SQL serving', operation: 'risk serving model' });
      touched.push('gold.fabric_turbine_risk');
    } else {
      const source = tableName(next, ['staging.fabric_customer_changes', 'erp.customer']);
      next = upsertWorkspaceTable(next, 'dw.fabric_dim_customer_current', cloneRows(source).map((row) => ({ customer_id: row.customer_id, customer_name: row.customer_name, is_current: true })), { layer: 'warehouse', source: 'Fabric Warehouse SCD2 serving projection', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Stored procedure / Warehouse', operation: 'SCD2 current projection' });
      touched.push('dw.fabric_dim_customer_current');
    }
  } else if (stage === 'operate') {
    next = createWorkspaceCheckpoint(next, `Fabric production checkpoint · ${caseStudy.title}`);
    next = upsertAudit(next, 'fabric', caseStudy, stage, `Operational checkpoint created at snapshot ${next.snapshot}.`);
    touched.push('ops.fabric_run_audit');
  }
  return { workspace: next, message: `${stage} completed · snapshot ${next.snapshot}`, touchedTables: touched, metrics: { snapshot: next.snapshot, lineageEdges: next.lineage.length, checkpoints: next.checkpoints.length } };
}

export function runDatabricksProductionStage(workspace: DataWorkspace, caseStudy: CaseStudy, stage: ProductionStageId): StageRunResult {
  let next = workspace;
  const touched: string[] = [];
  if (stage === 'design' || stage === 'govern') {
    next = upsertAudit(next, 'databricks', caseStudy, stage, stage === 'design' ? 'Serverless notebook/jobs + SQL Warehouse boundaries selected.' : 'Unity Catalog: external landing volume + managed medallion tables + least privilege.');
    touched.push('ops.databricks_run_audit');
  } else if (stage === 'ingest') {
    if (caseStudy.id === 'erp-incremental') {
      const orders = tableName(next, ['erp.sales_order']);
      const customers = tableName(next, ['erp.customer']);
      next = upsertWorkspaceTable(next, 'bronze.dbx_sales_order_changes', cloneRows(orders), { layer: 'bronze', source: 'Databricks Auto Loader', sources: orders ? [`${orders.schema}.${orders.name}`] : [], actor: 'Auto Loader', operation: 'cloudFiles order CDC ingest + checkpoint' });
      next = upsertWorkspaceTable(next, 'bronze.dbx_customer_changes', cloneRows(customers), { layer: 'bronze', source: 'Databricks Auto Loader', sources: customers ? [`${customers.schema}.${customers.name}`] : [], actor: 'Auto Loader', operation: 'cloudFiles customer CDC ingest + checkpoint' });
      touched.push('bronze.dbx_sales_order_changes', 'bronze.dbx_customer_changes');
    } else {
      const source = sourceForCase(next, caseStudy);
      const target = caseStudy.id === 'turbine-realtime' ? 'bronze.dbx_turbine_events' : 'bronze.dbx_sales_raw';
      next = upsertWorkspaceTable(next, target, cloneRows(source), { layer: 'bronze', source: 'Databricks Auto Loader', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Auto Loader', operation: 'cloudFiles incremental ingest + checkpoint' });
      touched.push(target);
    }
  } else if (stage === 'transform') {
    if (caseStudy.id === 'retail-medallion') {
      const source = tableName(next, ['bronze.dbx_sales_raw', 'raw.sales_csv']);
      const rows = cloneRows(source).filter((row) => Number(row.qty ?? 0) > 0).map((row) => ({ ...row, net_sales: Number(row.qty ?? 0) * Number(row.unit_price ?? 0), expectation_valid_qty: true }));
      next = upsertWorkspaceTable(next, 'silver.dbx_sales_clean', rows, { layer: 'silver', source: 'Lakeflow pipeline · streaming table', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Lakeflow pipelines', operation: 'streaming table + expectation drop invalid qty' });
      touched.push('silver.dbx_sales_clean');
    } else if (caseStudy.id === 'turbine-realtime') {
      const source = tableName(next, ['bronze.dbx_turbine_events', 'iot.turbine_events']);
      next = upsertWorkspaceTable(next, 'silver.dbx_turbine_features', turbineFeatures(cloneRows(source)), { layer: 'silver', source: 'Lakeflow pipeline · Spark semantics', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Lakeflow pipelines', operation: 'streaming feature engineering + expectations' });
      touched.push('silver.dbx_turbine_features');
    } else {
      const customers = tableName(next, ['bronze.dbx_customer_changes', 'staging.customer_incremental', 'erp.customer']);
      const rows = cloneRows(customers).map((row, index) => ({ ...row, sequence_by: index + 1, __START_AT: '2026-09-16T19:00:00Z', __END_AT: null, current: true }));
      next = upsertWorkspaceTable(next, 'silver.dbx_customer_cdc', rows, { layer: 'silver', source: 'Lakeflow AUTO CDC · SCD Type 2 semantics', sources: customers ? [`${customers.schema}.${customers.name}`] : [], actor: 'Lakeflow pipelines', operation: 'AUTO CDC SCD2 (simulated)' });
      touched.push('silver.dbx_customer_cdc');
    }
  } else if (stage === 'orchestrate') {
    next = upsertAudit(next, 'databricks', caseStudy, stage, caseStudy.id === 'turbine-realtime' ? 'Lakeflow Job: pipeline task → quality gate → SQL alert; file-arrival trigger; repair failed tasks.' : 'Lakeflow Job: ingest → pipeline/dbt task → SQL validation; serverless jobs compute; retry + notification.');
    touched.push('ops.databricks_run_audit');
  } else if (stage === 'serve') {
    if (caseStudy.id === 'retail-medallion') {
      const source = tableName(next, ['silver.dbx_sales_clean', 'silver.sales_clean', 'raw.sales_csv']);
      next = upsertWorkspaceTable(next, 'gold.dbx_daily_sales', dailySales(cloneRows(source)), { layer: 'gold', source: 'Databricks SQL / dbt serving model', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'SQL Warehouse / dbt', operation: 'materialized serving model' });
      touched.push('gold.dbx_daily_sales');
    } else if (caseStudy.id === 'turbine-realtime') {
      const source = tableName(next, ['silver.dbx_turbine_features', 'iot.turbine_events']);
      const rows = cloneRows(source).map((row) => ({ turbine_id: row.turbine_id, risk_score: row.risk_score ?? 0, requires_attention: Number(row.risk_score ?? 0) >= 0.75 }));
      next = upsertWorkspaceTable(next, 'gold.dbx_turbine_risk', rows, { layer: 'gold', source: 'Lakeflow materialized view', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'Lakeflow materialized view', operation: 'aggregate/serving materialization' });
      touched.push('gold.dbx_turbine_risk');
    } else {
      const source = tableName(next, ['silver.dbx_customer_cdc', 'erp.customer']);
      next = upsertWorkspaceTable(next, 'gold.dbx_customer_current', cloneRows(source).filter((row) => row.current !== false).map((row) => ({ customer_id: row.customer_id, customer_name: row.customer_name, current: true })), { layer: 'gold', source: 'Databricks SQL serving projection', sources: source ? [`${source.schema}.${source.name}`] : [], actor: 'SQL Warehouse', operation: 'current customer serving view' });
      touched.push('gold.dbx_customer_current');
    }
    next = upsertAudit(next, 'databricks', caseStudy, stage, 'Serverless SQL Warehouse query/profile validated the governed Gold result.');
    touched.push('ops.databricks_run_audit');
  } else if (stage === 'operate') {
    next = createWorkspaceCheckpoint(next, `Databricks production checkpoint · ${caseStudy.title}`);
    next = upsertAudit(next, 'databricks', caseStudy, stage, `Jobs timeline, lineage, expectations, and performance evidence reviewed at snapshot ${next.snapshot}.`);
    touched.push('ops.databricks_run_audit');
  }
  return { workspace: next, message: `${stage} completed · snapshot ${next.snapshot}`, touchedTables: touched, metrics: { snapshot: next.snapshot, lineageEdges: next.lineage.length, checkpoints: next.checkpoints.length } };
}
