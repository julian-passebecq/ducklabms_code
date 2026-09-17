import { useEffect, useMemo, useState } from 'react';
import {
  clearPracticeProgress, createPracticeProgress, emptyPracticeExerciseProgress, exercisesForCase, loadPracticeProgress,
  practiceReport, practiceSummary, practiceTools, recordPracticeAttempt, resetPracticeExercise, revealPracticeHint,
  revealPracticeSolution, runPracticeExercise, savePracticeProgress, type PracticeDifficulty, type PracticeKind, type PracticeProgress,
} from '../lib/practiceEngine';
import type { CaseStudy, DataWorkspace, PageKey } from '../types/app';

const difficultyOrder: PracticeDifficulty[] = ['Easy', 'Medium', 'Challenge'];
const kindLabels: Record<PracticeKind | 'all', string> = { all: 'All', decision: 'Architecture', sql: 'SQL', python: 'Python', dbt: 'dbt' };

export function PracticeStudio({ caseStudy, workspace, onWorkspace, onNavigate }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  onWorkspace: (workspace: DataWorkspace) => void;
  onNavigate: (page: PageKey) => void;
}) {
  const exercises = useMemo(() => exercisesForCase(caseStudy.id), [caseStudy.id]);
  const [progress, setProgress] = useState<PracticeProgress>(() => createPracticeProgress(caseStudy.id));
  const [difficulty, setDifficulty] = useState<PracticeDifficulty | 'all'>('all');
  const [kind, setKind] = useState<PracticeKind | 'all'>('all');
  const filtered = useMemo(() => exercises.filter((exercise) => (difficulty === 'all' || exercise.difficulty === difficulty) && (kind === 'all' || exercise.kind === kind)), [exercises, difficulty, kind]);
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? '');
  const selected = exercises.find((exercise) => exercise.id === selectedId) ?? filtered[0] ?? exercises[0];
  const [submission, setSubmission] = useState(selected?.starter ?? '');
  const [result, setResult] = useState<{ ok: boolean; message: string; evidence: string; output: string } | null>(null);

  useEffect(() => {
    const loaded = loadPracticeProgress(caseStudy.id);
    setProgress(loaded);
    const nextExercises = exercisesForCase(caseStudy.id);
    setSelectedId(nextExercises[0]?.id ?? '');
    setSubmission(nextExercises[0]?.starter ?? '');
    setResult(null);
  }, [caseStudy.id]);
  useEffect(() => {
    if (!filtered.length) return;
    if (!filtered.some((exercise) => exercise.id === selectedId)) {
      setSelectedId(filtered[0].id);
      setSubmission(filtered[0].starter);
      setResult(null);
    }
  }, [difficulty, kind, filtered, selectedId]);
  useEffect(() => { savePracticeProgress(progress); }, [progress]);

  const choose = (id: string) => {
    const exercise = exercises.find((item) => item.id === id);
    setSelectedId(id); setSubmission(exercise?.starter ?? ''); setResult(null);
  };
  const summary = practiceSummary(progress, caseStudy.id);
  const state = selected ? progress.exercises[selected.id] ?? emptyPracticeExerciseProgress(selected.id) : undefined;

  const run = () => {
    if (!selected) return;
    const next = runPracticeExercise(selected, workspace, submission);
    if (next.workspace !== workspace) onWorkspace(next.workspace);
    setProgress((current) => recordPracticeAttempt(current, selected, next));
    setResult({ ok: next.ok, message: next.message, evidence: next.evidence, output: next.output });
  };

  const exportReport = () => {
    const payload = JSON.stringify(practiceReport(progress, caseStudy.id), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${caseStudy.id}-practice-report.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (!selected) return <div className="unsupported-page"><strong>No practice exercises are available.</strong></div>;
  return <div className="studio-page practice-studio v13-practice-studio">
    <div className="page-heading studio-heading">
      <div><span className="eyebrow">Hands-on engineering practice</span><h1>Practice SQL, Python, dbt and architecture decisions</h1><p>Exercises execute against the same shared workspace as Notebook, Lakehouse and Pipeline. Passing requires observable evidence, not just matching text.</p></div>
      <div className="command-group"><button className="secondary-button" onClick={exportReport}>Export report</button><button className="secondary-button" onClick={() => { const fresh = clearPracticeProgress(caseStudy.id); setProgress(fresh); setResult(null); }}>Reset practice scores</button></div>
    </div>

    <div className="practice-summary-strip">
      <div><strong>{summary.completed}/{summary.total}</strong><span>completed</span></div><div><strong>{summary.masteryScore}</strong><span>mastery</span></div><div><strong>{summary.attempts}</strong><span>attempts</span></div><div><strong>{summary.hintsUsed}</strong><span>hints</span></div><div><strong>{workspace.snapshot}</strong><span>workspace snapshot</span></div>
    </div>

    <div className="practice-layout">
      <aside className="practice-catalog surface-card">
        <div className="pane-title">Exercise catalog</div>
        <div className="practice-filters"><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as PracticeDifficulty | 'all')}><option value="all">All levels</option>{difficultyOrder.map((item) => <option key={item}>{item}</option>)}</select><select value={kind} onChange={(event) => setKind(event.target.value as PracticeKind | 'all')}>{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div className="practice-exercise-list">{filtered.map((exercise) => { const itemState = progress.exercises[exercise.id] ?? emptyPracticeExerciseProgress(exercise.id); return <button key={exercise.id} className={selected.id === exercise.id ? 'active' : ''} onClick={() => choose(exercise.id)}><span><b className={`practice-level ${exercise.difficulty.toLowerCase()}`}>{exercise.difficulty}</b><small>{kindLabels[exercise.kind]}</small></span><strong>{exercise.title}</strong><em>{itemState.completed ? `✓ ${itemState.bestScore}/100` : 'Not completed'}</em></button>; })}</div>
      </aside>

      <main className="practice-main surface-card">
        <div className="practice-task-head"><div><span className="eyebrow">{selected.difficulty} · {kindLabels[selected.kind]}</span><h2>{selected.title}</h2><p>{selected.objective}</p></div><button className="secondary-button" onClick={() => onNavigate(selected.route)}>Open workbench</button></div>
        <div className="practice-prompt"><strong>Task</strong><p>{selected.prompt}</p><small>{selected.concept}</small></div>
        {selected.kind === 'decision' ? <div className="practice-tool-grid">{practiceTools.map((tool) => <button key={tool} className={submission === tool ? 'selected' : ''} onClick={() => setSubmission(tool)}>{tool}</button>)}</div> : <div className="practice-editor"><div className="code-tab">{selected.kind === 'sql' ? 'SQL' : selected.kind === 'python' ? 'Python · learning API' : 'dbt command'}</div><textarea value={submission} onChange={(event) => setSubmission(event.target.value)} spellCheck={false} /></div>}
        <div className="practice-actions"><button className="primary-button" onClick={run}>▶ Run & validate</button><button className="secondary-button" onClick={() => { setSubmission(selected.starter); setResult(null); setProgress((current) => resetPracticeExercise(current, selected.id)); }}>Reset exercise</button></div>
        {result && <section className={`practice-result ${result.ok ? 'passed' : 'failed'}`}><div><strong>{result.ok ? 'PASS' : 'NOT YET'}</strong><span>{result.message}</span></div><p>{result.evidence}</p>{result.output && <pre>{result.output}</pre>}</section>}
      </main>

      <aside className="practice-evidence surface-card">
        <div className="pane-title">Mastery & evidence</div>
        <div className="practice-score"><strong>{state?.completed ? state.bestScore : 0}</strong><span>/100 best score</span></div>
        <div className="review-row"><span>Attempts</span><strong>{state?.attempts ?? 0}</strong></div><div className="review-row"><span>Failed attempts</span><strong>{state?.failedAttempts ?? 0}</strong></div><div className="review-row"><span>Hints</span><strong>{state?.hintsUsed ?? 0}/3</strong></div>
        <section className="learning-box"><strong>Evidence contract</strong><p>{selected.kind === 'decision' && !state?.completed ? 'Choose the best primary tool for the stated workload. The rationale is revealed after validation.' : selected.expectedEvidence}</p></section>
        {state && state.hintsUsed > 0 && <section className="practice-hint"><strong>Hint {state.hintsUsed}</strong><p>{state.hintsUsed === 1 ? selected.hint : state.hintsUsed === 2 ? `${selected.hint} Focus on the exact output/evidence contract.` : `Target answer: ${selected.solution}`}</p></section>}
        <div className="practice-help-actions"><button className="secondary-button" disabled={(state?.hintsUsed ?? 0) >= 3} onClick={() => setProgress((current) => revealPracticeHint(current, selected.id))}>Reveal next hint</button><button className="secondary-button" onClick={() => { setProgress((current) => revealPracticeSolution(current, selected.id)); setSubmission(selected.solution); }}>Load solution</button></div>
        {state?.lastEvidence && <section className="learning-box compact"><strong>Latest evidence</strong><p>{state.lastEvidence}</p></section>}
        <section className="learning-box compact"><strong>Scoring</strong><p>Independent passes score highest. Failed attempts, hints and loading the solution reduce the mastery score. Challenge exercises apply the strongest penalties.</p></section>
      </aside>
    </div>
  </div>;
}
