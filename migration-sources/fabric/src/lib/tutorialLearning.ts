import type { CaseStudy, TutorialMode, TutorialProgress, TutorialStepProgress } from '../types/app';

const now = () => new Date().toISOString();

export function emptyStepProgress(stepId: string): TutorialStepProgress {
  return {
    stepId,
    attempts: 0,
    failedAttempts: 0,
    hintLevel: 0,
    solutionRevealed: false,
    solutionApplied: false,
    validated: false,
    bestScore: 0,
    lastMessage: '',
    lastAttemptAt: '',
  };
}

export function createTutorialProgress(caseStudy: CaseStudy, mode: TutorialMode = 'Guided'): TutorialProgress {
  return {
    caseStudyId: caseStudy.id,
    mode,
    startedAt: now(),
    updatedAt: now(),
    steps: Object.fromEntries(caseStudy.steps.map((step) => [step.id, emptyStepProgress(step.id)])),
  };
}

export function normalizeTutorialProgress(progress: TutorialProgress | undefined, caseStudy: CaseStudy): TutorialProgress {
  if (!progress || progress.caseStudyId !== caseStudy.id) return createTutorialProgress(caseStudy);
  const normalized = createTutorialProgress(caseStudy, progress.mode === 'Challenge' ? 'Challenge' : 'Guided');
  normalized.startedAt = progress.startedAt || normalized.startedAt;
  normalized.updatedAt = progress.updatedAt || normalized.updatedAt;
  for (const step of caseStudy.steps) {
    const source = progress.steps?.[step.id];
    if (!source) continue;
    normalized.steps[step.id] = {
      ...emptyStepProgress(step.id),
      ...source,
      stepId: step.id,
      attempts: Math.max(0, Number(source.attempts ?? 0)),
      failedAttempts: Math.max(0, Number(source.failedAttempts ?? 0)),
      hintLevel: Math.min(3, Math.max(0, Number(source.hintLevel ?? 0))) as 0 | 1 | 2 | 3,
      bestScore: Math.min(100, Math.max(0, Number(source.bestScore ?? 0))),
      validated: Boolean(source.validated),
      solutionRevealed: Boolean(source.solutionRevealed),
      solutionApplied: Boolean(source.solutionApplied),
    };
  }
  return normalized;
}

export function calculateStepScore(step: TutorialStepProgress, mode: TutorialMode): number {
  const failedPenalty = step.failedAttempts * (mode === 'Challenge' ? 10 : 6);
  const hintPenalty = step.hintLevel * (mode === 'Challenge' ? 7 : 4);
  const revealPenalty = step.solutionRevealed ? (mode === 'Challenge' ? 20 : 12) : 0;
  const applyPenalty = step.solutionApplied ? (mode === 'Challenge' ? 25 : 18) : 0;
  return Math.max(0, Math.round(100 - failedPenalty - hintPenalty - revealPenalty - applyPenalty));
}

function updateStep(progress: TutorialProgress, stepId: string, updater: (step: TutorialStepProgress) => TutorialStepProgress): TutorialProgress {
  const current = progress.steps[stepId] ?? emptyStepProgress(stepId);
  return {
    ...progress,
    updatedAt: now(),
    steps: { ...progress.steps, [stepId]: updater(current) },
  };
}

export function recordTutorialValidation(progress: TutorialProgress, stepId: string, result: { ok: boolean; message: string }): TutorialProgress {
  return updateStep(progress, stepId, (step) => {
    const updated: TutorialStepProgress = {
      ...step,
      attempts: step.attempts + 1,
      failedAttempts: step.failedAttempts + (result.ok ? 0 : 1),
      validated: step.validated || result.ok,
      lastMessage: result.message,
      lastAttemptAt: now(),
    };
    const score = result.ok ? calculateStepScore(updated, progress.mode) : step.bestScore;
    return { ...updated, bestScore: Math.max(step.bestScore, score) };
  });
}

export function revealTutorialHint(progress: TutorialProgress, stepId: string): TutorialProgress {
  return updateStep(progress, stepId, (step) => ({ ...step, hintLevel: Math.min(3, step.hintLevel + 1) as 0 | 1 | 2 | 3 }));
}

export function recordSolutionReveal(progress: TutorialProgress, stepId: string): TutorialProgress {
  return updateStep(progress, stepId, (step) => ({ ...step, solutionRevealed: true }));
}

export function recordSolutionApplied(progress: TutorialProgress, stepId: string): TutorialProgress {
  return updateStep(progress, stepId, (step) => ({ ...step, solutionRevealed: true, solutionApplied: true }));
}

export function setTutorialMode(progress: TutorialProgress, mode: TutorialMode): TutorialProgress {
  return { ...progress, mode, updatedAt: now() };
}

export function resetTutorialStep(progress: TutorialProgress, stepId: string): TutorialProgress {
  return updateStep(progress, stepId, () => emptyStepProgress(stepId));
}

export function tutorialSummary(progress: TutorialProgress, caseStudy: CaseStudy): {
  completed: number;
  total: number;
  completionPercent: number;
  masteryScore: number;
  rating: 'Mastery' | 'Strong' | 'Developing' | 'Starting';
  hintsUsed: number;
  failedAttempts: number;
  solutionUses: number;
} {
  const steps = caseStudy.steps.map((step) => progress.steps[step.id] ?? emptyStepProgress(step.id));
  const completedSteps = steps.filter((step) => step.validated);
  const completed = completedSteps.length;
  const total = steps.length;
  const masteryScore = completedSteps.length ? Math.round(completedSteps.reduce((sum, step) => sum + step.bestScore, 0) / completedSteps.length) : 0;
  const rating = masteryScore >= 90 && completed === total ? 'Mastery' : masteryScore >= 75 ? 'Strong' : completed > 0 ? 'Developing' : 'Starting';
  return {
    completed,
    total,
    completionPercent: total ? Math.round((completed / total) * 100) : 0,
    masteryScore,
    rating,
    hintsUsed: steps.reduce((sum, step) => sum + step.hintLevel, 0),
    failedAttempts: steps.reduce((sum, step) => sum + step.failedAttempts, 0),
    solutionUses: steps.filter((step) => step.solutionRevealed || step.solutionApplied).length,
  };
}

export function canAdvanceTutorial(progress: TutorialProgress, stepId: string): boolean {
  return Boolean(progress.steps[stepId]?.validated);
}

export function tutorialHintText(caseStudy: CaseStudy, stepId: string, level: number): string {
  const step = caseStudy.steps.find((item) => item.id === stepId);
  if (!step) return '';
  if (level <= 1) return `Focus on ${step.concept}. ${step.why}`;
  if (level === 2) return step.hint;
  return `Target configuration: ${step.solutionText}`;
}

export function buildTutorialReport(progress: TutorialProgress, caseStudy: CaseStudy) {
  const summary = tutorialSummary(progress, caseStudy);
  return {
    caseStudyId: caseStudy.id,
    title: caseStudy.title,
    mode: progress.mode,
    startedAt: progress.startedAt,
    updatedAt: progress.updatedAt,
    summary,
    steps: caseStudy.steps.map((step, index) => {
      const state = progress.steps[step.id] ?? emptyStepProgress(step.id);
      return {
        order: index + 1,
        id: step.id,
        title: step.title,
        concept: step.concept,
        validated: state.validated,
        bestScore: state.bestScore,
        attempts: state.attempts,
        failedAttempts: state.failedAttempts,
        hintsUsed: state.hintLevel,
        solutionRevealed: state.solutionRevealed,
        solutionApplied: state.solutionApplied,
        lastMessage: state.lastMessage,
      };
    }),
  };
}
