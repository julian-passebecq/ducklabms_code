/** Idempotent, additive M2 migration. Original notebook attachments remain recovery copies.
 * No save is performed here: Documents' workspace CAS must acknowledge this draft first.
 */
import type {Workspace} from '../../../../packages/contracts/src/index.ts';
import type {Resource,RootWorkbench,ResourceMigration,DbtProjectResource,ModelDesignResource,ChartBoardResource,ViewInstance} from '../../../../packages/contracts/src/foundation.ts';
import {assertWorkbench,emptyWorkbench,openResource,newId,replaceResource,patchView} from '../../../../packages/contracts/src/workbench.ts';
import type {RootNotebook} from '../notebook.ts';
import {LAB_KEY,newProject,validateProject,defaultSession} from '../studio/analytics/project.ts';
import type {LabProject,Layer} from '../studio/analytics/types.ts';

export const studioUI = () => ({theme:'fluent' as const,skin:'studio' as const,explorer_open:true,context_open:false});
export function stableJson(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stableJson(v)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
/** Non-security identity hint. Dedupe always compares complete canonical content. */
export function fingerprint(value:unknown):string {let h=14695981039346656037n;for(const c of stableJson(value)){h=BigInt.asUintN(64,(h^BigInt(c.codePointAt(0)!))*1099511628211n)}return h.toString(16)}
function content(r:Resource):unknown {
 switch(r.kind){case 'dbt-project':return {files:r.files,artifacts:r.artifacts};case 'model-design':return {model:r.model,scd:r.scd};case 'chart-board':return {board:r.board};default:return r}
}
function intern(state:RootWorkbench,resource:Resource):string {
 const text=stableJson(content(resource));const existing=state.resources.find(r=>r.kind===resource.kind&&stableJson(content(r))===text);
 if(existing)return existing.id;
 let id=`${resource.kind}-${fingerprint(content(resource))}`,i=1;
 while(state.resources.some(r=>r.id===id))id=`${resource.kind}-${fingerprint(content(resource))}-${i++}`;
 state.resources.push({...resource,id});return id;
}
export function addAnalyticsProject(state:RootWorkbench,project:LabProject):{document:RootWorkbench;refs:Record<string,string>} {
 const next=structuredClone(state),base={schema_version:1 as const,id:'pending',title:project.title,revision:0};
 const dbt=intern(next,{...base,title:project.title+' / dbt',kind:'dbt-project',files:project.files,...(project.artifacts?{artifacts:project.artifacts}:{})});
 const model=intern(next,{...base,title:project.title+' / Model',kind:'model-design',model:project.model,scd:project.scd});
 const chart=intern(next,{...base,title:project.board.title,kind:'chart-board',board:project.board});
 assertWorkbench(next);return {document:next,refs:{dbt,lineage:dbt,model,scd:model,charts:chart}};
}
export function initialResources(workspace:Workspace<RootNotebook>):RootWorkbench {
 let state=structuredClone(workspace.workbench??emptyWorkbench());assertWorkbench(state);
 state.resource_schema_version=2;state.ui??=studioUI();state.migrations??=[];
 const notebooks={...workspace.notebooks,...(workspace.notebook?{[workspace.notebook.id]:workspace.notebook}:{})};
 for(const [id,title] of [['shared-catalog','Shared catalog'],['shared-evidence','Run evidence']])if(!state.resources.some(r=>r.id===id))state.resources.push({schema_version:1,id,title,kind:id==='shared-catalog'?'catalog':'evidence',revision:0});
 for(const n of Object.values(notebooks))if(!state.resources.some(r=>r.kind==='notebook'&&r.notebook_id===n.id)){
  if(state.resources.length>=60)throw new Error('Migration would exceed the workspace resource limit. Original documents were not changed.');
  state.resources.push({schema_version:1,id:newId('notebook'),kind:'notebook',title:n.title,notebook_id:n.id,revision:0});
 }
 let migratedSession=false;
 for(const n of Object.values(notebooks)){
  const attachment=n.blockState?.[LAB_KEY];if(attachment===undefined)continue;
  const fp=fingerprint(attachment);
  if((state.migrations??[]).some(m=>m.notebook_id===n.id&&m.fingerprint===fp))continue;
  // Migrate each attachment transactionally; a bad one must not corrupt other resources.
  try{
   const p=validateProject(attachment);const migrated=addAnalyticsProject(state,p);let next=migrated.document;
   const refs={...migrated.refs,notebook:next.resources.find(r=>r.kind==='notebook'&&r.notebook_id===n.id)!.id,connections:'shared-catalog'};
   const entry:ResourceMigration={notebook_id:n.id,fingerprint:fp,status:'migrated',resources:refs,message:'Original attachment retained for recovery. Workspace resources are authoritative after Save workspace.'};
   next.migrations=[...(next.migrations??[]),entry];
   const preserveLayout=!!workspace.workbench||migratedSession;
   if(!preserveLayout){next.panes=p.session.panes.map((pane,index)=>({id:`m2-pane-${pane.id}`,view_ids:[],active_view_id:null,weight:p.session.panes.length===1?1:(index===0?p.session.ratio:100-p.session.ratio)/50}));next.views=[];next.active_pane_id=`m2-pane-${p.session.activePane}`;next.direction=p.session.direction;next.ui={...next.ui!,theme:p.session.theme,explorer_open:p.session.explorerOpen,context_open:p.session.contextOpen};}
   for(const [i,pane] of p.session.panes.entries())for(const tab of pane.tabs){
    const resourceId=(refs as Record<string,string>)[tab.layer];if(!resourceId)continue;
    const paneId=next.panes[Math.min(i,next.panes.length-1)].id;
    const beforeActive=next.panes.find(x=>x.id===paneId)!.active_view_id;
    next=openResource(next,resourceId,paneId,true);
    const viewId=next.panes.find(x=>x.id===paneId)!.active_view_id!;
    next=patchView(next,viewId,{state:{layer:tab.layer,selectedFile:p.selectedFile}});
    if(preserveLayout||tab.id!==pane.active)next.panes.find(x=>x.id===paneId)!.active_view_id=beforeActive??viewId;
   }
   if(preserveLayout)next.active_pane_id=state.active_pane_id;
   else next.active_pane_id=`m2-pane-${p.session.activePane}`;
   assertWorkbench(next);state=next;migratedSession=true;
  }catch(error){(state.migrations??=[]).push({notebook_id:n.id,fingerprint:fp,status:'recovery',resources:{},message:String(error)+' Original attachment remains untouched.'});}
 }
 if(!state.resources.some(r=>r.kind==='dbt-project')&&!(state.migrations??[]).some(m=>m.status==='recovery'))state=addAnalyticsProject(state,newProject()).document;
 if(!state.views.length){const current=state.resources.find(r=>r.kind==='notebook'&&r.notebook_id===workspace.notebook?.id);state=openResource(state,current?.id??'shared-catalog');}
 assertWorkbench(state);return state;
}
/** Compatibility projection for M2 components. It is ephemeral, never saved as a second project. */
export function projectForResource(resource:Resource,view:ViewInstance):LabProject {
 const p=newProject();p.session=defaultSession();p.title=resource.title;p.revision=resource.revision;
 if(resource.kind==='dbt-project'){p.files=resource.files;p.artifacts=resource.artifacts;p.selectedFile=resource.files.some(f=>f.path===view.state?.selectedFile)?String(view.state!.selectedFile):resource.files[0]?.path??'';}
 if(resource.kind==='model-design'){p.model=resource.model;p.scd=resource.scd;}
 if(resource.kind==='chart-board')p.board=resource.board;
 return p;
}
export function applyProjectEdit(state:RootWorkbench,resourceId:string,viewId:string,project:LabProject):RootWorkbench {
 const resource=state.resources.find(r=>r.id===resourceId),view=state.views.find(v=>v.id===viewId);
 if(!resource||!view||view.resource_id!==resourceId)throw new Error('The resource/view changed. Your current workspace is retained.');
 let next=state;
 if(resource.kind==='dbt-project'){
  const value:DbtProjectResource={...resource,files:project.files};if(project.artifacts)value.artifacts=project.artifacts;else delete value.artifacts;
  if(stableJson(content(resource))!==stableJson(content(value)))next=replaceResource(next,value);
  next=patchView(next,viewId,{state:{...view.state,selectedFile:project.selectedFile}});
 }
 if(resource.kind==='model-design'){const value:ModelDesignResource={...resource,model:project.model,scd:project.scd};if(stableJson(content(resource))!==stableJson(content(value)))next=replaceResource(next,value);}
 if(resource.kind==='chart-board'){const value:ChartBoardResource={...resource,board:project.board};if(stableJson(content(resource))!==stableJson(content(value)))next=replaceResource(next,value);}
 return next;
}
