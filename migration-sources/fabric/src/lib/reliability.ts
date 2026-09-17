import type { DataWorkspace, WorkspaceTable } from '../types/app';
import { defaultDbtProject, findWorkspaceTable, runDbtCommand, upsertWorkspaceTable } from './dataRuntime';
import { createWorkspaceCheckpoint } from './workspaceInsights';

type Row = Record<string, unknown>;

export type ReliabilitySeverity = 'Critical' | 'Warning' | 'Info';

export interface ReliabilityRuleResult {
  id: string;
  title: string;
  table: string;
  severity: ReliabilitySeverity;
  passed: boolean;
  observed: string;
  expected: string;
  hint: string;
}

export interface ReliabilityIncidentDefinition {
  id: string;
  title: string;
  symptom: string;
  productionImpact: string;
  injectedObject: string;
  preferredRecovery: string;
  wrongTool: string;
  whyNotWrongTool: string;
  supportsDbt: boolean;
}

export interface ReliabilityAssessment {
  rules: ReliabilityRuleResult[];
  passed: number;
  failed: number;
  criticalFailed: number;
  status: 'Healthy' | 'Degraded' | 'Broken';
}

export interface DbtReliabilityResult {
  workspace: DataWorkspace;
  log: string[];
  passed: number;
  failed: number;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const qn = (table: WorkspaceTable) => `${table.schema}.${table.name}`;

export const reliabilityIncidents: Record<string, ReliabilityIncidentDefinition> = {
  'retail-medallion': {
    id: 'retail-duplicate-negative',
    title: 'Duplicate sales + invalid quantity',
    symptom: 'A late CSV replay introduced a duplicate sale_id and one malformed negative-quantity record into Bronze.',
    productionImpact: 'A duplicate key can double-count revenue; a negative quantity can corrupt Gold metrics unless it is rejected or explicitly modeled as a return.',
    injectedObject: 'bronze.sales_raw',
    preferredRecovery: 'Stop downstream promotion, inspect the failed quality/dbt checks, clean or quarantine the invalid Bronze records, then rerun the transformation from the last safe checkpoint.',
    wrongTool: 'Start a Spark cluster and rewrite the whole pipeline in PySpark.',
    whyNotWrongTool: 'This is a correctness problem on a small relational batch. Spark adds compute complexity but does not solve duplicate-key semantics or data contracts.',
    supportsDbt: true,
  },
  'turbine-realtime': {
    id: 'turbine-contract-drift',
    title: 'Sensor contract drift + duplicate event',
    symptom: 'A firmware rollout emitted a duplicate event_id and an event with a missing gearbox temperature.',
    productionImpact: 'The duplicate can over-weight a turbine in feature calculations and the missing temperature can produce an invalid risk score or false alert.',
    injectedObject: 'iot.turbine_events',
    preferredRecovery: 'Quarantine malformed events at the ingestion/quality boundary, deduplicate by event_id, replay the clean micro-batch, and only then recompute features/alerts.',
    wrongTool: 'Use dbt as the primary raw-stream repair engine.',
    whyNotWrongTool: 'dbt is excellent for SQL transformation models downstream, but the raw streaming contract and replay boundary should be handled before analytical modeling.',
    supportsDbt: false,
  },
  'erp-incremental': {
    id: 'erp-watermark-poison',
    title: 'Poisoned watermark + duplicate customer change',
    symptom: 'The customer watermark was advanced into the future while a duplicate customer business key entered the change set.',
    productionImpact: 'Future incremental runs silently skip legitimate changes, while duplicate business keys can break SCD Type 2 history and uniqueness assumptions.',
    injectedObject: 'control.watermarks + erp.customer',
    preferredRecovery: 'Restore or correct the watermark, re-extract the missed interval, let dbt validate/conform the customer changes, then rerun the idempotent SCD2 merge.',
    wrongTool: 'Full-refresh every ERP entity with Spark.',
    whyNotWrongTool: 'The failure is state-management and idempotency, not distributed compute. A full refresh is expensive and can hide the root cause instead of repairing the incremental contract.',
    supportsDbt: true,
  },
};

function rowsOf(workspace: DataWorkspace, tableName: string): Row[] {
  return clone((findWorkspaceTable(workspace, tableName)?.rows ?? []) as Row[]);
}

function unique(values: unknown[]): boolean {
  return new Set(values.map((value) => JSON.stringify(value))).size === values.length;
}

function rule(id: string, title: string, table: string, severity: ReliabilitySeverity, passed: boolean, observed: string, expected: string, hint: string): ReliabilityRuleResult {
  return { id, title, table, severity, passed, observed, expected, hint };
}

export function assessReliability(workspace: DataWorkspace): ReliabilityAssessment {
  const rules: ReliabilityRuleResult[] = [];
  if (workspace.caseStudyId === 'retail-medallion') {
    const rows = rowsOf(workspace, 'bronze.sales_raw');
    const ids = rows.map((row) => row.sale_id);
    const invalidQty = rows.filter((row) => Number(row.qty ?? 0) <= 0).length;
    const missingKeys = rows.filter((row) => !row.sale_id || !row.customer_id || !row.product_id).length;
    rules.push(
      rule('retail-unique-sale', 'sale_id is unique', 'bronze.sales_raw', 'Critical', unique(ids), `${rows.length - new Set(ids.map(String)).size} duplicate row(s)`, '0 duplicate rows', 'Deduplicate using the transaction business key before Silver.'),
      rule('retail-positive-qty', 'Quantity is positive', 'bronze.sales_raw', 'Critical', invalidQty === 0, `${invalidQty} invalid row(s)`, 'qty > 0', 'Reject/quarantine malformed rows or explicitly model returns as a separate business rule.'),
      rule('retail-required-keys', 'Business keys are present', 'bronze.sales_raw', 'Critical', missingKeys === 0, `${missingKeys} row(s) missing a required key`, 'sale_id/customer_id/product_id populated', 'Prevent invalid keys from reaching the star schema.'),
    );
  } else if (workspace.caseStudyId === 'turbine-realtime') {
    const rows = rowsOf(workspace, 'iot.turbine_events');
    const ids = rows.map((row) => row.event_id);
    const missingTemperature = rows.filter((row) => row.gearbox_temp_c === null || row.gearbox_temp_c === undefined || row.gearbox_temp_c === '').length;
    const missingTimestamp = rows.filter((row) => !row.event_ts).length;
    rules.push(
      rule('turbine-unique-event', 'event_id is unique', 'iot.turbine_events', 'Critical', unique(ids), `${rows.length - new Set(ids.map(String)).size} duplicate event(s)`, '0 duplicate events', 'Use the event identifier as a replay-safe deduplication key.'),
      rule('turbine-temperature', 'Gearbox temperature is present', 'iot.turbine_events', 'Critical', missingTemperature === 0, `${missingTemperature} event(s) missing temperature`, '0 missing temperature values', 'Quarantine malformed events before computing the risk score.'),
      rule('turbine-event-time', 'Event timestamp is present', 'iot.turbine_events', 'Warning', missingTimestamp === 0, `${missingTimestamp} event(s) missing event time`, '0 missing event timestamps', 'Event-time windows require a reliable timestamp.'),
    );
  } else if (workspace.caseStudyId === 'erp-incremental') {
    const customers = rowsOf(workspace, 'erp.customer');
    const ids = customers.map((row) => row.customer_id);
    const missingNames = customers.filter((row) => !row.customer_name).length;
    const watermarkRows = rowsOf(workspace, 'control.watermarks');
    const futureWatermarks = watermarkRows.filter((row) => String(row.last_successful_ts ?? '') > '2026-09-17 23:59:59').length;
    const currentDim = rowsOf(workspace, 'dw.dim_customer').filter((row) => row.is_current === true);
    const currentIds = currentDim.map((row) => row.customer_id);
    rules.push(
      rule('erp-unique-customer', 'ERP customer business key is unique', 'erp.customer', 'Critical', unique(ids), `${customers.length - new Set(ids.map(String)).size} duplicate customer row(s)`, '0 duplicate customer_id values', 'Deduplicate the source change set before the SCD2 merge.'),
      rule('erp-customer-name', 'Customer name is present', 'erp.customer', 'Warning', missingNames === 0, `${missingNames} customer(s) missing a name`, '0 missing names', 'Decide whether missing attributes are rejected, defaulted, or historized.'),
      rule('erp-watermark', 'Watermarks do not point into the future', 'control.watermarks', 'Critical', futureWatermarks === 0, `${futureWatermarks} future watermark(s)`, 'watermark ≤ latest source time', 'Correct the control state before re-running incremental extraction.'),
      rule('erp-current-scd', 'Only one current dimension row per customer', 'dw.dim_customer', 'Critical', unique(currentIds), `${currentDim.length - new Set(currentIds.map(String)).size} duplicate current version(s)`, '1 current row per business key', 'SCD2 reruns must remain idempotent.'),
    );
  }
  const failed = rules.filter((item) => !item.passed);
  const criticalFailed = failed.filter((item) => item.severity === 'Critical').length;
  return { rules, passed: rules.length - failed.length, failed: failed.length, criticalFailed, status: criticalFailed > 0 ? 'Broken' : failed.length > 0 ? 'Degraded' : 'Healthy' };
}

function withIncidentCheckpoint(workspace: DataWorkspace): DataWorkspace {
  const hasCheckpoint = (workspace.checkpoints ?? []).some((checkpoint) => checkpoint.label === 'Pre-incident safe point' && checkpoint.snapshot === workspace.snapshot);
  return hasCheckpoint ? workspace : createWorkspaceCheckpoint(workspace, 'Pre-incident safe point');
}

export function injectReliabilityIncident(workspace: DataWorkspace): DataWorkspace {
  let next = withIncidentCheckpoint(workspace);
  if (workspace.caseStudyId === 'retail-medallion') {
    const rows = rowsOf(next, 'bronze.sales_raw');
    const duplicate = rows.find((row) => String(row.sale_id) === '1002') ?? rows[0];
    const malformed: Row = { ...(rows.at(-1) ?? duplicate ?? {}), sale_id: 1099, qty: -4, customer_id: 'C031', product_id: 'P07' };
    const injected = [...rows, clone(duplicate ?? {}), malformed];
    next = upsertWorkspaceTable(next, 'bronze.sales_raw', injected, { mode: 'overwrite', source: 'Reliability lab fault injection', sources: ['raw.sales_csv'], actor: 'Reliability Lab', operation: 'Inject duplicate + invalid quantity' });
  } else if (workspace.caseStudyId === 'turbine-realtime') {
    const rows = rowsOf(next, 'iot.turbine_events');
    const duplicate = rows.find((row) => String(row.event_id) === 'e-902') ?? rows[0];
    const malformed: Row = { ...(rows.at(-1) ?? duplicate ?? {}), event_id: 'e-999', gearbox_temp_c: null, event_ts: '2026-09-16 19:31:23' };
    next = upsertWorkspaceTable(next, 'iot.turbine_events', [...rows, clone(duplicate ?? {}), malformed], { mode: 'overwrite', source: 'Reliability lab fault injection', sources: ['iot.turbine_events'], actor: 'Reliability Lab', operation: 'Inject replay duplicate + contract drift' });
  } else if (workspace.caseStudyId === 'erp-incremental') {
    const customers = rowsOf(next, 'erp.customer');
    const duplicate = customers.find((row) => String(row.customer_id) === 'C104') ?? customers[0];
    const duplicateCustomer = { ...(duplicate ?? {}), customer_name: 'Nordic Wind Group AS - duplicate feed', modified_at: '2026-09-16 19:10:00' };
    next = upsertWorkspaceTable(next, 'erp.customer', [...customers, duplicateCustomer], { mode: 'overwrite', source: 'Reliability lab fault injection', sources: ['erp.customer'], actor: 'Reliability Lab', operation: 'Inject duplicate business key' });
    const staged = findWorkspaceTable(next, 'staging.customer_incremental');
    if (staged) next = upsertWorkspaceTable(next, 'staging.customer_incremental', [...clone(staged.rows as Row[]), duplicateCustomer], { mode: 'overwrite', source: 'Reliability lab fault injection', sources: ['erp.customer'], actor: 'Reliability Lab', operation: 'Inject duplicate into staged change set' });
    const watermarks = rowsOf(next, 'control.watermarks').map((row) => String(row.entity_name) === 'customer' ? { ...row, last_successful_ts: '2026-12-31 23:59:59' } : row);
    next = upsertWorkspaceTable(next, 'control.watermarks', watermarks, { mode: 'overwrite', source: 'Reliability lab fault injection', sources: ['control.watermarks'], actor: 'Reliability Lab', operation: 'Poison incremental watermark' });
  }
  return next;
}

export function repairReliabilityIncident(workspace: DataWorkspace): DataWorkspace {
  let next = workspace;
  if (workspace.caseStudyId === 'retail-medallion') {
    const rows = rowsOf(next, 'bronze.sales_raw');
    const seen = new Set<string>(); const rejected: Row[] = [];
    const clean = rows.filter((row) => {
      const id = JSON.stringify(row.sale_id);
      const invalid = seen.has(id) || Number(row.qty ?? 0) <= 0 || !row.sale_id || !row.customer_id || !row.product_id;
      if (invalid) { rejected.push(row); return false; }
      seen.add(id); return true;
    });
    if (rejected.length) next = upsertWorkspaceTable(next, 'quarantine.sales_rejected', rejected, { mode: 'overwrite', layer: 'bronze', source: 'Reliability lab quarantine', sources: ['bronze.sales_raw'], actor: 'Reliability Lab', operation: 'Quarantine invalid sales' });
    next = upsertWorkspaceTable(next, 'bronze.sales_raw', clean, { mode: 'overwrite', source: 'Reliability lab repair', sources: ['bronze.sales_raw'], actor: 'Reliability Lab', operation: 'Deduplicate + reject invalid sales' });
  } else if (workspace.caseStudyId === 'turbine-realtime') {
    const rows = rowsOf(next, 'iot.turbine_events');
    const seen = new Set<string>(); const rejected: Row[] = [];
    const clean = rows.filter((row) => {
      const id = JSON.stringify(row.event_id);
      const invalid = seen.has(id) || row.gearbox_temp_c === null || row.gearbox_temp_c === undefined || !row.event_ts;
      if (invalid) { rejected.push(row); return false; }
      seen.add(id); return true;
    });
    if (rejected.length) next = upsertWorkspaceTable(next, 'quarantine.turbine_events_rejected', rejected, { mode: 'overwrite', layer: 'bronze', source: 'Reliability lab quarantine', sources: ['iot.turbine_events'], actor: 'Reliability Lab', operation: 'Quarantine malformed events' });
    next = upsertWorkspaceTable(next, 'iot.turbine_events', clean, { mode: 'overwrite', source: 'Reliability lab repair', sources: ['iot.turbine_events'], actor: 'Reliability Lab', operation: 'Deduplicate replay + retain valid events' });
  } else if (workspace.caseStudyId === 'erp-incremental') {
    const customers = rowsOf(next, 'erp.customer');
    const byId = new Map<string, Row>();
    for (const row of customers) {
      const key = String(row.customer_id ?? '');
      const previous = byId.get(key);
      if (!previous || String(row.modified_at ?? '') > String(previous.modified_at ?? '')) byId.set(key, row);
    }
    const cleanCustomers = [...byId.values()];
    const rejected = customers.filter((row, index) => customers.findIndex((candidate) => String(candidate.customer_id) === String(row.customer_id)) !== index);
    if (rejected.length) next = upsertWorkspaceTable(next, 'quarantine.customer_changes_rejected', rejected, { mode: 'overwrite', layer: 'bronze', source: 'Reliability lab quarantine', sources: ['erp.customer'], actor: 'Reliability Lab', operation: 'Quarantine duplicate customer changes' });
    next = upsertWorkspaceTable(next, 'erp.customer', cleanCustomers, { mode: 'overwrite', source: 'Reliability lab repair', sources: ['erp.customer'], actor: 'Reliability Lab', operation: 'Deduplicate customer change feed' });
    const staged = findWorkspaceTable(next, 'staging.customer_incremental');
    if (staged) {
      const stagedById = new Map<string, Row>();
      for (const row of staged.rows as Row[]) {
        const key = String(row.customer_id ?? ''); const previous = stagedById.get(key);
        if (!previous || String(row.modified_at ?? '') > String(previous.modified_at ?? '')) stagedById.set(key, row);
      }
      next = upsertWorkspaceTable(next, 'staging.customer_incremental', [...stagedById.values()], { mode: 'overwrite', source: 'Reliability lab repair', sources: ['erp.customer'], actor: 'Reliability Lab', operation: 'Deduplicate staged customer changes' });
    }
    const watermarks = rowsOf(next, 'control.watermarks').map((row) => String(row.entity_name) === 'customer' && String(row.last_successful_ts ?? '') > '2026-09-17 23:59:59'
      ? { ...row, last_successful_ts: '2026-09-16 18:45:00' }
      : row);
    next = upsertWorkspaceTable(next, 'control.watermarks', watermarks, { mode: 'overwrite', source: 'Reliability lab repair', sources: ['control.watermarks'], actor: 'Reliability Lab', operation: 'Restore safe customer watermark' });
  }
  return next;
}

export function runReliabilityDbt(workspace: DataWorkspace): DbtReliabilityResult {
  const project = defaultDbtProject(workspace);
  const result = runDbtCommand(workspace, project, { command: 'dbt build', failFast: false, threads: 4 });
  return result;
}

export function incidentDefinition(caseStudyId: string): ReliabilityIncidentDefinition {
  return reliabilityIncidents[caseStudyId] ?? reliabilityIncidents['retail-medallion'];
}
