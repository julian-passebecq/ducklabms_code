import { useState } from 'react';
import { runFabricProductionStage } from '../lib/productionWorkflow';
import type { CaseStudy, DataWorkspace } from '../types/app';

export function FabricCopyJobStudio({ caseStudy, workspace, onWorkspace }: { caseStudy: CaseStudy; workspace: DataWorkspace; onWorkspace: (workspace: DataWorkspace) => void }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'Full copy'|'Incremental copy'>('Incremental copy');
  const [ran, setRan] = useState(false);
  const [message, setMessage] = useState('');
  const source = caseStudy.tables[0];
  const runCopy = () => {
    const result = runFabricProductionStage(workspace, caseStudy, 'ingest');
    onWorkspace(result.workspace);
    setRan(true);
    setMessage(`${result.touchedTables.join(', ')} · workspace snapshot ${result.workspace.snapshot}`);
  };
  return <div className="studio-page copyjob-studio">
    <div className="studio-commandbar"><div><span className="fabric-item-icon">CJ</span><strong>CJ_{caseStudy.id.replaceAll('-', '_')}</strong><span className="muted">Copy Job</span></div><button className="primary-button" onClick={runCopy}>Run</button></div>
    <div className="copyjob-layout"><aside className="wizard-steps">{['Choose source','Select data','Choose destination','Configure copy','Review & save'].map((s,i)=><button key={s} className={`${i===step?'active':''} ${i<step?'done':''}`} onClick={()=>setStep(i)}><span>{i<step?'✓':i+1}</span><div><strong>{s}</strong><small>{i<step?'Configured':' '}</small></div></button>)}</aside>
      <main className="wizard-main"><span className="eyebrow">Step {step+1} of 5</span><h2>{['Choose a data source','Select tables or files','Choose a destination','Configure copy behavior','Review and save'][step]}</h2>
      {step===0&&<div className="connector-grid">{['Azure SQL Database','ADLS Gen2','SQL Server','Amazon S3','Oracle','Snowflake'].map((x,i)=><button key={x} className={i===0?'selected':''}><span>▣</span><strong>{x}</strong><small>{i===0?'Selected source':'Connector'}</small></button>)}</div>}
      {step===1&&<div className="selection-table"><label><input type="checkbox" defaultChecked/> {source.schema}.{source.name}</label>{caseStudy.tables.slice(1,4).map(t=><label key={t.name}><input type="checkbox"/> {t.schema}.{t.name}</label>)}</div>}
      {step===2&&<div className="connector-grid">{['Fabric Lakehouse','Fabric Warehouse','Azure SQL Database','ADLS Gen2'].map((x,i)=><button key={x} className={i===0?'selected':''}><span>▦</span><strong>{x}</strong><small>{i===0?'LH_training / bronze':'Destination'}</small></button>)}</div>}
      {step===3&&<div className="form-stack copy-config"><label>Copy behavior<select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option>Full copy</option><option>Incremental copy</option></select></label><label>Incremental column<input defaultValue="last_modified_utc" disabled={mode==='Full copy'}/></label><label>Write behavior<select><option>Upsert</option><option>Append</option><option>Overwrite</option></select></label><label><input type="checkbox" defaultChecked/> Enable staging</label></div>}
      {step===4&&<div className="review-panel"><Row a="Source" b={`Azure SQL · ${source.schema}.${source.name}`}/><Row a="Destination" b="Lakehouse · bronze/staging"/><Row a="Behavior" b={mode}/><Row a="Schedule" b="Manual for this lab"/><div className="learning-box wide"><strong>Why Copy Job?</strong><p>Copy Job focuses on repeatable high-volume movement with full or incremental behaviors. It can also be invoked from a Fabric pipeline when movement is one step in a larger orchestration.</p></div></div>}
      <div className="wizard-actions"><button className="secondary-button" disabled={step===0} onClick={()=>setStep(Math.max(0,step-1))}>Back</button><button className="primary-button" onClick={()=>step<4?setStep(step+1):runCopy()}>{step<4?'Next':'Save & run'}</button></div>
      {ran&&<div className="run-success-box"><strong>Copy job succeeded</strong><span>{message}</span></div>}</main>
      <aside className="learning-side-panel standalone"><div className="pane-title">Learning objective</div><h3>Movement versus transformation</h3><p>Copy Job moves data reliably. Use Dataflow Gen2, Spark, Python, dbt, or SQL when you need transformation logic.</p><div className="concept-card"><strong>Full copy</strong><span>Re-read the complete selected source.</span></div><div className="concept-card"><strong>Incremental copy</strong><span>Move only rows/files newer than a tracked watermark.</span></div><div className="concept-card"><strong>Live evidence</strong><span>Successful runs now create the same representative Bronze/staging tables inspected by Lakehouse, OneLake Catalog, Notebook and Pipeline.</span></div></aside>
    </div>
  </div>;
}
function Row({a,b}:{a:string;b:string}){return <div className="review-row"><span>{a}</span><strong>{b}</strong></div>}
