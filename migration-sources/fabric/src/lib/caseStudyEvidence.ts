import type { CaseStudy, CaseStudyAcceptanceCriterion, DataWorkspace } from '../types/app';
import { findWorkspaceTable } from './dataRuntime';
import { workspaceObjectFreshness } from './workspaceInsights';

export interface AcceptanceEvidenceResult {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  status: 'pass' | 'stale' | 'missing';
  detail: string;
}

function nonSeedTables(workspace: DataWorkspace, names: string[]) {
  return names
    .map((name) => findWorkspaceTable(workspace, name))
    .filter((table): table is NonNullable<typeof table> => Boolean(table && table.runtimeSource !== 'Case-study seed'));
}

export function evaluateAcceptanceCriterion(workspace: DataWorkspace, criterion: CaseStudyAcceptanceCriterion): AcceptanceEvidenceResult {
  const evidence = criterion.evidence;
  const objects = evidence.objects ?? [];
  if (evidence.kind === 'table') {
    const candidates = nonSeedTables(workspace, objects);
    const evaluated = candidates.map((table) => ({ table, freshness: workspaceObjectFreshness(workspace, `${table.schema}.${table.name}`) }));
    const table = evaluated.find((item) => item.freshness.status === 'fresh' && item.table.rows.length >= (evidence.minRows ?? 0));
    const stale = evaluated.find((item) => item.freshness.status === 'stale');
    const passed = Boolean(table);
    return {
      id: criterion.id,
      title: criterion.title,
      description: criterion.description,
      passed,
      status: table ? 'pass' : stale ? 'stale' : 'missing',
      detail: table
        ? `${table.table.schema}.${table.table.name} · ${table.table.rows.length} row(s) · v${table.table.version} · fresh at snapshot ${table.freshness.writeSnapshot} · ${table.table.runtimeSource}`
        : stale
          ? `Stale evidence: ${stale.table.schema}.${stale.table.name} · ${stale.freshness.staleBecause[0] ?? 'an upstream object changed after this table was produced'}. Reprocess the affected downstream path.`
          : candidates.length
            ? `Learner-created evidence exists but does not satisfy the minimum row requirement (${evidence.minRows ?? 0}).`
            : `Waiting for learner-created evidence: ${objects.join(' or ')}`,
    };
  }

  if (evidence.kind === 'lineage') {
    const normalized = objects.map((value) => value.toLowerCase());
    const matching = workspace.lineage.filter((item) =>
      normalized.length === 0 || normalized.includes(item.to.toLowerCase()) || normalized.includes(item.from.toLowerCase()),
    );
    const edge = matching.find((item) => {
      const target = findWorkspaceTable(workspace, item.to);
      return !target || workspaceObjectFreshness(workspace, item.to).status === 'fresh';
    });
    return {
      id: criterion.id,
      title: criterion.title,
      description: criterion.description,
      passed: Boolean(edge),
      status: edge ? 'pass' : matching.length ? 'stale' : 'missing',
      detail: edge
        ? `${edge.from} → ${edge.to} · ${edge.actor} · fresh lineage at snapshot ${edge.snapshot}`
        : matching.length
          ? 'Lineage exists, but its downstream evidence is stale. Reprocess the affected path before promotion.'
          : `Waiting for emitted lineage${objects.length ? ` involving ${objects.join(', ')}` : ''}.`,
    };
  }

  if (evidence.kind === 'checkpoint') {
    const checkpoint = workspace.checkpoints.find((item) => item.id !== 'baseline');
    return {
      id: criterion.id,
      title: criterion.title,
      description: criterion.description,
      passed: Boolean(checkpoint),
      status: checkpoint ? 'pass' : 'missing',
      detail: checkpoint ? `${checkpoint.label} · snapshot ${checkpoint.snapshot}` : 'Waiting for a non-baseline recovery checkpoint.',
    };
  }

  const table = nonSeedTables(workspace, objects.length ? objects : ['ops.fabric_run_audit', 'ops.databricks_run_audit'])[0];
  const actorMatch = evidence.actorIncludes
    ? workspace.lineage.find((item) => item.actor.toLowerCase().includes(evidence.actorIncludes!.toLowerCase()))
    : undefined;
  const passed = Boolean(table || actorMatch);
  return {
    id: criterion.id,
    title: criterion.title,
    description: criterion.description,
    passed,
    status: passed ? 'pass' : 'missing',
    detail: table
      ? `${table.schema}.${table.name} · ${table.rows.length} audit row(s)`
      : actorMatch
        ? `${actorMatch.actor}: ${actorMatch.from} → ${actorMatch.to}`
        : 'Waiting for operational audit evidence.',
  };
}

export function evaluateCaseStudyAcceptance(caseStudy: CaseStudy, workspace: DataWorkspace): AcceptanceEvidenceResult[] {
  return (caseStudy.brief?.acceptanceCriteria ?? []).map((criterion) => evaluateAcceptanceCriterion(workspace, criterion));
}

export function caseStudyAcceptanceScore(caseStudy: CaseStudy, workspace: DataWorkspace): { passed: number; total: number; percent: number } {
  const results = evaluateCaseStudyAcceptance(caseStudy, workspace);
  const passed = results.filter((item) => item.passed).length;
  return { passed, total: results.length, percent: results.length ? Math.round((passed / results.length) * 100) : 0 };
}
