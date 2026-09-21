import {useCallback,useEffect,useRef,useState} from 'react';
import type {ArtifactBundle} from '../../../../../packages/contracts/src/analytics.ts';
import type {Resource} from '../../../../../packages/contracts/src/foundation.ts';
import type {LocalJob,LocalStart,LocalCapabilities,DbtAction} from '../../../../../packages/contracts/src/local.ts';
import {jobFinished} from '../../../../../packages/contracts/src/local.ts';
import {importManifest,attachRunResults} from '../analytics/dbt';
import type {ResourceServices} from './ResourceHost';

/** Pane state holds only a selected run ID. Rows/artifacts are read from the workspace. */
export function useLocalRuns(resource:Resource,services:ResourceServices) {
 const [runs,setRuns]=useState<LocalJob[]>([]),[job,setJob]=useState<LocalJob|null>(null),[error,setError]=useState(''),[starting,setStarting]=useState(false);
 const [selected,setSelected]=useState('');const epoch=useRef(0),selection=useRef(''),current=useRef(resource),finished=useRef(new Set<string>());
 current.current=resource;selection.current=selected;
 useEffect(()=>{
  const version=++epoch.current;let timer:ReturnType<typeof setTimeout>;let disposed=false;
  setRuns([]);setJob(null);setSelected('');setError('');setStarting(false);
  const poll=async()=>{
   try{const list=await services.api.localJobs(services.workspaceId,resource.id);if(disposed||version!==epoch.current)return;setRuns(list);
    const id=list.some(r=>r.id===selection.current)?selection.current:list[0]?.id;
    if(id){const next=await services.api.localJob(services.workspaceId,id);if(disposed||version!==epoch.current)return;setJob(next);
     if(jobFinished(next)&&!finished.current.has(next.id)){finished.current.add(next.id);await services.refresh();}
    }else setJob(null);
   }catch(e){if(!disposed&&version===epoch.current)setError(String(e));}
   finally{if(!disposed)timer=setTimeout(poll,2000);}
  };
  if(['dbt-project','pipeline','chart-board','exercise'].includes(resource.kind))void poll();return()=>{disposed=true;++epoch.current;clearTimeout(timer)};
 },[services.workspaceId,resource.id,services.api]);
 const choose=async(id:string)=>{setSelected(id);selection.current=id;const version=epoch.current;try{const value=await services.api.localJob(services.workspaceId,id);if(version===epoch.current)setJob(value)}catch(e){if(version===epoch.current)setError(String(e))}};
 const start=async(run:(body:LocalStart)=>Promise<LocalJob>)=>{
  const version=epoch.current,sourceRevision=current.current.revision,owner=services.workspaceId,id=resource.id;
  setStarting(true);setError('');
  try{
   await services.save();if(version!==epoch.current)return;
   const saved=await services.api.workspace(owner);if(version!==epoch.current)return;
   const checkpoint=saved.workbench?.resources.find(r=>r.id===id);
   if(!checkpoint||checkpoint.revision!==sourceRevision||current.current.revision!==sourceRevision)throw new Error('The resource changed while saving. Review it and run again.');
   const value=await run({resource_id:id,resource_revision:checkpoint.revision,workspace_revision:saved.revision});
   if(version!==epoch.current)return;setSelected(value.id);selection.current=value.id;setJob(value);setRuns(old=>[value,...old.filter(r=>r.id!==value.id)]);
  }catch(e){if(version===epoch.current)setError(String(e))}finally{if(version===epoch.current)setStarting(false)}
 };
 const cancel=async()=>{if(!job)return;const version=epoch.current;try{const value=await services.api.cancelLocalJob(services.workspaceId,job.id);if(version===epoch.current)setJob(value)}catch(e){if(version===epoch.current)setError(String(e))}};
 return {runs,job,error,setError,starting,start,choose,cancel,busy:starting||runs.some(r=>!jobFinished(r))||!!job&&!jobFinished(job)};
}
export type LocalRunController=ReturnType<typeof useLocalRuns>;
export function LocalRunEvidence({controller,revision}:{controller:LocalRunController;revision:number}) {
 const {job,runs,error}=controller;
 return <section className="dp-runtime-evidence" aria-label="Workspace local execution evidence">
 {error&&<p role="alert" className="an-error">{error}</p>}
 {!!runs.length&&<label>Run history <select aria-label="Select local run" value={job?.id??''} onChange={e=>void controller.choose(e.target.value)}>{runs.map(r=><option key={r.id} value={r.id}>{r.action} / {r.status} / {r.created_at.slice(11,19)} / revision {r.resource_revision}</option>)}</select></label>}
 {job&&<><div className="an-actions"><strong>{job.status}</strong><span className="an-badge">{job.truth==='real_local'?'Real local execution':'No local execution proven'}</span><code>{job.id.slice(0,12)}</code>{!jobFinished(job)&&<button onClick={()=>void controller.cancel()}>Cancel local run</button>}{job.resource_revision!==revision&&<span className="an-warning">Historical revision {job.resource_revision}; current draft is {revision}.</span>}</div>
 {job.error&&<p role="alert" className="an-error">{job.error}</p>}
 <details><summary>Logs and provenance ({Math.round(job.elapsed_ms)} ms{job.log_truncated?', log truncated':''})</summary><pre className="dp-log">{job.log||'No stdout/stderr captured.'}</pre><pre>{JSON.stringify(job.runtime,null,2)}</pre><p>Source checkpoint: <code>{job.source_hash}</code>. Completed writes survive cancellation; reruns are explicit.</p></details>
 {!!job.steps?.length&&<table className="dp-task-runs"><thead><tr><th>Task</th><th>Status</th><th>Attempts</th><th>Elapsed</th></tr></thead><tbody>{job.steps.map(t=><tr key={t.id}><td>{t.id}</td><td>{t.status}{t.error&&<small>{t.error}</small>}</td><td>{t.attempts?.length??0}</td><td>{Math.round(t.elapsed_ms)} ms</td></tr>)}</tbody></table>}
 </>}
 </section>;
}
export interface VerifiedDbtEvidence {bundle:ArtifactBundle;runId:string;resourceRevision:number;stale:boolean}
export function DbtExecution({resource,services,disabled,controller,onEvidence}:{resource:Resource;services:ResourceServices;disabled:boolean;controller:LocalRunController;onEvidence:(value:VerifiedDbtEvidence|undefined)=>void}) {
 const [caps,setCaps]=useState<LocalCapabilities|null>(null),[action,setAction]=useState<DbtAction>('build'),[selector,setSelector]=useState(''),[show,setShow]=useState(true);
 const {job}=controller;
 useEffect(()=>{let alive=true;void services.api.localCapabilities(services.workspaceId).then(value=>{if(alive)setCaps(value)},e=>{if(alive)controller.setError(String(e))});return()=>{alive=false}},[services.api,services.workspaceId]);
 useEffect(()=>{let alive=true;onEvidence(undefined);
  if(show&&job&&jobFinished(job)&&job.truth==='real_local'&&job.artifacts.manifest){
   const id=job.id;
   void (async()=>{try{
    let bundle=importManifest(JSON.stringify(await services.api.localArtifact(services.workspaceId,id,'manifest')));
    if(job.artifacts.run_results)bundle=attachRunResults(bundle,JSON.stringify(await services.api.localArtifact(services.workspaceId,id,'run_results')));
    if(job.result?.invocation_id&&bundle.invocationId!==job.result.invocation_id)throw new Error('Local artifact invocation identity mismatch.');
    if(alive)onEvidence({bundle,runId:id,resourceRevision:job.resource_revision,stale:job.resource_revision!==resource.revision});
   }catch(e){if(alive)controller.setError('Artifact qualification failed: '+String(e))}})();
  }
  return()=>{alive=false};
 },[job?.id,job?.status,job?.finished_at,show,services.workspaceId,services.api,onEvidence]);
 return <section className="dp-run-controls" aria-label="Local dbt runner"><div className="an-actions"><label>Action <select aria-label="dbt action" value={action} onChange={e=>setAction(e.target.value as DbtAction)}>{(['parse','compile','seed','run','build','test'] as DbtAction[]).map(a=><option key={a}>{a}</option>)}</select></label><label>Selection <input aria-label="dbt selection" value={selector} maxLength={200} disabled={action==='parse'} placeholder="Optional: +fct_sales" onChange={e=>setSelector(e.target.value)}/></label><button disabled={disabled||controller.busy||!caps?.dbt.available} onClick={()=>void controller.start(body=>services.api.runDbt(services.workspaceId,{...body,action,select:action==='parse'?'':selector}))}>Run dbt {action}</button><label><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Inspect selected local artifacts</label></div>
 <p className={caps?.dbt.available?'an-note':'an-warning'}>{caps?(caps.dbt.available?`${caps.dbt.target}. ${caps.dbt.warning}`:caps.dbt.reason):'Checking the local dbt capability...'}</p><LocalRunEvidence controller={controller} revision={resource.revision}/></section>;
}
