import {SparkInspector} from './SparkInspector';
import {isExecutionFresh,requireModuleCompatibility} from '../../../packages/contracts/src/index.ts';
import {useEffect,useState,type ReactNode} from 'react';
import type {Asset,CaseStudy,Execution,LakehouseOverview,ModuleManifest,RuntimeClient} from '../../../packages/contracts/src/index.ts';
import {Badge,Button} from '@fluentui/react-components';
import {DataTable} from './ResultView';

/** A specialist receives root state and commands. It may not create a second
 * provider, catalog, execution API, notebook document or localStorage schema. */
export interface ToolContext {workspaceId:string;notebookId:string;services:{runtime:RuntimeClient;inspectAsset:(name:string)=>void};caseStudy:CaseStudy;assets:Asset[];runs:Execution[];selectedStep:string;onSelectStep:(id:string)=>void;onRunWorkflow:()=>void;busy:boolean}
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
function LakehouseEvidence({context}:{context:ToolContext}){
 const [overview,setOverview]=useState<LakehouseOverview>();
 useEffect(()=>{let live=true;context.services.runtime.lakehouse(context.workspaceId).then(value=>{if(live)setOverview(value)}).catch(()=>{if(live)setOverview(undefined)});return()=>{live=false}},[context.services.runtime,context.workspaceId,context.assets]);
 if(!overview?.active)return <div className="notice">DuckLake evidence is unavailable in this workspace. Plain DuckDB/SQLite modes remain valid compatibility modes.</div>;
 const latest=overview.snapshots[0];
 const advisory=overview.tables.filter(t=>t.compaction_advisory!=='none');
 return <section><h2>DuckLake storage evidence</h2><p>Measured from DuckLake metadata. Small-file advice is educational only; no compaction runs automatically.</p><div className="brief-stats"><div><span>Latest snapshot</span><b>{latest?latest.snapshot_id:'—'}</b></div><div><span>Snapshots shown</span><b>{overview.snapshots.length}</b></div><div><span>Compaction candidates</span><b>{advisory.length}</b></div></div>{advisory.length>0&&<div className="notice">{advisory.length} table{advisory.length===1?'':'s'} currently meet the Datapass small-file heuristic. The corresponding DuckLake maintenance capability is <code>{overview.maintenance_capability}</code>; Datapass has not executed it.</div>}<div className="contract-list">{overview.tables.slice(0,8).map(table=><div key={table.name}><b>{table.name}</b><span>{table.file_count} files · {formatStorageBytes(table.size_bytes)} · avg {formatStorageBytes(table.average_file_size_bytes)}</span><span>{table.small_file_count} under 8 MiB · {table.delete_file_count} delete files</span><span>{table.partitioning?.partitioned?'Partitioned by '+table.partitioning.columns.map(col=>col.column+' ('+col.transform+')').join(', '):'Unpartitioned'}</span></div>)}</div></section>;
}
export function CatalogSurface({context,onInspect}:{context:ToolContext;onInspect:(name:string)=>void}){
 return <div className="surface-page"><div className="section-eyebrow">SHARED WORKSPACE CATALOG</div><h1>The same data in every tool</h1><p className="lead">Publish a table in one notebook and query it from another module. A new upstream version makes dependent assets stale. DuckLake tables also expose measured Parquet file evidence.</p><div className="asset-grid">{context.assets.map(a=><button className="asset-card" key={a.name} onClick={()=>onInspect(a.name)}><div><Badge appearance="tint" color={a.fresh?'success':'warning'}>{a.fresh?'fresh':'stale'}</Badge><span>{a.layer}</span></div><h3>{a.name}</h3><b>{a.row_count.toLocaleString()} rows</b>{a.storage&&<small>{a.storage.file_count} Parquet file{a.storage.file_count===1?'':'s'} · {formatStorageBytes(a.storage.size_bytes)}{a.storage.snapshot_id!==null?' · snapshot '+a.storage.snapshot_id:''}{a.storage.small_file_count!==undefined?' · '+a.storage.small_file_count+' small':''}{a.storage.partitioning?.partitioned?' · partitioned':''}</small>}<p>{a.producer??'No producer recorded'}</p><small>{Object.keys(a.inputs??{}).join(' + ')||'Independent source'}</small></button>)}</div><LakehouseEvidence context={context}/></div>;
}
export function ReportSurface({context}:{context:ToolContext}){
 const report=[...context.runs].reverse().find(r=>r.cell_id==='report'&&r.status==='success');
 return <div className="surface-page"><div className="section-eyebrow">POWER BI LEARNING / SQL-BACKED KPI</div><h1>Revenue overview</h1><p className="lead">The report consumes the Gold table. This foundation is not a DAX evaluation engine or a Power BI embedded report.</p>{report?.result?<>{!isExecutionFresh(report,context.assets)&&<p className="notice">Historical result: upstream data changed or provenance is unavailable. Rerun the KPI step.</p>}<div className="metric-row report-metrics">{Object.entries(report.result.rows[0]??{}).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><b>{typeof value==='number'?value.toLocaleString():String(value)}</b></div>)}</div><DataTable result={report.result}/></>:<div className="empty-state"><h2>Run the KPI step to create this preview</h2><p>Do not substitute sample cards for uncomputed results.</p><Button onClick={()=>context.onSelectStep('report')}>Open KPI step</Button></div>}<h2>Next specialist boundary</h2><p>The uploaded Power BI Studio contains its own DAX, model and reporting lessons. Migrate those as a semantic-model module that reads root assets; do not recreate the data store or notebook engine.</p></div>;
}

function SparkRunSurface({context}:{context:ToolContext}) {
 const run=[...context.runs].reverse().find(r=>r.language==='sparklab'&&r.simulation);
 return <div className="surface-page"><h1>SparkLab run evidence</h1>{run?.simulation?<SparkInspector simulation={run.simulation}/>:<p>Run a SparkLab cell to inspect its plan and virtual stages.</p>}</div>;
}
