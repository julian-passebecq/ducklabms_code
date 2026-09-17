import React, { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import {
  connectors, storageModes, visuals, learningModules, latestUpdates,
  powerQueryConcepts, refreshPatterns, securityConcepts, performanceChecks, pl300Coverage, sourceNotes,
} from '../data/curriculum.js';
import { aiReadinessChecklist, troubleshootingScenarios } from '../data/advancedCurriculum.js';

export function HomePage({ setPage }) {
  const lifecycle = [
    ['Connect', 'Get data', 'Choose source, credentials, storage mode'],
    ['Prepare', 'Power Query', 'Profile, clean, shape, combine, fold'],
    ['Model', 'Semantic model', 'Star schema, relationships, properties'],
    ['Calculate', 'DAX', 'Measures, context, time intelligence, UDFs'],
    ['Visualize', 'Report', 'Visuals, interactions, theme, accessibility'],
    ['Publish', 'Service', 'Workspace, app, permissions, lineage'],
    ['Operate', 'Refresh + security', 'Gateway, refresh, RLS, monitoring'],
  ];
  return (
    <div className="home-page page-pad">
      <section className="home-hero">
        <div className="hero-copy"><span className="eyebrow">POWER BI • INTERACTIVE LEARNING SYSTEM</span><h1>Learn the whole creation lifecycle, not isolated buttons.</h1><p>A professional Power BI Desktop + Service simulator built around the current 2026 workflow: connectivity, Power Query, semantic modeling, DAX, report design, refresh, gateways, security, and modern developer surfaces.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>setPage('simulator')}>Open Desktop simulator</button><button className="secondary-btn" onClick={()=>setPage('cases')}>Start end-to-end project</button></div><div className="hero-badges"><span>PL-300 grounded</span><span>August 2026 baseline</span><span>Fluent 2 visual language</span><span>Interactive validation</span></div></div>
        <div className="hero-product-card">
          <div className="hero-pbi-window"><div className="hero-window-top"><span className="pbi-mark"><i/><i/><i/></span><b>Power BI Desktop</b><small>Learning simulator</small></div><div className="hero-window-body"><div className="hero-left-rail"><i/><i/><i className="active"/><i/></div><div className="hero-canvas"><div className="fake-card"><span>Revenue</span><b>$4.8M</b></div><div className="fake-chart"><i/><i/><i/><i/><i/></div><div className="fake-line"><svg viewBox="0 0 200 70"><path d="M5 58 L36 48 L66 51 L94 31 L124 39 L155 18 L194 24"/></svg></div></div><div className="hero-panes"><span/><span/><span/><span/><span/></div></div></div>
          <div className="hero-mini-stats"><div><b>13</b><span>PL-300 lab areas</span></div><div><b>5</b><span>end-to-end cases</span></div><div><b>16</b><span>DAX exercises</span></div></div>
        </div>
      </section>

      <section className="lifecycle-section"><div className="section-title-row"><div><span className="eyebrow">THE MENTAL MODEL</span><h2>One product lifecycle</h2></div><p>Most mistakes come from solving a problem in the wrong layer. The app repeatedly asks: source, Power Query, model, DAX, visual, or Service?</p></div><div className="lifecycle-flow">{lifecycle.map((x,i)=><React.Fragment key={x[0]}><button onClick={()=>setPage(i===3?'dax':i===4?'visuals':i>=5?'operate':i===0?'sources':'simulator')}><span>{String(i+1).padStart(2,'0')}</span><b>{x[0]}</b><strong>{x[1]}</strong><small>{x[2]}</small></button>{i<lifecycle.length-1 && <div className="flow-arrow">→</div>}</React.Fragment>)}</div></section>

      <section className="decision-section"><div className="section-title-row"><div><span className="eyebrow">CALCULATION PLACEMENT</span><h2>Where should this logic live?</h2></div></div><div className="decision-grid"><article><span>SOURCE</span><h3>Database / warehouse</h3><p>Stable reusable logic, large data reduction, indexed relational operations, governed transformations.</p><b>Push work down when the source is the best engine.</b></article><article><span>POWER QUERY</span><h3>Refresh-time preparation</h3><p>Cleaning, types, combining files, joins, unpivoting, deterministic row-level shaping.</p><b>Prefer foldable transformations for remote relational sources.</b></article><article className="featured"><span>SEMANTIC MODEL</span><h3>DAX measures</h3><p>Business calculations that must respond dynamically to report filter context.</p><b>This is the analytical logic layer.</b></article><article><span>VISUAL</span><h3>Visual calculations</h3><p>Calculations used only by one visual and based on data already aggregated into that visual.</p><b>Keep local logic local.</b></article></div></section>
    </div>
  );
}

export function CurriculumPage({ setPage }) {
  const groups = useMemo(()=>[...new Set(learningModules.map(m=>m.group))],[]);
  const [selected, setSelected] = useState(learningModules[0]);
  return (
    <div className="page-pad curriculum-page">
      <div className="page-heading split-heading"><div><span className="eyebrow">STRUCTURED CURRICULUM</span><h1>Power BI from source to production</h1><p>The module sequence extends the supplied PL-300 labs into modern modeling, Service operations, performance, and developer workflows.</p></div><div className="course-total"><b>13</b><span>major modules</span><small>Prepare → Model → Visualize → Operate → Engineer</small></div></div>
      <div className="curriculum-layout"><aside className="module-rail">{groups.map(g=><div key={g}><label>{g}</label>{learningModules.filter(m=>m.group===g).map(m=><button key={m.id} className={selected.id===m.id?'active':''} onClick={()=>setSelected(m)}><span>{m.title}</span><small>{m.duration}</small></button>)}</div>)}</aside><main className="module-detail"><span className="group-label">{selected.group}</span><h2>{selected.title}</h2><h3>{selected.subtitle}</h3><div className="objective-list">{selected.objectives.map((o,i)=><div key={o}><span>{i+1}</span><p>{o}</p></div>)}</div><div className="module-actions"><button className="primary-btn" onClick={()=>setPage(selected.id.includes('dax')?'dax':selected.id==='report'||selected.id==='analytics'?'visuals':selected.id==='connect'?'sources':selected.group==='OPERATE'?'operate':'simulator')}>Open practice surface</button></div><div className="pl300-note"><Icon name="learn"/><div><b>PL-300 foundation</b><span>The supplied Microsoft Learning labs cover the core analyst sequence. This simulator adds explicit architectural reasoning and newer 2026 features around those labs.</span></div></div></main></div>
    </div>
  );
}

export function SourcesPage() {
  const [cat, setCat] = useState('All');
  const cats = ['All', ...new Set(connectors.map(c=>c.category))];
  const filtered = cat==='All'?connectors:connectors.filter(c=>c.category===cat);
  return (
    <div className="page-pad sources-page">
      <div className="page-heading"><span className="eyebrow">CONNECTIVITY + STORAGE</span><h1>Data sources and connection strategy</h1><p>Connector choice is only the first decision. You also need authentication, network reachability, storage mode, gateway behavior, transformation pushdown, and refresh semantics.</p></div>
      <div className="source-tabs">{cats.map(c=><button key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{c}</button>)}</div>
      <div className="connector-grid">{filtered.map(c=><article key={c.name}><div className="connector-icon"><Icon name={c.category==='File'?'query':c.category==='Fabric'?'service':'data'} size={22}/></div><div><span>{c.category}</span><h3>{c.name}</h3><div className="mode-chips">{c.modes.map(m=><b key={m}>{m}</b>)}</div><p>{c.note}</p><small>Gateway: <strong>{c.gateway}</strong></small></div></article>)}</div>
      <section className="storage-section"><div className="section-title-row"><div><span className="eyebrow">STORAGE MODE</span><h2>Import vs DirectQuery vs Direct Lake vs composite</h2></div></div><div className="storage-table"><div className="storage-row header"><span>Mode</span><span>Freshness</span><span>Query behavior</span><span>Use when</span><span>Avoid when</span></div>{storageModes.map(m=><div className="storage-row" key={m.name}><b>{m.name}</b><span>{m.freshness}</span><span>{m.modelData}</span><span>{m.useWhen}</span><span>{m.avoidWhen}</span></div>)}</div></section>
      <section className="pq-reference"><div className="section-title-row"><div><span className="eyebrow">POWER QUERY</span><h2>Transformation decision cards</h2></div></div><div className="pq-concept-grid">{powerQueryConcepts.map(c=><article key={c.name}><div><b>{c.name}</b><span>{c.layer}</span></div><p>{c.rule}</p><small>Query folding: {c.folding}</small></article>)}</div></section>
    </div>
  );
}

export function VisualsPage() {
  const [selected, setSelected] = useState(visuals[0]);
  return (
    <div className="page-pad visuals-page"><div className="page-heading"><span className="eyebrow">REPORT DESIGN</span><h1>Visual selection, interaction, and explanation</h1><p>The question comes first. A visual is a query result + encoding + interaction surface, not decoration.</p></div><div className="visual-learning-layout"><aside className="visual-list">{visuals.map(v=><button key={v.id} className={selected.id===v.id?'active':''} onClick={()=>setSelected(v)}><span className={`visual-glyph ${v.id}`}><i/><i/><i/></span><b>{v.name}</b></button>)}</aside><main className="visual-detail"><div className="visual-preview-card"><div className="preview-title">{selected.name}</div><VisualPreview type={selected.id}/></div><div className="visual-guidance"><article><span>BEST FOR</span><p>{selected.bestFor}</p></article><article><span>AVOID WHEN</span><p>{selected.avoid}</p></article><article><span>FIELD WELLS</span><p>{selected.fields}</p></article><article><span>INTERACTIONS</span><p>{selected.interaction}</p></article><article className="wide"><span>DESIGN RULE</span><p>{selected.tip}</p></article></div></main></div><section className="report-behavior-grid"><article><Icon name="filter"/><h3>Cross-filter vs cross-highlight</h3><p>Control Edit interactions when a selection should filter, highlight, or do nothing to another visual.</p></article><article><Icon name="case"/><h3>Drillthrough</h3><p>Move from summary context to a dedicated detail page while carrying the selected entity filters.</p></article><article><Icon name="report"/><h3>Bookmarks + buttons</h3><p>Capture display/filter state for navigation, explanations, toggles, and guided report experiences.</p></article><article><Icon name="info"/><h3>Report page tooltips</h3><p>Add contextual detail without overcrowding the main canvas, but do not hide essential accessible content only in a tooltip.</p></article></section></div>
  );
}

function VisualPreview({ type }) {
  if (type==='line') return <div className="big-line"><svg viewBox="0 0 500 220" preserveAspectRatio="none"><path d="M15 182 L78 143 L135 159 L191 110 L252 120 L309 74 L370 88 L428 43 L487 57"/></svg><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span></div>;
  if (type==='matrix') return <table className="big-matrix"><thead><tr><th>Region</th><th>Sales</th><th>Margin</th><th>YoY</th></tr></thead><tbody><tr><td>Nordics</td><td>$1.24M</td><td>34.8%</td><td>+8.4%</td></tr><tr><td>Central Europe</td><td>$1.10M</td><td>36.1%</td><td>+5.9%</td></tr><tr><td>Western Europe</td><td>$0.92M</td><td>31.9%</td><td>-1.8%</td></tr></tbody></table>;
  if (type==='card'||type==='kpi') return <div className="big-kpi"><span>Total Sales</span><b>$4.82M</b><strong>▲ 8.4% vs prior year</strong></div>;
  if (type==='scatter') return <div className="big-scatter">{Array.from({length:19}).map((_,i)=><i key={i} style={{left:`${8+(i*29)%86}%`,bottom:`${10+(i*37)%76}%`,width:`${8+(i%4)*3}px`,height:`${8+(i%4)*3}px`}}/> )}</div>;
  if (type==='decomposition') return <div className="big-decomp"><div><b>Sales</b><span>$4.82M</span></div><strong>›</strong><div><b>Country</b><span>Norway $1.24M</span></div><strong>›</strong><div><b>Category</b><span>Bikes $0.78M</span></div></div>;
  return <div className="big-bars"><div><span>Bikes</span><i style={{width:'88%'}}/></div><div><span>Accessories</span><i style={{width:'61%'}}/></div><div><span>Clothing</span><i style={{width:'47%'}}/></div><div><span>Components</span><i style={{width:'34%'}}/></div></div>;
}

export function OperationsPage() {
  return (
    <div className="page-pad operations-page"><div className="page-heading"><span className="eyebrow">PRODUCTION OPERATIONS</span><h1>Refresh, security, Service, and performance</h1><p>A report is not complete when the canvas looks good. Production BI requires reliable processing, source connectivity, permissions, data security, monitoring, and performance discipline.</p></div>
      <section><div className="section-title-row"><div><span className="eyebrow">REFRESH</span><h2>Choose the refresh pattern that matches the storage mode</h2></div></div><div className="op-grid">{refreshPatterns.map(p=><article key={p.name}><Icon name="refresh"/><h3>{p.name}</h3><b>{p.trigger}</b><p>{p.goodFor}</p><small>{p.watch}</small></article>)}</div></section>
      <section><div className="section-title-row"><div><span className="eyebrow">SECURITY</span><h2>Different controls protect different layers</h2></div></div><div className="security-table"><div className="security-row header"><span>Control</span><span>Scope</span><span>What it means</span></div>{securityConcepts.map(s=><div className="security-row" key={s.name}><b>{s.name}</b><span>{s.scope}</span><p>{s.detail}</p></div>)}</div></section>
      <section><div className="section-title-row"><div><span className="eyebrow">PERFORMANCE</span><h2>Performance checklist</h2></div></div><div className="perf-grid">{performanceChecks.map(([area,item,why])=><article key={item}><span>{area}</span><b>{item}</b><p>{why}</p></article>)}</div></section>
      <section><div className="section-title-row"><div><span className="eyebrow">COPILOT / AI</span><h2>Semantic model AI-readiness checklist</h2></div><p>AI quality depends on semantic-model quality and governance, not merely enabling a Copilot entry point.</p></div><div className="ai-reference-grid">{aiReadinessChecklist.map(([title,detail],i)=><article key={title}><span>{String(i+1).padStart(2,'0')}</span><b>{title}</b><p>{detail}</p></article>)}</div></section>
      <section className="trouble-reference-strip"><div><span className="eyebrow">FAILURE MODES</span><h2>{troubleshootingScenarios.length} production troubleshooting tickets</h2><p>DAX totals, relationship ambiguity, gateway failures, schema synchronization, rendering bottlenecks, Direct Lake operations, Copilot readiness, and security boundaries.</p></div></section>
    </div>
  );
}

export function LatestPage() {
  return (
    <div className="page-pad latest-page"><div className="page-heading split-heading"><div><span className="eyebrow">CURRENT BASELINE</span><h1>What changed in 2026</h1><p>The simulator targets the latest verified monthly Power BI release available when this app was built: August 2026. Preview features are labeled separately from generally available functionality.</p></div><div className="latest-stamp"><span>Verified</span><b>August 2026</b><small>Power BI monthly update</small></div></div><div className="timeline-updates">{latestUpdates.map((u,i)=><article key={u.title}><div className="timeline-date"><b>{u.date}</b><span className={u.status.includes('GA')?'ga':'preview'}>{u.status}</span></div><div className="timeline-dot"><i/></div><div className="timeline-card"><h3>{u.title}</h3><p>{u.summary}</p><div><b>Why it matters for learning</b><span>{u.learn}</span></div></div></article>)}</div><div className="accuracy-note"><Icon name="info"/><div><b>Why this matters</b><p>Power BI changes monthly. Learning materials can lag behind the product, so the app separates durable concepts from release-specific UI/features.</p></div></div></div>
  );
}

export function CoveragePage() {
  return (
    <div className="page-pad coverage-page"><div className="page-heading"><span className="eyebrow">SOURCE MAP</span><h1>PL-300 coverage + source provenance</h1><p>The user-supplied Microsoft Learning package is used as the course backbone. Current Microsoft Learn documentation is used only to extend or update features that changed after older lab material.</p></div><div className="coverage-layout"><section><h2>PL-300 lab coverage</h2><div className="coverage-list">{pl300Coverage.map((x,i)=><div key={x}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p><b>Covered</b></div>)}</div></section><aside><h2>Reference sources</h2>{sourceNotes.map((n,i)=><div className="source-note" key={n}><span>{i+1}</span><p>{n}</p></div>)}<div className="source-policy"><b>Simulation boundary</b><p>This is an explanatory React simulator. It does not execute the Microsoft VertiPaq/DAX engine, authenticate to connectors, publish to a tenant, or run a real gateway. Configuration state and validation are intentionally local and pedagogical.</p></div></aside></div></div>
  );
}
