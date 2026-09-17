import type { CaseStudy, DataWorkspace, NotebookDocument, PipelineNode, RunStatus } from '../types/app';
import { defaultDbtProject, executeNotebook, executePipelineLearningData, executeWorkspaceSql, runDbtCommand } from './dataRuntime';

export type AirflowTaskType = 'copyJob' | 'notebook' | 'dbt' | 'pipeline' | 'sparkJob' | 'sqlCheck';
export type AirflowTaskStatus = 'Not run' | 'Running' | 'Succeeded' | 'Failed' | 'Skipped';

export interface AirflowTaskDefinition {
  id: string;
  variable: string;
  label: string;
  type: AirflowTaskType;
  itemName: string;
  retries: number;
  retryDelaySeconds: number;
  triggerRule: 'all_success' | 'all_done';
  simulateFailure?: boolean;
  x: number;
  y: number;
}

export interface AirflowEdgeDefinition { id: string; from: string; to: string; }

export interface AirflowDagDefinition {
  dagId: string;
  schedule: string;
  catchup: boolean;
  tasks: AirflowTaskDefinition[];
  edges: AirflowEdgeDefinition[];
}

export interface AirflowTaskRun {
  taskId: string;
  label: string;
  type: AirflowTaskType;
  status: AirflowTaskStatus;
  durationMs: number;
  log: string[];
}

export interface AirflowDagRunResult {
  workspace: DataWorkspace;
  notebook: NotebookDocument;
  status: 'Succeeded' | 'Failed';
  taskRuns: AirflowTaskRun[];
  log: string[];
}

const jobTypeByTask: Record<AirflowTaskType, string> = {
  copyJob: 'CopyJob',
  notebook: 'RunNotebook',
  dbt: 'dbtJob',
  pipeline: 'Pipeline',
  sparkJob: 'sparkjob',
  sqlCheck: 'SQLCheck',
};

const taskTypeByJob: Record<string, AirflowTaskType> = {
  CopyJob: 'copyJob',
  RunNotebook: 'notebook',
  dbtJob: 'dbt',
  Pipeline: 'pipeline',
  sparkjob: 'sparkJob',
  SQLCheck: 'sqlCheck',
};

export function defaultAirflowDag(caseStudy: CaseStudy): AirflowDagDefinition {
  const common: AirflowTaskDefinition[] = [
    { id: 'task-copy', variable: 'ingest', label: 'Ingest data', type: 'copyJob', itemName: 'CJ_Ingest_Incremental', retries: 1, retryDelaySeconds: 60, triggerRule: 'all_success', x: 70, y: 120 },
    { id: 'task-notebook', variable: 'refine', label: 'Refine with notebook', type: 'notebook', itemName: `NB_${caseStudy.id.replaceAll('-', '_')}`, retries: 1, retryDelaySeconds: 60, triggerRule: 'all_success', x: 340, y: 120 },
    { id: 'task-dbt', variable: 'model', label: 'Build dbt models', type: 'dbt', itemName: `dbt_${caseStudy.id.replaceAll('-', '_')}`, retries: 0, retryDelaySeconds: 60, triggerRule: 'all_success', x: 610, y: 120 },
    { id: 'task-check', variable: 'validate', label: 'Validate output', type: 'sqlCheck', itemName: 'SQL quality check', retries: 0, retryDelaySeconds: 60, triggerRule: 'all_success', x: 880, y: 120 },
  ];
  if (caseStudy.id === 'turbine-realtime') {
    common.splice(2, 0, { id: 'task-spark', variable: 'spark_transform', label: 'Large-scale Spark transform', type: 'sparkJob', itemName: 'SJD_Turbine_Features', retries: 1, retryDelaySeconds: 120, triggerRule: 'all_success', x: 610, y: 260 });
    common[3].x = 880;
    common[4].x = 1150;
  }
  const edges: AirflowEdgeDefinition[] = [];
  for (let i = 0; i < common.length - 1; i += 1) edges.push({ id: `air-edge-${i}`, from: common[i].id, to: common[i + 1].id });
  return { dagId: `fabric_${caseStudy.id.replaceAll('-', '_')}`, schedule: '@daily', catchup: false, tasks: common, edges };
}

export function generateAirflowDagCode(dag: AirflowDagDefinition): string {
  const taskBlocks = dag.tasks.map((task) => {
    const policy = `        retries=${Math.max(0, Number(task.retries ?? 0))},\n        retry_delay=timedelta(seconds=${Math.max(0, Number(task.retryDelaySeconds ?? 60))}),\n        trigger_rule="${task.triggerRule ?? 'all_success'}",\n`;
    if (task.type === 'sqlCheck') {
      return `${task.variable} = SQLCheckOperator(\n        task_id="${task.id}",\n        sql="SELECT * FROM gold.output LIMIT 1",\n${policy}    )`;
    }
    return `${task.variable} = FabricRunItemOperator(\n        task_id="${task.id}",\n        fabric_conn_id="fabric_conn",\n        workspace_id="training-workspace",\n        item_id="${task.itemName}",\n        job_type="${jobTypeByTask[task.type]}",\n        wait_for_termination=True,\n        deferrable=True,\n${policy}    )`;
  }).join('\n\n    ');
  const varsById = new Map(dag.tasks.map((task) => [task.id, task.variable]));
  const chains = dependencyChains(dag).map((ids) => ids.map((id) => varsById.get(id) ?? id).join(' >> '));
  return `from airflow import DAG\nfrom airflow.providers.common.sql.operators.sql import SQLCheckOperator\nfrom apache_airflow_microsoft_fabric_plugin.operators.fabric import FabricRunItemOperator\nfrom datetime import datetime, timedelta\n\nwith DAG(\n    dag_id="${dag.dagId}",\n    schedule="${dag.schedule}",\n    start_date=datetime(2026, 9, 1),\n    catchup=${dag.catchup ? 'True' : 'False'},\n) as dag:\n    ${taskBlocks}\n\n    ${chains.join('\n    ')}`;
}

function dependencyChains(dag: AirflowDagDefinition): string[][] {
  const incoming = new Map<string, number>();
  dag.tasks.forEach((task) => incoming.set(task.id, 0));
  dag.edges.forEach((edge) => incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1));
  const starts = dag.tasks.filter((task) => (incoming.get(task.id) ?? 0) === 0);
  const chains: string[][] = [];
  for (const start of starts) {
    const chain = [start.id];
    let current = start.id;
    const seen = new Set(chain);
    while (true) {
      const outgoing = dag.edges.filter((edge) => edge.from === current);
      if (outgoing.length !== 1) break;
      const next = outgoing[0].to;
      if (seen.has(next)) break;
      chain.push(next); seen.add(next); current = next;
    }
    if (chain.length > 1) chains.push(chain);
  }
  if (!chains.length && dag.tasks.length) chains.push(dag.tasks.map((task) => task.id));
  return chains;
}

export function parseAirflowDagCode(code: string): AirflowDagDefinition {
  const dagId = code.match(/dag_id\s*=\s*["']([^"']+)["']/)?.[1] ?? 'training_dag';
  const schedule = code.match(/schedule(?:_interval)?\s*=\s*["']([^"']+)["']/)?.[1] ?? '@daily';
  const catchup = /catchup\s*=\s*True/.test(code);
  const tasks: AirflowTaskDefinition[] = [];
  const blockPattern = /(\w+)\s*=\s*(FabricRunItemOperator|SQLCheckOperator)\s*\(([\s\S]*?)\n\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(code))) {
    const variable = match[1]; const operator = match[2]; const body = match[3];
    const id = body.match(/task_id\s*=\s*["']([^"']+)["']/)?.[1] ?? `task-${tasks.length + 1}`;
    const jobType = operator === 'SQLCheckOperator' ? 'SQLCheck' : body.match(/job_type\s*=\s*["']([^"']+)["']/)?.[1] ?? 'Pipeline';
    const type = taskTypeByJob[jobType] ?? 'pipeline';
    const itemName = operator === 'SQLCheckOperator' ? 'SQL quality check' : body.match(/item_id\s*=\s*["']([^"']+)["']/)?.[1] ?? id;
    const retries = Number(body.match(/retries\s*=\s*(\d+)/)?.[1] ?? 0);
    const retryDelaySeconds = Number(body.match(/retry_delay\s*=\s*timedelta\(seconds\s*=\s*(\d+)\)/)?.[1] ?? 60);
    const triggerRule = (body.match(/trigger_rule\s*=\s*["']([^"']+)["']/)?.[1] === 'all_done' ? 'all_done' : 'all_success') as AirflowTaskDefinition['triggerRule'];
    tasks.push({ id, variable, label: itemName.replaceAll('_', ' '), type, itemName, retries, retryDelaySeconds, triggerRule, x: 70 + tasks.length * 270, y: 120 });
  }
  const taskByVariable = new Map(tasks.map((task) => [task.variable, task]));
  const edges: AirflowEdgeDefinition[] = [];
  for (const line of code.split('\n')) {
    if (!line.includes('>>')) continue;
    const variables = line.split('>>').map((value) => value.trim()).filter((value) => /^\w+$/.test(value));
    for (let i = 0; i < variables.length - 1; i += 1) {
      const from = taskByVariable.get(variables[i]); const to = taskByVariable.get(variables[i + 1]);
      if (from && to) edges.push({ id: `air-edge-${from.id}-${to.id}`, from: from.id, to: to.id });
    }
  }
  return { dagId, schedule, catchup, tasks, edges };
}

export function validateAirflowDag(dag: AirflowDagDefinition): string[] {
  const problems: string[] = [];
  if (!dag.dagId.trim()) problems.push('DAG id is required.');
  if (!dag.tasks.length) problems.push('Add at least one Airflow task.');
  const ids = new Set<string>();
  for (const task of dag.tasks) {
    if (ids.has(task.id)) problems.push(`Duplicate task id: ${task.id}`);
    ids.add(task.id);
    if (Number(task.retries ?? 0) < 0) problems.push(`${task.id}: retries cannot be negative.`);
    if (Number(task.retryDelaySeconds ?? 0) < 0) problems.push(`${task.id}: retry delay cannot be negative.`);
  }
  for (const edge of dag.edges) if (!ids.has(edge.from) || !ids.has(edge.to)) problems.push(`Dependency ${edge.id} references a missing task.`);
  if (hasCycle(dag)) problems.push('Airflow DAG contains a cycle.');
  return problems;
}

function hasCycle(dag: AirflowDagDefinition): boolean {
  const adjacency = new Map<string, string[]>();
  dag.tasks.forEach((task) => adjacency.set(task.id, []));
  dag.edges.forEach((edge) => adjacency.get(edge.from)?.push(edge.to));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true; if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  return dag.tasks.some((task) => visit(task.id));
}

function topologicalTasks(dag: AirflowDagDefinition): AirflowTaskDefinition[] {
  const result: AirflowTaskDefinition[] = []; const pending = new Set(dag.tasks.map((task) => task.id));
  while (pending.size) {
    const ready = dag.tasks.filter((task) => pending.has(task.id) && dag.edges.filter((edge) => edge.to === task.id).every((edge) => !pending.has(edge.from)));
    if (!ready.length) throw new Error('Airflow DAG contains a cycle.');
    for (const task of ready) { result.push(task); pending.delete(task.id); }
  }
  return result;
}

export function runAirflowDag(input: {
  dag: AirflowDagDefinition;
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  notebook: NotebookDocument;
  pipelineNodes: PipelineNode[];
}): AirflowDagRunResult {
  const problems = validateAirflowDag(input.dag);
  if (problems.length) return { workspace: input.workspace, notebook: input.notebook, status: 'Failed', taskRuns: [], log: problems.map((problem) => `ERROR ${problem}`) };
  let workspace = input.workspace; let notebook = input.notebook; const taskRuns: AirflowTaskRun[] = []; const log: string[] = [];
  const statusByTask = new Map<string, AirflowTaskStatus>();
  for (const task of topologicalTasks(input.dag)) {
    const upstream = input.dag.edges.filter((edge) => edge.to === task.id).map((edge) => statusByTask.get(edge.from));
    if (task.triggerRule !== 'all_done' && upstream.some((status) => status === 'Failed' || status === 'Skipped')) {
      statusByTask.set(task.id, 'Skipped'); taskRuns.push({ taskId: task.id, label: task.label, type: task.type, status: 'Skipped', durationMs: 0, log: ['Skipped because an upstream task did not succeed and trigger_rule=all_success.'] }); continue;
    }
    const taskLog: string[] = [`START ${task.id} · ${task.type} · trigger_rule=${task.triggerRule}`];
    let status: AirflowTaskStatus = 'Succeeded';
    let attempt = 0;
    const maxAttempts = Math.max(1, Number(task.retries ?? 0) + 1);
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        taskLog.push(`TRY ${attempt}/${maxAttempts}`);
        if (task.simulateFailure) throw new Error('Simulated task failure for retry/recovery training.');
      if (task.type === 'copyJob') {
        const temp: PipelineNode = { id: `airflow-${task.id}`, type: 'copyJob', name: task.label, x: 0, y: 0, status: 'Not run', config: { source: 'case-study source', destination: 'staging', incremental: true } };
        const effect = executePipelineLearningData(workspace, notebook, [temp], new Map([[temp.id, 'Succeeded' as RunStatus]]));
        workspace = effect.workspace; notebook = effect.notebook; taskLog.push(...effect.messages);
      } else if (task.type === 'notebook') {
        const result = executeNotebook(workspace, notebook); workspace = result.workspace; notebook = result.notebook; taskLog.push(`Notebook executed · touched ${result.touchedTables.join(', ') || 'no tables'}`);
      } else if (task.type === 'dbt') {
        const result = runDbtCommand(workspace, defaultDbtProject(workspace), { command: 'dbt build', threads: 4 }); workspace = result.workspace; taskLog.push(...result.log);
        if (result.failed > 0) status = 'Failed';
      } else if (task.type === 'pipeline') {
        if (!input.pipelineNodes.length) taskLog.push('No authored pipeline activities exist; Fabric item invocation simulated.');
        else {
          const nodeStatuses = new Map(input.pipelineNodes.map((node) => [node.id, 'Succeeded' as RunStatus]));
          const result = executePipelineLearningData(workspace, notebook, input.pipelineNodes, nodeStatuses); workspace = result.workspace; notebook = result.notebook; taskLog.push(...result.messages);
        }
      } else if (task.type === 'sparkJob') {
        const source = workspace.tables.find((table) => table.layer === 'bronze' || table.layer === 'source' || table.layer === 'stream');
        if (source) {
          const result = executeWorkspaceSql(workspace, `CREATE OR REPLACE TABLE silver.spark_training_output AS SELECT * FROM ${source.schema}.${source.name} LIMIT 100`);
          workspace = result.workspace;
          taskLog.push(`Simulated Spark semantics on representative rows · production scenario assumes distributed scale · wrote silver.spark_training_output (${result.rows.length} rows)`);
        } else taskLog.push('Spark Job Definition simulated; no representative source table was available.');
      } else if (task.type === 'sqlCheck') {
        const target = [...workspace.tables].reverse().find((table) => table.layer === 'gold' || table.layer === 'warehouse' || table.layer === 'silver') ?? workspace.tables[0];
        if (!target) throw new Error('No table is available for SQL quality validation.');
        const result = executeWorkspaceSql(workspace, `SELECT * FROM ${target.schema}.${target.name} LIMIT 1`);
        taskLog.push(`SQL check passed on ${target.schema}.${target.name} · ${result.rows.length} representative row inspected`);
      }
      } catch (error) {
        status = 'Failed'; taskLog.push(`ERROR attempt ${attempt}: ${error instanceof Error ? error.message : 'task failed'}`);
        if (attempt < maxAttempts) { taskLog.push(`RETRY scheduled after ${task.retryDelaySeconds}s (simulated)`); continue; }
      }
      if (status === 'Succeeded') break;
    }
    taskLog.push(`${status === 'Succeeded' ? 'SUCCESS' : 'FAILED'} ${task.id} · attempts=${attempt}`);
    statusByTask.set(task.id, status);
    taskRuns.push({ taskId: task.id, label: task.label, type: task.type, status, durationMs: status === 'Succeeded' ? 650 + taskRuns.length * 190 + (attempt - 1) * 120 : 320 + (attempt - 1) * 120, log: taskLog });
    log.push(...taskLog);
  }
  return { workspace, notebook, status: taskRuns.some((task) => task.status === 'Failed') ? 'Failed' : 'Succeeded', taskRuns, log };
}
