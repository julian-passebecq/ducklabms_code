import {SparkInspector} from './SparkInspector';
import {isExecutionFresh,requireModuleCompatibility} from '../../../packages/contracts/src/index.ts';
import {useEffect,useState,type ReactNode} from 'react';
import type {AirflowDispatch,AirflowRemoteCapabilities,AirflowRunResult,AirflowRunStatus,Asset,CaseStudy,Execution,LakehouseOverview,ModuleManifest,RuntimeClient,SparkRemoteCapabilities,SparkRemoteDispatch,SparkRemoteResult,SparkRemoteRunStatus} from '../../../packages/contracts/src/index.ts';
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
 'fabric-notebook':['brief','catalog'],
 warehouse:['brief','catalog'],dbt:['brief','graph','catalog'],airflow:['brief','graph'],
 'power-bi':['brief','report','catalog'],'databricks-notebook':['brief','catalog'],
 'polars-notebook':['brief','catalog'],sparklab:['brief','graph','catalog'],
};
export function buildRegistry(manifests:ModuleManifest[]):Map<string,ToolPlugin>{
 return new Map(manifests.map(manifest=>{
  requireModuleCompatibility(manifest);
  const mapped=(modulePanels[manifest.id]??['brief']).map(id=>{
   if(manifest.id==='sparklab'&&id==='graph')return {id,render:(context:ToolContext)=><SparkRunSurface context={context}/>} as ToolPanel;
   if(manifest.id==='airflow'&&id==='graph')return {id,render:(context:ToolContext)=><AirflowSurface context={context}/>} as ToolPanel;
   return panels[id];
  });
  return [manifest.id,{manifest,description:manifest.status==='foundation'?'Shared foundation; specialist migration is bounded by the module contract.':'',panels:mapped}];
 }));
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
function airflowIdentifier(value:string):string {
 const normalized=value.replace(/[^A-Za-z0-9_]/g,'_');
 return /^[A-Za-z_]/.test(normalized)?normalized:'dag_'+normalized;
}
function defaultAirflowDag(caseStudy:CaseStudy):string {
 const dagId='datapass_'+airflowIdentifier(caseStudy.id);
 const tasks=caseStudy.steps.map(step=>{
  const fn=airflowIdentifier(step.id);
  return `    @task
    def ${fn}():
        return "${step.id}"

    ${fn}_task = ${fn}()
`;
 }).join('\n');
 const dependencies=caseStudy.steps.flatMap(step=>step.depends_on.map(parent=>`    ${airflowIdentifier(parent)}_task >> ${airflowIdentifier(step.id)}_task`)).join('\n');
 return `from airflow.sdk import dag, task

@dag(dag_id="${dagId}", schedule=None, catchup=False)
def ${dagId}():
${tasks}
${dependencies||'    pass'}

${dagId}()
`;
}
function AirflowSurface({context}:{context:ToolContext}){
 const dagId='datapass_'+airflowIdentifier(context.caseStudy.id);
 const [capabilities,setCapabilities]=useState<AirflowRemoteCapabilities>();
 const [source,setSource]=useState(()=>defaultAirflowDag(context.caseStudy));
 const [dispatch,setDispatch]=useState<AirflowDispatch>();
 const [status,setStatus]=useState<AirflowRunStatus>();
 const [result,setResult]=useState<AirflowRunResult>();
 const [remoteBusy,setRemoteBusy]=useState(false);
 const [remoteError,setRemoteError]=useState('');
 useEffect(()=>{setSource(defaultAirflowDag(context.caseStudy));setDispatch(undefined);setStatus(undefined);setResult(undefined);setRemoteError('')},[context.caseStudy.id]);
 useEffect(()=>{let live=true;context.services.runtime.airflowCapabilities().then(value=>{if(live)setCapabilities(value)}).catch(error=>{if(live)setRemoteError(String(error))});return()=>{live=false}},[context.services.runtime]);
 useEffect(()=>{
  const runId=dispatch?.run_id;if(!runId)return;
  let live=true,timer:number|undefined;
  const poll=async()=>{
   try{
    const current=await context.services.runtime.airflowStatus(runId);if(!live)return;setStatus(current);
    if(current.status==='completed'){
     const finished=await context.services.runtime.airflowResult(runId,dispatch.request_id);if(live){setResult(finished);setRemoteBusy(false)}
    }else timer=window.setTimeout(poll,2000);
   }catch(error){if(live){setRemoteError(String(error));setRemoteBusy(false)}}
  };
  void poll();
  return()=>{live=false;if(timer)window.clearTimeout(timer)};
 },[context.services.runtime,dispatch?.run_id,dispatch?.request_id]);
 const runRemote=async()=>{
  if(!capabilities?.enabled)return;
  setRemoteBusy(true);setRemoteError('');setResult(undefined);setStatus(undefined);
  try{
   const accepted=await context.services.runtime.airflowDispatch({dag_id:dagId,logical_date:'2026-01-01T00:00:00+00:00',source});
   setDispatch(accepted);
   if(!accepted.run_id)throw new Error('GitHub accepted the dispatch but did not return a run id. Retry after the workflow is on the default branch.');
  }catch(error){setRemoteBusy(false);setRemoteError(String(error))}
 };
 return <div className="surface-page airflow-surface">
  <div className="surface-title"><div><div className="section-eyebrow">REAL AIRFLOW 3 / GITHUB ACTIONS</div><h1>{context.caseStudy.title}</h1></div><Button appearance="primary" onClick={()=>void runRemote()} disabled={!capabilities?.enabled||remoteBusy}>{remoteBusy?'Running…':'Run on GitHub'}</Button></div>
  <p className="lead">Datapass renders the DAG in Fluent UI. When launched, the Dag is executed by real Airflow {capabilities?.airflow_version??'3'} on an ephemeral GitHub-hosted runner; this is not a persistent scheduler.</p>
  {capabilities&&!capabilities.enabled&&<p className="notice">{capabilities.truth}. Configure the FastAPI server with a fine-grained GitHub token that has Actions write permission.</p>}
  {capabilities?.public_repo&&<p className="notice">{capabilities.privacy}</p>}
  {remoteError&&<p className="error-output">{remoteError}</p>}
  <div className="airflow-run-strip"><Badge appearance="tint" color={result?.status==='success'?'success':result?.status==='failed'?'danger':'informative'}>{result?result.status.toUpperCase():status?.status?.toUpperCase()??'NOT RUN'}</Badge><span>{dagId}</span>{dispatch?.run_id&&<span>GitHub run {dispatch.run_id}</span>}{result&&<span>Airflow {result.airflow_version}</span>}</div>
  <h2>DAG graph</h2>
  <div className="pipeline-flow">{context.caseStudy.steps.map((step,i)=><div className="pipeline-group" key={step.id}><button className="pipeline-node" onClick={()=>context.onSelectStep(step.id)}><div className="node-top"><span>{String(i+1).padStart(2,'0')}</span><Badge appearance="tint">{step.id}</Badge></div><h3>{step.title}</h3><small>Upstream: {step.depends_on.join(', ')||'none'}</small></button></div>)}</div>
  <h2>Dag source</h2>
  <p>Editable educational source sent to the isolated runner. Never put passwords, tokens, customer data or private code here when the execution repository is public.</p>
  <textarea className="airflow-source" value={source} onChange={event=>setSource(event.target.value)} spellCheck={false}/>
  {result&&<><h2>Real run evidence</h2><div className="brief-stats"><div><span>Execution</span><b>{result.execution_mode}</b></div><div><span>Runner</span><b>{result.runner}</b></div><div><span>Persistent scheduler</span><b>{String(result.persistent_scheduler)}</b></div></div><div className="tag-row">{result.tasks.map(task=><Badge key={task} appearance="tint">{task}</Badge>)}</div><h2>Airflow log</h2><pre className="airflow-log">{result.log||'No log was returned.'}</pre>{result.run_url&&<p><a href={result.run_url} target="_blank" rel="noreferrer">Open GitHub Actions run</a></p>}<p className="notice">{result.truth}</p></>}
 </div>;
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
 const step=(run&&context.caseStudy.steps.find(item=>item.id===run.cell_id&&item.language==='sparklab'))??context.caseStudy.steps.find(item=>item.language==='sparklab');
 const [capabilities,setCapabilities]=useState<SparkRemoteCapabilities>();
 const [dispatch,setDispatch]=useState<SparkRemoteDispatch>();
 const [status,setStatus]=useState<SparkRemoteRunStatus>();
 const [real,setReal]=useState<SparkRemoteResult>();
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{let live=true;context.services.runtime.sparkRemoteCapabilities().then(value=>{if(live)setCapabilities(value)}).catch(err=>{if(live)setError(String(err))});return()=>{live=false}},[context.services.runtime]);
 useEffect(()=>{
  const runId=dispatch?.run_id;if(!runId)return;
  let live=true,timer:number|undefined;
  const poll=async()=>{
   try{
    const current=await context.services.runtime.sparkRemoteStatus(context.workspaceId,runId);if(!live)return;setStatus(current);
    if(current.status==='completed'){
     const result=await context.services.runtime.sparkRemoteResult(context.workspaceId,runId,dispatch.request_id);
     if(live){setReal(result);setBusy(false)}
    }else timer=window.setTimeout(poll,2500);
   }catch(err){if(live){setError(String(err));setBusy(false)}}
  };
  void poll();
  return()=>{live=false;if(timer)window.clearTimeout(timer)};
 },[context.services.runtime,context.workspaceId,dispatch?.run_id,dispatch?.request_id]);
 const verify=async()=>{
  if(!step||!capabilities?.enabled)return;
  setBusy(true);setError('');setDispatch(undefined);setStatus(undefined);setReal(undefined);
  try{
   const accepted=await context.services.runtime.sparkRemoteDispatch(context.workspaceId,{notebook_id:context.notebookId,code:step.code,collect_limit:100});
   setDispatch(accepted);
  }catch(err){setError(String(err));setBusy(false)}
 };
 const metrics=real?.metrics;
 return <div className="surface-page">
  <div className="surface-title"><div><div className="section-eyebrow">SPARKLAB + REAL SPARK ORACLE</div><h1>Spark execution evidence</h1></div><Button appearance="primary" onClick={()=>void verify()} disabled={!run?.simulation||!step||!capabilities?.enabled||busy}>{busy?'Verifying…':'Verify on real Spark'}</Button></div>
  <p className="lead">SparkLab stays instant and simulated for distributed behavior. Verification runs the canonical case step on genuine Apache Spark {capabilities?.spark_version??'4.2.0'} in <code>{capabilities?.master??'local[4]'}</code> on one ephemeral GitHub VM.</p>
  {capabilities&&!capabilities.enabled&&<p className="notice">{capabilities.truth}</p>}
  {capabilities?.public_repo&&<p className="notice">{capabilities.privacy}</p>}
  {step&&<p className="notice">Remote verification currently uses the canonical case source for <b>{step.id}</b>. Edited ad-hoc notebook source is not silently uploaded.</p>}
  {error&&<p className="error-output">{error}</p>}
  {dispatch&&<div className="airflow-run-strip"><Badge appearance="tint" color={real?.status==='success'?'success':real?.status==='failed'?'danger':'informative'}>{real?('REAL SPARK '+real.status.toUpperCase()):(status?.status?.toUpperCase()??'QUEUED')}</Badge><span>GitHub run {dispatch.run_id}</span><span>{dispatch.sources?.join(', ')}</span></div>}
  {run?.simulation?<SparkInspector simulation={run.simulation}/>:<p>Run a SparkLab cell to inspect its plan and virtual stages.</p>}
  {real&&<section className="real-spark-evidence"><h2>Real Spark oracle</h2><div className="tag-row"><Badge appearance="tint" color="success">REAL APACHE SPARK {real.spark_version}</Badge><Badge appearance="tint">SINGLE HOST {real.master}</Badge><Badge appearance="tint">{real.runner}</Badge></div><div className="brief-stats"><div><span>Stages</span><b>{metrics?.stage_count??0}</b></div><div><span>Tasks</span><b>{metrics?.task_count??0}</b></div><div><span>Shuffle read</span><b>{formatStorageBytes(metrics?.shuffle_read_bytes??0)}</b></div><div><span>Shuffle write</span><b>{formatStorageBytes(metrics?.shuffle_write_bytes??0)}</b></div></div><p className="notice">{real.truth}. {metrics?.truth}</p><h3>Real result</h3><DataTable result={{columns:real.columns,rows:real.rows,total_rows:real.total_rows,truncated:real.truncated}}/><details><summary>Physical plan</summary><pre className="airflow-log">{real.physical_plan}</pre></details><details><summary>Formatted explain</summary><pre className="airflow-log">{real.formatted_plan}</pre></details><details><summary>Runner log</summary><pre className="airflow-log">{real.log}</pre></details>{real.run_url&&<p><a href={real.run_url} target="_blank" rel="noreferrer">Open GitHub Actions Spark run</a></p>}</section>}
 </div>;
}
