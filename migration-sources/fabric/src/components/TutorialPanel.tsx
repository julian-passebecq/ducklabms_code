import { compareWorkspaceToSeed } from '../lib/workspaceInsights';
import { buildTutorialReport, canAdvanceTutorial, calculateStepScore, emptyStepProgress, revealTutorialHint, resetTutorialStep, setTutorialMode, tutorialHintText, tutorialSummary } from '../lib/tutorialLearning';
import type { CaseStudy, DataWorkspace, PageKey, PipelineRun, TutorialProgress, TutorialStep } from '../types/app';

export function TutorialPanel({ caseStudy, workspace, stepIndex, progress, validation, runs, onValidate, onNext, onPrev, onProgress, onReveal, onReset, onNavigate, onRecovery }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  stepIndex: number;
  progress: TutorialProgress;
  validation: { ok: boolean; message: string } | null;
  runs: PipelineRun[];
  onValidate: () => void;
  onNext: () => void;
  onPrev: () => void;
  onProgress: (progress: TutorialProgress) => void;
  onReveal: (step: TutorialStep) => void;
  onReset: () => void;
  onNavigate: (page: PageKey) => void;
  onRecovery?: () => void;
}) {
  const step = caseStudy.steps[stepIndex];
  const stepProgress = progress.steps[step.id] ?? emptyStepProgress(step.id);
  const summary = tutorialSummary(progress, caseStudy);
  const navigationUnlocked = canAdvanceTutorial(progress, step.id);
  const changes = compareWorkspaceToSeed(workspace, caseStudy).filter((change) => change.kind !== 'unchanged');
  const latest = workspace.history[0];
  const latestRun = runs[0];
  const currentScore = stepProgress?.validated ? stepProgress.bestScore : calculateStepScore(stepProgress, progress.mode);
  const hintLevel = stepProgress?.hintLevel ?? 0;
  const challenge = progress.mode === 'Challenge';

  const revealNextHint = () => onProgress(revealTutorialHint(progress, step.id));
  const resetStepScore = () => onProgress(resetTutorialStep(progress, step.id));
  const exportReport = () => {
    const payload = JSON.stringify(buildTutorialReport(progress, caseStudy), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${caseStudy.id}-learning-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="tutorial-panel v12-tutorial-panel">
      <div className="tutorial-header">
        <div>
          <div className="eyebrow">Learning mission</div>
          <strong>{caseStudy.title}</strong>
        </div>
        <button className="icon-button" title="Reset entire lab" onClick={onReset}>↺</button>
      </div>

      <div className="tutorial-mode-row">
        <button className={progress.mode === 'Guided' ? 'active' : ''} onClick={() => onProgress(setTutorialMode(progress, 'Guided'))}>Guided</button>
        <button className={progress.mode === 'Challenge' ? 'active' : ''} onClick={() => onProgress(setTutorialMode(progress, 'Challenge'))}>Challenge</button>
      </div>

      <div className="mastery-summary">
        <div><span>Completion</span><strong>{summary.completed}/{summary.total}</strong><small>{summary.completionPercent}%</small></div>
        <div><span>Mastery</span><strong>{summary.masteryScore || '—'}</strong><small>{summary.rating}</small></div>
        <div><span>Hints</span><strong>{summary.hintsUsed}</strong><small>{summary.solutionUses} solution use{summary.solutionUses === 1 ? '' : 's'}</small></div>
      </div>

      <div className="progress-row"><div className="progress-track"><span style={{ width: `${summary.completionPercent}%` }} /></div><span>{stepIndex + 1}/{caseStudy.steps.length}</span></div>
      {summary.completed === summary.total && <div className="mission-complete-banner"><strong>Core mission complete</strong><span>{summary.masteryScore}/100 mastery · {summary.rating}. Continue into failure/recovery to prove operational understanding.</span></div>}

      <div className="tutorial-step">
        <div className="step-heading-row"><span className="step-kicker">Step {stepIndex + 1}</span><span className={`step-score ${stepProgress?.validated ? 'validated' : ''}`}>{stepProgress?.validated ? `✓ ${stepProgress.bestScore}/100` : `${currentScore}/100 available`}</span></div>
        <h3>{step.title}</h3>
        <p className="instruction">{step.instruction}</p>

        {!challenge ? <>
          <div className="learning-box"><strong>Why this matters</strong><p>{step.why}</p></div>
          <div className="concept-row"><span>Concept</span><strong>{step.concept}</strong></div>
          <div className="expected-box"><strong>Validation expects</strong><p>{step.expected}</p></div>
        </> : <div className="challenge-brief"><strong>Challenge mode</strong><span>Build from the instruction first. Reveal evidence or hints only when you need them; assistance lowers the available mastery score.</span></div>}

        {caseStudy.engineeringDecision && <details className="decision-in-case"><summary>Why these tools?</summary><div><strong>Production context</strong><p>{caseStudy.engineeringDecision.productionScale}</p><strong>Preferred approach</strong><p>{caseStudy.engineeringDecision.preferred}</p><strong>Avoid</strong><p>{caseStudy.engineeringDecision.avoid}</p><small>Learning sample: {caseStudy.engineeringDecision.learningSample}</small></div></details>}

        <section className="tutorial-proof-grid">
          <div><span>Workspace</span><strong>snapshot {workspace.snapshot}</strong><small>{changes.length} changed/created table{changes.length === 1 ? '' : 's'}</small></div>
          <div><span>Lineage</span><strong>{workspace.lineage?.length ?? 0} edges</strong><small>{latest ? `${latest.action} · ${latest.object}` : 'No data event yet'}</small></div>
          <div><span>Latest run</span><strong>{latestRun?.status ?? 'Not run'}</strong><small>{latestRun ? `${latestRun.trigger} · ${latestRun.activities.length} activities` : 'Debug when the pipeline is ready'}</small></div>
          <div><span>Attempts</span><strong>{stepProgress?.attempts ?? 0}</strong><small>{stepProgress?.failedAttempts ?? 0} failed validation{(stepProgress?.failedAttempts ?? 0) === 1 ? '' : 's'}</small></div>
        </section>

        {validation && <div className={`validation-message ${validation.ok ? 'ok' : 'error'}`}><strong>{validation.ok ? 'Validated' : 'Not yet'}</strong><span>{validation.message}</span></div>}
        {!validation && stepProgress?.validated && <div className="validation-message ok"><strong>Previously validated</strong><span>This step has recorded mastery evidence. Re-validate after changes if you want to confirm the current state.</span></div>}

        <div className="hint-ladder">
          <div className="hint-ladder-head"><strong>Hint ladder</strong><span>{hintLevel}/3 revealed</span></div>
          {hintLevel === 0 && <p>Try the task before revealing help.</p>}
          {Array.from({ length: hintLevel }, (_, index) => index + 1).map((level) => <div className="hint-level" key={level}><span>L{level}</span><p>{tutorialHintText(caseStudy, step.id, level)}</p></div>)}
          {hintLevel < 3 && <button className="secondary-button compact" onClick={revealNextHint}>Reveal hint {hintLevel + 1}</button>}
        </div>

        <details className="evidence-navigation"><summary>Inspect evidence in other workbenches</summary><div className="evidence-links"><button onClick={() => onNavigate('lakehouse')}>Lakehouse</button><button onClick={() => onNavigate('notebook')}>Notebook</button><button onClick={() => onNavigate('dbt')}>dbt</button><button onClick={() => onNavigate('monitor')}>Monitor</button><button onClick={() => onNavigate('recovery')}>Recovery</button></div></details>
      </div>

      <div className="tutorial-actions">
        <button className="primary-button" onClick={onValidate}>Validate step</button>
        <button className="secondary-button" onClick={() => onReveal(step)}>Show solution</button>
        <div className="tutorial-secondary-actions"><button className="text-button" onClick={resetStepScore}>Reset step attempts</button><button className="text-button" onClick={exportReport}>Export mission report</button></div>
        <div className="step-nav">
          <button onClick={onPrev} disabled={stepIndex === 0}>Previous</button>
          <button onClick={onNext} disabled={stepIndex >= caseStudy.steps.length - 1 || !navigationUnlocked} title={!navigationUnlocked ? 'Validate this step before continuing.' : undefined}>Next</button>
        </div>
        {!navigationUnlocked && stepIndex < caseStudy.steps.length - 1 && <small className="next-lock-note">Validate the current step to unlock Next.</small>}
        {stepIndex === caseStudy.steps.length - 1 && onRecovery && <button className="recovery-drill-button" disabled={!navigationUnlocked} onClick={onRecovery}>{navigationUnlocked ? 'Run failure & recovery drill →' : 'Validate final step to unlock recovery drill'}</button>}
      </div>
    </aside>
  );
}
