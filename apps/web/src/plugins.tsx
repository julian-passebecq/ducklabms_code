import {SparkInspector} from './SparkInspector';
import {isExecutionFresh,requireModuleCompatibility} from '../../../packages/contracts/src/index.ts';
import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import type {Asset,CaseStudy,Execution,ModuleManifest,RuntimeClient,LakehouseTableEvidence,LakehouseSnapshotPreview,LakehouseCompactionResult} from '../../../packages/contracts/src/index.ts';
import {Badge,Button,Spinner} from '@fluentui/react-components';
import {DataTable} from './ResultView';

/** A specialist receives root state and commands. It may not create a second
 * provider, catalog, execution API, notebook document or localStorage schema. */
export interface ToolContext {workspaceId:string;notebookId:string;services:{runtime:RuntimeClient;inspectAsset:(name:string)=>void;refreshCatalog:()=>Promise<void>};caseStudy:CaseStudy;assets:Asset[];runs:Execution[];selectedStep:string;onSelectStep:(id:string)=>void;onRunWorkflow:()=>void;busy:boolean}
export type ToolPanelId='graph'|'catalog'|'brief'|'report';
export interface ToolPanel {id:ToolPanelId;render:(context:ToolContext)=>ReactNode}
export interface ToolPlugin {manifest:ModuleManifest;description:string;panels:ToolPanel[]}
const panels:Record<ToolPanelId,ToolPanel>={
 brief:{id:'brief',render:context=><CaseBrief context={context}/>},
 graph:{id:'graph',render:context=><PipelineSurface context={context}/>},
 catalog:{id:'catalog',render:context=><CatalogSurface context={context} onInspect={context.services.inspectAsset}/>},
 report:{id:'report',render:context=><ReportSurface context={context}/>},
};
const modulePanels:Record<string,ToolPanelId[]>={
 'data-factory':['brief','graph','catalog'], 'fabric-notebook':['brief','catalog'],
 warehouse:['brief','catalog'],dbt:['brief','graph','catalog'],airflow:['brief','graph'],
 'power-bi':['brief','report','catalog'],'databricks-notebook':['brief','catalog'],
 'polars-notebook':['brief','catalog'],sparklab:['brief','graph','catalog'],
};
export function buildRegistry(manifests:ModuleManifest[]):Map<string,ToolPlugin>{
 return new Map(manifests.map(manifest=>{requireModuleCompatibility(manifest);return [manifest.id,{manifest,description:manifest.status==='foundation'?'Shared foundation; specialist migration is bounded by the module contract.':'',panels:(modulePanels[manifest.id]??['brief']).map(id=>manifest.id==='sparklab'&&id==='graph'?{id,render:(context:ToolContext)=><SparkRunSurface context={context}/>} : panels[id])}]}));
}
export function renderToolPanel(registry:Map<string,ToolPlugin>,id:ToolPanelId,context:ToolContext):ReactNode {
 const registered=context.caseStudy.modules.flatMap(module=>registry.get(module)?.panels??[]).find(panel=>panel.id===id);
 return (registered??panels[id]).render(context);
}
export function CaseBrief({context}:{context:ToolContext}){
 const c=context.caseStudy;
 return <div className="surface-page"><div className="section-eyebrow">CASE STUDY / {c.domain.toUpperCase()}</div><h1>{c.title}</h1><p className="lead">{c.description}</p><div className="brief-stats"><div><span>Physical dataset</span><b>{c.physical_data}</b></div><div><span>Learning path</span><b>{c.steps.length} steps / {c.modules.length} tool modules</b></div><div><span>Level</span><b>{c.difficulty}</b></div></div>{c.scale_note&&<p className="notice">{c.scale_note}</p>}<h2>Choose the shortest useful path</h2><p>Tools are optional capabilities, not compulsory stages. This case uses only the modules shown below.</p><div className="tag-row">{c.modules.map(m=><Badge appearance="tint" key={m}>{m}</Badge>)}</div><div className="brief-steps">{c.steps.map((s,i)=><button key={s.id} className="brief-step" onClick={()=>context.onSelectStep(s.id)}><span className="step-number">{i+1}</span><div><b>{s.title}</b><p>{s.task}</p><span>{s.module} / {s.language} {s.output_asset?` / ${s.output_asset}`:''}</span></div></button>)}</div><h2>Execution truth</h2><p>Rows come from the workspace catalog. Cloud-service interfaces are teaching surfaces. Distributed Spark metrics, when available, are labeled simulations. No cloud account or paid resource is provisioned.</p></div>;
}
export function PipelineSurface({context}:{context:ToolContext}){
 const latest=new Map(context.runs.filter(r=>r.cell_id).map(r=>[r.cell_id,r]));
 return <div className="surface-page"><div className="surface-title"><div><div className="section-eyebrow">PORTABLE TASK GRAPH</div><h1>One project, connected artifacts</h1></div><Button appearance="primary" onClick={context.onRunWorkflow} disabled={context.busy}>Run workflow</Button></div><p className="lead">Dependencies determine execution order. Each task uses the root kernel and publishes to the same catalog.</p><div className="pipeline-flow">{context.caseStudy.steps.map((s,i)=>{const run=latest.get(s.id);return <div className="pipeline-group" key={s.id}><button className={`pipeline-node ${context.selectedStep===s.id?'active':''}`} onClick={()=>context.onSelectStep(s.id)}><div className="node-top"><span>{String(i+1).padStart(2,'0')}</span><Badge appearance="tint" color={run?.status==='success'?'success':run?.status==='error'?'danger':'subtle'}>{run?.status??'not run'}</Badge></div><h3>{s.title}</h3><p>{s.module}</p><small>Needs: {s.depends_on.join(', ')||'source'}</small><code>{s.output_asset??'Result preview'}</code></button></div>})}</div><h2>Dependency contract</h2><div className="contract-list">{context.caseStudy.steps.map(s=><div key={s.id}><b>{s.id}</b><span>Needs: {s.depends_on.join(', ')||'source fixture'}</span><span>Publishes: {s.output_asset??'bounded result'}</span></div>)}</div><p className="notice">This executes the registered task graph, not arbitrary Airflow Python or an Azure pipeline JSON definition. Advanced authoring surfaces remain migration work.</p></div>;
}
function formatStorageBytes(value:number):string {
 if(value<1024)return value+' B';
 if(value<1024*1024)return (value/1024).toFixed(1)+' KiB';
 if(value<1024*1024*1024)return (value/(1024*1024)).toFixed(1)+' MiB';
 return (value/(1024*1024*1024)).toFixed(2)+' GiB';
}
export function CatalogSurface({context,onInspect}:{context:ToolContext;onInspect:(name:string)=>void}){
 const signature=context.assets.map(a=>a.name+':'+(a.storage?.snapshot_id??'none')).join('|');
 const [selected,setSelected]=useState(context.assets[0]?.name??'');
 const [evidence,setEvidence]=useState<LakehouseTableEvidence|null>(null);
 const [preview,setPreview]=useState<LakehouseSnapshotPreview|null>(null);
 const [maintenance,setMaintenance]=useState<LakehouseCompactionResult|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{
  if(!context.assets.some(a=>a.name===selected))setSelected(context.assets[0]?.name??'');
 },[signature,selected,context.assets]);

 useEffect(()=>{
  let live=true;
  if(!selected){setEvidence(null);return()=>{live=false}}
  setLoading(true);setError('');setPreview(null);setMaintenance(null);
  context.services.runtime.lakehouseTable(context.workspaceId,selected)
   .then(value=>{if(live)setEvidence(value)})
   .catch(reason=>{if(live){setEvidence(null);setError(String(reason))}})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[context.workspaceId,selected,signature,context.services.runtime]);

 async function showSnapshot(snapshotId:number){
  setLoading(true);setError('');
  try{setPreview(await context.services.runtime.lakehouseSnapshot(context.workspaceId,selected,snapshotId,50))}
  catch(reason){setError(String(reason))}
  finally{setLoading(false)}
 }
 async function compact(){
  setLoading(true);setError('');
  try{
   const result=await context.services.runtime.compactLakehouseTable(context.workspaceId,selected);
   setMaintenance(result);
   await context.services.refreshCatalog();
   setEvidence(await context.services.runtime.lakehouseTable(context.workspaceId,selected));
  }catch(reason){setError(String(reason))}
  finally{setLoading(false)}
 }

 return <div className="surface-page"><div className="section-eyebrow">SHARED WORKSPACE CATALOG</div><h1>Lakehouse evidence</h1><p className="lead">The catalog is shared by every module. In DuckLake mode, file counts, bytes, snapshots and maintenance are real local metadata; Spark stages and cost remain separate simulations.</p>
 <div className="asset-grid">{context.assets.map(a=><button className={`asset-card ${selected===a.name?'selected':''}`} key={a.name} onClick={()=>setSelected(a.name)}><div><Badge appearance="tint" color={a.fresh?'success':'warning'}>{a.fresh?'fresh':'stale'}</Badge><span>{a.layer}</span></div><h3>{a.name}</h3><b>{a.row_count.toLocaleString()} rows</b>{a.storage&&<><small>{a.storage.file_count} Parquet file{a.storage.file_count===1?'':'s'} · {formatStorageBytes(a.storage.size_bytes)} · snapshot {a.storage.snapshot_id??'—'}</small>{a.storage.compaction_candidate&&<Badge appearance="tint" color="warning">small-file candidate</Badge>}</>}<p>{a.producer??'No producer recorded'}</p><small>{Object.keys(a.inputs??{}).join(' + ')||'Independent source'}</small></button>)}</div>
 {selected&&<section className="lakehouse-evidence-panel"><div className="surface-title"><div><div className="section-eyebrow">SELECTED ASSET</div><h2>{selected}</h2></div><div><Button size="small" onClick={()=>onInspect(selected)}>Open rows</Button>{evidence?.storage&&<Button size="small" appearance="primary" disabled={loading||!evidence.storage.compaction_candidate} onClick={()=>void compact()}>Compact small files</Button>}</div></div>
 {loading&&<Spinner size="tiny" label="Reading lakehouse evidence"/>}{error&&<p className="notice">{error}</p>}
 {evidence&&!evidence.available&&<p className="notice">{evidence.truth}</p>}
 {evidence?.storage&&<><div className="metric-row lakehouse-metrics"><div><span>Parquet files</span><b>{evidence.storage.file_count}</b></div><div><span>Physical bytes</span><b>{formatStorageBytes(evidence.storage.size_bytes)}</b></div><div><span>Average file</span><b>{formatStorageBytes(evidence.storage.average_file_size_bytes)}</b></div><div><span>Small files &lt; 1 MiB</span><b>{evidence.storage.small_file_count}</b></div></div><p className="notice">{evidence.storage.maintenance_truth}</p></>}
 {maintenance&&<p className="notice">Real DuckLake compaction: {maintenance.before.file_count} → {maintenance.after.file_count} current data files; {maintenance.logical_rows_preserved.toLocaleString()} logical rows preserved. Old files are retained while snapshots still reference them.</p>}
 {evidence?.snapshots.length?<><h2>Snapshot history</h2><p className="lead">Time travel runs a real DuckLake versioned query. A snapshot can predate this table; those requests fail explicitly rather than returning invented data.</p><div className="snapshot-list">{evidence.snapshots.slice(0,10).map(snapshot=><button key={snapshot.snapshot_id} onClick={()=>void showSnapshot(snapshot.snapshot_id)} disabled={loading}><b>#{snapshot.snapshot_id}</b><span>{snapshot.snapshot_time}</span><small>{snapshot.changes||'catalog change'}</small></button>)}</div></>:null}
 {preview&&<><h2>Snapshot #{preview.snapshot_id}</h2><DataTable result={preview.result}/><p className="notice">{preview.truth}. Preview is bounded to 50 rows.</p></>}
 </section>}</div>;
}
export function ReportSurface({context}:{context:ToolContext}){
 const report=[...context.runs].reverse().find(r=>r.cell_id==='report'&&r.status==='success');
 return <div className="surface-page"><div className="section-eyebrow">POWER BI LEARNING / SQL-BACKED KPI</div><h1>Revenue overview</h1><p className="lead">The report consumes the Gold table. This foundation is not a DAX evaluation engine or a Power BI embedded report.</p>{report?.result?<>{!isExecutionFresh(report,context.assets)&&<p className="notice">Historical result: upstream data changed or provenance is unavailable. Rerun the KPI step.</p>}<div className="metric-row report-metrics">{Object.entries(report.result.rows[0]??{}).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><b>{typeof value==='number'?value.toLocaleString():String(value)}</b></div>)}</div><DataTable result={report.result}/></>:<div className="empty-state"><h2>Run the KPI step to create this preview</h2><p>Do not substitute sample cards for uncomputed results.</p><Button onClick={()=>context.onSelectStep('report')}>Open KPI step</Button></div>}<h2>Next specialist boundary</h2><p>The uploaded Power BI Studio contains its own DAX, model and reporting lessons. Migrate those as a semantic-model module that reads root assets; do not recreate the data store or notebook engine.</p></div>;
}

function SparkRunSurface({context}:{context:ToolContext}) {
 const run=[...context.runs].reverse().find(r=>r.language==='sparklab'&&r.simulation);
 return <div className="surface-page"><h1>SparkLab run evidence</h1>{run?.simulation?<SparkInspector simulation={run.simulation}/>:<p>Run a SparkLab cell to inspect its plan and virtual stages.</p>}</div>;
}
