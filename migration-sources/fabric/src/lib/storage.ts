import type { CaseStudy, DataWorkspace, NotebookDocument, PipelineEdge, PipelineNode, PipelineParameter, PipelineRun, PipelineRunActivity, PipelineVariable, TutorialProgress } from '../types/app';
import { normalizeTutorialProgress } from './tutorialLearning';

export interface PersistedLabState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  stepIndex: number;
  runs: PipelineRun[];
  parameters?: PipelineParameter[];
  variables?: PipelineVariable[];
  workspace?: DataWorkspace;
  notebook?: NotebookDocument;
  tutorialProgress?: TutorialProgress;
}

const key = (caseStudyId: string, experience: string) => `fabric-adf-learning:${experience}:${caseStudyId}`;

function normalizeRunActivity(activity: Partial<PipelineRunActivity>): PipelineRunActivity {
  return {
    nodeId: String(activity.nodeId ?? 'unknown'),
    name: String(activity.name ?? 'Activity'),
    type: activity.type ?? 'wait',
    status: activity.status ?? 'Not run',
    durationMs: Number(activity.durationMs ?? 0),
    startOffsetMs: Number(activity.startOffsetMs ?? 0),
    attempts: Number(activity.attempts ?? 1),
    input: String(activity.input ?? ''),
    output: String(activity.output ?? ''),
    error: activity.error ? String(activity.error) : undefined,
    metrics: activity.metrics && typeof activity.metrics === 'object' ? activity.metrics : {},
    secureInput: Boolean(activity.secureInput),
    secureOutput: Boolean(activity.secureOutput),
  };
}


function normalizeWorkspace(workspace: DataWorkspace | undefined): DataWorkspace | undefined {
  if (!workspace) return undefined;
  return {
    ...workspace,
    lineage: Array.isArray(workspace.lineage) ? workspace.lineage : [],
    checkpoints: Array.isArray(workspace.checkpoints) ? workspace.checkpoints : [{
      id: 'migrated-baseline',
      label: 'Migrated baseline',
      createdAt: new Date().toISOString(),
      snapshot: Number(workspace.snapshot ?? 1),
      tables: workspace.tables ?? [],
    }],
  };
}

function normalizeRun(run: PipelineRun): PipelineRun {
  const activities = (run.activities ?? []).map((activity) => normalizeRunActivity(activity));
  const inferredDuration = activities.reduce((max, activity) => Math.max(max, activity.startOffsetMs + activity.durationMs), 0);
  return { ...run, durationMs: Number(run.durationMs ?? inferredDuration), trigger: run.trigger || 'Debug', activities };
}

export function loadLab(caseStudyId: string, experience: string, caseStudy?: CaseStudy): PersistedLabState | null {
  try {
    const raw = localStorage.getItem(key(caseStudyId, experience));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLabState;
    return { ...parsed, runs: (parsed.runs ?? []).map(normalizeRun), workspace: normalizeWorkspace(parsed.workspace), tutorialProgress: caseStudy ? normalizeTutorialProgress(parsed.tutorialProgress, caseStudy) : parsed.tutorialProgress };
  } catch {
    return null;
  }
}

export function saveLab(caseStudyId: string, experience: string, state: PersistedLabState): void {
  try {
    localStorage.setItem(key(caseStudyId, experience), JSON.stringify(state));
  } catch {
    // Learning state persistence is best-effort.
  }
}

export function clearLab(caseStudyId: string, experience: string): void {
  localStorage.removeItem(key(caseStudyId, experience));
}
