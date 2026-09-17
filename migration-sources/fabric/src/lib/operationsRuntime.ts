import type { CaseStudy, DataWorkspace, PipelineRun, PipelineRunActivity, RunStatus } from '../types/app';
import { findWorkspaceTable, upsertWorkspaceTable } from './dataRuntime';
import { runDatabricksProductionStage } from './productionWorkflow';

export type FabricRetryMode = 'Full retry' | 'From failed activity' | 'From selected activity';

function cloneActivity(activity: PipelineRunActivity): PipelineRunActivity {
  return {
    ...activity,
    metrics: { ...activity.metrics },
    dependencies: activity.dependencies?.map((dependency) => ({ ...dependency })),
  };
}

function dependencyMatches(condition: NonNullable<PipelineRunActivity['dependencies']>[number]['condition'], sourceStatus: RunStatus): boolean {
  if (condition === 'Succeeded') return sourceStatus === 'Succeeded';
  if (condition === 'Failed') return sourceStatus === 'Failed';
  if (condition === 'Skipped') return sourceStatus === 'Skipped';
  return sourceStatus === 'Succeeded' || sourceStatus === 'Failed' || sourceStatus === 'Skipped';
}

function descendantScope(activities: PipelineRunActivity[], roots: Set<string>): Set<string> {
  const scope = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    activities.forEach((activity) => {
      if (scope.has(activity.nodeId)) return;
      if ((activity.dependencies ?? []).some((dependency) => scope.has(dependency.nodeId))) {
        scope.add(activity.nodeId);
        changed = true;
      }
    });
  }
  return scope;
}

function retryScope(source: PipelineRun, mode: FabricRetryMode, selectedNodeId?: string): { roots: Set<string>; scope: Set<string> } {
  const activities = source.activities;
  if (mode === 'Full retry') {
    const all = new Set(activities.map((activity) => activity.nodeId));
    return { roots: all, scope: all };
  }
  if (mode === 'From selected activity') {
    const selected = activities.some((activity) => activity.nodeId === selectedNodeId) ? selectedNodeId : undefined;
    const roots = new Set(selected ? [selected] : []);
    return { roots, scope: descendantScope(activities, roots) };
  }
  const roots = new Set(activities.filter((activity) => activity.status === 'Failed').map((activity) => activity.nodeId));
  return { roots, scope: descendantScope(activities, roots) };
}

function topologicalActivities(activities: PipelineRunActivity[]): PipelineRunActivity[] {
  const remaining = new Set(activities.map((activity) => activity.nodeId));
  const ordered: PipelineRunActivity[] = [];
  while (remaining.size) {
    let progressed = false;
    for (const activity of activities) {
      if (!remaining.has(activity.nodeId)) continue;
      const dependencies = activity.dependencies ?? [];
      if (dependencies.some((dependency) => remaining.has(dependency.nodeId))) continue;
      ordered.push(activity);
      remaining.delete(activity.nodeId);
      progressed = true;
    }
    if (!progressed) {
      activities.filter((activity) => remaining.has(activity.nodeId)).forEach((activity) => ordered.push(activity));
      break;
    }
  }
  return ordered;
}

export function fabricRetryScopeKeys(source: PipelineRun, mode: FabricRetryMode, selectedNodeId?: string): string[] {
  return [...retryScope(source, mode, selectedNodeId).scope];
}

export function createFabricRetryRun(source: PipelineRun, mode: FabricRetryMode, selectedNodeId?: string): PipelineRun {
  const activities = source.activities.map(cloneActivity);
  const { roots, scope } = retryScope(source, mode, selectedNodeId);
  const byId = new Map(activities.map((activity) => [activity.nodeId, activity]));
  const statusById = new Map<string, RunStatus>();
  const outputById = new Map<string, PipelineRunActivity>();

  for (const activity of topologicalActivities(activities)) {
    if (!scope.has(activity.nodeId)) {
      const preserved: PipelineRunActivity = {
        ...activity,
        durationMs: 0,
        startOffsetMs: 0,
        error: undefined,
        output: `Preserved from parent run ${source.id}; this activity was not executed again.`,
        metrics: { ...activity.metrics, rerun_scope: 'preserved' },
        rerunDisposition: 'Preserved',
      };
      statusById.set(activity.nodeId, preserved.status);
      outputById.set(activity.nodeId, preserved);
      continue;
    }

    const dependencies = activity.dependencies ?? [];
    const dependenciesSatisfied = mode !== 'Full retry' && roots.has(activity.nodeId)
      ? true
      : dependencies.every((dependency) => dependencyMatches(dependency.condition, statusById.get(dependency.nodeId) ?? byId.get(dependency.nodeId)?.status ?? 'Not run'));
    const status: RunStatus = dependenciesSatisfied ? 'Succeeded' : 'Skipped';
    const executed: PipelineRunActivity = {
      ...activity,
      status,
      durationMs: status === 'Skipped' ? 0 : Math.max(activity.durationMs || 600, 500),
      attempts: status === 'Skipped' ? 0 : Math.max(activity.attempts, 1),
      error: undefined,
      output: status === 'Skipped'
        ? 'Skipped on rerun because the dependency condition was not satisfied after the rerun outcome changed.'
        : `${activity.output || 'Activity completed'}\nRerun simulation: activity executed again and succeeded.`,
      metrics: status === 'Skipped' ? { rerun_scope: 'executed_but_condition_skipped' } : { ...activity.metrics, rerun_scope: 'executed' },
      rerunDisposition: 'Executed',
    };
    statusById.set(activity.nodeId, status);
    outputById.set(activity.nodeId, executed);
  }

  const rerunActivities = activities.map((activity) => outputById.get(activity.nodeId) ?? activity);
  const offsetById = new Map<string, number>();
  for (const activity of topologicalActivities(rerunActivities)) {
    if (activity.rerunDisposition === 'Preserved' || activity.status === 'Skipped') {
      activity.startOffsetMs = 0;
      offsetById.set(activity.nodeId, 0);
      continue;
    }
    const incoming = activity.dependencies ?? [];
    const start = incoming.length
      ? Math.max(...incoming.map((dependency) => {
          const upstream = outputById.get(dependency.nodeId);
          if (!upstream || upstream.rerunDisposition === 'Preserved') return 0;
          return (offsetById.get(dependency.nodeId) ?? 0) + upstream.durationMs;
        }))
      : 0;
    activity.startOffsetMs = start;
    offsetById.set(activity.nodeId, start);
  }

  const durationMs = rerunActivities.reduce((max, activity) => activity.rerunDisposition === 'Preserved' ? max : Math.max(max, activity.startOffsetMs + activity.durationMs), 0);
  const status: RunStatus = rerunActivities.some((activity) => activity.rerunDisposition !== 'Preserved' && activity.status === 'Failed') ? 'Failed' : 'Succeeded';
  const rootNames = [...roots].map((nodeId) => byId.get(nodeId)?.name ?? nodeId).join(', ');

  return {
    ...source,
    id: `run-${Date.now()}-retry`,
    startedAt: new Date().toISOString(),
    durationMs: Math.max(durationMs, 1),
    status,
    trigger: mode === 'Full retry' ? `Retry full run · ${source.id}` : `${mode} · ${rootNames || source.id}`,
    parentRunId: source.id,
    rerunMode: mode,
    rerunFromNodeId: mode === 'Full retry' ? undefined : [...roots][0],
    parameterValues: { ...(source.parameterValues ?? {}) },
    variableValues: { ...(source.variableValues ?? {}) },
    activities: rerunActivities,
  };
}

export type AutoLoaderEvolutionMode = 'addNewColumns' | 'addNewColumnsWithTypeWidening' | 'failOnNewColumns' | 'rescue';
export type AutoLoaderIncidentStatus = 'Ready' | 'Failed' | 'Restart required' | 'Succeeded' | 'Rescued';

export interface AutoLoaderIncidentResult {
  status: AutoLoaderIncidentStatus;
  message: string;
  schemaChanged: boolean;
  rescuedRecords: number;
  restartRequired: boolean;
  targetColumns: string[];
}

export function simulateAutoLoaderSchemaDrift(
  mode: AutoLoaderEvolutionMode,
  restarted = false,
): AutoLoaderIncidentResult {
  const base = ['event_id', 'device_id', 'event_ts', 'temperature'];
  const evolved = [...base, 'firmware_version'];
  if (mode === 'failOnNewColumns') {
    return {
      status: 'Failed',
      message: 'New column firmware_version violates the strict schema contract. Update the schema/evolution policy before rerunning.',
      schemaChanged: false,
      rescuedRecords: 0,
      restartRequired: false,
      targetColumns: base,
    };
  }
  if (mode === 'rescue') {
    return {
      status: 'Rescued',
      message: 'Unexpected firmware_version and incompatible values were captured in _rescued_data; the target schema stayed unchanged.',
      schemaChanged: false,
      rescuedRecords: 37,
      restartRequired: false,
      targetColumns: [...base, '_rescued_data'],
    };
  }
  if (!restarted) {
    return {
      status: 'Restart required',
      message: mode === 'addNewColumnsWithTypeWidening'
        ? 'Auto Loader detected firmware_version and a compatible INT→DOUBLE widening. Schema state was updated; restart the stream to continue with the evolved schema.'
        : 'Auto Loader detected firmware_version and updated its inferred schema state. The stream stops once; restart it to continue.',
      schemaChanged: true,
      rescuedRecords: 0,
      restartRequired: true,
      targetColumns: evolved,
    };
  }
  return {
    status: 'Succeeded',
    message: mode === 'addNewColumnsWithTypeWidening'
      ? 'Restart succeeded. firmware_version was added and temperature widened to DOUBLE.'
      : 'Restart succeeded with firmware_version added to the target schema.',
    schemaChanged: true,
    rescuedRecords: 0,
    restartRequired: false,
    targetColumns: evolved,
  };
}


export function applyAutoLoaderSchemaDriftToWorkspace(
  workspace: DataWorkspace,
  targetName: string,
  mode: AutoLoaderEvolutionMode,
): DataWorkspace {
  const target = findWorkspaceTable(workspace, targetName);
  if (!target) return workspace;
  const rows = target.rows.map((row, index) => {
    if (mode === 'rescue') {
      return {
        ...row,
        _rescued_data: index === 0 ? JSON.stringify({ firmware_version: 'v3.8.1', temperature: '82.9' }) : null,
      };
    }
    return { ...row, firmware_version: 'v3.8.1' };
  });
  return upsertWorkspaceTable(workspace, targetName, rows, {
    layer: target.layer,
    source: mode === 'rescue' ? 'Auto Loader rescued-data evolution' : 'Auto Loader additive schema evolution',
    actor: 'Auto Loader',
    operation: mode === 'rescue' ? 'rescue unexpected payload' : 'schema evolution restart',
  });
}

export type JobTaskStatus = 'Succeeded' | 'Failed' | 'Skipped';
export interface JobTaskResult {
  key: string;
  status: JobTaskStatus;
  dependsOn: string[];
  attempts: number;
  output: string;
  taskValues?: Record<string, string | number | boolean>;
  repairDisposition?: 'Executed' | 'Preserved';
}

export interface DatabricksJobRunModel {
  id: string;
  repairedFrom?: string;
  parameters: Record<string, string>;
  tasks: JobTaskResult[];
  status: 'Succeeded' | 'Failed';
  repairNumber: number;
}

export function simulateDatabricksJobRun(failQualityGate: boolean, parameters: Record<string, string> = {}): DatabricksJobRunModel {
  const targetLayer = parameters.target_layer || 'gold';
  const ingest: JobTaskResult = { key: 'ingest_bronze', status: 'Succeeded', dependsOn: [], attempts: 1, output: '4,820 rows ingested', taskValues: { rows_ingested: 4820, batch_id: 18 } };
  const clean: JobTaskResult = { key: 'clean_silver', status: 'Succeeded', dependsOn: ['ingest_bronze'], attempts: 1, output: `Cleaned rows using target_layer=${targetLayer}`, taskValues: { valid_rows: 4777 } };
  const audit: JobTaskResult = { key: 'publish_audit', status: 'Succeeded', dependsOn: ['clean_silver'], attempts: 1, output: 'Published independent audit metrics', taskValues: { invalid_rows: 43 } };
  const quality: JobTaskResult = { key: 'quality_gate', status: failQualityGate ? 'Failed' : 'Succeeded', dependsOn: ['clean_silver'], attempts: 1, output: failQualityGate ? 'Expectation violation: 12 invalid records' : 'Quality checks passed' };
  const aggregate: JobTaskResult = { key: 'aggregate_gold', status: failQualityGate ? 'Skipped' : 'Succeeded', dependsOn: ['quality_gate'], attempts: failQualityGate ? 0 : 1, output: failQualityGate ? 'Skipped because quality_gate failed' : `Published ${targetLayer} aggregate` };
  return {
    id: `job-run-${Date.now()}`,
    parameters: { processing_date: parameters.processing_date || '2026-09-17', target_layer: targetLayer },
    tasks: [ingest, clean, audit, quality, aggregate],
    status: failQualityGate ? 'Failed' : 'Succeeded',
    repairNumber: 0,
  };
}


export interface DatabricksJobWorkspaceResult {
  workspace: DataWorkspace;
  touchedStages: string[];
  touchedTables: string[];
}

/**
 * Materialize the representative data effects of a Lakeflow Jobs run into the
 * shared learning workspace. Original runs apply every succeeded task. Repair
 * runs apply only tasks that were actually rerun; preserved tasks keep their
 * parent-run evidence and are deliberately not rewritten.
 */
export function applyDatabricksJobRunToWorkspace(workspace: DataWorkspace, caseStudy: CaseStudy, run: DatabricksJobRunModel): DatabricksJobWorkspaceResult {
  let next = workspace;
  const touchedStages: string[] = [];
  const touchedTables: string[] = [];
  const shouldApply = (task: JobTaskResult) => task.status === 'Succeeded' && (!run.repairedFrom || task.repairDisposition === 'Executed');
  const applyStage = (stage: 'ingest' | 'transform' | 'orchestrate' | 'serve') => {
    const result = runDatabricksProductionStage(next, caseStudy, stage);
    next = result.workspace;
    touchedStages.push(stage);
    touchedTables.push(...result.touchedTables);
  };

  for (const task of run.tasks) {
    if (!shouldApply(task)) continue;
    if (task.key === 'ingest_bronze') applyStage('ingest');
    else if (task.key === 'clean_silver') applyStage('transform');
    else if (task.key === 'publish_audit') applyStage('orchestrate');
    else if (task.key === 'aggregate_gold') applyStage('serve');
  }

  // Persist the full operational run/task matrix, including failures, skips and
  // preserved repair tasks. This is separate from data effects so navigation or
  // page remounts do not erase the operational history.
  next = upsertWorkspaceTable(next, 'ops.databricks_job_runs', [{
    run_id: run.id,
    status: run.status,
    repaired_from: run.repairedFrom ?? null,
    repair_number: run.repairNumber,
    processing_date: run.parameters.processing_date ?? null,
    target_layer: run.parameters.target_layer ?? null,
  }], { layer: 'warehouse', mode: 'append', source: 'Lakeflow Jobs simulator', actor: 'Lakeflow Jobs', operation: 'persist job run history' });
  touchedTables.push('ops.databricks_job_runs');

  const taskRows = run.tasks.map((task) => ({
    run_id: run.id,
    task_key: task.key,
    task_status: task.status,
    attempts: task.attempts,
    output: task.output,
    depends_on: task.dependsOn.join(','),
    repair_disposition: task.repairDisposition ?? (run.repairedFrom ? 'Preserved' : 'Executed'),
    rows_ingested: task.taskValues?.rows_ingested ?? null,
    batch_id: task.taskValues?.batch_id ?? null,
    valid_rows: task.taskValues?.valid_rows ?? null,
    invalid_rows: task.taskValues?.invalid_rows ?? null,
  }));
  next = upsertWorkspaceTable(next, 'ops.databricks_job_tasks', taskRows, { layer: 'warehouse', mode: 'append', source: 'Lakeflow Jobs simulator', actor: 'Lakeflow Jobs', operation: 'persist job task matrix' });
  touchedTables.push('ops.databricks_job_tasks');

  return { workspace: next, touchedStages: Array.from(new Set(touchedStages)), touchedTables: Array.from(new Set(touchedTables)) };
}

export function loadDatabricksJobRunsFromWorkspace(workspace: DataWorkspace): DatabricksJobRunModel[] {
  const runs = findWorkspaceTable(workspace, 'ops.databricks_job_runs')?.rows ?? [];
  const tasks = findWorkspaceTable(workspace, 'ops.databricks_job_tasks')?.rows ?? [];
  const seen = new Set<string>();
  const ordered = [...runs].reverse().filter((row) => {
    const id = String(row.run_id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return ordered.map((row) => {
    const id = String(row.run_id);
    const taskRows = tasks.filter((task) => String(task.run_id ?? '') === id);
    const mappedTasks: JobTaskResult[] = taskRows.map((task) => {
      const taskValues: Record<string, string | number | boolean> = {};
      const candidates = { rows_ingested: task.rows_ingested, batch_id: task.batch_id, valid_rows: task.valid_rows, invalid_rows: task.invalid_rows };
      Object.entries(candidates).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') taskValues[key] = value;
      });
      return {
        key: String(task.task_key),
        status: String(task.task_status) as JobTaskStatus,
        dependsOn: String(task.depends_on ?? '').split(',').filter(Boolean),
        attempts: Number(task.attempts ?? 0),
        output: String(task.output ?? ''),
        repairDisposition: String(task.repair_disposition ?? '') === 'Preserved' ? 'Preserved' : 'Executed',
        taskValues,
      };
    });
    return {
      id,
      repairedFrom: row.repaired_from ? String(row.repaired_from) : undefined,
      parameters: { processing_date: String(row.processing_date ?? ''), target_layer: String(row.target_layer ?? '') },
      tasks: mappedTasks,
      status: String(row.status) as 'Succeeded' | 'Failed',
      repairNumber: Number(row.repair_number ?? 0),
    };
  });
}

export function repairTaskKeys(run: DatabricksJobRunModel): string[] {
  const unsuccessful = new Set(run.tasks.filter((task) => task.status !== 'Succeeded').map((task) => task.key));
  let changed = true;
  while (changed) {
    changed = false;
    run.tasks.forEach((task) => {
      if (task.dependsOn.some((dependency) => unsuccessful.has(dependency)) && !unsuccessful.has(task.key)) {
        unsuccessful.add(task.key);
        changed = true;
      }
    });
  }
  return run.tasks.filter((task) => unsuccessful.has(task.key)).map((task) => task.key);
}

export function repairDatabricksJobRun(run: DatabricksJobRunModel, overrides: Record<string, string> = {}): DatabricksJobRunModel {
  const repairScope = new Set(repairTaskKeys(run));
  return {
    id: `${run.id}-repair-${run.repairNumber + 1}`,
    repairedFrom: run.id,
    parameters: { ...run.parameters, ...overrides },
    status: 'Succeeded',
    repairNumber: run.repairNumber + 1,
    tasks: run.tasks.map((task) => repairScope.has(task.key)
      ? { ...task, status: 'Succeeded', attempts: Math.max(task.attempts, 0) + 1, output: `${task.output}\nRepair run: task reran from the beginning and succeeded.`, repairDisposition: 'Executed' }
      : { ...task, output: `${task.output}\nPreserved from parent run; successful task was not rerun.`, repairDisposition: 'Preserved' }),
  };
}

