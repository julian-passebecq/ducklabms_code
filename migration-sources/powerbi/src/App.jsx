import React, { useEffect, useState } from 'react';
import Icon from './components/Icon.jsx';
import PowerBIDesktop from './components/PowerBIDesktop.jsx';
import DaxLab from './components/DaxLab.jsx';
import CaseStudies from './components/CaseStudies.jsx';
import {
  HomePage, CurriculumPage, SourcesPage, VisualsPage, OperationsPage, LatestPage, CoveragePage,
} from './components/ReferencePages.jsx';
import { DecisionLab, SearchPalette } from './components/LearningExtras.jsx';
import TroubleshootingCenter from './components/TroubleshootingCenter.jsx';
import { normalizeWorkspace } from './utils/workspaceState.js';
import { clearAllCaseSessions } from './utils/caseSessions.js';

const nav = [
  ['home','home','Overview'],
  ['learn','learn','Learning path'],
  ['simulator','report','Desktop simulator'],
  ['dax','dax','DAX lab'],
  ['sources','data','Data & Power Query'],
  ['visuals','visual','Visuals & reports'],
  ['practice','learn','Decision lab'],
  ['troubleshoot','speed','Troubleshooting'],
  ['cases','case','Case studies'],
  ['operate','refresh','Operate & secure'],
  ['latest','info','2026 updates'],
  ['coverage','query','Source map'],
];

function loadWorkspace() {
  try {
    const raw = localStorage.getItem('pbi-learning-workspace-v1');
    return raw ? normalizeWorkspace(JSON.parse(raw)) : normalizeWorkspace();
  } catch { return normalizeWorkspace(); }
}

export default function App() {
  const [page, setPage] = useState('home');
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [activeView, setActiveView] = useState('report');
  const [navOpen, setNavOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(()=>{
    try { localStorage.setItem('pbi-learning-workspace-v1', JSON.stringify(workspace)); } catch {}
  }, [workspace]);

  const resetWorkspace = (overrides = {}) => {
    const next = normalizeWorkspace(overrides);
    setWorkspace(next);
    try {
      if (Object.keys(overrides).length) localStorage.setItem('pbi-learning-workspace-v1', JSON.stringify(next));
      else localStorage.removeItem('pbi-learning-workspace-v1');
    } catch {}
  };

  const resetAllLabState = () => {
    try { clearAllCaseSessions(localStorage); } catch {}
    resetWorkspace();
  };

  const openSimulatorView = (view) => { setActiveView(view); setPage('simulator'); };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`app-shell ${navOpen?'nav-open':'nav-collapsed'}`}>
      <header className="global-header">
        <div className="brand-lockup"><button className="nav-toggle" onClick={()=>setNavOpen(v=>!v)} aria-label="Toggle navigation">☰</button><span className="pbi-mark"><i/><i/><i/></span><div><b>Power BI Learning Studio</b><small>Desktop + Service • 2026</small></div></div>
        <button className="global-search" onClick={()=>setSearchOpen(true)}><Icon name="search" size={16}/><span>Search concepts, DAX, visuals, connectors…</span><kbd>Ctrl K</kbd></button>
        <div className="global-actions"><button title="Current simulator state"><Icon name="data" size={16}/><span>{workspace.measures.length} measures</span></button><button title="Settings"><Icon name="settings" size={18}/></button><div className="avatar">JP</div></div>
      </header>
      <aside className="global-nav">
        <div className="nav-section-label">LEARN</div>
        {nav.map(([id,icon,label])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)} title={label}><Icon name={icon} size={19}/><span>{label}</span>{id==='cases' && <b className="nav-pill">5</b>}{id==='latest' && <b className="new-pill">NEW</b>}</button>)}
        <div className="nav-footer"><div className="progress-summary"><span>Workspace progress</span><b>{workspace.sources.length + workspace.transforms.length + workspace.relationships.length + workspace.measures.length + workspace.visuals.length}</b><small>objects configured</small></div><button onClick={resetAllLabState}><Icon name="refresh" size={16}/><span>Reset lab state</span></button></div>
      </aside>
      <main className="app-main">
        {page==='home' && <HomePage setPage={setPage}/>} 
        {page==='learn' && <CurriculumPage setPage={setPage}/>} 
        {page==='simulator' && <div className="simulator-page page-pad"><div className="page-heading simulator-page-heading"><span className="eyebrow">INTERACTIVE REPLICA</span><h1>Power BI Desktop + Service</h1><p>Use the view rail, ribbon, panes, and learning controls to build a persistent local project state. This is a workflow simulator, not a pixel-copy or a connection to Microsoft services.</p></div><div id="simulator-anchor"><PowerBIDesktop workspace={workspace} setWorkspace={setWorkspace} activeView={activeView} setActiveView={setActiveView}/></div><div className="simulator-help-strip"><button onClick={()=>setActiveView('report')}><Icon name="report"/>Report</button><button onClick={()=>setActiveView('powerquery')}><Icon name="query"/>Power Query</button><button onClick={()=>setActiveView('model')}><Icon name="model"/>Model</button><button onClick={()=>setActiveView('dax')}><Icon name="dax"/>DAX</button><button onClick={()=>setActiveView('performance')}><Icon name="visual"/>Performance</button><button onClick={()=>setActiveView('refresh')}><Icon name="refresh"/>Refresh</button><button onClick={()=>setActiveView('service')}><Icon name="service"/>Service</button></div></div>} 
        {page==='dax' && <DaxLab/>}
        {page==='sources' && <SourcesPage/>}
        {page==='visuals' && <VisualsPage/>}
        {page==='practice' && <DecisionLab/>}
        {page==='troubleshoot' && <TroubleshootingCenter setPage={setPage} openSimulatorView={openSimulatorView}/>}
        {page==='cases' && <div><CaseStudies workspace={workspace} setActiveView={setActiveView} resetWorkspace={resetWorkspace}/><div className="case-simulator-wrap page-pad" id="simulator-anchor"><div className="section-title-row"><div><span className="eyebrow">WORK HERE</span><h2>Case-study simulator</h2></div><p>The case instructions above validate this exact workspace state.</p></div><PowerBIDesktop workspace={workspace} setWorkspace={setWorkspace} activeView={activeView} setActiveView={setActiveView}/></div></div>}
        {page==='operate' && <OperationsPage/>}
        {page==='latest' && <LatestPage/>}
        {page==='coverage' && <CoveragePage/>}
      </main>
      <SearchPalette open={searchOpen} onClose={()=>setSearchOpen(false)} setPage={setPage} openSimulatorView={openSimulatorView}/>
      <footer className="global-footer"><span>Educational simulator • not affiliated with or endorsed by Microsoft</span><span>Latest verified monthly baseline: August 2026</span><button onClick={()=>openSimulatorView('service')}>Open Service simulation →</button></footer>
    </div>
  );
}
