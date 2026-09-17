import { Button, FluentProvider, Switch, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { caseStudies, getCaseStudy } from './data/caseStudies.js';
import { concepts } from './data/concepts.js';
import { loadJson, loadString, markStorageVersion, saveJson, saveString, storageKeys } from './lib/persistence.js';
import type { LabMode, ThemeMode } from './types.js';
import { AirflowLab } from './pages/AirflowLab.js';
import { DbtLab } from './pages/DbtLab.js';
import { HybridLab } from './pages/HybridLab.js';

const pathToLab=(path:string):LabMode=>path.startsWith('/dbt')?'dbt':path.startsWith('/hybrid')?'hybrid':'airflow';
const defaultCases:Record<LabMode,string>={airflow:'ecommerce',dbt:'ecommerce',hybrid:'ecommerce'};
const validCaseIds=new Set(caseStudies.map((study)=>study.id));
const loadCaseSelection=():Record<LabMode,string>=>{
  const raw=loadJson<unknown>(storageKeys.caseByLab,defaultCases);
  const candidate=raw&&typeof raw==='object'&&!Array.isArray(raw) ? raw as Partial<Record<LabMode,unknown>> : {};
  return {
    airflow:typeof candidate.airflow==='string'&&validCaseIds.has(candidate.airflow)?candidate.airflow:defaultCases.airflow,
    dbt:typeof candidate.dbt==='string'&&validCaseIds.has(candidate.dbt)?candidate.dbt:defaultCases.dbt,
    hybrid:typeof candidate.hybrid==='string'&&validCaseIds.has(candidate.hybrid)?candidate.hybrid:defaultCases.hybrid,
  };
};

export function App(){
  const [lab,setLab]=useState<LabMode>(()=>pathToLab(window.location.pathname));
  const [theme,setTheme]=useState<ThemeMode>(()=>loadString(storageKeys.theme,'light')==='dark'?'dark':'light');
  const [caseByLab,setCaseByLab]=useState<Record<LabMode,string>>(()=>loadCaseSelection());
  const [resetToken,setResetToken]=useState(0);
  const [showConcepts,setShowConcepts]=useState(false);
  const [conceptQuery,setConceptQuery]=useState('');
  const activeStudy=getCaseStudy(caseByLab[lab]);

  useEffect(()=>{markStorageVersion();const onPop=()=>setLab(pathToLab(window.location.pathname));window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>{if(!showConcepts)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setShowConcepts(false);};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[showConcepts]);
  const navigate=(next:LabMode)=>{const path=next==='airflow'?'/airflow':next==='dbt'?'/dbt':'/hybrid';history.pushState({},'',path);setLab(next);};
  const setCase=(id:string)=>{const next={...caseByLab,[lab]:id};setCaseByLab(next);saveJson(storageKeys.caseByLab,next);setResetToken((value)=>value+1);};
  const toggleTheme=(checked:boolean)=>{const next=checked?'dark':'light';setTheme(next);saveString(storageKeys.theme,next);};
  const filteredConcepts=useMemo(()=>concepts.filter((c)=>`${c.title} ${c.product} ${c.definition}`.toLowerCase().includes(conceptQuery.toLowerCase())),[conceptQuery]);

  return <FluentProvider theme={theme==='dark'?webDarkTheme:webLightTheme} className={`app-root theme-${theme}`}>
    <header className="app-header">
      <div className="brand-block"><div className="product-mark">OS</div><div><strong>Orchestration Studio</strong><span>Airflow + dbt teaching simulator</span></div></div>
      <nav className="mode-nav" aria-label="Lab mode"><button type="button" aria-current={lab==='airflow'?'page':undefined} className={lab==='airflow'?'active':''} onClick={()=>navigate('airflow')}>Airflow Lab</button><button type="button" aria-current={lab==='dbt'?'page':undefined} className={lab==='dbt'?'active':''} onClick={()=>navigate('dbt')}>dbt Lab</button><button type="button" aria-current={lab==='hybrid'?'page':undefined} className={lab==='hybrid'?'active':''} onClick={()=>navigate('hybrid')}>Hybrid Project</button></nav>
      <div className="header-actions"><Button appearance="subtle" onClick={()=>setShowConcepts(true)}>Concept library</Button><Switch checked={theme==='dark'} onChange={(_e:any,data:any)=>toggleTheme(Boolean(data.checked))} label="Dark"/></div>
    </header>
    <div className="context-bar"><div><span>Case study</span><select value={activeStudy.id} onChange={(event)=>setCase(event.target.value)}>{caseStudies.map((study)=><option key={study.id} value={study.id}>{study.name}</option>)}</select></div><p>{activeStudy.description}</p><Button size="small" appearance="subtle" onClick={()=>setResetToken((value)=>value+1)}>Reset run/UI state</Button></div>
    <div className="page-shell">
      {lab==='airflow'&&<AirflowLab study={activeStudy} resetToken={resetToken}/>} 
      {lab==='dbt'&&<DbtLab study={activeStudy} resetToken={resetToken}/>} 
      {lab==='hybrid'&&<HybridLab study={activeStudy} resetToken={resetToken}/>} 
    </div>
    {showConcepts&&<div className="modal-backdrop" onMouseDown={(event)=>{if(event.currentTarget===event.target)setShowConcepts(false);}}><section className="concept-modal" role="dialog" aria-modal="true" aria-label="Concept library"><div className="modal-header"><div><div className="eyebrow">REFERENCE</div><h2>Concept library</h2></div><Button appearance="subtle" onClick={()=>setShowConcepts(false)}>Close</Button></div><input className="concept-search" aria-label="Search concept library" placeholder="Search retry, ref, incremental…" value={conceptQuery} onChange={(event)=>setConceptQuery(event.target.value)}/><div className="concept-list">{filteredConcepts.map((concept)=><article key={concept.id}><div><span>{concept.product}</span><h3>{concept.title}</h3></div><p>{concept.definition}</p><details><summary>Why / example / mistake</summary><dl><dt>Why</dt><dd>{concept.why}</dd><dt>Example</dt><dd><code>{concept.example}</code></dd><dt>Common mistake</dt><dd>{concept.mistake}</dd></dl></details></article>)}</div></section></div>}
  </FluentProvider>;
}
