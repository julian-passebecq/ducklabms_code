import { useEffect, useMemo, useState } from 'react';
import type { CaseStudy } from '../types.js';
import { isLocalStorageUsable, loadBooleanRecord, loadStringRecord, mockAnswersKey, mockReviewKey, removeStored, saveJson } from '../lib/persistence.js';

export function CaseOverview({study}:{study:CaseStudy}){
  const [mockAnswers,setMockAnswers]=useState<Record<string,string>>({});
  const [mockReview,setMockReview]=useState<Record<string,boolean>>({});
  const [storageOk,setStorageOk]=useState(()=>isLocalStorageUsable());

  useEffect(()=>{
    if(study.mockProject){
      setMockAnswers(loadStringRecord(mockAnswersKey(study.id)));
      setMockReview(loadBooleanRecord(mockReviewKey(study.id)));
      setStorageOk(isLocalStorageUsable());
    }else{
      setMockAnswers({});
      setMockReview({});
    }
  },[study.id,Boolean(study.mockProject)]);

  const answeredCount=useMemo(()=>study.mockProject?.checkpoints.filter((checkpoint)=>Boolean(mockAnswers[checkpoint.id]?.trim())).length??0,[study.mockProject,mockAnswers]);
  const reviewCount=useMemo(()=>study.mockProject?.acceptanceCriteria.filter((_item,index)=>mockReview[`acceptance-${index}`]===true).length??0,[study.mockProject,mockReview]);

  const updateMockAnswer=(checkpointId:string,value:string)=>{
    const next={...mockAnswers,[checkpointId]:value};
    setMockAnswers(next);
    setStorageOk(saveJson(mockAnswersKey(study.id),next));
  };
  const updateReview=(index:number,value:boolean)=>{
    const next={...mockReview,[`acceptance-${index}`]:value};
    setMockReview(next);
    setStorageOk(saveJson(mockReviewKey(study.id),next));
  };
  const clearMockWorkspace=()=>{
    setMockAnswers({});
    setMockReview({});
    const answersRemoved=removeStored(mockAnswersKey(study.id));
    const reviewRemoved=removeStored(mockReviewKey(study.id));
    setStorageOk(answersRemoved&&reviewRemoved);
  };

  return <div className={`overview-grid ${study.mockProject?'mock-mode':''}`}>
    <article className="hero-card"><div className="eyebrow">{study.domain}</div><h2>{study.name}</h2><p>{study.description}</p><div className="truth-banner"><strong>Teaching simulator</strong><span>Execution states and logs are deterministic simulations, not an Airflow scheduler, dbt engine or warehouse.</span></div></article>
    {study.mockProject&&<section className="mock-project-card" aria-label="Mock project brief">
      <div className="mock-project-heading"><div><div className="eyebrow">MOCK PROJECT</div><h3>Start from the requirements</h3><p>{study.mockProject.role}</p></div><span className="mock-badge">Practice case</span></div>
      <p className="mock-brief">{study.mockProject.brief}</p>
      <div className="mock-columns">
        <div><h4>Requirements</h4><ul>{study.mockProject.requirements.map((item)=><li key={item}>{item}</li>)}</ul></div>
        <div><h4>Constraints</h4><ul>{study.mockProject.constraints.map((item)=><li key={item}>{item}</li>)}</ul></div>
        <div><h4>Deliverables</h4><ul>{study.mockProject.deliverables.map((item)=><li key={item}>{item}</li>)}</ul></div>
      </div>
      <div className="mock-checkpoints">
        <div className="mock-progress-row">
          <div><h4>Reasoning checkpoints</h4><p>Write your own answer first. This is self-review, not automatic architecture grading.</p><p className={`storage-note ${storageOk?'ok':'warning'}`}>{storageOk?'Drafts and self-review checks are saved in this browser.':'Browser storage is unavailable. Your current drafts stay only in this open tab.'}</p></div>
          <div className="mock-progress"><strong>{answeredCount}/{study.mockProject.checkpoints.length}</strong><span>drafted</span><strong>{reviewCount}/{study.mockProject.acceptanceCriteria.length}</strong><span>reviewed</span><button type="button" onClick={clearMockWorkspace} disabled={answeredCount===0&&reviewCount===0}>Clear practice state</button></div>
        </div>
        {study.mockProject.checkpoints.map((checkpoint)=><article key={checkpoint.id} className="mock-checkpoint"><strong>{checkpoint.title}</strong><p>{checkpoint.prompt}</p><label className="mock-answer-label" htmlFor={`mock-answer-${study.id}-${checkpoint.id}`}>Your design note</label><textarea id={`mock-answer-${study.id}-${checkpoint.id}`} className="mock-answer" value={mockAnswers[checkpoint.id]??''} onChange={(event)=>updateMockAnswer(checkpoint.id,event.target.value)} placeholder="Write your reasoning before revealing the hint…" rows={3}/><details><summary>Hint</summary><p>{checkpoint.hint}</p></details><details><summary>Reference answer</summary><p>{checkpoint.referenceAnswer}</p></details></article>)}
      </div>
      <div className="mock-acceptance"><div className="mock-acceptance-heading"><div><h4>Acceptance checks</h4><p>After comparing your plan with the reference implementation, mark what you can now explain.</p></div><span>{reviewCount}/{study.mockProject.acceptanceCriteria.length} self-reviewed</span></div><div className="mock-review-list">{study.mockProject.acceptanceCriteria.map((item,index)=><label key={item}><input type="checkbox" checked={mockReview[`acceptance-${index}`]===true} onChange={(event)=>updateReview(index,event.target.checked)}/><span>{item}</span></label>)}</div></div>
    </section>}
    <article className="info-card"><h3>Business problem</h3><p>{study.businessProblem}</p></article>
    <article className="info-card">{study.mockProject?<><h3>Reference architecture rationale</h3><details className="reference-rationale"><summary>Reveal after you make your own plan</summary><p>{study.architectureWhy}</p></details></>:<><h3>Why this architecture</h3><p>{study.architectureWhy}</p></>}</article>
    <article className="info-card"><h3>Learning goals</h3><ul>{study.learningGoals.map((goal)=><li key={goal}>{goal}</li>)}</ul></article>
    <article className="info-card"><h3>Common failure to reason about</h3><p>{study.commonFailure}</p></article>
  </div>;
}
