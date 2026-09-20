import type {RootWorkbench} from '../../../packages/contracts/src/foundation.ts';
import type {AirflowDispatch,AirflowDispatchRequest,AirflowRemoteCapabilities,AirflowRunResult,AirflowRunStatus,Asset,Capabilities,CaseStudy,ExecuteRequest,Execution,LakehouseOverview,ModuleManifest,Profile,RuntimeClient,SparkRemoteCapabilities,SparkRemoteDispatch,SparkRemoteDispatchRequest,SparkRemoteResult,SparkRemoteRunStatus,WorkflowResult,Workspace,ExerciseDefinition,ExerciseRequest,ExerciseResult,ExerciseAttempt,PracticeReview,PracticeProgress} from '../../../packages/contracts/src/index.ts';
import type {RootNotebook} from './notebook';

const STORAGE='datapass-local-token';
export function initialToken():string {
 const hash=new URLSearchParams(location.hash.slice(1));
 const fresh=hash.get('token');
 if(fresh){try{sessionStorage.setItem(STORAGE,fresh)}catch{}history.replaceState(null,'',location.pathname+location.search);return fresh}
 try{return sessionStorage.getItem(STORAGE)??''}catch{return ''}
}
export class ApiClient implements RuntimeClient {
 constructor(public token:string){}
 async request<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`,...options.headers}});
  const data=await response.json();
  if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail??data));
  return data as T;
 }
 cases=()=>this.request<CaseStudy[]>('/cases');
 progress=(id:string)=>this.request<PracticeProgress>(`/workspaces/${id}/practice/progress`);
 exercises=()=>this.request<ExerciseDefinition[]>('/exercises');
 solution=(id:string)=>this.request<{source:string;exercise_version:string}>(`/exercises/${encodeURIComponent(id)}/solution`,{method:'POST'});
 attempts=(id:string)=>this.request<ExerciseAttempt[]>(`/workspaces/${id}/attempts`);
 exercise=(id:string,request:ExerciseRequest)=>this.request<ExerciseResult>(`/workspaces/${id}/exercise`,{method:'POST',body:JSON.stringify(request)});
 review=(id:string,exercise:string,revision:number,metadata:PracticeReview)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}/practice/${encodeURIComponent(exercise)}/review`,{method:'PUT',body:JSON.stringify({revision,...metadata})});
 modules=()=>this.request<ModuleManifest[]>('/modules');
 profiles=()=>this.request<Profile[]>('/profiles');
 workspaces=()=>this.request<Array<Pick<Workspace,'id'|'case_id'|'title'|'revision'|'updated_at'>>>('/workspaces');
 create=(case_id:string|null,title?:string)=>this.request<Workspace<RootNotebook>>('/workspaces',{method:'POST',body:JSON.stringify({case_id,title})});
 workspace=(id:string)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}`);
 save=(id:string,revision:number,notebook:RootNotebook)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}/notebook`,{method:'PUT',body:JSON.stringify({revision,notebook})});
 validateWorkbench=(id:string,workbench:unknown)=>this.request<{status:'valid';truth:'design_only';workbench:RootWorkbench}>(`/workspaces/${id}/workbench/validate`,{method:'POST',body:JSON.stringify(workbench)});
 saveWorkbench=(id:string,revision:number,workbench:RootWorkbench)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}/workbench`,{method:'PUT',body:JSON.stringify({revision,workbench})});
 foundationSchema=()=>this.request<Record<string,unknown>>('/foundation/schema');
 catalog=(id:string)=>this.request<Asset[]>(`/workspaces/${id}/catalog`);
 lakehouse=(id:string)=>this.request<LakehouseOverview>(`/workspaces/${id}/lakehouse`);
 airflowCapabilities=()=>this.request<AirflowRemoteCapabilities>('/airflow/capabilities');
 airflowDispatch=(request:AirflowDispatchRequest)=>this.request<AirflowDispatch>('/airflow/runs',{method:'POST',body:JSON.stringify(request)});
 airflowStatus=(runId:number)=>this.request<AirflowRunStatus>(`/airflow/runs/${runId}`);
 airflowResult=(runId:number,requestId:string)=>this.request<AirflowRunResult>(`/airflow/runs/${runId}/result/${encodeURIComponent(requestId)}`);
 sparkRemoteCapabilities=()=>this.request<SparkRemoteCapabilities>('/spark/remote/capabilities');
 sparkRemoteDispatch=(id:string,request:SparkRemoteDispatchRequest)=>this.request<SparkRemoteDispatch>(`/workspaces/${id}/spark/remote`,{method:'POST',body:JSON.stringify(request)});
 sparkRemoteStatus=(id:string,jobId:string)=>this.request<SparkRemoteRunStatus>(`/workspaces/${id}/spark/remote/${encodeURIComponent(jobId)}`);
 sparkRemoteResult=(id:string,jobId:string,requestId:string)=>this.request<SparkRemoteResult>(`/workspaces/${id}/spark/remote/${encodeURIComponent(jobId)}/result/${encodeURIComponent(requestId)}`);
 capabilities=(id:string)=>this.request<Capabilities>(`/workspaces/${id}/capabilities`);
 execute=(id:string,request:ExecuteRequest)=>this.request<Execution>(`/workspaces/${id}/execute`,{method:'POST',body:JSON.stringify(request)});
 workflow=(id:string,notebook_id:string,overrides:Record<string,string>,profile:string,aqe:boolean)=>this.request<WorkflowResult>(`/workspaces/${id}/workflow`,{method:'POST',body:JSON.stringify({notebook_id,overrides,profile,aqe})});
 check=(id:string)=>this.request<Record<string,import('../../../packages/contracts/src/index.ts').Check>>(`/workspaces/${id}/check`,{method:'POST'});
 restart=(id:string)=>this.request(`/workspaces/${id}/restart`,{method:'POST'});
}
