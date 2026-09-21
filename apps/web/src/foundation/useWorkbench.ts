import {useEffect,useReducer,useRef} from 'react';
import type {Workspace} from '../../../../packages/contracts/src/index.ts';
import type {RootWorkbench,Resource} from '../../../../packages/contracts/src/foundation.ts';
import {assertWorkbench,emptyWorkbench,openResource,newId} from '../../../../packages/contracts/src/workbench.ts';
import type {RootNotebook} from '../notebook.ts';

import {initialResources} from './workspaceResources.ts';

interface Draft {owner:string; document:RootWorkbench; saved:RootWorkbench; past:RootWorkbench[]; future:RootWorkbench[]}
/** A transient editor buffer, not a second persistence service. Documents owns saved state. */
export function useWorkbench(workspace:Workspace<RootNotebook>|null) {
 const owner=useRef(workspace?.id);owner.current=workspace?.id;
 const ref=useRef<Draft|null>(null),[,render]=useReducer(n=>n+1,0);
 useEffect(()=>{ref.current=workspace?(()=>{const document=initialResources(workspace);return {owner:workspace.id,document,saved:JSON.stringify(document)===JSON.stringify(workspace.workbench)?document:(workspace.workbench??emptyWorkbench()),past:[],future:[]}})():null;render()},[workspace?.id]);
 useEffect(()=>{
  const current=ref.current,n=workspace?.notebook;
  if(!current||current.owner!==owner.current||!n||current.document.resources.some(r=>r.kind==='notebook'&&r.notebook_id===n.id))return;
  const resource:Resource={schema_version:1,id:newId('notebook'),kind:'notebook',notebook_id:n.id,title:n.title,revision:0};
  current.document=openResource({...current.document,resources:[...current.document.resources,resource]},resource.id);render();
 },[workspace?.id,workspace?.notebook?.id]);
 const state=ref.current?.owner===workspace?.id?ref.current:null;
 const change=(update:RootWorkbench|((current:RootWorkbench)=>RootWorkbench),record=true)=>{
  const current=ref.current;if(!current||current.owner!==owner.current)throw new Error('Open a workspace first.');
  const next=typeof update==='function'?update(current.document):update;assertWorkbench(next);
  if(next===current.document||JSON.stringify(next)===JSON.stringify(current.document))return;
  if(record){current.past=[...current.past,current.document].slice(-40);current.future=[]}
  current.document=next;render();
 };
 const checkpoint=()=>{const current=ref.current;if(!current||current.owner!==owner.current)return;current.past=[...current.past,current.document].slice(-40);current.future=[];render()};
 const undo=()=>{const current=ref.current;if(!current?.past.length)return;current.future.push(current.document);current.document=current.past.pop()!;render()};
 const redo=()=>{const current=ref.current;if(!current?.future.length)return;current.past.push(current.document);current.document=current.future.pop()!;render()};
 const snapshot=(owner:string)=>ref.current?.owner===owner?ref.current.document:null;
 const markSaved=(owner:string,saved:RootWorkbench)=>{if(ref.current?.owner!==owner)return;ref.current.saved=saved;render()};
 const linkNotebook=(notebook:RootNotebook)=>change(current=>{
  const existing=current.resources.find(r=>r.kind==='notebook'&&r.notebook_id===notebook.id);
  const resource:Resource=existing??{schema_version:1,id:newId('notebook'),kind:'notebook',notebook_id:notebook.id,title:notebook.title,revision:0};
  return openResource(existing?current:{...current,resources:[...current.resources,resource]},resource.id);
 });
 return {document:state?.document??null,dirty:!!state&&JSON.stringify(state.document)!==JSON.stringify(state.saved),change,checkpoint,undo,redo,canUndo:!!state?.past.length,canRedo:!!state?.future.length,snapshot,markSaved,linkNotebook};
}
export type WorkbenchController=ReturnType<typeof useWorkbench>;
