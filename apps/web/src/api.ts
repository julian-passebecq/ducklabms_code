import type {RootWorkbench} from '../../../packages/contracts/src/foundation.ts';
import type {Asset,Capabilities,CaseStudy,ExecuteRequest,Execution,ModuleManifest,Profile,RuntimeClient,WorkflowResult,Workspace,ExerciseDefinition,ExerciseRequest,ExerciseResult,ExerciseAttempt,PracticeReview,PracticeProgress,DuckLakeSnapshot,LakehouseTableEvidence,LakehouseSnapshotPreview,LakehouseCompactionResult} from '../../../packages/contracts/src/index.ts';
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
 create=(case_id:string|null)=>this.request<Workspace<RootNotebook>>('/workspaces',{method:'POST',body:JSON.stringify({case_id})});
 workspace=(id:string)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}`);
 save=(id:string,revision:number,notebook:RootNotebook)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}/notebook`,{method:'PUT',body:JSON.stringify({revision,notebook})});
 validateWorkbench=(id:string,workbench:unknown)=>this.request<{status:'valid';truth:'design_only';workbench:RootWorkbench}>(`/workspaces/${id}/workbench/validate`,{method:'POST',body:JSON.stringify(workbench)});
 saveWorkbench=(id:string,revision:number,workbench:RootWorkbench)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}/workbench`,{method:'PUT',body:JSON.stringify({revision,workbench})});
 foundationSchema=()=>this.request<Record<string,unknown>>('/foundation/schema');
 catalog=(id:string)=>this.request<Asset[]>(`/workspaces/${id}/catalog`);
 private lakehousePath(asset:string){
  const [layer,table,...extra]=asset.split('.');
  if(!layer||!table||extra.length)throw new Error('Expected a layer.table asset name.');
  return `${encodeURIComponent(layer)}/${encodeURIComponent(table)}`;
 }
 lakehouseSnapshots=(id:string,limit=30)=>this.request<DuckLakeSnapshot[]>(`/workspaces/${id}/lakehouse/snapshots?limit=${limit}`);
 lakehouseTable=(id:string,asset:string)=>this.request<LakehouseTableEvidence>(`/workspaces/${id}/lakehouse/tables/${this.lakehousePath(asset)}`);
 lakehouseSnapshot=(id:string,asset:string,snapshotId:number,limit=50)=>this.request<LakehouseSnapshotPreview>(`/workspaces/${id}/lakehouse/tables/${this.lakehousePath(asset)}/snapshots/${snapshotId}?limit=${limit}`);
 compactLakehouseTable=(id:string,asset:string)=>this.request<LakehouseCompactionResult>(`/workspaces/${id}/lakehouse/tables/${this.lakehousePath(asset)}/compact`,{method:'POST'});
 capabilities=(id:string)=>this.request<Capabilities>(`/workspaces/${id}/capabilities`);
 execute=(id:string,request:ExecuteRequest)=>this.request<Execution>(`/workspaces/${id}/execute`,{method:'POST',body:JSON.stringify(request)});
 workflow=(id:string,notebook_id:string,overrides:Record<string,string>,profile:string,aqe:boolean)=>this.request<WorkflowResult>(`/workspaces/${id}/workflow`,{method:'POST',body:JSON.stringify({notebook_id,overrides,profile,aqe})});
 check=(id:string)=>this.request<Record<string,import('../../../packages/contracts/src/index.ts').Check>>(`/workspaces/${id}/check`,{method:'POST'});
 restart=(id:string)=>this.request(`/workspaces/${id}/restart`,{method:'POST'});
}
