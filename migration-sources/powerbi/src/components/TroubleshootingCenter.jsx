import React, { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { troubleshootingScenarios } from '../data/advancedCurriculum.js';

export default function TroubleshootingCenter({ setPage, openSimulatorView }) {
  const [scenarioId, setScenarioId] = useState(troubleshootingScenarios[0].id);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [filter, setFilter] = useState('All');
  const scenario = troubleshootingScenarios.find(x => x.id === scenarioId) || troubleshootingScenarios[0];
  const areas = ['All', ...new Set(troubleshootingScenarios.map(x=>x.area))];
  const visible = filter === 'All' ? troubleshootingScenarios : troubleshootingScenarios.filter(x=>x.area===filter);
  const solved = useMemo(() => troubleshootingScenarios.filter(x=>answers[x.id]===x.answer).length, [answers]);
  const chosen = answers[scenario.id];
  const isCorrect = chosen === scenario.answer;

  const goSurface = () => {
    const map = {
      'DAX': 'dax', 'Model': 'model', 'Refresh': 'refresh', 'Performance': 'performance',
      'Storage': 'refresh', 'Copilot / AI': 'service', 'Security': 'service',
    };
    const view = map[scenario.area];
    if (view) openSimulatorView(view);
    else setPage('simulator');
  };

  return (
    <div className="page-pad troubleshoot-page">
      <div className="page-heading split-heading">
        <div>
          <span className="eyebrow">DIAGNOSE BEFORE YOU CHANGE THINGS</span>
          <h1>Power BI troubleshooting center</h1>
          <p>Practice production failure modes. Read the evidence, identify the layer that is actually failing, choose the remediation, then compare the root-cause explanation.</p>
        </div>
        <div className="trouble-score"><span>Resolved correctly</span><b>{solved}/{troubleshootingScenarios.length}</b><small>tickets</small><div className="progress-track"><i style={{width:`${(solved/troubleshootingScenarios.length)*100}%`}}/></div></div>
      </div>

      <div className="trouble-filter">{areas.map(a=><button key={a} className={filter===a?'active':''} onClick={()=>setFilter(a)}>{a}</button>)}</div>

      <div className="trouble-layout">
        <aside className="trouble-list">
          {visible.map(x=>{
            const done = answers[x.id]===x.answer;
            return <button key={x.id} className={`${scenario.id===x.id?'active':''} ${done?'done':''}`} onClick={()=>setScenarioId(x.id)}>
              <span className={`severity ${x.severity.toLowerCase()}`}>{x.severity}</span>
              <b>{x.title}</b><small>{x.area}</small>{done && <i>✓</i>}
            </button>;
          })}
        </aside>

        <main className="trouble-ticket">
          <div className="ticket-head"><span>{scenario.area}</span><span className={`severity ${scenario.severity.toLowerCase()}`}>{scenario.severity}</span><h2>{scenario.title}</h2><p>{scenario.symptom}</p></div>
          <section className="evidence-box"><div><Icon name="info" size={18}/><b>Observed evidence</b></div>{scenario.evidence.map(x=><span key={x}>• {x}</span>)}</section>
          <section className="diagnosis-options"><h3>What should you do first?</h3>{scenario.options.map((x,i)=>{
            const selected = chosen===i;
            const state = selected ? (i===scenario.answer?'correct':'wrong') : '';
            return <button key={x} className={`${selected?'selected':''} ${state}`} onClick={()=>setAnswers(a=>({...a,[scenario.id]:i}))}><span>{String.fromCharCode(65+i)}</span><p>{x}</p>{selected && <b>{i===scenario.answer?'Correct':'Try again'}</b>}</button>;
          })}</section>
          {chosen !== undefined && <div className={`diagnosis-feedback ${isCorrect?'ok':'no'}`}><Icon name={isCorrect?'check':'info'} size={18}/><div><b>{isCorrect?'Diagnosis accepted':'That treats the wrong layer'}</b><span>{isCorrect?scenario.rootCause:'Use the evidence to identify which Power BI layer owns the symptom before applying a fix.'}</span></div></div>}
          <div className="ticket-actions"><button className="primary-btn" onClick={goSurface}>Open relevant simulator surface</button><button className="secondary-btn" onClick={()=>setRevealed(r=>({...r,[scenario.id]:!r[scenario.id]}))}>{revealed[scenario.id]?'Hide':'Reveal'} remediation</button></div>
          {revealed[scenario.id] && <div className="remediation"><span>REFERENCE REMEDIATION</span><pre>{scenario.fix}</pre><small>Work surface: {scenario.surface}</small></div>}
        </main>

        <aside className="trouble-method">
          <span className="eyebrow">DEBUG METHOD</span><h3>Use the same sequence every time</h3>
          {[['1','Reproduce','Confirm the exact symptom and scope.'],['2','Measure','Collect refresh history, Performance Analyzer timings, model state, or security evidence.'],['3','Locate','Source, Power Query, model, DAX, visual, Service, or infrastructure?'],['4','Change one layer','Apply the smallest justified change.'],['5','Retest','Compare against the original evidence and a control total.']].map(([n,t,d])=><div className="debug-step" key={n}><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span></div>)}
          <div className="anti-pattern"><b>Anti-pattern</b><p>Do not rewrite DAX, change storage mode, enable bidirectional relationships, or add refreshes until the evidence points to that layer.</p></div>
        </aside>
      </div>
    </div>
  );
}
