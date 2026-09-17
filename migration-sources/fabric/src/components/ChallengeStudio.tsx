import { useEffect, useMemo, useState } from 'react';
import type { CaseStudy, DataWorkspace, PageKey, PipelineEdge, PipelineNode, PipelineRun } from '../types/app';
import { createWorkspaceCheckpoint } from '../lib/workspaceInsights';
import { loadPracticeProgress } from '../lib/practiceEngine';
import {
  challengeForCase, challengeReport, challengeSummary, clearChallengeProgress, createChallengeProgress,
  emptyChallengeStageProgress, loadChallengeProgress, recordChallengeAttempt, resetChallengeStage,
  revealChallengeHint, saveChallengeProgress, validateChallengeStage, type ChallengeCaseId, type ChallengeProgress,
} from '../lib/challengeEngine';

export function ChallengeStudio({ caseStudy, workspace, nodes, edges, runs, onWorkspace, onNavigate }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  runs: PipelineRun[];
  onWorkspace: (workspace: DataWorkspace) => void;
  onNavigate: (page: PageKey) => void;
}) {
  const caseId = caseStudy.id as ChallengeCaseId;
  const challenge = useMemo(() => challengeForCase(caseStudy.id), [caseStudy.id]);
  const [progress, setProgress] = useState<ChallengeProgress>(() => createChallengeProgress(caseId));
  const [selectedId, setSelectedId] = useState(challenge.stages[0]?.id ?? '');
  const [result, setResult] = useState<{ ok: boolean; message: string; evidence: string } | null>(null);

  useEffect(() => {
    const loaded = loadChallengeProgress(caseId);
    setProgress(loaded);
    const firstIncomplete = challenge.stages.find((stage) => !loaded.stages[stage.id]?.completed) ?? challenge.stages[0];
    setSelectedId(firstIncomplete?.id ?? '');
    setResult(null);
  }, [caseStudy.id, challenge.id]);
  useEffect(() => { saveChallengeProgress(progress); }, [progress]);

  const selectedIndex = Math.max(0, challenge.stages.findIndex((stage) => stage.id === selectedId));
  const selected = challenge.stages[selectedIndex] ?? challenge.stages[0];
  const state = progress.stages[selected.id] ?? emptyChallengeStageProgress(selected.id);
  const summary = challengeSummary(progress, caseId);
  const previousComplete = selectedIndex === 0 || Boolean(progress.stages[challenge.stages[selectedIndex - 1].id]?.completed);

  const validate = () => {
    if (!previousComplete) return;
    const practice = loadPracticeProgress(caseStudy.id);
    const validation = validateChallengeStage(selected, { workspace, nodes, edges, runs, practice });
    const nextProgress = recordChallengeAttempt(progress, selected, validation);
    setProgress(nextProgress);
    setResult({ ok: validation.ok, message: validation.message, evidence: validation.evidence });
    if (validation.ok && selectedIndex < challenge.stages.length - 1) {
      const next = challenge.stages[selectedIndex + 1];
      window.setTimeout(() => { setSelectedId(next.id); setResult(null); }, 250);
    }
  };

  const exportReport = () => {
    const payload = JSON.stringify(challengeReport(progress, caseId), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${caseStudy.id}-end-to-end-challenge.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  const createStartCheckpoint = () => {
    const label = `Challenge start · ${challenge.title}`;
    if (workspace.checkpoints.some((checkpoint) => checkpoint.label === label && checkpoint.snapshot === workspace.snapshot)) return;
    onWorkspace(createWorkspaceCheckpoint(workspace, label));
  };

  return <div className="studio-page challenge-studio v14-challenge-studio">
    <div className="page-heading studio-heading">
      <div><span className="eyebrow">End-to-end engineering challenge</span><h1>{challenge.title}</h1><p>{challenge.summary}</p></div>
      <div className="command-group"><button className="secondary-button" onClick={createStartCheckpoint}>Create start checkpoint</button><button className="secondary-button" onClick={exportReport}>Export challenge report</button><button className="secondary-button" onClick={() => { const fresh = clearChallengeProgress(caseId); setProgress(fresh); setSelectedId(challenge.stages[0]?.id ?? ''); setResult(null); }}>Reset challenge scores</button></div>
    </div>

    <div className="practice-summary-strip challenge-summary-strip">
      <div><strong>{summary.completed}/{summary.total}</strong><span>stages proven</span></div><div><strong>{summary.masteryScore}</strong><span>mastery</span></div><div><strong>{summary.attempts}</strong><span>validations</span></div><div><strong>{summary.hintsUsed}</strong><span>hints</span></div><div><strong>{workspace.snapshot}</strong><span>workspace snapshot</span></div><div><strong>{runs[0]?.status ?? 'No run'}</strong><span>latest run</span></div>
    </div>

    {summary.completed === summary.total && <div className="recovery-proof-banner"><div><strong>End-to-end challenge proven</strong><span>All stages have observable evidence across the shared workspace and orchestration surfaces.</span></div><span>✓ COMPLETE</span></div>}

    <div className="challenge-layout">
      <aside className="challenge-stage-list surface-card">
        <div className="pane-title">Mission stages</div>
        {challenge.stages.map((stage, index) => {
          const stageState = progress.stages[stage.id] ?? emptyChallengeStageProgress(stage.id);
          const unlocked = index === 0 || Boolean(progress.stages[challenge.stages[index - 1].id]?.completed);
          return <button key={stage.id} disabled={!unlocked} className={`${selected.id === stage.id ? 'active' : ''} ${stageState.completed ? 'completed' : ''}`} onClick={() => { setSelectedId(stage.id); setResult(null); }}>
            <span>{stageState.completed ? '✓' : unlocked ? index + 1 : '🔒'}</span><div><strong>{stage.title}</strong><small>{stageState.completed ? `${stageState.bestScore}/100` : unlocked ? 'Ready' : 'Complete previous stage'}</small></div>
          </button>;
        })}
      </aside>

      <main className="challenge-main surface-card">
        <div className="practice-task-head"><div><span className="eyebrow">Stage {selectedIndex + 1} of {challenge.stages.length}</span><h2>{selected.title}</h2><p>{selected.objective}</p></div><button className="primary-button" onClick={() => onNavigate(selected.route)}>Open {selected.route}</button></div>
        <section className="practice-prompt"><strong>Why this matters</strong><p>{selected.why}</p></section>
        <section className="learning-box"><strong>Evidence contract</strong><p>{selected.expectedEvidence}</p></section>
        <div className="challenge-stage-actions"><button className="primary-button" disabled={!previousComplete} onClick={validate}>✓ Validate current evidence</button><button className="secondary-button" onClick={() => { setProgress((current) => resetChallengeStage(current, selected.id)); setResult(null); }}>Reset stage score</button></div>
        {!previousComplete && <div className="validation-message error"><strong>Stage locked</strong><span>Prove the previous stage before validating this one.</span></div>}
        {result && <section className={`practice-result ${result.ok ? 'passed' : 'failed'}`}><div><strong>{result.ok ? 'STAGE PROVEN' : 'NOT YET'}</strong><span>{result.message}</span></div><pre>{result.evidence}</pre></section>}
      </main>

      <aside className="practice-evidence surface-card challenge-evidence">
        <div className="pane-title">Stage evidence</div>
        <div className="practice-score"><strong>{state.completed ? state.bestScore : 0}</strong><span>/100 best score</span></div>
        <div className="review-row"><span>Attempts</span><strong>{state.attempts}</strong></div><div className="review-row"><span>Failed attempts</span><strong>{state.failedAttempts}</strong></div><div className="review-row"><span>Hints</span><strong>{state.hintsUsed}/3</strong></div>
        {state.hintsUsed > 0 && <section className="practice-hint"><strong>Hint {state.hintsUsed}</strong><p>{state.hintsUsed === 1 ? selected.hint : state.hintsUsed === 2 ? `${selected.hint} Validate the exact evidence contract before adding more infrastructure.` : `${selected.hint} Use the Open workbench button and inspect the shared data/run state directly.`}</p></section>}
        <button className="secondary-button full-width" disabled={state.hintsUsed >= 3} onClick={() => setProgress((current) => revealChallengeHint(current, selected.id))}>Reveal next hint</button>
        {state.lastEvidence && <section className="learning-box compact"><strong>Latest validation</strong><pre>{state.lastEvidence}</pre></section>}
        <section className="learning-box compact"><strong>Challenge rule</strong><p>The challenge does not execute the work for you. Make changes in the real workbenches, return here, then validate observable state.</p></section>
      </aside>
    </div>
  </div>;
}
