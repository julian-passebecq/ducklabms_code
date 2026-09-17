import { assessReliability } from './reliability';
import { findWorkspaceTable } from './dataRuntime';
import type { DataWorkspace, PageKey, PipelineEdge, PipelineNode, PipelineRun } from '../types/app';
import type { PracticeProgress } from './practiceEngine';

export type ChallengeCaseId = 'retail-medallion' | 'turbine-realtime' | 'erp-incremental';
export type ChallengeValidator =
  | { type: 'table'; table: string; columns?: string[]; minRows?: number; uniqueKey?: string; positiveColumn?: string }
  | { type: 'lineage'; target: string; actorContains?: string }
  | { type: 'practice'; exerciseId: string }
  | { type: 'pipeline-design'; orderedTypes: PipelineNode['type'][] }
  | { type: 'node-config'; nodeType: PipelineNode['type']; key: string; contains: string }
  | { type: 'latest-run'; requiredTypes: PipelineNode['type'][]; status?: PipelineRun['status'] }
  | { type: 'checkpoint'; minCount?: number; labelContains?: string }
  | { type: 'reliability'; requireHealthy?: boolean; requireQuarantine?: boolean }
  | { type: 'watermark'; entity: string; minValue: string }
  | { type: 'scd-current'; customerId: string; expectedName?: string };

export interface ChallengeStage {
  id: string;
  title: string;
  objective: string;
  why: string;
  route: PageKey;
  expectedEvidence: string;
  hint: string;
  validators: ChallengeValidator[];
}

export interface ChallengeDefinition {
  id: string;
  caseStudyId: ChallengeCaseId;
  title: string;
  summary: string;
  stages: ChallengeStage[];
}

export interface ChallengeStageProgress {
  stageId: string;
  attempts: number;
  failedAttempts: number;
  hintsUsed: number;
  completed: boolean;
  bestScore: number;
  lastMessage: string;
  lastEvidence: string;
}

export interface ChallengeProgress {
  caseStudyId: ChallengeCaseId;
  challengeId: string;
  startedAt: string;
  updatedAt: string;
  stages: Record<string, ChallengeStageProgress>;
}

export interface ChallengeContext {
  workspace: DataWorkspace;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  runs: PipelineRun[];
  practice?: PracticeProgress;
}

export interface ChallengeValidationResult {
  ok: boolean;
  message: string;
  evidence: string;
  checks: { ok: boolean; evidence: string }[];
}

const now = () => new Date().toISOString();

export const challenges: ChallengeDefinition[] = [
  {
    id: 'retail-end-to-end', caseStudyId: 'retail-medallion', title: 'Retail production handoff',
    summary: 'Clean a representative dataset, build tested SQL models, orchestrate the flow, prove the run, and leave a recoverable state.',
    stages: [
      { id: 'retail-clean', title: '1 · Prepare a clean training table', objective: 'Use Notebook/Python to create challenge.retail_clean from raw.sales_csv.', why: 'Code is justified here for an explicit cleaning exercise, but the workload is still local and does not need Spark.', route: 'notebook', expectedEvidence: 'challenge.retail_clean exists with unique sale_id values and positive qty.', hint: 'Use table(), drop_duplicates(), filter(), and write_table("challenge.retail_clean", ...).', validators: [{ type: 'table', table: 'challenge.retail_clean', columns: ['sale_id', 'qty'], minRows: 1, uniqueKey: 'sale_id', positiveColumn: 'qty' }] },
      { id: 'retail-dbt', title: '2 · Build tested SQL models', objective: 'Run dbt build so the curated model is materialized and tested.', why: 'dbt owns maintainable SQL-model dependencies and tests; Spark is unnecessary for this star-schema path.', route: 'dbt', expectedEvidence: 'gold.sales_raw_curated exists and dbt lineage is recorded.', hint: 'Use dbt build, then inspect the model output and lineage.', validators: [{ type: 'table', table: 'gold.sales_raw_curated', minRows: 1 }, { type: 'lineage', target: 'gold.sales_raw_curated', actorContains: 'dbt model' }] },
      { id: 'retail-pipeline', title: '3 · Orchestrate the work', objective: 'Build a Pipeline containing Notebook → dbt → Stored procedure in dependency order.', why: 'The pipeline should sequence runtimes; it should not absorb transformation logic that belongs in Notebook/dbt/SQL.', route: 'pipeline', expectedEvidence: 'The activity DAG contains Notebook → dbt → Stored procedure.', hint: 'Add the three activities and connect them with Succeeded dependencies.', validators: [{ type: 'pipeline-design', orderedTypes: ['notebook', 'dbt', 'storedProcedure'] }, { type: 'node-config', nodeType: 'dbt', key: 'command', contains: 'dbt build' }] },
      { id: 'retail-run', title: '4 · Prove the operational run', objective: 'Debug the pipeline and inspect the latest run.', why: 'A correct design is not enough; the run must prove that each required activity completed.', route: 'monitor', expectedEvidence: 'Latest run succeeded with Notebook, dbt and Stored procedure activities succeeded.', hint: 'Validate, Debug, then open Monitoring hub.', validators: [{ type: 'latest-run', requiredTypes: ['notebook', 'dbt', 'storedProcedure'], status: 'Succeeded' }] },
      { id: 'retail-recovery', title: '5 · Leave a recoverable state', objective: 'Confirm the data contract is healthy and that a pre-run/safe checkpoint exists.', why: 'Operational pipelines should support safe diagnosis and rollback after partial mutation.', route: 'recovery', expectedEvidence: 'Reliability checks are healthy and at least one recovery checkpoint exists.', hint: 'A successful Debug creates a pre-run checkpoint; verify reliability in the Recovery lab.', validators: [{ type: 'reliability', requireHealthy: true }, { type: 'checkpoint', minCount: 1 }] },
    ],
  },
  {
    id: 'turbine-end-to-end', caseStudyId: 'turbine-realtime', title: 'Telemetry engineering + scale judgment',
    summary: 'Process a representative sample locally, justify Spark only for production scale, then orchestrate alerting and prove the run.',
    stages: [
      { id: 'turbine-local', title: '1 · Engineer local sample features', objective: 'Create challenge.turbine_features with a temperature_delta feature.', why: 'The learning sample is tiny, so local Python is enough even though the production workload may justify Spark.', route: 'notebook', expectedEvidence: 'challenge.turbine_features exists with temperature_delta.', hint: 'Read iot.turbine_events, copy the frame, derive gearbox_temp_c - 65, then write the challenge table.', validators: [{ type: 'table', table: 'challenge.turbine_features', columns: ['turbine_id', 'temperature_delta'], minRows: 1 }] },
      { id: 'turbine-scale', title: '2 · Make the Spark decision', objective: 'Complete the production-scale Spark decision exercise in Hands-on practice.', why: 'Spark should be selected because the production scenario is multi-TB/distributed—not because this tiny sample needs it.', route: 'practice', expectedEvidence: 'The turbine Spark decision exercise is completed.', hint: 'Open Hands-on practice and complete the turbine production-scale decision.', validators: [{ type: 'practice', exerciseId: 'turbine-spark-decision' }] },
      { id: 'turbine-pipeline', title: '3 · Build event-to-alert orchestration', objective: 'Build Eventstream → Notebook → If → Stored procedure.', why: 'Streaming ingress, feature work, control flow, and transactional alert writes have different responsibilities.', route: 'pipeline', expectedEvidence: 'The Pipeline contains the four activities in dependency order.', hint: 'Use Eventstream, Notebook, If Condition, then Stored procedure.', validators: [{ type: 'pipeline-design', orderedTypes: ['eventstream', 'notebook', 'if', 'storedProcedure'] }, { type: 'node-config', nodeType: 'if', key: 'expression', contains: 'greater' }] },
      { id: 'turbine-run', title: '4 · Prove the alert path', objective: 'Debug and confirm the latest run succeeds through the required activities.', why: 'Operational telemetry needs observable branching and downstream alert writes.', route: 'monitor', expectedEvidence: 'Latest run succeeded through Eventstream, Notebook, If and Stored procedure.', hint: 'Run Debug from Pipeline and inspect Monitoring hub.', validators: [{ type: 'latest-run', requiredTypes: ['eventstream', 'notebook', 'if', 'storedProcedure'], status: 'Succeeded' }] },
      { id: 'turbine-recovery', title: '5 · Prove recoverability', objective: 'Keep the current data contract healthy and preserve a recovery checkpoint.', why: 'Replay/contract-drift incidents should be recoverable without rewriting the architecture.', route: 'recovery', expectedEvidence: 'Reliability is healthy and a checkpoint exists.', hint: 'Verify the recovery lab after the successful run.', validators: [{ type: 'reliability', requireHealthy: true }, { type: 'checkpoint', minCount: 1 }] },
    ],
  },
  {
    id: 'erp-end-to-end', caseStudyId: 'erp-incremental', title: 'Incremental ERP + SCD2 production challenge',
    summary: 'Design metadata-driven ingestion, execute the incremental path, prove staging/dbt/SCD2 effects, and verify recovery readiness.',
    stages: [
      { id: 'erp-design', title: '1 · Build metadata-driven orchestration', objective: 'Build Lookup → ForEach → Copy Job → dbt → Stored procedure.', why: 'The hard problem is durable state, idempotency and model history—not distributed compute.', route: 'pipeline', expectedEvidence: 'All five required activities exist in dependency order.', hint: 'Start with control.watermarks, then loop entities, copy changed rows, build dbt models, and apply SCD2.', validators: [{ type: 'pipeline-design', orderedTypes: ['lookup', 'foreach', 'copyJob', 'dbt', 'storedProcedure'] }, { type: 'node-config', nodeType: 'foreach', key: 'items', contains: 'Lookup_Watermarks' }, { type: 'node-config', nodeType: 'copyJob', key: 'watermarkValue', contains: '@item().last_successful_ts' }, { type: 'node-config', nodeType: 'dbt', key: 'command', contains: 'dbt build' }] },
      { id: 'erp-run', title: '2 · Execute the incremental path', objective: 'Debug the pipeline successfully.', why: 'The execution must prove the metadata-driven path works end-to-end.', route: 'monitor', expectedEvidence: 'Latest run succeeded with Lookup, ForEach, Copy Job, dbt and Stored procedure.', hint: 'Validate then Debug from Pipeline.', validators: [{ type: 'latest-run', requiredTypes: ['lookup', 'foreach', 'copyJob', 'dbt', 'storedProcedure'], status: 'Succeeded' }] },
      { id: 'erp-staging', title: '3 · Prove incremental staging + dbt', objective: 'Inspect the staged order/customer changes and conformed dbt customer change model.', why: 'Evidence should show only incremental changes were staged and then transformed into a governed model.', route: 'lakehouse', expectedEvidence: 'staging.sales_order_incremental, staging.customer_incremental and staging.customer_changes exist.', hint: 'Inspect Lakehouse Tables after the successful run.', validators: [{ type: 'table', table: 'staging.sales_order_incremental', minRows: 1 }, { type: 'table', table: 'staging.customer_incremental', minRows: 1 }, { type: 'table', table: 'staging.customer_changes', minRows: 1 }] },
      { id: 'erp-scd2', title: '4 · Prove SCD2 + watermark advancement', objective: 'Confirm C104 has the new current customer name and both watermarks advanced beyond the baseline.', why: 'A safe incremental design must update dimensional history and state only after successful processing.', route: 'lakehouse', expectedEvidence: 'C104 current row is Nordic Wind Group AS and both watermarks are > 2026-09-16 18:45:00.', hint: 'Inspect dw.dim_customer and control.watermarks.', validators: [{ type: 'scd-current', customerId: 'C104', expectedName: 'Nordic Wind Group AS' }, { type: 'watermark', entity: 'sales_order', minValue: '2026-09-16 18:45:00' }, { type: 'watermark', entity: 'customer', minValue: '2026-09-16 18:45:00' }] },
      { id: 'erp-recovery', title: '5 · Verify rerun safety', objective: 'Confirm a recovery checkpoint exists and the current reliability contract is healthy.', why: 'Incremental state must be recoverable; a poisoned watermark or duplicate business key should be diagnosable and reversible.', route: 'recovery', expectedEvidence: 'Healthy reliability state plus at least one checkpoint.', hint: 'Open Reliability / recovery and confirm the current state before injecting another incident.', validators: [{ type: 'reliability', requireHealthy: true }, { type: 'checkpoint', minCount: 1 }] },
    ],
  },
];

export function challengeForCase(caseStudyId: string): ChallengeDefinition {
  return challenges.find((challenge) => challenge.caseStudyId === caseStudyId) ?? challenges[0];
}

export function emptyChallengeStageProgress(stageId: string): ChallengeStageProgress {
  return { stageId, attempts: 0, failedAttempts: 0, hintsUsed: 0, completed: false, bestScore: 0, lastMessage: '', lastEvidence: '' };
}

export function createChallengeProgress(caseStudyId: ChallengeCaseId): ChallengeProgress {
  const challenge = challengeForCase(caseStudyId);
  return { caseStudyId, challengeId: challenge.id, startedAt: now(), updatedAt: now(), stages: Object.fromEntries(challenge.stages.map((stage) => [stage.id, emptyChallengeStageProgress(stage.id)])) };
}

export function normalizeChallengeProgress(progress: ChallengeProgress | undefined, caseStudyId: ChallengeCaseId): ChallengeProgress {
  const seeded = createChallengeProgress(caseStudyId);
  if (!progress || progress.caseStudyId !== caseStudyId || progress.challengeId !== seeded.challengeId) return seeded;
  seeded.startedAt = progress.startedAt || seeded.startedAt;
  seeded.updatedAt = progress.updatedAt || seeded.updatedAt;
  for (const stage of challengeForCase(caseStudyId).stages) {
    const source = progress.stages?.[stage.id];
    if (!source) continue;
    seeded.stages[stage.id] = {
      ...emptyChallengeStageProgress(stage.id), ...source, stageId: stage.id,
      attempts: Math.max(0, Number(source.attempts ?? 0)), failedAttempts: Math.max(0, Number(source.failedAttempts ?? 0)),
      hintsUsed: Math.min(3, Math.max(0, Number(source.hintsUsed ?? 0))), bestScore: Math.min(100, Math.max(0, Number(source.bestScore ?? 0))),
      completed: Boolean(source.completed),
    };
  }
  return seeded;
}

export function challengeStageScore(progress: ChallengeStageProgress): number {
  return Math.max(0, Math.min(100, 105 - progress.failedAttempts * 12 - progress.hintsUsed * 8));
}

function orderedPipelineEvidence(nodes: PipelineNode[], edges: PipelineEdge[], orderedTypes: PipelineNode['type'][]): { ok: boolean; evidence: string } {
  const outgoing = new Map<string, PipelineNode[]>();
  for (const edge of edges) {
    const target = nodes.find((node) => node.id === edge.to);
    if (!target) continue;
    const bucket = outgoing.get(edge.from) ?? []; bucket.push(target); outgoing.set(edge.from, bucket);
  }
  const walk = (current: PipelineNode, typeIndex: number, chain: PipelineNode[]): PipelineNode[] | null => {
    if (typeIndex === orderedTypes.length - 1) return chain;
    const expected = orderedTypes[typeIndex + 1];
    for (const next of outgoing.get(current.id) ?? []) {
      if (next.type !== expected || chain.some((item) => item.id === next.id)) continue;
      const result = walk(next, typeIndex + 1, [...chain, next]);
      if (result) return result;
    }
    return null;
  };
  for (const start of nodes.filter((node) => node.type === orderedTypes[0])) {
    const chain = walk(start, 0, [start]);
    if (chain) return { ok: true, evidence: `Pipeline order proven: ${chain.map((node) => node.name).join(' → ')}.` };
  }
  const missing = orderedTypes.filter((type) => !nodes.some((node) => node.type === type));
  return { ok: false, evidence: missing.length ? `Missing required activity type(s): ${missing.join(', ')}.` : `Required dependency chain not found: ${orderedTypes.join(' → ')}.` };
}

function validateOne(validator: ChallengeValidator, context: ChallengeContext): { ok: boolean; evidence: string } {
  const { workspace, nodes, edges, runs, practice } = context;
  if (validator.type === 'table') {
    const table = findWorkspaceTable(workspace, validator.table);
    if (!table) return { ok: false, evidence: `${validator.table} does not exist.` };
    const missing = (validator.columns ?? []).filter((column) => !table.columns.some((item) => item.name === column));
    if (missing.length) return { ok: false, evidence: `${validator.table} is missing ${missing.join(', ')}.` };
    if (table.rows.length < (validator.minRows ?? 0)) return { ok: false, evidence: `${validator.table} has ${table.rows.length} rows; expected at least ${validator.minRows}.` };
    if (validator.uniqueKey) {
      const values = table.rows.map((row) => JSON.stringify(row[validator.uniqueKey!]));
      if (new Set(values).size !== values.length) return { ok: false, evidence: `${validator.table}.${validator.uniqueKey} is not unique.` };
    }
    if (validator.positiveColumn && table.rows.some((row) => Number(row[validator.positiveColumn!]) <= 0)) return { ok: false, evidence: `${validator.table}.${validator.positiveColumn} contains non-positive values.` };
    return { ok: true, evidence: `${validator.table}: ${table.rows.length} rows at snapshot ${workspace.snapshot}.` };
  }
  if (validator.type === 'lineage') {
    const edge = workspace.lineage.find((item) => item.to.toLowerCase() === validator.target.toLowerCase() && (!validator.actorContains || item.actor.toLowerCase().includes(validator.actorContains.toLowerCase())));
    return edge ? { ok: true, evidence: `Lineage: ${edge.from} → ${edge.to} via ${edge.actor}.` } : { ok: false, evidence: `No matching lineage edge reaches ${validator.target}.` };
  }
  if (validator.type === 'practice') {
    const state = practice?.exercises?.[validator.exerciseId];
    return state?.completed ? { ok: true, evidence: `Practice exercise ${validator.exerciseId} completed at ${state.bestScore}/100.` } : { ok: false, evidence: `Complete practice exercise ${validator.exerciseId}.` };
  }
  if (validator.type === 'pipeline-design') return orderedPipelineEvidence(nodes, edges, validator.orderedTypes);
  if (validator.type === 'node-config') {
    const node = nodes.find((item) => item.type === validator.nodeType && String(item.config[validator.key] ?? '').toLowerCase().includes(validator.contains.toLowerCase()));
    return node ? { ok: true, evidence: `${node.name}.${validator.key} contains ${validator.contains}.` } : { ok: false, evidence: `No ${validator.nodeType} activity has ${validator.key} containing ${validator.contains}.` };
  }
  if (validator.type === 'latest-run') {
    const run = runs.find((item) => item.caseStudyId === workspace.caseStudyId);
    if (!run) return { ok: false, evidence: 'No run exists for this case study.' };
    if (validator.status && run.status !== validator.status) return { ok: false, evidence: `Latest run is ${run.status}; expected ${validator.status}.` };
    const missing = validator.requiredTypes.filter((type) => !run.activities.some((activity) => activity.type === type && activity.status === 'Succeeded'));
    return missing.length ? { ok: false, evidence: `Latest run is missing succeeded activity type(s): ${missing.join(', ')}.` } : { ok: true, evidence: `${run.trigger} run ${run.id}: ${run.status}; required activity types succeeded.` };
  }
  if (validator.type === 'checkpoint') {
    const matching = workspace.checkpoints.filter((checkpoint) => !validator.labelContains || checkpoint.label.toLowerCase().includes(validator.labelContains.toLowerCase()));
    const needed = validator.minCount ?? 1;
    return matching.length >= needed ? { ok: true, evidence: `${matching.length} matching recovery checkpoint(s) available.` } : { ok: false, evidence: `Need ${needed} recovery checkpoint(s); found ${matching.length}.` };
  }
  if (validator.type === 'reliability') {
    const assessment = assessReliability(workspace);
    const quarantineRows = workspace.tables.filter((table) => table.schema === 'quarantine').reduce((sum, table) => sum + table.rows.length, 0);
    if (validator.requireHealthy && assessment.failed > 0) return { ok: false, evidence: `Reliability is ${assessment.status}: ${assessment.failed} rule(s) failing.` };
    if (validator.requireQuarantine && quarantineRows < 1) return { ok: false, evidence: 'No quarantined rows exist yet.' };
    return { ok: true, evidence: `Reliability ${assessment.status}: ${assessment.passed}/${assessment.rules.length} rules pass; quarantine rows=${quarantineRows}.` };
  }
  if (validator.type === 'watermark') {
    const table = findWorkspaceTable(workspace, 'control.watermarks');
    const row = table?.rows.find((item) => String(item.entity_name) === validator.entity);
    const value = String(row?.last_successful_ts ?? '');
    return value > validator.minValue ? { ok: true, evidence: `${validator.entity} watermark advanced to ${value}.` } : { ok: false, evidence: `${validator.entity} watermark is ${value || 'missing'}; expected > ${validator.minValue}.` };
  }
  const table = findWorkspaceTable(workspace, 'dw.dim_customer');
  const current = table?.rows.find((row) => String(row.customer_id) === validator.customerId && row.is_current === true);
  if (!current) return { ok: false, evidence: `No current SCD2 row exists for ${validator.customerId}.` };
  if (validator.expectedName && String(current.customer_name) !== validator.expectedName) return { ok: false, evidence: `Current ${validator.customerId} name is ${String(current.customer_name)}; expected ${validator.expectedName}.` };
  return { ok: true, evidence: `${validator.customerId} current SCD2 row is ${String(current.customer_name)}.` };
}

export function validateChallengeStage(stage: ChallengeStage, context: ChallengeContext): ChallengeValidationResult {
  const checks = stage.validators.map((validator) => validateOne(validator, context));
  const ok = checks.every((check) => check.ok);
  return { ok, message: ok ? 'Stage evidence is complete.' : 'Stage evidence is incomplete.', evidence: checks.map((check) => `${check.ok ? '✓' : '✕'} ${check.evidence}`).join('\n'), checks };
}

export function recordChallengeAttempt(progress: ChallengeProgress, stage: ChallengeStage, result: ChallengeValidationResult): ChallengeProgress {
  const current = progress.stages[stage.id] ?? emptyChallengeStageProgress(stage.id);
  const updated: ChallengeStageProgress = {
    ...current,
    attempts: current.attempts + 1,
    failedAttempts: current.failedAttempts + (result.ok ? 0 : 1),
    completed: current.completed || result.ok,
    lastMessage: result.message,
    lastEvidence: result.evidence,
  };
  if (result.ok) updated.bestScore = Math.max(current.bestScore, challengeStageScore(updated));
  return { ...progress, updatedAt: now(), stages: { ...progress.stages, [stage.id]: updated } };
}

export function revealChallengeHint(progress: ChallengeProgress, stageId: string): ChallengeProgress {
  const current = progress.stages[stageId] ?? emptyChallengeStageProgress(stageId);
  return { ...progress, updatedAt: now(), stages: { ...progress.stages, [stageId]: { ...current, hintsUsed: Math.min(3, current.hintsUsed + 1) } } };
}

export function resetChallengeStage(progress: ChallengeProgress, stageId: string): ChallengeProgress {
  return { ...progress, updatedAt: now(), stages: { ...progress.stages, [stageId]: emptyChallengeStageProgress(stageId) } };
}

export function challengeSummary(progress: ChallengeProgress, caseStudyId: ChallengeCaseId) {
  const challenge = challengeForCase(caseStudyId);
  const states = challenge.stages.map((stage) => progress.stages[stage.id] ?? emptyChallengeStageProgress(stage.id));
  const completed = states.filter((state) => state.completed).length;
  const scores = states.filter((state) => state.completed).map((state) => state.bestScore);
  return { completed, total: states.length, completionPercent: Math.round(completed / Math.max(states.length, 1) * 100), masteryScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0, attempts: states.reduce((sum, state) => sum + state.attempts, 0), hintsUsed: states.reduce((sum, state) => sum + state.hintsUsed, 0) };
}

export function challengeReport(progress: ChallengeProgress, caseStudyId: ChallengeCaseId) {
  const challenge = challengeForCase(caseStudyId);
  return { caseStudyId, challengeId: challenge.id, title: challenge.title, generatedAt: now(), summary: challengeSummary(progress, caseStudyId), stages: challenge.stages.map((stage) => ({ id: stage.id, title: stage.title, objective: stage.objective, expectedEvidence: stage.expectedEvidence, ...progress.stages[stage.id] })) };
}

const storageKey = (caseStudyId: string) => `fabric-de-challenge:${caseStudyId}`;
export function loadChallengeProgress(caseStudyId: ChallengeCaseId): ChallengeProgress {
  try { return normalizeChallengeProgress(JSON.parse(localStorage.getItem(storageKey(caseStudyId)) || 'null') as ChallengeProgress | undefined, caseStudyId); }
  catch { return createChallengeProgress(caseStudyId); }
}
export function saveChallengeProgress(progress: ChallengeProgress): void { try { localStorage.setItem(storageKey(progress.caseStudyId), JSON.stringify(progress)); } catch { /* best effort */ } }
export function clearChallengeProgress(caseStudyId: ChallengeCaseId): ChallengeProgress { try { localStorage.removeItem(storageKey(caseStudyId)); } catch { /* best effort */ } return createChallengeProgress(caseStudyId); }
