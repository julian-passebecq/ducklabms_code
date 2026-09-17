import React, { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { performanceScenarios } from '../data/advancedCurriculum.js';
import { buildPerformanceRows, getScenarioProfile, hasLoadedSemanticModel, performanceContextSignature, performanceEvidenceCurrent } from '../utils/simulatorLogic.js';

function TimingBar({ value, total }) {
  return <div className="timing-track"><i style={{width:`${Math.max(3,(value/total)*100)}%`}}/></div>;
}

export function PerformanceView({ workspace, setWorkspace }) {
  const [recording, setRecording] = useState(false);
  const [selectedName, setSelectedName] = useState(performanceScenarios[1].name);
  const [filter, setFilter] = useState('All');
  const [copied, setCopied] = useState(false);
  const rows = useMemo(()=>buildPerformanceRows(performanceScenarios, workspace), [workspace.visuals.length]);
  const selected = rows.find(row=>row.name===selectedName) || rows[0];
  const profile = getScenarioProfile(workspace);
  const evidenceCurrent = performanceEvidenceCurrent(workspace);
  const loadedModel = hasLoadedSemanticModel(workspace);
  const copiedQuery = `EVALUATE\nSUMMARIZECOLUMNS (\n    ${profile.id==='wind' ? 'Site[Site]' : profile.id==='finance' ? 'Project[BusinessUnit]' : 'Region[Country]'},\n    \"Metric\", ${profile.primaryMeasure}\n)`;
  const visible = filter==='All' ? rows : rows.filter(x=>filter==='Slow' ? x.dax+x.render+x.other>300 : x.dax+x.render+x.other<=300);
  const run = () => {
    if (!loadedModel) return;
    setRecording(true);
    setWorkspace(w=>({...w,performance:{...(w.performance||{}),hasRun:true,lastRunAt:new Date().toISOString(),evidenceSignature:performanceContextSignature(w)}}));
    window.setTimeout(()=>setRecording(false), 450);
  };
  const optimize = (item) => setWorkspace(w=>({
    ...w,
    performance:{...(w.performance||{}),optimized:[...new Set([...(w.performance?.optimized||[]),item])]},
  }));
  return (
    <div className="desktop-work-area performance-layout">
      <main className="performance-main">
        <div className="performance-toolbar"><button disabled={!loadedModel} className={`pbi-primary ${recording?'recording':''}`} onClick={run}>{recording?'■ Recording…':'● Start recording / Run analyzer'}</button><button onClick={()=>setFilter('All')} className={filter==='All'?'active':''}>All visuals</button><button onClick={()=>setFilter('Slow')} className={filter==='Slow'?'active':''}>Slow only</button><button onClick={()=>setFilter('Healthy')} className={filter==='Healthy'?'active':''}>Healthy</button><span>{loadedModel?'Simulated timings adapt to your report visual count.':'Load a semantic model before recording Performance Analyzer evidence.'}</span></div>
        <div className="performance-table-head"><span>Visual</span><span>DAX query</span><span>Display</span><span>Other</span><span>Total</span></div>
        <div className="performance-rows">{visible.map(r=>{const total=r.dax+r.render+r.other; return <button key={r.name} className={selected.name===r.name?'active':''} onClick={()=>setSelectedName(r.name)}><b>{r.name}</b><div><TimingBar value={r.dax} total={Math.max(500,total)}/><small>{r.dax} ms</small></div><div><TimingBar value={r.render} total={Math.max(500,total)}/><small>{r.render} ms</small></div><span>{r.other} ms</span><strong>{total} ms</strong></button>})}</div>
        <div className="performance-help"><Icon name="info" size={17}/><p><b>Interpret timing categories before changing the model.</b> High DAX time points toward query/model logic; high display time points toward rendering/visual density; “other” includes time not attributed to those two categories.</p></div>
      </main>
      <aside className="performance-inspector">
        <span className="eyebrow">SELECTED VISUAL</span><h3>{selected.name}</h3><p>{selected.note}</p>
        <div className="perf-metric"><span>DAX query</span><b>{selected.dax} ms</b></div><div className="perf-metric"><span>Visual display</span><b>{selected.render} ms</b></div><div className="perf-metric"><span>Other</span><b>{selected.other} ms</b></div>
        <button disabled={!loadedModel} onClick={async()=>{try { if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(copiedQuery); } catch {} setCopied(true);window.setTimeout(()=>setCopied(false),800)}}>▣ {copied?'Copied':'Copy query'}</button>
        <div className="perf-checks"><b>Optimization actions</b>{['Reduce page visual density','Review high-cardinality fields','Inspect DAX / query shape','Preserve query folding','Remove unused model columns'].map(x=><button disabled={!workspace.performance?.hasRun} key={x} className={(workspace.performance?.optimized||[]).includes(x)?'done':''} onClick={()=>optimize(x)}><span>{(workspace.performance?.optimized||[]).includes(x)?'✓':'○'}</span>{x}</button>)}</div>
        <div className={`perf-state ${workspace.performance?.hasRun && !evidenceCurrent?'stale':''}`}><span>Analyzer state</span><b>{!workspace.performance?.hasRun?'Not run':evidenceCurrent?'Recorded · current':'Stale · rerun required'}</b><small>{workspace.performance?.hasRun && !evidenceCurrent?'The report/model changed after this evidence was recorded. ':''}{workspace.performance?.optimized?.length||0} optimization checks marked</small></div>
      </aside>
    </div>
  );
}
