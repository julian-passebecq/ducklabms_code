import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { connectors, powerQueryConcepts, sampleTables, storageModes, visuals as visualCatalog, refreshPatterns } from '../data/curriculum.js';
import { PerformanceView } from './AdvancedSimulatorViews.jsx';
import { addRelationshipToWorkspace, addSourceToWorkspace, appendQueryTransform, applyStorageModeSelection, buildRefreshHistoryEntry, buildServiceItems, canApproveCopilot, daxObjectCompatibility, evaluateLoadedModelRefreshState, evaluateRefreshState, filterServiceItems, getScenarioProfile, hasLoadedSemanticModel, markQueriesApplied, nextAiServiceState, nextRecommendedRelationship, parseDaxQueryDefinedMeasure, parseTmdlMeasureScript, relationshipCardinalityMarkers, relationshipHealth, relationshipVisualSlot, releaseReadiness, removeLastQueryTransform, removeRelationshipAt, removeSourceFromWorkspace, semanticModelRefreshStatus, updateAllRelationships, updateRelationshipAt, upsertDaxObjectInWorkspace, upsertMeasureInWorkspace } from '../utils/simulatorLogic.js';

const ribbonTabs = ['Home', 'Insert', 'Modeling', 'View', 'Optimize', 'Help'];
const viewItems = [
  ['report', 'report', 'Report'],
  ['data', 'data', 'Data'],
  ['model', 'model', 'Model'],
  ['dax', 'dax', 'DAX Query'],
  ['tmdl', 'query', 'TMDL'],
  ['powerquery', 'query', 'Power Query'],
  ['performance', 'visual', 'Performance'],
  ['refresh', 'refresh', 'Refresh'],
  ['service', 'service', 'Service'],
];

function Panel({ title, children, compact = false }) {
  return (
    <section className={`pbi-pane ${compact ? 'compact' : ''}`}>
      <div className="pbi-pane-title">{title}<span className="pane-kebab">•••</span></div>
      <div className="pbi-pane-body">{children}</div>
    </section>
  );
}

function MiniBar({ label, value, max = 100 }) {
  return (
    <div className="mini-bar-row">
      <span>{label}</span>
      <div className="mini-bar-track"><div style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      <b>{value}</b>
    </div>
  );
}

function ReportVisual({ type, index, profile, detail = {} }) {
  const seed = index + 1;
  const scenario = profile?.id || 'sales';
  const card = scenario==='wind'
    ? {label:'Energy MWh', value:`${(824 + seed*37).toLocaleString()} MWh`, delta:'▲ 4.2% vs plan'}
    : scenario==='finance'
      ? {label:'Actual spend', value:`$${(1.82 + seed*.09).toFixed(2)}M`, delta:'▼ 2.6% vs budget'}
      : {label:'Total Sales', value:`$${(1.24 + seed*.11).toFixed(2)}M`, delta:'▲ 8.4% vs PY'};
  const lineTitle = scenario==='wind' ? 'Energy production trend' : scenario==='finance' ? 'Actual vs budget trend' : 'Sales trend';
  const barTitle = scenario==='wind' ? 'Energy by site' : scenario==='finance' ? 'Spend by business unit' : 'Sales by category';
  const bars = scenario==='wind'
    ? [['North',92],['West',76],['East',61],['South',48]]
    : scenario==='finance'
      ? [['Data',88],['Finance',71],['Operations',52],['Commercial',39]]
      : [['Bikes',92],['Accessories',55],['Clothing',41],['Components',29]];
  const matrix = scenario==='wind'
    ? {title:'Turbine performance', headers:['Turbine','Energy','Availability'], rows:[['WT-101','412 MWh','97.8%'],['WT-102','389 MWh','96.9%'],['WT-103','324 MWh','94.7%']]}
    : scenario==='finance'
      ? {title:'Project performance', headers:['Project','Actual','Variance'], rows:[['Fabric Migration','$184k','-3.2%'],['Finance Planning','$126k','+1.8%'],['BI Modernization','$92k','-0.7%']]}
      : {title:'Country performance', headers:['Country','Sales','Margin'], rows:[['Norway','$412k','34.8%'],['Switzerland','$389k','36.1%'],['France','$324k','31.9%']]};
  const visualTitle = (text) => detail.titleOn === false ? null : <div className="viz-title">{text}</div>;
  if (type === 'Card') return <div className="viz-card"><span>{card.label}</span><strong>{card.value}</strong><small>{card.delta}</small></div>;
  if (type === 'Line chart') return <div className="viz-shell">{visualTitle(lineTitle)}<svg viewBox="0 0 260 110" className="chart-svg" preserveAspectRatio="none"><path d="M8 88 L45 69 L82 78 L119 44 L156 51 L193 24 L230 35 L252 14" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M8 96H252" opacity=".18"/></svg></div>;
  if (type === 'Bar / Column') return <div className="viz-shell">{visualTitle(barTitle)}{bars.map(([label,value])=><MiniBar key={label} label={label} value={value}/>)}</div>;
  if (type === 'Matrix') return <div className="viz-shell matrix-mini">{visualTitle(matrix.title)}<table><thead><tr>{matrix.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{matrix.rows.map(row=><tr key={row[0]}>{row.map((cell,i)=><td key={`${row[0]}-${i}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
  if (type === 'Slicer') return <div className="viz-shell">{visualTitle('Fiscal year')}<div className="slicer-pills"><button>FY2025</button><button className="selected">FY2026</button><button>FY2027</button></div></div>;
  if (type === 'Waterfall') return <div className="viz-shell">{visualTitle(scenario==='finance'?'Budget to actual bridge':'Budget bridge')}<div className="waterfall"><i style={{height:'45%'}}/><i style={{height:'70%'}}/><i className="down" style={{height:'28%'}}/><i style={{height:'82%'}}/><i className="total" style={{height:'64%'}}/></div></div>;
  if (type === 'Scatter chart') return <div className="viz-shell">{visualTitle(scenario==='wind'?'Vibration vs output':'Operating pattern')}<div className="scatter-area">{[14,22,30,41,53,66,74,82].map((x,i)=><i key={x} style={{left:`${x}%`,bottom:`${18 + ((i*17)%64)}%`,width:`${8+i%3*3}px`,height:`${8+i%3*3}px`}} />)}</div></div>;
  if (type === 'Decomposition tree') return <div className="viz-shell">{visualTitle(scenario==='wind'?'Downtime drivers':'Variance drivers')}<div className="decomp"><span>{scenario==='wind'?'Downtime 184h':'Variance -$84k'}</span><b>›</b><span>{scenario==='wind'?'Site North 72h':'Data BU -$42k'}</span><b>›</b><span>{scenario==='wind'?'Alarm: gearbox 31h':'Project: Migration -$21k'}</span></div></div>;
  return <div className="viz-shell placeholder-viz"><Icon name="visual" size={28}/><span>{type}</span><small>Configured learning visual</small></div>;
}
function EmptyReport() {
  return (
    <div className="empty-report">
      <div className="empty-chart"><i/><i/><i/><i/></div>
      <h3>Build your report</h3>
      <p>Add a visual from the Visualizations pane. Then bind fields and measures from the Data pane.</p>
    </div>
  );
}

function ReportView({ workspace, addVisual, updateVisual, removeVisual, duplicateVisual, addSource, setTheme, toggleOnObject, addBookmark, addInteraction, updateReportFilters }) {
  const profile = getScenarioProfile(workspace);
  const axisOptions = profile.id==='wind' ? ['Date[Month]','Turbine[Turbine]','Site[Site]'] : profile.id==='finance' ? ['Date[Month]','Project[Project]','Project[BusinessUnit]'] : ['Date[Month]','Product[Category]','Region[Country]'];
  const valueOptions = profile.id==='wind' ? ['[Energy MWh]','[Availability %]','[Alarm Rate]'] : profile.id==='finance' ? ['[Actual]','[Budget]','[Variance]'] : ['[Total Sales]','[Margin %]','Sales[Sales]'];
  const legendOptions = profile.id==='wind' ? ['Site[Site]','Turbine[Model]','None'] : profile.id==='finance' ? ['Project[BusinessUnit]','Project[Manager]','None'] : ['Product[Category]','Region[Country]','None'];
  const [selectedVisual, setSelectedVisual] = useState('Bar / Column');
  const [selectedSource, setSelectedSource] = useState('SQL Server');
  const [paneTab, setPaneTab] = useState('Build');
  const [axis, setAxis] = useState('Date[Month]');
  const [value, setValue] = useState('[Total Sales]');
  const [legend, setLegend] = useState('Product[Category]');
  const [titleOn, setTitleOn] = useState(true);
  const [tooltipOn, setTooltipOn] = useState(true);
  const [altText, setAltText] = useState('Sales analysis visual');
  const [interactionMode, setInteractionMode] = useState(false);
  const [selectedCanvasIndex, setSelectedCanvasIndex] = useState(null);
  const [filterScope, setFilterScope] = useState('Page');
  const [filterExpr, setFilterExpr] = useState('Date[Year] = 2026');
  useEffect(() => {
    setAxis(profile.axis);
    setValue(profile.primaryMeasure);
    setLegend(profile.legend);
    setAltText(`${profile.label} visual`);
    setFilterExpr(profile.filterOptions[0]);
    setSelectedCanvasIndex(null);
    setSelectedSource(profile.id==='wind' ? 'OneLake catalog' : profile.id==='finance' ? 'Azure SQL Database' : 'SQL Server');
  }, [profile.id]);
  const effectiveSelectedIndex = selectedCanvasIndex !== null && selectedCanvasIndex >= 0 && selectedCanvasIndex < workspace.visuals.length ? selectedCanvasIndex : null;
  const selectedDetail = effectiveSelectedIndex === null ? null : (workspace.visualDetails?.[effectiveSelectedIndex] || {type:workspace.visuals[effectiveSelectedIndex]});
  const pageFilters = workspace.reportFilters?.page || [];
  const reportFilters = workspace.reportFilters?.report || [];
  const visualFilters = selectedDetail?.filters || [];
  const loadedModel = hasLoadedSemanticModel(workspace);
  const addConfigured = () => { addVisual(selectedVisual, { axis, value, legend, titleOn, tooltipOn, altText, filters:[], analytics:[] }); setSelectedCanvasIndex(workspace.visuals.length); };
  const patchSelected = (patch) => effectiveSelectedIndex !== null && updateVisual(effectiveSelectedIndex, patch);
  const addScopedFilter = () => {
    if (filterScope==='Visual') {
      if (effectiveSelectedIndex === null) return;
      patchSelected({filters:[...new Set([...(selectedDetail?.filters||[]), filterExpr])]});
      return;
    }
    const key = filterScope==='Page' ? 'page' : 'report';
    const current = key==='page' ? pageFilters : reportFilters;
    updateReportFilters(key, [...new Set([...current, filterExpr])]);
  };
  const removeScopedFilter = (scope, filter) => {
    if (scope==='visual') patchSelected({filters:visualFilters.filter(x=>x!==filter)});
    else updateReportFilters(scope, (workspace.reportFilters?.[scope] || []).filter(x=>x!==filter));
  };
  return (
    <div className="desktop-work-area report-layout">
      <div className="report-canvas-wrap">
        <div className="report-author-toolbar">
          <span><b>{workspace.theme || 'Fluent 2'}</b> base theme</span>
          <button className={workspace.onObject?'active':''} onClick={toggleOnObject}>On-object {workspace.onObject?'On':'Off'}</button>
          <button className={interactionMode?'active':''} onClick={()=>{setInteractionMode(v=>!v);addInteraction(`${profile.pageName}: visual interaction review`)}}>Edit interactions</button>
          <button onClick={()=>addBookmark(`Bookmark ${workspace.bookmarks.length+1}`)}>＋ Bookmark</button>
          <span>{workspace.bookmarks.length} bookmarks</span>
        </div>
        <div className={`report-canvas theme-${(workspace.theme||'fluent-2').toLowerCase().replace(/\s+/g,'-')} ${interactionMode?'interaction-mode':''}`}>
          <div className="report-page-label">{profile.pageName}</div>
          {workspace.onObject && <div className="on-object-hint"><b>On-object interaction</b><span>Build / format controls move closer to the selected visual.</span></div>}
          <div className="report-grid">
            {workspace.visuals.length ? workspace.visuals.map((v, i) => {
              const detail = workspace.visualDetails?.[i] || {type:v};
              const tooltip = detail.tooltipOn===false ? undefined : `${detail.value || profile.primaryMeasure} · ${detail.axis || profile.axis}`;
              return <div className={`report-visual-wrap ${effectiveSelectedIndex===i?'selected-object':''}`} key={`${v}-${i}`} onClick={()=>setSelectedCanvasIndex(i)} aria-label={detail.altText || `${profile.label} ${v}`} title={tooltip}>{loadedModel ? <ReportVisual type={v} index={i} profile={profile} detail={detail}/> : <div className="viz-shell broken-viz"><Icon name="info" size={22}/><b>Semantic model unavailable</b><span>Reload or apply a source snapshot to restore this visual.</span></div>}{(detail.filters||[]).length>0 && <span className="visual-filter-count">{detail.filters.length} filter{detail.filters.length===1?'':'s'}</span>}{(detail.analytics||[]).length>0 && <div className="visual-analytics-badges">{detail.analytics.map(item=><span key={item}>{item}</span>)}</div>}{effectiveSelectedIndex===i && <div className="selection-handles"><i/><i/><i/><i/></div>}{interactionMode && <div className="interaction-badges">{['Filter','Highlight','None'].map(mode=><button key={mode} className={detail.interaction===mode?'active':''} onClick={e=>{e.stopPropagation();updateVisual(i,{interaction:mode});addInteraction(`${v}: ${mode}`)}}>{mode}</button>)}</div>}</div>;
            }) : <EmptyReport />}
          </div>
        </div>
        <div className="page-tabs"><button className="active">{profile.id==='wind'?'Operations':profile.id==='finance'?'Management':'Executive'}</button><button>Detail</button><button>Drillthrough</button><button>Tooltip</button><button>＋</button></div>
      </div>
      <aside className="right-pane-stack">
        <Panel title="Filters" compact>
          <div className="filter-scope-editor"><select value={filterScope} onChange={e=>setFilterScope(e.target.value)}><option>Visual</option><option>Page</option><option>Report</option></select><select value={filterExpr} onChange={e=>setFilterExpr(e.target.value)}>{profile.filterOptions.map(option=><option key={option}>{option}</option>)}</select><button disabled={!loadedModel || (filterScope==='Visual' && effectiveSelectedIndex===null)} onClick={addScopedFilter}>Add filter</button></div>
          <div className="filter-scope-block"><b>Filters on this visual</b>{effectiveSelectedIndex===null?<small>Select a visual to configure visual-scope filters.</small>:visualFilters.length?visualFilters.map(f=><button key={f} onClick={()=>removeScopedFilter('visual',f)}>{f}<span>×</span></button>):<small>No visual filters.</small>}</div>
          <div className="filter-scope-block"><b>Filters on this page</b>{pageFilters.length?pageFilters.map(f=><button key={f} onClick={()=>removeScopedFilter('page',f)}>{f}<span>×</span></button>):<small>No page filters.</small>}</div>
          <div className="filter-scope-block"><b>Filters on all pages</b>{reportFilters.length?reportFilters.map(f=><button key={f} onClick={()=>removeScopedFilter('report',f)}>{f}<span>×</span></button>):<small>No report filters.</small>}</div>
          <div className="filter-context-note">Effective filter context combines report + page + visual filters, slicers, cross-highlighting, relationships, and security.</div>
        </Panel>
        <Panel title="Visualizations">
          <div className="pane-mode-tabs">{['Build','Format','Analytics'].map(t=><button key={t} className={paneTab===t?'active':''} onClick={()=>setPaneTab(t)}>{t}</button>)}</div>
          {paneTab==='Build' && <>
            <div className="visual-icon-grid">
              {visualCatalog.map(v => <button key={v.id} className={selectedVisual === v.name ? 'active':''} onClick={()=>setSelectedVisual(v.name)} title={v.name}><Icon name="visual" size={17}/><span>{v.name.split(' ')[0]}</span></button>)}
            </div>
            <div className="field-wells"><label>Build visual</label>
              <div className="field-well configured">X-axis <select value={axis} onChange={e=>setAxis(e.target.value)}>{axisOptions.map(option=><option key={option}>{option}</option>)}</select></div>
              <div className="field-well configured">Y-axis / Values <select value={value} onChange={e=>setValue(e.target.value)}>{valueOptions.map(option=><option key={option}>{option}</option>)}</select></div>
              <div className="field-well configured">Legend <select value={legend} onChange={e=>setLegend(e.target.value)}>{legendOptions.map(option=><option key={option}>{option}</option>)}</select></div>
            </div>
            <button className="pbi-primary full" disabled={!loadedModel} onClick={addConfigured}>Add configured {selectedVisual}</button>{!loadedModel && <small className="authoring-prereq-note">Load a semantic model first. Use Power Query → Close & Apply, or select a compatible OneLake Direct Lake path.</small>}
            {selectedDetail && <div className="selected-object-editor"><div><b>Selected canvas object</b><span>{selectedDetail.type || workspace.visuals[effectiveSelectedIndex]}</span></div><label>X-axis<select disabled={!loadedModel} value={selectedDetail.axis||profile.axis} onChange={e=>patchSelected({axis:e.target.value})}>{axisOptions.map(option=><option key={option}>{option}</option>)}</select></label><label>Values<select disabled={!loadedModel} value={selectedDetail.value||profile.primaryMeasure} onChange={e=>patchSelected({value:e.target.value})}>{valueOptions.map(option=><option key={option}>{option}</option>)}</select></label><label>Legend<select disabled={!loadedModel} value={selectedDetail.legend||'None'} onChange={e=>patchSelected({legend:e.target.value})}>{legendOptions.map(option=><option key={option}>{option}</option>)}</select></label><div className="object-actions"><button onClick={()=>duplicateVisual(effectiveSelectedIndex)}>Duplicate</button><button className="danger" onClick={()=>{removeVisual(effectiveSelectedIndex);setSelectedCanvasIndex(null)}}>Delete</button></div></div>}
          </>}
          {paneTab==='Format' && <div className="format-pane-sim">
            <label>Current theme<select value={workspace.theme||'Fluent 2'} onChange={e=>setTheme(e.target.value)}><option>Fluent 2</option><option>Classic 2026</option><option>Executive</option><option>High contrast learning</option></select></label>
            <button className={`toggle-row ${(selectedDetail?.titleOn ?? titleOn)?'on':''}`} onClick={()=>{const next=!(selectedDetail?.titleOn ?? titleOn); if(selectedDetail) patchSelected({titleOn:next}); else setTitleOn(next)}}><span>Title</span><i/></button>
            <button className={`toggle-row ${(selectedDetail?.tooltipOn ?? tooltipOn)?'on':''}`} onClick={()=>{const next=!(selectedDetail?.tooltipOn ?? tooltipOn); if(selectedDetail) patchSelected({tooltipOn:next}); else setTooltipOn(next)}}><span>Tooltips</span><i/></button>
            <label>Alt text<textarea value={selectedDetail?.altText ?? altText} onChange={e=>{if(selectedDetail) patchSelected({altText:e.target.value}); else setAltText(e.target.value)}}/></label>
            {selectedDetail && <small className="format-selection-note">Formatting changes apply to the selected {selectedDetail.type || 'visual'} object.</small>}
            <details open><summary>General</summary><span>Properties · Title · Effects · Data format · Header icons · Tooltips · Alt text</span></details>
          </div>}
          {paneTab==='Analytics' && <div className="analytics-pane-sim"><b>Analytics options depend on visual type</b>{['Average line','Constant line','Min / max line','Error bars'].map(item=>{const active=(selectedDetail?.analytics||[]).includes(item); return <button key={item} disabled={!loadedModel || !selectedDetail} className={active?'active':''} onClick={()=>{if(!selectedDetail) return; const current=selectedDetail.analytics||[]; patchSelected({analytics:active?current.filter(x=>x!==item):[...current,item]});}}>{active?'✓':'＋'} {item}</button>})}<small>{selectedDetail?'Analytics choices persist on the selected visual.':'Select a visual before adding an analytical overlay.'} Use analytical overlays to support the question; do not add them decoratively.</small></div>}
        </Panel>
        <Panel title="Data">
          <div className="search-box"><Icon name="search" size={14}/>Search fields</div>
          {loadedModel ? profile.fields.map((t,idx)=><div className="field-table" key={t}><b>▸ {t}</b>{idx < 3 && <span>∑ {idx===0?profile.primaryFact:idx===1?'Key / attribute':'Category / group'}</span>}</div>) : <div className="data-pane-empty"><b>No loaded fields</b><span>Staged sources do not enter the semantic model until they are loaded.</span></div>}
          <div className="quick-source">
            <select value={selectedSource} onChange={e=>setSelectedSource(e.target.value)}>{connectors.map(c=><option key={c.name}>{c.name}</option>)}</select>
            <button onClick={()=>addSource(selectedSource)}>Get data</button>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
function DataView({ workspace }) {
  const profile = getScenarioProfile(workspace);
  const scenarioTables = profile.id==='wind' ? ['Telemetry','Turbine','Site','Date'] : profile.id==='finance' ? ['Actuals','Budget','Project','Date'] : ['Sales','Product','Region','Date'];
  const [table, setTable] = useState(scenarioTables[0]);
  const actualTable = scenarioTables.includes(table) ? table : scenarioTables[0];
  const rows = sampleTables[actualTable] || sampleTables.Sales;
  const loadedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : [];
  const hasLoadedModel = hasLoadedSemanticModel(workspace);
  const pendingQueryChanges = Boolean(workspace.queryDirty);
  const numeric = Object.values(rows[0]).filter(v=>typeof v==='number').length;
  return (
    <div className="desktop-work-area data-layout">
      <aside className="table-list">
        <div className="pane-section-title">Model</div>
        {hasLoadedModel ? scenarioTables.map(t=><button className={actualTable===t?'active':''} key={t} onClick={()=>setTable(t)}><Icon name="data" size={15}/>{t}</button>) : <div className="data-empty-model-list"><b>No loaded tables</b><span>Use Power Query and Close & Apply first.</span></div>}
        {hasLoadedModel && <><div className="pane-section-title">Loaded connections</div>{loadedSources.map(s=><div className="connection-chip" key={s}>{s}</div>)}</>}
        {pendingQueryChanges && <div className="connection-pending-note">Power Query has pending changes. Data view still represents the last Close & Apply snapshot.</div>}
      </aside>
      <main className="data-grid-wrap">
        {hasLoadedModel ? <>
          <div className="data-formula-bar"><span>fx</span><code>{actualTable}[SelectedColumn]</code><small>Table view is for model data inspection—not Power Query source preview.</small></div>
          <table className="data-table"><thead><tr>{Object.keys(rows[0]).map(k=><th key={k}>{k}<small>▾</small></th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{Object.values(r).map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>
          <div className="grid-status">{rows.length} representative rows • {Object.keys(rows[0]).length} columns • {numeric} numeric columns • learning semantic-model data</div>
        </> : <div className="data-empty-model"><Icon name="data" size={30}/><h3>No semantic-model data loaded</h3><p>Connect and shape a source in Power Query, then run Close & Apply. Staged queries do not appear in Data view until they are loaded.</p></div>}
      </main>
      <aside className="properties-pane"><Panel title="Properties"><div className="property-row"><span>Name</span><b>{hasLoadedModel?actualTable:'—'}</b></div><div className="property-row"><span>Storage mode</span><b>{workspace.storageMode||'Import'}</b></div><div className="property-row"><span>Load state</span><b>{hasLoadedModel?'Loaded':'No model data'}</b></div><div className="property-row"><span>Synonyms</span><b>—</b></div></Panel><Panel title="Column tools"><div className="property-row"><span>Data type</span><b>{hasLoadedModel?'Auto / modeled':'—'}</b></div><div className="property-row"><span>Format</span><b>{hasLoadedModel?'General':'—'}</b></div><div className="property-row"><span>Summarization</span><b>{hasLoadedModel?'Context dependent':'—'}</b></div><p className="pane-help">Use model properties for semantic meaning; use Power Query for source shaping and repeatable preparation.</p></Panel></aside>
    </div>
  );
}
function ModelTable({ title, fields, x, y, kind='dimension' }) {
  return (
    <div className={`model-table ${kind}`} style={{left:x,top:y}}>
      <div className="model-table-head"><Icon name="data" size={14}/>{title}<span>⋮</span></div>
      {fields.map((f,i)=><div className="model-field" key={f}><span>{i===0?'▣':'▤'}</span>{f}</div>)}
    </div>
  );
}

function ModelView({ workspace, addRelationship, updateRelationshipSettings, updateRelationship, removeRelationship, updateAllRelationshipSettings, markDateTable }) {
  const profile = getScenarioProfile(workspace);
  const modelKind = profile.id;
  const [selectedRelationshipIndex, setSelectedRelationshipIndex] = useState(0);
  const models = {
    sales: {
      pairs: [['Product','Sales'],['Region','Sales'],['Date','Sales'],['Reseller','Sales']],
      tables: [
        ['Product',['ProductKey','Product','Category','Color'],44,70,'dimension'],
        ['Region',['RegionKey','Country','Group'],44,275,'dimension'],
        ['Sales',['SalesKey','DateKey','ProductKey','RegionKey','SalesAmount','Cost'],392,180,'fact'],
        ['Date',['DateKey','Date','Year','Month','Fiscal Year'],666,70,'dimension'],
        ['Reseller',['ResellerKey','Reseller','Manager'],666,315,'dimension'],
      ],
    },
    wind: {
      pairs: [['Turbine','Telemetry'],['Date','Telemetry'],['Site','Telemetry'],['Turbine','Maintenance']],
      tables: [
        ['Turbine',['TurbineKey','Turbine','Model','RatedMW'],44,70,'dimension'],
        ['Site',['SiteKey','Site','Country','Region'],44,275,'dimension'],
        ['Telemetry',['EventKey','DateKey','TurbineKey','EnergyMWh','Temperature','Vibration'],392,180,'fact'],
        ['Date',['DateKey','Date','Year','Month','Week'],666,70,'dimension'],
        ['Maintenance',['TicketKey','TurbineKey','AlarmType','DowntimeHours'],666,315,'fact'],
      ],
    },
    finance: {
      pairs: [['Project','Actuals'],['Date','Actuals'],['Cost Center','Actuals'],['Project','Budget']],
      tables: [
        ['Project',['ProjectKey','Project','Manager','BusinessUnit'],44,70,'dimension'],
        ['Cost Center',['CostCenterKey','CostCenter','Department'],44,275,'dimension'],
        ['Actuals',['EntryKey','DateKey','ProjectKey','CostCenterKey','Amount'],392,180,'fact'],
        ['Date',['DateKey','Date','Year','Month','Fiscal Period'],666,70,'dimension'],
        ['Budget',['BudgetKey','ProjectKey','Period','Amount'],666,315,'fact'],
      ],
    },
  };
  const model = models[modelKind];
  const loadedModel = hasLoadedSemanticModel(workspace);
  const pairs = model.pairs;
  const next = nextRecommendedRelationship(pairs, workspace);
  const health = relationshipHealth(workspace);
  const safeRelIndex = health.relationships.length ? Math.min(selectedRelationshipIndex, health.relationships.length-1) : null;
  const settings = safeRelIndex === null
    ? (workspace.relationshipSettings || {cardinality:'One to many (1:*)',direction:'Single',active:true})
    : health.relationships[safeRelIndex];
  const editSelected = (patch) => safeRelIndex === null ? updateRelationshipSettings(patch) : updateRelationship(safeRelIndex, patch);
  const activeRelationshipCount = health.relationships.filter(rel=>rel.active !== false).length;
  const healthIssues = [
    health.broadBoth.length ? `${health.broadBoth.length} relationship${health.broadBoth.length===1?'':'s'} use bidirectional filtering; verify each path deliberately.` : null,
    !workspace.dateTable ? 'No explicit Date table is marked for time intelligence.' : null,
    workspace.relationships.length < 2 ? 'The model has very few defined dimension-to-fact relationships.' : null,
    workspace.relationships.length >= 2 && activeRelationshipCount < 2 ? 'Fewer than two core relationships are active; visuals can silently lose expected dimension filtering.' : null,
    health.manyToMany.length ? `${health.manyToMany.length} many-to-many relationship${health.manyToMany.length===1?'':'s'} need an explicit business reason or bridge pattern.` : null,
    health.oneToOne.length ? `${health.oneToOne.length} one-to-one core relationship${health.oneToOne.length===1?'':'s'} do not match this trainer's dimension-to-fact star pattern.` : null,
  ].filter(Boolean);
  const score = Math.max(0, Math.min(100, 100 - healthIssues.length * 22 + Math.min(8, workspace.relationships.length * 2)));
  return (
    <div className="desktop-work-area model-layout">
      <main className="model-canvas">
        <div className="model-toolbar"><button>＋ New layout</button><button>Auto layout</button><button>Fit to screen</button><span>Scenario <b>{modelKind==='wind'?'Operations telemetry':modelKind==='finance'?'Finance & budget':'Sales star'}</b></span><span>Star-schema health <b>{score}%</b></span></div>
        {loadedModel ? <>
          <svg className="relationship-lines" width="100%" height="100%" viewBox="0 0 900 560" preserveAspectRatio="none">
            {workspace.relationships.slice(0,4).map((r,i)=>{
              const slots = [[240,118,410,230],[240,320,410,250],[660,118,560,220],[680,350,560,280]];
              const slot = relationshipVisualSlot(pairs, r);
              const coords = slots[slot >= 0 ? slot : i] || slots[i] || slots[0];
              const detail = health.relationships[i] || settings;
              const [leftMarker, rightMarker] = relationshipCardinalityMarkers(detail.cardinality);
              return <g key={r} className={safeRelIndex===i?'selected-rel':''}><line className={`${detail.active?'':'inactive'} ${detail.direction==='Both'?'both':''}`} x1={coords[0]} y1={coords[1]} x2={coords[2]} y2={coords[3]} /><circle cx={coords[0]} cy={coords[1]} r="10"/><text textAnchor="middle" x={coords[0]} y={coords[1]+4}>{leftMarker}</text><circle cx={coords[2]} cy={coords[3]} r="10"/><text textAnchor="middle" x={coords[2]} y={coords[3]+4}>{rightMarker}</text></g>
            })}
          </svg>
          {model.tables.map(([title,fields,x,y,kind])=><ModelTable key={title} title={title} fields={fields} x={x} y={y} kind={kind}/>)}
          {workspace.dateTable && <div className="date-table-badge">✓ Date marked as date table</div>}
          <div className="model-legend"><span><i className="dim-dot"/>Dimension</span><span><i className="fact-dot"/>Fact</span><span>{workspace.relationships.length} relationships</span>{health.inactive.length>0 && <span>{health.inactive.length} inactive</span>}</div>
        </> : <div className="data-empty-model model-empty-state"><Icon name="model" size={32}/><h3>No semantic model loaded</h3><p>Load a source snapshot before creating relationships. Power Query edits remain staged until Close & Apply; a compatible Direct Lake path loads through its storage selection.</p></div>}
      </main>
      <aside className="right-pane-stack model-right">
        <Panel title="Properties">
          <div className="relationship-editing-label"><small>{safeRelIndex===null?'NEW RELATIONSHIP DEFAULTS':'SELECTED RELATIONSHIP'}</small><b>{safeRelIndex===null?'Trainer defaults':workspace.relationships[safeRelIndex]}</b></div>
          <label className="model-property-select">Cardinality<select disabled={!loadedModel} value={settings.cardinality} onChange={e=>editSelected({cardinality:e.target.value})}><option>One to many (1:*)</option><option>Many to one (*:1)</option><option>One to one (1:1)</option><option>Many to many (*:*)</option></select></label>
          <label className="model-property-select">Cross-filter<select disabled={!loadedModel} value={settings.direction} onChange={e=>editSelected({direction:e.target.value})}><option>Single</option><option>Both</option></select></label>
          <button disabled={!loadedModel} className={`toggle-row ${settings.active?'on':''} ${!loadedModel?'disabled':''}`} onClick={()=>editSelected({active:!settings.active})}><span>Active relationship</span><i/></button>
          {health.relationships.length>1 && <button className="secondary-inline-action" onClick={()=>updateAllRelationshipSettings({direction:settings.direction})}>Apply {settings.direction} direction to all relationships</button>}
          {safeRelIndex!==null && <button className="secondary-inline-action danger" onClick={()=>{const removedIndex=safeRelIndex;removeRelationship(removedIndex);setSelectedRelationshipIndex(Math.max(0,removedIndex-1));}}>Delete selected relationship</button>}
          <p className="pane-help">Relationship properties are stored per relationship. Prefer single-direction dimension → fact filtering unless a specific model requirement justifies an exception.</p>
        </Panel>
        <Panel title="Relationship trainer"><p className="pane-help">The trainer adapts to the sources in the current case study and restores the first missing recommended relationship.</p><button className="pbi-primary full" disabled={!loadedModel || !next} onClick={()=>next && addRelationship(`${next[0]} → ${next[1]}`)}>＋ {!next?'Core model complete':`Create ${next[0]} → ${next[1]}`}</button><div className="relationship-list">{workspace.relationships.map((r,i)=>{const d=health.relationships[i]; return <button className={safeRelIndex===i?'active':''} key={r} onClick={()=>setSelectedRelationshipIndex(i)}><span>✓ {r}</span><small>{d?.cardinality || '1:*'} · {d?.direction || 'Single'}{d?.active===false?' · inactive':''}</small></button>})}</div></Panel>
        <Panel title="Date table"><p className="pane-help">A deliberate Date table gives time intelligence a stable calendar/fiscal dimension and avoids ambiguous date behavior.</p><button className={`pbi-primary full ${workspace.dateTable?'done':''}`} disabled={!loadedModel} onClick={markDateTable}>{workspace.dateTable?'✓ Date table marked':'Mark Date as date table'}</button></Panel>
        <Panel title="Model health scanner"><div className={`health-score ${healthIssues.length?'warn':'good'}`}><b>{score}%</b><span>{healthIssues.length?`${healthIssues.length} design warning${healthIssues.length===1?'':'s'}`:'Core relationship checks look healthy'}</span></div>{healthIssues.length?healthIssues.map(x=><div className="health-warning" key={x}>⚠ {x}</div>):<div className="health-ok">✓ Relationship-specific filter paths and Date table checks look healthy.</div>}</Panel>
      </aside>
    </div>
  );
}
const measureTemplates = [
  ['Total Sales', 'Total Sales = SUM ( Sales[Sales] )'],
  ['Margin %', 'Margin % = DIVIDE ( [Total Sales] - SUM ( Sales[Cost] ), [Total Sales] )'],
  ['Sales YTD', "Sales YTD = TOTALYTD ( [Total Sales], 'Date'[Date] )"],
  ['Availability %', 'Availability % = DIVIDE ( [Available Minutes], [Observed Minutes] )'],
  ['Energy MWh', 'Energy MWh = SUM ( Telemetry[EnergyMWh] )'],
  ['Alarm Rate', 'Alarm Rate = DIVIDE ( [Alarm Events], [Observed Hours] )'],
  ['Actual', 'Actual = SUM ( Actuals[Amount] )'],
  ['Budget', 'Budget = SUM ( Budget[Amount] )'],
  ['Variance', 'Variance = [Actual] - [Budget]'],
  ['Variance %', 'Variance % = DIVIDE ( [Variance], [Budget] )'],
  ['Rolling 7', 'Rolling 7 = MOVINGAVERAGE ( [Energy MWh], 7 )'],
];

function DaxView({ workspace, addMeasure, addDaxObject }) {
  const profile = getScenarioProfile(workspace);
  const loadedModel = hasLoadedSemanticModel(workspace);
  const scenarioTemplateNames = profile.id==='wind'
    ? ['Energy MWh','Availability %','Alarm Rate','Rolling 7']
    : profile.id==='finance'
      ? ['Actual','Budget','Variance','Variance %']
      : ['Total Sales','Margin %','Sales YTD'];
  const scenarioTemplates = measureTemplates.filter(template=>scenarioTemplateNames.includes(template[0]));
  const defaultTemplate = scenarioTemplates[0];
  const [name, setName] = useState(defaultTemplate[0]);
  const [formula, setFormula] = useState(defaultTemplate[1]);
  const [output, setOutput] = useState('Ready. Write a measure or select a template.');
  const [objectType, setObjectType] = useState('Measure');
  const choose = (m) => { setObjectType('Measure'); setName(m[0]); setFormula(m[1]); };
  useEffect(()=>{ setName(defaultTemplate[0]); setFormula(defaultTemplate[1]); setObjectType('Measure'); setOutput(`Ready for the ${profile.label} model.`); }, [profile.id]);
  const groupField = profile.id==='wind' ? 'Site[Site]' : profile.id==='finance' ? 'Project[BusinessUnit]' : 'Region[Country]';
  const queryAlias = profile.id==='wind' ? 'Energy' : profile.id==='finance' ? 'Actual' : 'Sales';
  const presets = {
    'Measure': defaultTemplate[1],
    'Calculated column': profile.id==='wind' ? 'Temperature Band = IF ( Telemetry[Temperature] > 80, "High", "Normal" )' : profile.id==='finance' ? 'Spend Band = IF ( Actuals[Amount] > 10000, "High", "Standard" )' : 'Margin Band = IF ( Sales[Sales] - Sales[Cost] > 1000, "High", "Standard" )',
    'Direct Lake calc column (Preview)': profile.id==='wind' ? 'Temperature Delta = Telemetry[Temperature] - 60' : profile.id==='finance' ? 'Signed Amount = Actuals[Amount]' : 'Gross Margin = Sales[Sales] - Sales[Cost]',
    'Visual calculation': `Rolling 3 = MOVINGAVERAGE ( ${profile.primaryMeasure}, 3 )`,
    'UDF': 'FUNCTION SafeRatio = ( numerator : NUMERIC, denominator : NUMERIC ) =>\n    DIVIDE ( numerator, denominator )',
    'Query': `DEFINE\n    MEASURE '${profile.primaryFact}'[Query Metric] = ${profile.tmdlFormula}\nEVALUATE\nSUMMARIZECOLUMNS (\n    ${groupField},\n    "${queryAlias}", ${profile.primaryMeasure}\n)\nORDER BY [${queryAlias}] DESC`,
  };
  const selectType = (type) => { setObjectType(type); setFormula(presets[type]); setOutput(`Editing ${type}.`); };
  const apply = () => {
    if (!loadedModel) { setOutput('Load a semantic model before creating or querying DAX objects.'); return; }
    const trimmed = formula.trim();
    if (!trimmed) { setOutput('Nothing to apply. Enter a DAX expression.'); return; }
    if (objectType==='Query') { setOutput('Query evaluated in the learning simulator. Real DAX Query View executes against the semantic model and returns a table result.'); return; }
    const compatibility = daxObjectCompatibility(workspace, objectType);
    if (!compatibility.compatible) { setOutput(`Apply blocked: ${compatibility.message}`); return; }
    const actualName = objectType==='UDF' ? (trimmed.match(/FUNCTION\s+([^\s=]+)/i)?.[1] || 'Function') : (trimmed.includes('=') ? trimmed.split('=')[0].trim() : name.trim());
    if (!actualName) { setOutput('Apply blocked: the DAX object needs a valid name.'); return; }
    if (objectType==='Measure') addMeasure(actualName, formula);
    else addDaxObject({ type: objectType, name: actualName, formula });
    setOutput(`Stored ${objectType}: ${actualName}. This simulator checks workflow and structure; it does not execute the VertiPaq/DAX engine.`);
  };
  const updateModelFromQuery = () => {
    if (!loadedModel) { setOutput('Load a semantic model before updating model objects from DAX Query View.'); return; }
    if (objectType !== 'Query') { setOutput('Update model is available here only for DEFINE MEASURE changes in the Query tab.'); return; }
    const parsed = parseDaxQueryDefinedMeasure(formula);
    if (!parsed.ok) { setOutput(`Update model blocked: ${parsed.error}`); return; }
    addMeasure(parsed.name, parsed.dax);
    setOutput(`Updated model measure: ${parsed.name}. The learning parser applies the first DEFINE MEASURE declaration; other query definitions remain preview-only.`);
  };
  const warnings = [];
  const objectCompatibility = daxObjectCompatibility(workspace, objectType);
  if (!objectCompatibility.compatible) warnings.push(objectCompatibility.message);
  const rawFactArithmetic = new RegExp(`${profile.primaryFact.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\[[^\\]]+\\]\\s*[-+*/]`, 'i');
  if (objectType==='Measure' && rawFactArithmetic.test(formula) && !/SUM|AVERAGE|MIN|MAX|SELECTEDVALUE|RELATED/i.test(formula)) warnings.push('Possible raw-column arithmetic in a measure. Check aggregation semantics.');
  if (/\/\s*\[/i.test(formula) && !/DIVIDE/i.test(formula)) warnings.push('Consider DIVIDE when denominator can be zero or blank.');
  const sampleRows = profile.id==='wind'
    ? [['North','824 MWh','97.8%'],['West','791 MWh','96.9%']]
    : profile.id==='finance'
      ? [['Data','$184k','-$21k'],['Finance','$126k','+$4k']]
      : [['Norway','1,238,420','34.8%'],['Switzerland','1,102,730','36.1%']];
  return (
    <div className="desktop-work-area dax-layout">
      <aside className="dax-model-explorer">
        <div className="pane-section-title">Model explorer</div>
        {['Tables','Measures','Functions','Calculation groups','Roles','Perspectives'].map((x,i)=><div className="explorer-node" key={x}><span>{i===1?'▾':'▸'}</span>{x}{i===1 && <div className="explorer-children">{workspace.measures.map(m=><small key={m.name}>∑ {m.name}</small>)}</div>}{x==='Functions' && <div className="explorer-children">{(workspace.daxObjects||[]).filter(o=>o.type==='UDF').map(o=><small key={o.name}>ƒ {o.name}</small>)}</div>}</div>)}
      </aside>
      <main className="code-workbench">
        <div className="code-tabs"><button className="active">DAX workbench *</button><button>＋</button><span className="code-actions"><button disabled={!loadedModel} onClick={apply}>▶ {objectType==='Query'?'Run':'Apply'}</button><button disabled={!loadedModel || objectType!=='Query'} onClick={updateModelFromQuery}>Update model</button></span></div>
        <div className="dax-object-tabs">{Object.keys(presets).map(t=><button className={objectType===t?'active':''} key={t} onClick={()=>selectType(t)}>{t}</button>)}</div>
        {objectType==='Measure' && <div className="formula-template-row">{scenarioTemplates.map(m=><button key={m[0]} className={name===m[0]?'active':''} onClick={()=>choose(m)}>{m[0]}</button>)}</div>}
        <div className="code-editor dax-editor"><div className="line-numbers">1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7</div><textarea value={formula} onChange={e=>{setFormula(e.target.value);setName(e.target.value.split('=')[0]?.trim() || objectType)}} spellCheck="false" /></div>
        {warnings.length>0 && <div className="dax-warning">{warnings.map(w=><span key={w}>⚠ {w}</span>)}</div>}
        <div className="query-output"><div className="output-tabs"><b>Results</b><span>Output</span><span>Query plan</span></div><p>{output}</p><table><thead><tr><th>{profile.id==='wind'?'Site':profile.id==='finance'?'Business unit':'Country'}</th><th>{profile.primaryMeasure}</th><th>{profile.id==='wind'?'[Availability %]':profile.id==='finance'?'[Variance]':'[Margin %]'}</th></tr></thead><tbody>{sampleRows.map(row=><tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div>
      </main>
      <aside className="right-pane-stack dax-right"><Panel title="Choose the right DAX object"><div className="dax-concept"><b>Measure</b><span>Dynamic business calculation evaluated in filter context.</span></div><div className="dax-concept"><b>Calculated column</b><span>Stored row-level result; increases model size and does not recalculate with slicers.</span></div><div className="dax-concept"><b>Direct Lake calculated column</b><span>August 2026 preview: DAX calculated columns can be defined for Direct Lake on OneLake models and are evaluated at query time; review preview limitations before production use.</span></div><div className="dax-concept"><b>Visual calculation</b><span>Calculation local to a visual over its aggregated result.</span></div><div className="dax-concept"><b>UDF</b><span>Reusable parameterized logic for supported DAX expressions.</span></div></Panel><Panel title="Modern DAX"><span className="modern-chip">Visual calculations · GA</span><span className="modern-chip">User-defined functions · GA</span><span className="modern-chip">DAX Query View</span><span className="modern-chip preview-chip">Direct Lake calc columns · Preview</span></Panel></aside>
    </div>
  );
}
function TmdlView({ workspace, applyTmdlMeasure }) {
  const profile = getScenarioProfile(workspace);
  const loadedModel = hasLoadedSemanticModel(workspace);
  const tmdlTemplate = `createOrReplace\n\n  table ${profile.primaryFact}\n    measure '${profile.primaryMeasureLabel}' = ${profile.tmdlFormula}\n      formatString: "#,0.00"\n\n  function SafeRatio =\n    ( numerator : NUMERIC, denominator : NUMERIC ) =>\n      DIVIDE ( numerator, denominator )`;
  const [code, setCode] = useState(tmdlTemplate);
  const [status, setStatus] = useState('No unapplied simulator changes.');
  useEffect(()=>{ setCode(tmdlTemplate); setStatus(`Loaded ${profile.label} metadata example.`); }, [profile.id]);
  const preview = () => {
    const parsed = parseTmdlMeasureScript(code);
    setStatus(parsed.ok ? `Preview valid: measure '${parsed.name}' can be applied by this learning parser.` : `Preview error: ${parsed.error}`);
  };
  const apply = () => {
    if (!loadedModel) { setStatus('Apply blocked: load a semantic model before changing TMDL model objects.'); return; }
    const parsed = parseTmdlMeasureScript(code);
    if (!parsed.ok) { setStatus(`Apply blocked: ${parsed.error}`); return; }
    applyTmdlMeasure(parsed.name, parsed.dax);
    setStatus(`Applied measure '${parsed.name}' to the simulated semantic model. Other TMDL metadata remains preview-only in this learning surface.`);
  };
  return (
    <div className="desktop-work-area dax-layout tmdl-layout">
      <aside className="dax-model-explorer"><div className="pane-section-title">TMDL explorer</div>{['model.tmdl','tables','relationships.tmdl','roles.tmdl','functions.tmdl'].map(x=><div className="file-node" key={x}>▸ {x}</div>)}</aside>
      <main className="code-workbench"><div className="code-tabs"><button className="active">Script 1</button><span className="code-actions"><button onClick={preview}>Preview</button><button disabled={!loadedModel} onClick={apply}>Apply measure</button></span></div><div className="code-editor tmdl-editor"><div className="line-numbers">1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9</div><textarea value={code} onChange={e=>setCode(e.target.value)} spellCheck="false" /></div><div className="output-console"><b>Output</b><span>{status}</span></div></main>
      <aside className="right-pane-stack dax-right"><Panel title="Why TMDL"><ul className="plain-list"><li>Code-first semantic-model metadata</li><li>Bulk edits and reusable scripts</li><li>Transparent model definitions</li><li>Works with PBIP model definitions</li><li>Web authoring is available as a preview surface</li></ul></Panel><Panel title="Current model"><div className="property-row"><span>Scenario</span><b>{profile.label}</b></div><div className="property-row"><span>Measures</span><b>{workspace.measures.length}</b></div><div className="property-row"><span>Relationships</span><b>{workspace.relationships.length}</b></div></Panel></aside>
    </div>
  );
}
function PowerQueryView({ workspace, addTransform, removeLastTransform, addSource, removeSource, applyQueries }) {
  const profile = getScenarioProfile(workspace);
  const [selected, setSelected] = useState(powerQueryConcepts[0]);
  const [activeQuery, setActiveQuery] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [profiling, setProfiling] = useState(true);
  const [newSource, setNewSource] = useState('Text / CSV');
  const queries = workspace.sources;
  const hasQuery = queries.length > 0;
  const safeActiveQuery = Math.min(activeQuery, Math.max(0, queries.length-1));
  useEffect(() => { if (activeQuery !== safeActiveQuery) setActiveQuery(safeActiveQuery); }, [activeQuery, safeActiveQuery]);
  const queryName = hasQuery ? queries[safeActiveQuery] : '';
  const querySteps = hasQuery ? (workspace.queryTransforms?.[queryName] || (safeActiveQuery===0 ? workspace.transforms : [])) : [];
  const previewTable = queryName==='SharePoint Folder' ? 'Budget' : queryName==='OneLake catalog' ? 'Telemetry' : queryName==='Azure SQL Database' ? 'Actuals' : profile.primaryFact;
  const previewRows = hasQuery ? (sampleTables[previewTable] || sampleTables.Sales) : [];
  const previewColumns = Object.keys(previewRows[0] || {});
  const mCode = `let\n    Source = /* ${queryName || 'select a source'} connector */,\n    Data = Source,\n    #"Filtered Rows" = Table.SelectRows(Data, each true),\n    #"Changed Type" = Table.TransformColumnTypes(#"Filtered Rows", {})\nin\n    #"Changed Type"`;
  return (
    <div className="desktop-work-area pq-layout">
      <aside className="pq-queries"><div className="pq-head">Queries <span>{queries.length}</span></div>{queries.length?queries.map((q,i)=><button key={`${q}-${i}`} className={i===safeActiveQuery?'active':''} onClick={()=>setActiveQuery(i)}><Icon name="data" size={14}/>{q}<small>{i===0?'Load enabled':'Connection'}</small></button>):<div className="pq-empty-list"><b>No queries</b><span>Add a source to create the first query.</span></div>}</aside>
      <main className="pq-center">
        <div className="pq-ribbon"><button onClick={applyQueries} disabled={!hasQuery}>Close & Apply</button><select className="pq-source-select" value={newSource} onChange={e=>setNewSource(e.target.value)}>{connectors.map(c=><option key={c.name}>{c.name}</option>)}</select><button onClick={()=>{const existingIndex=queries.indexOf(newSource);setActiveQuery(existingIndex>=0?existingIndex:queries.length);addSource(newSource)}}>New Source</button><button disabled title="Reference-only in this learning build">Recent Sources</button><button disabled title="Reference-only in this learning build">Enter Data</button><span/><button disabled={!hasQuery}>Choose Columns</button><button disabled={!hasQuery}>Remove Columns</button><button disabled={!hasQuery}>Keep Rows</button><button disabled={!hasQuery}>Remove Rows</button><button disabled={!hasQuery}>Split Column</button><button disabled={!hasQuery}>Group By</button><button disabled={!hasQuery} onClick={()=>setAdvanced(v=>!v)}>Advanced Editor</button></div>
        <div className={`pq-formula ${hasQuery?'':'disabled'}`}><span>✕</span><span>✓</span><b>fx</b><code>{hasQuery ? '= Table.TransformColumnTypes(Source, {{"Date", type date}})' : '= Select or create a query'}</code></div>
        {advanced && hasQuery ? <div className="m-advanced-editor"><div><b>Advanced Editor — {queryName}</b><button onClick={()=>setAdvanced(false)}>Done</button></div><textarea value={mCode} readOnly spellCheck="false"/><small>M describes a repeatable sequence of immutable query steps. In a foldable source path, supported operations can be translated and pushed to the source.</small></div> : <>
          {hasQuery ? <table className="pq-table"><thead><tr>{previewColumns.map(column=><th key={column}><small>{typeof previewRows[0]?.[column]==='number'?'123':column.toLowerCase().includes('date')?'📅':'ABC'}</small>{column}<div className="column-quality good"/></th>)}</tr></thead><tbody>{previewRows.map((row,i)=><tr key={i}>{previewColumns.map(column=><td key={column}>{row[column]}</td>)}</tr>)}</tbody></table> : <div className="pq-empty-canvas"><Icon name="data" size={28}/><h3>No Power Query source connected</h3><p>Use New Source to create a real query before adding transformation steps or running Close & Apply.</p></div>}
          {hasQuery && profiling && <div className="profile-strip"><div><b>Column quality</b><span className="quality good">Valid 100%</span><span>Error 0%</span><span>Empty 0%</span></div><div><b>Column distribution</b><span>Distinct 6</span><span>Unique 6</span></div><button onClick={()=>setProfiling(false)}>Hide profiling</button></div>}
          {hasQuery && !profiling && <button className="show-profile" onClick={()=>setProfiling(true)}>Show column quality / distribution / profile</button>}
        </>}
      </main>
      <aside className="pq-settings"><div className="pq-head">Query Settings</div><label>PROPERTIES</label><div className="name-field">Name <input value={queryName || '—'} readOnly/></div><label>APPLIED STEPS</label>{hasQuery ? <div className="applied-steps"><span>⚙ Source</span><span>⚙ Navigation</span>{querySteps.map((x,i)=><span key={`${x}-${i}`}>⚙ {x}</span>)}</div> : <div className="applied-steps empty"><span>No query steps yet</span></div>}<div className="step-actions"><button onClick={()=>removeLastTransform(queryName)} disabled={!querySteps.length}>Undo last</button><button disabled={!hasQuery} onClick={()=>setAdvanced(true)}>View M</button>{workspace.sources.includes(queryName) && <button className="danger" onClick={()=>removeSource(queryName)}>Delete query</button>}</div><label>TRAINER</label><select value={selected.name} onChange={e=>setSelected(powerQueryConcepts.find(x=>x.name===e.target.value))}>{powerQueryConcepts.map(x=><option key={x.name}>{x.name}</option>)}</select><p>{selected.rule}</p><div className="folding-note"><b>Query folding:</b> {selected.folding}</div><button className="pbi-primary full" disabled={!hasQuery} onClick={()=>addTransform(selected.name, queryName)}>Add step: {selected.name}</button><div className={`query-apply-state ${workspace.queryDirty?'dirty':'clean'}`}><b>{workspace.queryDirty?'Pending query changes':'Model load state'}</b><span>{workspace.queryDirty ? (workspace.queryAppliedAt ? `Changes made after the ${workspace.queryAppliedAt} apply are not loaded yet.` : 'Changes not yet applied in this simulator session.') : (workspace.queryAppliedAt ? `Last Close & Apply: ${workspace.queryAppliedAt}` : 'No pending query changes.')}</span></div><div className="pq-layer-tip"><b>Layer check</b><span>If SQL can do a large relational filter/join efficiently and Power Query can fold it, push the work down rather than importing unnecessary data.</span></div></aside>
    </div>
  );
}
function RefreshView({ workspace, setRefreshMode, setStorageMode, updateRefreshConfig, runRefresh }) {
  const profile = getScenarioProfile(workspace);
  const storage = workspace.storageMode || 'Import';
  const selectedMode = storageModes.find(x=>x.name===storage) || storageModes[0];
  const config = workspace.refreshConfig || {};
  const granular = ['Refresh schema and data','Sync schema only','Refresh data only',`Table-level: ${profile.primaryFact}`];
  const history = workspace.refreshHistory || [];
  const latest = history[0];
  const refreshState = evaluateRefreshState(workspace);
  const currentModelStatus = semanticModelRefreshStatus(workspace);
  const readiness = refreshState.status;
  return (
    <div className="desktop-work-area refresh-layout">
      <main className="refresh-main">
        <div className="refresh-title"><div><span className="eyebrow">SEMANTIC MODEL OPERATIONS</span><h2>Refresh & storage strategy</h2><p>Choose a storage mode first, then configure connectivity, credentials, partition policy, scheduling, and the scope of processing.</p></div><div className="refresh-status">Last simulated operation <b>{latest?.time || '—'}</b><span className={latest && ['Failed','Blocked'].includes(latest.status)?'status-warn':latest?'status-good':''}>{latest ? `${['Failed','Blocked'].includes(latest.status)?'⚠':'✓'} ${latest.status}` : 'No run yet'}</span><small>Current model: {currentModelStatus}</small></div></div>
        <div className="storage-choice">{storageModes.map(m=><button key={m.name} className={storage===m.name?'active':''} onClick={()=>setStorageMode(m.name)}><b>{m.name}</b><span>{m.freshness}</span></button>)}</div>
        <div className="mode-explainer"><div><b>Best fit</b><p>{selectedMode.useWhen}</p></div><div><b>Watch for</b><p>{selectedMode.avoidWhen}</p></div><div><b>Data behavior</b><p>{selectedMode.modelData}</p></div></div>
        <div className={`refresh-readiness ${refreshState.ready?'ready':'warn'}`}><Icon name={refreshState.ready?'check':'info'} size={17}/><div><b>Operational interpretation</b><span>{readiness}</span>{!refreshState.ready && refreshState.failure && <small>{refreshState.failure}</small>}</div><button onClick={runRefresh}>Run simulated operation</button></div>
        <div className="refresh-pattern-grid">{refreshPatterns.map(p=><button key={p.name} className={workspace.refreshMode===p.name?'selected':''} onClick={()=>setRefreshMode(p.name)}><div><Icon name="refresh" size={18}/><b>{p.name}</b></div><span>{p.goodFor}</span><small>{p.watch}</small></button>)}</div>
        <div className="granular-refresh"><div><span className="eyebrow">AUGUST 2026</span><h3>Granular semantic-model refresh controls</h3><p>Choose whether the operation synchronizes schema, processes data, or targets a table.</p></div>{granular.map(x=><button className={config.granularAction===x?'active':''} key={x} onClick={()=>updateRefreshConfig({granularAction:x})}>{config.granularAction===x?'✓':'↻'} {x}</button>)}</div>
        <div className="refresh-history"><div className="refresh-history-head"><b>Refresh history simulator</b><span>Newest first</span></div>{history.length?history.slice(0,5).map((h,i)=><div key={`${h.time}-${i}`} className={['Failed','Blocked'].includes(h.status)?'failed':''}><span>{h.time}</span><b>{h.action}</b><strong>{h.status}</strong><small>{h.message}</small></div>):<p>No simulated runs yet. Configure the storage/connection state, then run an operation.</p>}</div>
      </main>
      <aside className="refresh-side">
        <Panel title="Gateway & credentials"><div className="gateway-card"><div className="gateway-icon">G</div><div><b>On-premises gateway</b><span className={refreshState.requiresGateway?(config.gatewayMapped?'status-good':'status-warn'):'status-good'}>● {refreshState.requiresGateway?(config.gatewayMapped?'Mapped':'Required / not mapped'):'Not required for current path'}</span><small>{refreshState.requiresGateway?'The simulated private SQL Server source requires a gateway mapping.':'Do not add a gateway just because the model uses Import; it depends on source/network reachability.'}</small></div></div><button disabled={!refreshState.requiresGateway} className={`toggle-row ${config.gatewayMapped?'on':''} ${!refreshState.requiresGateway?'disabled':''}`} onClick={()=>updateRefreshConfig({gatewayMapped:!config.gatewayMapped})}><span>Private-source gateway mapping</span><i/></button><button disabled={!refreshState.requiresCredentials} className={`toggle-row ${config.credentials?'on':''} ${!refreshState.requiresCredentials?'disabled':''}`} onClick={()=>updateRefreshConfig({credentials:!config.credentials})}><span>Credentials configured</span><i/></button></Panel>
        <Panel title="Schedule & incremental"><label className="refresh-config-label">Schedule<select value={config.schedule||'08:00 daily'} onChange={e=>updateRefreshConfig({schedule:e.target.value})}><option>08:00 daily</option><option>06:00 and 18:00</option><option>Weekdays 07:00</option><option>Manual only</option></select></label><button className={`toggle-row ${config.incremental?'on':''}`} onClick={()=>updateRefreshConfig({incremental:!config.incremental})}><span>Incremental refresh policy</span><i/></button>{config.incremental && <div className="incremental-box"><b>RangeStart / RangeEnd</b><span>Store 5 years</span><span>Refresh last 10 days</span><small>Production policies rely on date filtering and partition processing.</small></div>}</Panel>
        <Panel title="Selected"><strong className="selected-refresh">{workspace.refreshMode || 'Not configured'}</strong><span className="selected-refresh-sub">{storage} · {config.granularAction||'No granular action'}</span></Panel>
      </aside>
    </div>
  );
}
function ServiceView({ workspace, setRls, updateService }) {
  const profile = getScenarioProfile(workspace);
  const [tab, setTab] = useState('All');
  const service = workspace.service || {};
  const aiScore = [service.descriptionsReady, service.aiPrepared, service.copilotApproved].filter(Boolean).length;
  const loadedModel = hasLoadedSemanticModel(workspace);
  const copilotPrereqs = loadedModel && canApproveCopilot(service);
  const items = loadedModel ? filterServiceItems(buildServiceItems(workspace), tab) : [];
  const release = releaseReadiness(workspace);
  const connectivity = evaluateLoadedModelRefreshState(workspace);
  const currentModelStatus = semanticModelRefreshStatus(workspace);
  const setAiGate = (key, value) => updateService(nextAiServiceState(service, key, value));
  return (
    <div className="desktop-work-area service-layout">
      <aside className="service-nav"><div className="service-brand"><span className="pbi-mark"><i/><i/><i/></span>Power BI</div>{['Home','Browse','OneLake catalog','Apps','Workspaces','Monitor','Copilot'].map((x,i)=><button className={i===4?'active':''} key={x}>{x}</button>)}</aside>
      <main className="service-main"><div className="workspace-header"><div><span>Workspace</span><h2>{profile.workspaceName}</h2><small>Development → Test → Production release thinking</small></div><button>＋ New item</button></div><div className="workspace-tabs">{['All','Reports','Semantic models','Dashboards','Dataflows'].map(x=><button key={x} onClick={()=>setTab(x)} className={tab===x?'active':''}>{x}</button>)}</div><table className="workspace-table"><thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Refresh</th><th>Endorsement</th></tr></thead><tbody>{items.length ? items.map(item=><tr key={item.name}><td>{item.name}</td><td>{item.icon} {item.type}</td><td>{item.owner}</td><td>{item.refresh==='Completed'?<span className="status-good">Completed</span>:['Failed','Blocked','Pending changes','Refresh required','Configuration issue'].includes(item.refresh)?<span className="status-warn">{item.refresh}</span>:item.refresh}</td><td>{item.endorsement}</td></tr>) : <tr><td colSpan="5" className="empty-service-tab">No items in this simulated workspace category.</td></tr>}</tbody></table><div className="service-cards"><div><Icon name="model"/><b>Lineage</b><span>{loadedModel?'Source → model → report → dashboard/app':'Load a semantic model to populate lineage'}</span></div><div><Icon name="refresh"/><b>Refresh</b><span>{workspace.refreshMode || 'Configure a strategy'}</span></div><div><Icon name="security"/><b>Security</b><span>{workspace.rls ? 'RLS enabled' : 'No RLS role in simulator'}</span></div></div>{loadedModel ? <div className="lineage-sim"><span>{profile.lineageSource}</span><b>→</b><span>{profile.semanticModelName}</span><b>→</b><span>{profile.reportName}</span><b>→</b><span>{service.appPublished?'Published app':'Workspace app'}</span></div> : <div className="lineage-sim empty-lineage"><span>No loaded semantic model</span><b>→</b><span>Close & Apply or load a Direct Lake path first</span></div>}
        <div className="service-ai-card"><div><span className="eyebrow">COPILOT / AI READINESS</span><h3>Semantic model grounding</h3><p>Access to Copilot is not enough. Business metadata, governed measures, clear relationships, security, and the model AI-preparation workflow all affect answer quality.</p></div><div className="ai-readiness-meter"><b>{aiScore}/3</b><span>readiness gates</span><i><em style={{width:`${(aiScore/3)*100}%`}}/></i></div></div>
        <div className="release-readiness-card"><div><span className="eyebrow">PRE-RELEASE REVIEW</span><h3>{release.passed}/{release.total} governed checks passing</h3><p>Publishing is still allowed in the simulator so you can observe the difference between “can publish” and “ready to publish”.</p></div><div className="release-check-grid">{release.checks.map(check=><div key={check.id} className={check.ok?'pass':'warn'}><b>{check.ok?'✓':'!'} {check.label}</b><span>{check.detail}</span></div>)}</div></div>
      </main>
      <aside className="service-settings">
        <Panel title="Semantic model settings"><div className="settings-group"><b>Gateway and cloud connections</b><span>{connectivity.ready?'Ready':connectivity.status}</span></div><div className="settings-group"><b>Refresh</b><span>{workspace.refreshMode ? `${workspace.refreshMode} · ${currentModelStatus}` : currentModelStatus}</span></div><div className="settings-group"><b>Security</b><span>Roles and user membership</span></div><div className="settings-group"><b>Permissions</b><span>Read, Reshare, Build</span></div><button disabled={!loadedModel} className={`toggle-row ${workspace.rls?'on':''} ${!loadedModel?'disabled':''}`} onClick={()=>setRls(!workspace.rls)}><span>Dynamic RLS role</span><i/></button><button disabled={!loadedModel} className={`toggle-row ${service.buildPermission?'on':''} ${!loadedModel?'disabled':''}`} onClick={()=>updateService({buildPermission:!service.buildPermission})}><span>Grant Build permission</span><i/></button><small className="release-note">App consumption and semantic-model authoring are different permission needs. Avoid granting Build solely for read-only consumption.</small></Panel>
        <Panel title="Copilot / AI readiness"><button disabled={!loadedModel} className={`toggle-row ${service.descriptionsReady?'on':''} ${!loadedModel?'disabled':''}`} onClick={()=>setAiGate('descriptionsReady',!service.descriptionsReady)}><span>Business descriptions & synonyms</span><i/></button><button disabled={!loadedModel} className={`toggle-row ${service.aiPrepared?'on':''} ${!loadedModel?'disabled':''}`} onClick={()=>setAiGate('aiPrepared',!service.aiPrepared)}><span>Prepare data for AI</span><i/></button><button className={`toggle-row ${service.copilotApproved?'on':''} ${!copilotPrereqs?'disabled':''}`} disabled={!loadedModel || (!copilotPrereqs && !service.copilotApproved)} onClick={()=>setAiGate('copilotApproved',!service.copilotApproved)}><span>Approved for Copilot</span><i/></button>{!copilotPrereqs && <small className="copilot-prereq-note">Complete business metadata and Prepare data for AI before approval. Turning either prerequisite off revokes simulated approval.</small>}<div className={`ai-readiness-state ${aiScore===3?'ready':''}`}><b>{aiScore===3?'AI-ready learning state':'Preparation incomplete'}</b><span>{aiScore===3?'The simulator has all three readiness gates set.':'Complete semantic metadata and governance checks before approval.'}</span></div></Panel>
        <Panel title="Release controls"><label className="model-property-select">Deployment stage<select value={service.deploymentStage||'Development'} onChange={e=>updateService({deploymentStage:e.target.value})}><option>Development</option><option>Test</option><option>Production</option></select></label><label className="model-property-select">Endorsement<select value={service.endorsement||'Promoted'} onChange={e=>updateService({endorsement:e.target.value})}><option>None</option><option>Promoted</option><option>Certified</option></select></label><button disabled={!loadedModel} className={`pbi-primary full ${service.appPublished?'done':''}`} onClick={()=>updateService({appPublished:!service.appPublished})}>{service.appPublished?'✓ App published':'Publish app'}</button><small className={`release-note ${release.passed<release.total?'warn':''}`}>{release.passed===release.total?'All governed training checks are currently green.':'Publishing is possible, but the readiness card still has unresolved training warnings.'}</small></Panel>
      </aside>
    </div>
  );
}
export default function PowerBIDesktop({ workspace, setWorkspace, activeView, setActiveView }) {
  const profile = getScenarioProfile(workspace);
  const [ribbon, setRibbon] = useState('Home');
  const [toast, setToast] = useState('');
  const addSource = (source) => {
    if (workspace.sources.includes(source)) { setToast(`${source} is already connected in this learning workspace.`); return; }
    setWorkspace(w => addSourceToWorkspace(w, source));
    setToast(`Connected learning source: ${source}. Query changes are pending until Close & Apply.`);
  };
  const removeSource = (source) => {
    setWorkspace(w => removeSourceFromWorkspace(w, source));
    setToast(`Removed query/source: ${source}. Close & Apply to commit the model-load change.`);
  };
  const addTransform = (step, queryName='Sales') => {
    setWorkspace(w => appendQueryTransform(w, queryName, step));
    setToast(`Power Query step added to ${queryName}: ${step}`);
  };
  const removeLastTransform = (queryName='Sales') => {
    setWorkspace(w => removeLastQueryTransform(w, queryName));
    setToast(`Last Power Query step removed from ${queryName}`);
  };
  const applyQueries = () => {
    const appliedAt = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    setWorkspace(w=>markQueriesApplied(w, appliedAt));
    setToast('Close & Apply simulated: the current query/source snapshot is now loaded into the learning model');
  };
  const addRelationship = (rel) => {
    if (workspace.relationships.includes(rel)) { setToast(`Relationship already exists: ${rel}`); return; }
    setWorkspace(w => addRelationshipToWorkspace(w, rel));
    setToast(`Relationship created: ${rel}`);
  };
  const addMeasure = (name, formula) => {
    setWorkspace(w => upsertMeasureInWorkspace(w, name, formula));
    setToast(`Measure saved: ${name}`);
  };
  const addDaxObject = (obj) => {
    setWorkspace(w => upsertDaxObjectInWorkspace(w, obj));
    setToast(`${obj.type} stored: ${obj.name}`);
  };
  const addVisual = (visual, details={}) => {
    setWorkspace(w => ({...w, visuals: [...w.visuals, visual], visualDetails:[...(w.visualDetails||[]),{type:visual,...details}]}));
    setToast(`${visual} added to report page`);
  };
  const updateVisual = (index, patch) => setWorkspace(w=>({...w, visualDetails:(w.visualDetails||[]).map((d,i)=>i===index?{...d,...patch}:d)}));
  const removeVisual = (index) => { setWorkspace(w=>({...w, visuals:w.visuals.filter((_,i)=>i!==index), visualDetails:(w.visualDetails||[]).filter((_,i)=>i!==index)})); setToast('Visual removed from report page'); };
  const duplicateVisual = (index) => { setWorkspace(w=>{ const type=w.visuals[index]; const details=(w.visualDetails||[])[index]||{type}; return {...w,visuals:[...w.visuals,type],visualDetails:[...(w.visualDetails||[]),{...details}]}; }); setToast('Visual duplicated'); };
  const setRefreshMode = (mode) => { setWorkspace(w=>({...w, refreshMode:mode})); setToast(`Refresh strategy selected: ${mode}`); };
  const setStorageMode = (mode) => {
    const result = applyStorageModeSelection(workspace, mode, new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
    setWorkspace(result.workspace);
    setToast(result.directLakeLoad
      ? 'Direct Lake selected: the compatible OneLake source is treated as the loaded semantic-model path; no Power Query Close & Apply is required.'
      : `Storage mode selected: ${mode}`);
  };
  const updateRefreshConfig = (patch) => setWorkspace(w=>({...w,refreshConfig:{...(w.refreshConfig||{}),...patch}}));
  const runRefresh = () => {
    setWorkspace(w => {
      const entry = buildRefreshHistoryEntry(w, new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
      return {...w, refreshHistory:[entry, ...(w.refreshHistory||[])].slice(0,8)};
    });
    setToast('Refresh operation recorded in simulated history');
  };
  const setRls = (enabled) => { setWorkspace(w=>({...w, rls:enabled})); setToast(enabled ? 'Dynamic RLS enabled' : 'RLS disabled'); };
  const updateService = (patch) => setWorkspace(w=>({...w,service:{...(w.service||{}),...patch}}));
  const setTheme = (theme) => { setWorkspace(w=>({...w,theme})); setToast(`Report base theme: ${theme}`); };
  const toggleOnObject = () => setWorkspace(w=>({...w,onObject:!w.onObject}));
  const addBookmark = (name) => { setWorkspace(w=>({...w,bookmarks:[...(w.bookmarks||[]),name]})); setToast(`Bookmark created: ${name}`); };
  const addInteraction = (name) => setWorkspace(w=>({...w,interactions:[...new Set([...(w.interactions||[]),name])]}));
  const updateReportFilters = (scope, filters) => setWorkspace(w=>({...w,reportFilters:{page:[],report:[],...(w.reportFilters||{}),[scope]:filters}}));
  const updateRelationshipSettings = (patch) => setWorkspace(w=>({...w,relationshipSettings:{...(w.relationshipSettings||{}),...patch}}));
  const updateRelationship = (index, patch) => setWorkspace(w=>updateRelationshipAt(w,index,patch));
  const removeRelationship = (index) => { setWorkspace(w=>removeRelationshipAt(w,index)); setToast('Relationship removed from semantic model'); };
  const updateAllRelationshipSettings = (patch) => setWorkspace(w=>updateAllRelationships(w,patch));
  const markDateTable = () => { setWorkspace(w=>({...w,dateTable:true})); setToast('Date table marked in learning model'); };

  const ribbonActions = useMemo(() => ribbon === 'Home'
    ? ['Paste','Get data','Excel workbook','SQL Server','Transform data','Refresh','Publish']
    : ribbon === 'Insert'
      ? ['New visual','Text box','Button','Shape','Image','Slicer','Power Apps']
      : ribbon === 'Modeling'
        ? ['New measure','Quick measure','New column','New table','Manage relationships','Manage roles','Calculation group']
        : ribbon === 'View'
          ? ['Themes','Page view','Gridlines','Snap to grid','Selection','Performance analyzer','Sync slicers']
          : ribbon === 'Optimize'
            ? ['Pause visuals','Optimization presets','Performance analyzer','Apply all slicers']
            : ['Learn','Community','Blog','About'], [ribbon]);

  return (
    <div className="powerbi-simulator">
      <div className="simulator-caption"><div><span className="pbi-mark small"><i/><i/><i/></span><b>Power BI Desktop — learning simulator</b><span className="sim-badge">August 2026 baseline</span></div><div>Educational UI • no Microsoft service connection</div></div>
      <div className="pbi-titlebar"><span>{profile.documentName}</span><div className="titlebar-search"><Icon name="search" size={14}/>Search Power BI</div><span className="window-controls">— □ ×</span></div>
      <div className="pbi-ribbon-tabs">{ribbonTabs.map(t=><button key={t} className={ribbon===t?'active':''} onClick={()=>setRibbon(t)}>{t}</button>)}<span className="ribbon-spacer"/><button>Share</button><button onClick={()=>{setActiveView('service');setToast('Opened Copilot / AI readiness in the Service simulation')}}>Copilot</button></div>
      <div className="pbi-ribbon-actions">{ribbonActions.map((a,i)=><button key={a} onClick={()=>{if(a==='Transform data')setActiveView('powerquery'); if(a==='Refresh')setActiveView('refresh'); if(a==='Publish')setActiveView('service'); if(a==='Manage relationships')setActiveView('model'); if(a==='New measure')setActiveView('dax'); if(a==='Performance analyzer')setActiveView('performance'); if(a==='Get data')setToast('Use the Data pane Get data control to add a simulated source.')}}><span className="ribbon-action-icon">{i%3===0?'▦':i%3===1?'◇':'▤'}</span>{a}</button>)}</div>
      <div className="pbi-main-row">
        <nav className="view-rail">{viewItems.map(([id,icon,label])=><button key={id} className={activeView===id?'active':''} onClick={()=>setActiveView(id)} title={label}><Icon name={icon} size={19}/><span>{label}</span></button>)}</nav>
        <div className="pbi-view-root">
          {activeView === 'report' && <ReportView workspace={workspace} addVisual={addVisual} updateVisual={updateVisual} removeVisual={removeVisual} duplicateVisual={duplicateVisual} addSource={addSource} setTheme={setTheme} toggleOnObject={toggleOnObject} addBookmark={addBookmark} addInteraction={addInteraction} updateReportFilters={updateReportFilters}/>} 
          {activeView === 'data' && <DataView workspace={workspace}/>} 
          {activeView === 'model' && <ModelView workspace={workspace} addRelationship={addRelationship} updateRelationshipSettings={updateRelationshipSettings} updateRelationship={updateRelationship} removeRelationship={removeRelationship} updateAllRelationshipSettings={updateAllRelationshipSettings} markDateTable={markDateTable}/>} 
          {activeView === 'dax' && <DaxView workspace={workspace} addMeasure={addMeasure} addDaxObject={addDaxObject}/>} 
          {activeView === 'tmdl' && <TmdlView workspace={workspace} applyTmdlMeasure={addMeasure}/>} 
          {activeView === 'powerquery' && <PowerQueryView workspace={workspace} addTransform={addTransform} removeLastTransform={removeLastTransform} addSource={addSource} removeSource={removeSource} applyQueries={applyQueries}/>} 
          {activeView === 'performance' && <PerformanceView workspace={workspace} setWorkspace={setWorkspace}/>} 
          {activeView === 'refresh' && <RefreshView workspace={workspace} setRefreshMode={setRefreshMode} setStorageMode={setStorageMode} updateRefreshConfig={updateRefreshConfig} runRefresh={runRefresh}/>} 
          {activeView === 'service' && <ServiceView workspace={workspace} setRls={setRls} updateService={updateService}/>} 
        </div>
      </div>
      <div className="pbi-statusbar"><span>Page 1 of 3</span><span>{hasLoadedSemanticModel(workspace)?`Semantic model: ${profile.semanticModelName}`:'Semantic model: not loaded'}</span><span className="status-spacer"/><span>100%</span><span>▰▰▰</span></div>
      {toast && <button className="toast" onClick={()=>setToast('')}><Icon name="check" size={16}/>{toast}<span>×</span></button>}
    </div>
  );
}
