import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { connectors, daxTopics, learningModules, visuals } from '../data/curriculum.js';
import { authoringFeatures, decisionScenarios, troubleshootingScenarios } from '../data/advancedCurriculum.js';

const navSearch = [
  ['home','Overview','Architecture and end-to-end orientation'],
  ['learn','Learning path','Structured PL-300 plus engineering curriculum'],
  ['simulator','Desktop simulator','Report, Data, Model, DAX, TMDL, Power Query, refresh, Service'],
  ['dax','DAX lab','Filter context, CALCULATE, time intelligence, modern DAX'],
  ['sources','Data & Power Query','Connectors, storage modes, transformations'],
  ['visuals','Visuals & reports','Visual selection, interactions, accessibility'],
  ['practice','Decision lab','Scenario reasoning and architecture choices'],
  ['troubleshoot','Troubleshooting','Diagnose DAX, model, refresh, performance, Direct Lake, AI, and security failures'],
  ['cases','Case studies','End-to-end guided projects'],
  ['operate','Operate & secure','Refresh, gateway, RLS, permissions, performance'],
  ['latest','2026 updates','Current release-specific changes'],
  ['coverage','Source map','Coverage and provenance'],
];

export function SearchPalette({ open, onClose, setPage, openSimulatorView }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const items = useMemo(() => {
    const base = navSearch.map(([id,title,description]) => ({type:'Page',title,description, action:()=>setPage(id)}));
    const modules = learningModules.map(x=>({type:'Module',title:x.title,description:`${x.group} · ${x.subtitle}`,action:()=>setPage('learn')}));
    const dax = daxTopics.map(x=>({type:'DAX',title:x.title,description:`${x.group} · ${x.core}`,action:()=>setPage('dax')}));
    const conns = connectors.map(x=>({type:'Connector',title:x.name,description:`${x.category} · ${x.modes.join(', ')}`,action:()=>setPage('sources')}));
    const viz = visuals.map(x=>({type:'Visual',title:x.name,description:x.bestFor,action:()=>setPage('visuals')}));
    const trouble = troubleshootingScenarios.map(x=>({type:'Troubleshoot',title:x.title,description:`${x.area} · ${x.symptom}`,action:()=>setPage('troubleshoot')}));
    const surfaces = [
      ['Report canvas','report'],['Table/Data view','data'],['Model view','model'],['DAX Query view','dax'],['TMDL view','tmdl'],['Power Query Editor','powerquery'],['Performance Analyzer','performance'],['Refresh operations','refresh'],['Power BI Service','service'],
    ].map(([title,view])=>({type:'Simulator',title,description:`Open ${title} in the interactive learning workspace`,action:()=>openSimulatorView(view)}));
    return [...base,...surfaces,...modules,...dax,...conns,...viz,...trouble];
  }, [setPage, openSimulatorView]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter(x => `${x.type} ${x.title} ${x.description}`.toLowerCase().includes(q)).slice(0, 24);
  }, [items, query]);

  if (!open) return null;
  return (
    <div className="search-overlay" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Search learning studio">
      <div className="search-palette" onMouseDown={e=>e.stopPropagation()}>
        <div className="search-input-row"><Icon name="search" size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search DAX, panels, connectors, visuals, modules…"/><kbd>Esc</kbd></div>
        <div className="search-results">
          {filtered.length ? filtered.map((item,i)=><button key={`${item.type}-${item.title}-${i}`} onClick={()=>{item.action();onClose();}}><span>{item.type}</span><div><b>{item.title}</b><small>{item.description}</small></div><Icon name="chevron" size={14}/></button>) : <div className="search-empty">No matching learning item.</div>}
        </div>
      </div>
    </div>
  );
}

export function DecisionLab() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showWhy, setShowWhy] = useState(false);
  const scenario = decisionScenarios[index];
  const answer = answers[scenario.id];
  const complete = Object.keys(answers).length;
  const correct = Object.entries(answers).filter(([id,value])=>decisionScenarios.find(s=>s.id===id)?.answer===value).length;

  const choose = (i) => { setAnswers(a=>({...a,[scenario.id]:i})); setShowWhy(true); };
  return (
    <div className="page-pad decision-page">
      <div className="page-heading split-heading">
        <div><span className="eyebrow">ARCHITECTURE REASONING</span><h1>Power BI decision lab</h1><p>Practice the choices that matter in real work: transformation layer, DAX object type, storage mode, refresh, security, visual selection, and performance diagnosis.</p></div>
        <div className="decision-score"><span>Completed</span><b>{complete}/{decisionScenarios.length}</b><small>{correct} currently correct · answers can be revised</small></div>
      </div>
      <div className="decision-lab-layout">
        <aside className="decision-scenario-list">{decisionScenarios.map((s,i)=><button key={s.id} className={`${i===index?'active':''} ${answers[s.id]!==undefined?'done':''}`} onClick={()=>{setIndex(i);setShowWhy(answers[s.id]!==undefined)}}><span>{answers[s.id]!==undefined?'✓':i+1}</span><div><small>{s.area}</small><b>{s.title}</b></div></button>)}</aside>
        <main className="decision-question">
          <span className="stage-pill">{scenario.area}</span><h2>{scenario.title}</h2><p className="decision-prompt">{scenario.prompt}</p>
          <div className="decision-options">{scenario.options.map((opt,i)=>{const chosen=answer===i; const reveal=showWhy && answer!==undefined; const cls = reveal && i===scenario.answer ? 'correct' : reveal && chosen ? 'incorrect' : chosen ? 'chosen' : ''; return <button className={cls} key={opt} onClick={()=>choose(i)}><span>{String.fromCharCode(65+i)}</span><b>{opt}</b>{reveal && i===scenario.answer && <Icon name="check" size={17}/>}</button>})}</div>
          {showWhy && answer!==undefined && <div className={`decision-explanation ${answer===scenario.answer?'ok':'no'}`}><div><b>{answer===scenario.answer?'Correct reasoning':'Review the layer choice'}</b><p>{scenario.why}</p></div><div className="trap-note"><span>COMMON TRAP</span><p>{scenario.trap}</p></div></div>}
          <div className="step-nav"><button disabled={index===0} onClick={()=>{setIndex(i=>i-1);setShowWhy(answers[decisionScenarios[index-1]?.id]!==undefined)}}>← Previous</button><button disabled={index===decisionScenarios.length-1} onClick={()=>{setIndex(i=>i+1);setShowWhy(answers[decisionScenarios[index+1]?.id]!==undefined)}}>Next →</button></div>
        </main>
      </div>
      <section className="authoring-reference"><div className="section-title-row"><div><span className="eyebrow">REPORT AUTHORING SURFACES</span><h2>What each report-authoring control is for</h2></div><p>Use this as a map before practicing the same concepts in the simulator.</p></div><div className="authoring-feature-grid">{authoringFeatures.map(([name,desc])=><article key={name}><Icon name="report" size={18}/><b>{name}</b><p>{desc}</p></article>)}</div></section>
    </div>
  );
}
