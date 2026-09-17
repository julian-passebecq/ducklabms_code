import type {Asset,Capabilities,CaseStudy,ExecuteRequest,Execution,ModuleManifest,Profile,RuntimeClient,WorkflowResult,Workspace} from '../../../packages/contracts/src/index.ts';
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
 modules=()=>this.request<ModuleManifest[]>('/modules');
 profiles=()=>this.request<Profile[]>('/profiles');
 workspaces=()=>this.request<Array<Pick<Workspace,'id'|'case_id'|'title'|'revision'|'updated_at'>>>('/workspaces');
 create=(case_id:string)=>this.request<Workspace<RootNotebook>>('/workspaces',{method:'POST',body:JSON.stringify({case_id})});
 workspace=(id:string)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}`);
 save=(id:string,revision:number,notebook:RootNotebook)=>this.request<Workspace<RootNotebook>>(`/workspaces/${id}/notebook`,{method:'PUT',body:JSON.stringify({revision,notebook})});
 catalog=(id:string)=>this.request<Asset[]>(`/workspaces/${id}/catalog`);
 capabilities=(id:string)=>this.request<Capabilities>(`/workspaces/${id}/capabilities`);
 execute=(id:string,request:ExecuteRequest)=>this.request<Execution>(`/workspaces/${id}/execute`,{method:'POST',body:JSON.stringify(request)});
 workflow=(id:string,notebook_id:string,overrides:Record<string,string>,profile:string,aqe:boolean)=>this.request<WorkflowResult>(`/workspaces/${id}/workflow`,{method:'POST',body:JSON.stringify({notebook_id,overrides,profile,aqe})});
 check=(id:string)=>this.request<Record<string,import('../../../packages/contracts/src/index.ts').Check>>(`/workspaces/${id}/check`,{method:'POST'});
 restart=(id:string)=>this.request(`/workspaces/${id}/restart`,{method:'POST'});
}
