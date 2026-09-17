import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { caseStudies } from '../data/curriculum.js';
import { advancedCaseStudies } from '../data/advancedCurriculum.js';
import { checkWorkspaceTask, workspaceObjectCount } from '../utils/workspaceChecks.js';
import { performanceEvidenceCurrent } from '../utils/simulatorLogic.js';
import { clearCaseProgress, clearCaseSession, loadCaseProgress, loadCaseSession, saveCaseProgress, saveCaseSession } from '../utils/caseSessions.js';

const allCaseStudies = [...caseStudies, ...advancedCaseStudies];

export default function CaseStudies({ workspace, setActiveView, resetWorkspace }) {
  const savedStudyId = allCaseStudies.some(c=>c.id===workspace.caseStudyId) ? workspace.caseStudyId : allCaseStudies[0].id;
  const [studyId, setStudyId] = useState(savedStudyId);
  const initialStudy = allCaseStudies.find(c=>c.id===savedStudyId) || allCaseStudies[0];
  const [stepIndex, setStepIndex] = useState(()=>loadCaseProgress(localStorage, savedStudyId, initialStudy.steps.length));
  const [revealed, setRevealed] = useState({});
  const [feedback, setFeedback] = useState(null);
  const study = allCaseStudies.find(c=>c.id===studyId) || allCaseStudies[0];
  const step = study.steps[stepIndex];
  const completion = useMemo(() => study.steps.filter(s=>checkWorkspaceTask(s.check, workspace)).length, [study, workspace]);

  const seedFor = (id) => allCaseStudies.find(c=>c.id===id)?.seed || {};
  const validWorkspaceCase = allCaseStudies.some(c=>c.id===workspace.caseStudyId);

  useEffect(() => {
    if (!validWorkspaceCase || workspace.caseStudyId !== studyId) {
      if (!validWorkspaceCase) setStepIndex(loadCaseProgress(localStorage, studyId, study.steps.length));
      resetWorkspace(loadCaseSession(localStorage, studyId) || {caseStudyId: studyId, ...seedFor(studyId)});
    }
  }, [validWorkspaceCase, workspace.caseStudyId, studyId, study.steps.length]); // Recover invalid/reset case identity, including the guided-step cursor, and resume a valid saved session when available.

  useEffect(() => {
    if (workspace.caseStudyId) saveCaseSession(localStorage, workspace.caseStudyId, workspace);
  }, [workspace]);

  useEffect(() => {
    saveCaseProgress(localStorage, studyId, stepIndex);
  }, [studyId, stepIndex]);

  const selectStudy = (id) => {
    if (id !== studyId) {
      if (workspace.caseStudyId) saveCaseSession(localStorage, workspace.caseStudyId, workspace);
      resetWorkspace(loadCaseSession(localStorage, id) || {caseStudyId: id, ...seedFor(id)});
    }
    const target = allCaseStudies.find(c=>c.id===id) || allCaseStudies[0];
    setStudyId(id); setStepIndex(loadCaseProgress(localStorage, id, target.steps.length)); setFeedback(null); setRevealed({});
  };
  const restartStudy = () => {
    clearCaseSession(localStorage, studyId);
    clearCaseProgress(localStorage, studyId);
    resetWorkspace({caseStudyId:studyId, ...seedFor(studyId)});
    setStepIndex(0); setFeedback(null); setRevealed({});
  };
  const validate = () => {
    const ok = checkWorkspaceTask(step.check, workspace);
    setFeedback(ok ? {ok:true,text:'Step validated. The simulator state now matches the required learning outcome.'} : {ok:false,text:'Not complete yet. Open the indicated Power BI surface and perform the requested configuration.'});
  };
  const goToTask = () => { setActiveView(step.view); document.getElementById('simulator-anchor')?.scrollIntoView({behavior:'smooth', block:'start'}); };

  return (
    <div className="case-studies page-pad">
      <div className="page-heading split-heading">
        <div><span className="eyebrow">END-TO-END PRACTICE</span><h1>Five Power BI case studies</h1><p>Each project makes you perform the work inside the simulated Desktop/Service surfaces, then validate the resulting state. The goal is to learn the sequence and architectural decisions, not just click through screenshots.</p></div>
        <div className="case-overall"><span>Current workspace</span><b>{workspaceObjectCount(workspace)}</b><small>configured learning objects</small><button onClick={restartStudy}>Restart this case</button></div>
      </div>

      <div className="case-scope-note"><Icon name="info" size={15}/><span>Case-study mode isolates each project. Switching projects resumes that project's saved workspace and last step when available; Restart this case returns only the active project to its original seed so unrelated artifacts cannot satisfy validation.</span></div><div className="case-selector">{allCaseStudies.map(c=><button key={c.id} className={studyId===c.id?'active':''} onClick={()=>selectStudy(c.id)}><span>{c.level}</span><b>{c.title}</b><small>{c.purpose}</small></button>)}</div>

      <section className="case-brief">
        <div className="brief-main"><span className="eyebrow">PROJECT BRIEF</span><h2>{study.title}</h2><p>{study.outcome}</p><div className="stack-chips">{study.stack.map(s=><span key={s}>{s}</span>)}</div></div>
        <div className="architecture-strip">{study.architecture.map((a,i)=><React.Fragment key={a}><div><Icon name={i===0?'data':i===study.architecture.length-1?'service':i===3?'model':'query'} size={20}/><span>{a}</span></div>{i<study.architecture.length-1 && <b>→</b>}</React.Fragment>)}</div>
      </section>

      <div className="case-workspace">
        <aside className="step-list"><div className="step-list-head"><div><b>{completion}/{study.steps.length}</b><span>validated</span></div><div className="progress-track"><i style={{width:`${(completion/study.steps.length)*100}%`}}/></div></div>{study.steps.map((s,i)=>{const done=checkWorkspaceTask(s.check,workspace); return <button key={s.id} className={`${i===stepIndex?'active':''} ${done?'done':''}`} onClick={()=>{setStepIndex(i);setFeedback(null)}}><span className="step-index">{done?'✓':i+1}</span><span><small>{s.stage}</small><b>{s.title}</b></span></button>})}</aside>
        <main className="guided-task">
          <div className="task-head"><span className="stage-pill">{step.stage}</span><span className="task-counter">Step {stepIndex+1} of {study.steps.length}</span><h2>{step.title}</h2><p>{step.instruction}</p></div>
          <div className="task-callout"><Icon name="info" size={18}/><div><b>Where to work</b><span>Use the <strong>{step.view === 'powerquery' ? 'Power Query' : step.view === 'dax' ? 'DAX Query' : step.view[0].toUpperCase()+step.view.slice(1)}</strong> surface in the simulator below. Your changes persist across all case-study steps.</span></div></div>
          <div className="task-actions"><button className="primary-btn" onClick={goToTask}>Open required surface</button><button className="secondary-btn" onClick={validate}><Icon name="check" size={16}/>Validate step</button><button className="text-btn" onClick={()=>setRevealed(r=>({...r,[step.id]:!r[step.id]}))}>{revealed[step.id]?'Hide':'Reveal'} solution</button></div>
          {feedback && <div className={`validation-result ${feedback.ok?'ok':'no'}`}><Icon name={feedback.ok?'check':'info'} size={18}/>{feedback.text}</div>}
          {revealed[step.id] && <div className="case-solution"><span>REFERENCE SOLUTION</span><pre>{step.solution}</pre></div>}
          <div className="step-nav"><button disabled={stepIndex===0} onClick={()=>{setStepIndex(i=>i-1);setFeedback(null)}}>← Previous</button><button disabled={stepIndex===study.steps.length-1} onClick={()=>{setStepIndex(i=>i+1);setFeedback(null)}}>Next →</button></div>
        </main>
        <aside className="state-inspector">
          <h3>Workspace state</h3>
          <div><span>Sources</span><b>{workspace.sources.length}</b><small>{workspace.sources.join(', ') || 'None yet'}</small></div>
          <div><span>Power Query steps</span><b>{workspace.transforms.length}</b><small>{workspace.transforms.slice(-3).join(', ') || 'None yet'}</small></div>
          <div><span>Relationships</span><b>{workspace.relationships.length}</b><small>{workspace.relationships.join(', ') || 'None yet'}</small></div>
          <div><span>Measures</span><b>{workspace.measures.length}</b><small>{workspace.measures.map(m=>m.name).join(', ') || 'None yet'}</small></div>
          <div><span>Visuals</span><b>{workspace.visuals.length}</b><small>{workspace.visuals.join(', ') || 'None yet'}</small></div>
          <div><span>Refresh</span><b>{workspace.refreshMode || '—'}</b></div>
          <div><span>RLS</span><b>{workspace.rls ? 'Enabled' : 'Off'}</b></div>
          <div><span>Performance</span><b>{!workspace.performance?.hasRun ? 'Not run' : performanceEvidenceCurrent(workspace) ? 'Current' : 'Stale'}</b></div>
          <div><span>AI readiness</span><b>{workspace.service?.copilotApproved ? 'Approved' : 'Not approved'}</b></div>
          <div><span>App</span><b>{workspace.service?.appPublished ? 'Published' : 'Not published'}</b></div>
        </aside>
      </div>
    </div>
  );
}
