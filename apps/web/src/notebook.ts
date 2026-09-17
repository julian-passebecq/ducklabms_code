import type { CaseStudy, Execution, KernelId } from '../../../packages/contracts/src/index.ts';
import type { WorkbenchPanel } from '../../../packages/notebook-core/src/types.ts';
import type { NotebookView } from '../../../packages/notebook-core/src/v2/model.ts';
import { parseIpynb, createImportedViews, type ImportedNotebookInfo, type JupyterOutputSnapshot } from '../../../packages/notebook-core/src/v2/ipynb.ts';
import { buildIpynbDocument } from '../../../packages/notebook-core/src/v2/ipynbExport.ts';
import { parseProjectSnapshot } from '../../../packages/notebook-core/src/v2/projectExport.ts';

export interface RootBlock extends WorkbenchPanel {kernel?:KernelId;stepId?:string;outputAsset?:string|null;role?:'code'|'help'|'result'|'note';readOnly?:boolean}
export interface RootNotebook {schemaVersion:1;id:string;title:string;blocks:RootBlock[];views:NotebookView[];blockState:Record<string,unknown>;info:ImportedNotebookInfo|null;executions:Record<string,Execution>;executedSource:Record<string,string>;practiceLayouts?:Record<string,NotebookView['layout']>}
const codeTypes=new Set(['sql','python','polars']);
export const isRunnable=(b:RootBlock)=>codeTypes.has(b.type)&&!b.readOnly;
export const sourceKey=(b:RootBlock)=>`mosaic:v2:${b.type==='markdown'?'markdown':'code'}:${b.id}`;
export const sourceOf=(n:RootNotebook,b:RootBlock):string=>String(n.blockState[sourceKey(b)]??'');
export const withSource=(n:RootNotebook,id:string,value:string):RootNotebook=>{const block=n.blocks.find(b=>b.id===id);if(!block)return n;return {...n,blockState:{...n.blockState,[sourceKey(block)]:value}}};

export function createCaseNotebook(c:CaseStudy):RootNotebook {
 const blocks:RootBlock[]=[];const state:Record<string,unknown>={};
 for(const [i,step] of c.steps.entries()){
  const type=step.language==='sql'||step.language==='dbt'?'sql':step.language==='polars'?'polars':'python';
  const code:RootBlock={id:step.id,type,title:step.title,kernel:step.language,stepId:step.id,outputAsset:step.output_asset,role:'code',notebook:{source:'ipynb',cellId:step.id,cellType:'code',originalIndex:i,language:type,cellMetadata:{datapass:{kernel:step.language,stepId:step.id,outputAsset:step.output_asset}}}};
  blocks.push(code);state[sourceKey(code)]=step.code;
  const help:RootBlock={id:`help-${step.id}`,type:'markdown',title:'Understand this step',stepId:step.id,role:'help'};
  blocks.push(help);state[sourceKey(help)]=`${step.concept}\n\nYour task\n${step.task}\n\nHint\n${step.hint||'Inspect the input, implement the rule, then check the output.'}`;
  const output:RootBlock={id:`output-${step.id}`,type:'notebook-output',title:'Result and evidence',stepId:step.id,role:'result',notebook:{source:'ipynb',cellId:`output-${step.id}`,cellType:'output',parentCellId:step.id,originalIndex:i}};
  blocks.push(output);state[`mosaic:v2:jupyter-output:${output.id}`]=[];
 }
 const sourceById=new Map(blocks.map(b=>[b.id,String(state[sourceKey(b)]??'')]));
 const views=createImportedViews(blocks,sourceById);
 return {schemaVersion:1,id:'case-notebook',title:c.title,blocks,views,blockState:state,info:null,executions:{},executedSource:{}};
}

export function practiceView(n:RootNotebook,stepId:string):NotebookView {
 const block=n.blocks.find(b=>b.id===stepId)??n.blocks.find(isRunnable);
 if(!block)return {id:'practice',label:'Practice',description:'Choose or add a cell.',blockIds:[],layout:[]};
 const help=n.blocks.find(b=>b.id===`help-${block.id}`);
 const output=n.blocks.find(b=>b.notebook?.parentCellId===block.notebook?.cellId&&b.type==='notebook-output');
 const ids=[block.id,...(help?[help.id]:[]),...(output?[output.id]:[])];
 return {id:'practice',label:'Practice',description:'Code, explanation and output share the same cell identity.',blockIds:ids,layout:n.practiceLayouts?.[block.id]??[{i:block.id,x:0,y:0,w:help?8:12,h:12,minH:7,minW:4},...(help?[{i:help.id,x:8,y:0,w:4,h:12,minH:6,minW:3}]:[]),...(output?[{i:output.id,x:0,y:12,w:12,h:9,minH:5,minW:4}]:[])]};
}

export function recordExecution(n:RootNotebook,run:Execution):RootNotebook {
 if(run.notebook_id!==n.id)return n;
 const code=n.blocks.find(b=>b.id===run.cell_id)??n.blocks.find(b=>isRunnable(b)&&b.stepId===run.cell_id);if(!code)return n;
 const cellId=code.notebook?.cellId??code.id;
 let output=n.blocks.find(b=>b.type==='notebook-output'&&b.notebook?.parentCellId===cellId);
 const snapshots:JupyterOutputSnapshot[]=[];
 if(run.stdout)snapshots.push({outputType:'stream',name:'stdout',text:run.stdout});
 if(run.error)snapshots.push({outputType:'error',errorName:run.error.type,errorValue:run.error.message,traceback:[]});
 if(run.result)snapshots.push({outputType:'execute_result',table:{columns:run.result.columns,rows:run.result.rows},executionCount:run.sequence,text:JSON.stringify(run.result.rows,null,2)});
 let blocks=n.blocks.map(b=>b.id===code.id?{...b,notebook:{...(b.notebook??{source:'ipynb' as const,cellId,cellType:'code' as const,originalIndex:0}),executionCount:run.sequence}}:b);
 let views=n.views;
 if(!output){
  output={id:`output-${code.id}`,type:'notebook-output',title:'Result and evidence',role:'result',notebook:{source:'ipynb',cellId:`output-${code.id}`,cellType:'output',parentCellId:cellId,originalIndex:0}};
  blocks=[...blocks,output];const outputId=output.id;
  views=views.map(v=>{if(!v.blockIds.includes(code.id))return v;const after=v.blockIds.indexOf(code.id)+1;const bottom=Math.max(0,...v.layout.map(i=>i.y+i.h));return {...v,blockIds:[...v.blockIds.slice(0,after),outputId,...v.blockIds.slice(after)],layout:[...v.layout,{i:outputId,x:0,y:bottom,w:12,h:9}]}});
 }
 return {...n,blocks,views,executions:{...n.executions,[code.id]:run},executedSource:{...n.executedSource,[code.id]:sourceOf(n,code)},blockState:{...n.blockState,[`mosaic:v2:jupyter-output:${output.id}`]:snapshots}};
}

export function importNotebook(text:string,fileName:string):RootNotebook {
 if(text.length>2_000_000)throw new Error('Notebook exceeds the 2 MB import limit.');
 const imported=parseIpynb(text,fileName);
 const blocks:RootBlock[]=imported.blocks.map(b=>{
  const meta=b.notebook?.cellMetadata?.datapass as Record<string,unknown>|undefined;
  const rawKernel=meta?.kernel;
  const kernel:KernelId|undefined=typeof rawKernel==='string'&&['sql','sparklab','python','polars','dbt'].includes(rawKernel)?rawKernel as KernelId:b.type==='sql'?'sql':b.type==='python'?'python':undefined;
  return {...b,kernel,stepId:typeof meta?.stepId==='string'?meta.stepId:undefined,readOnly:b.type==='markdown'&&b.notebook?.cellType==='code',outputAsset:typeof meta?.outputAsset==='string'?meta.outputAsset:null};
 });
 return {schemaVersion:1,id:`import-${Date.now()}`,title:imported.info.title,blocks,views:imported.views,blockState:imported.blockState,info:imported.info,executions:{},executedSource:{}};
}

export function exportNotebook(n:RootNotebook):unknown {
 const blocks=n.blocks.map(b=>isRunnable(b)?{...b,notebook:{...(b.notebook??{source:'ipynb' as const,cellId:b.id,cellType:'code' as const,originalIndex:0}),cellMetadata:{...b.notebook?.cellMetadata,datapass:{kernel:b.kernel,outputAsset:b.outputAsset,stepId:b.stepId}}}}:b);
 return buildIpynbDocument({blocks,views:n.views,notebookInfo:n.info,storage:{getItem:key=>key in n.blockState?JSON.stringify(n.blockState[key]):null}});
}

export function restoreNotebook(value:unknown):RootNotebook {
 if(!value||typeof value!=='object')throw new Error('Invalid notebook document.');
 const doc=value as Partial<RootNotebook>;
 if(doc.schemaVersion!==1||!Array.isArray(doc.blocks)||!Array.isArray(doc.views)||!doc.blockState||typeof doc.blockState!=='object')throw new Error('Unsupported notebook document version.');
 if(doc.blocks.length>300||JSON.stringify(doc).length>2_000_000)throw new Error('Notebook document exceeds limits.');
 // Reuse Mosaic sanitization before geometry or imported metadata reaches the renderer.
 const practiceViews=Object.entries(doc.practiceLayouts??{}).filter(([id,layout])=>doc.blocks!.some(b=>b.id===id)&&Array.isArray(layout)).map(([id,layout])=>({...practiceView(doc as RootNotebook,id),id:'saved-practice-'+id,layout}));
 const normalized=parseProjectSnapshot(JSON.stringify({format:'mosaic-v2-notebook-project',version:'2.1.7',currentViewId:'notebook',blocks:doc.blocks,views:[...doc.views,...practiceViews],datasets:[],notebookInfo:doc.info,result:{columns:[],rows:[]},blockState:doc.blockState}));
 const byId=new Map(doc.blocks.map(b=>[b.id,b]));
 const blocks:RootBlock[]=normalized.blocks.map(b=>{const old=byId.get(b.id);return {...b,kernel:old?.kernel&&['sql','sparklab','python','polars','dbt'].includes(old.kernel)?old.kernel:undefined,stepId:typeof old?.stepId==='string'?old.stepId:undefined,outputAsset:typeof old?.outputAsset==='string'?old.outputAsset:null,role:old?.role,readOnly:!!old?.readOnly}});
 return {schemaVersion:1,id:typeof doc.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(doc.id)?doc.id:'case-notebook',title:String(doc.title??'Notebook'),blocks,views:normalized.views.filter(v=>!v.id.startsWith('saved-practice-')),practiceLayouts:Object.fromEntries(normalized.views.filter(v=>v.id.startsWith('saved-practice-')).map(v=>[v.id.slice(15),v.layout])),blockState:normalized.blockState,info:normalized.notebookInfo,executions:{},executedSource:{}};
}

export function addCell(n:RootNotebook,kernel:KernelId|'markdown'):RootNotebook {
 const id=`cell-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
 const type=kernel==='markdown'?'markdown':kernel==='sql'||kernel==='dbt'?'sql':kernel==='polars'?'polars':'python';
 const block:RootBlock={id,type,title:kernel==='markdown'?'Notes':'Untitled cell',kernel:kernel==='markdown'?undefined:kernel,role:kernel==='markdown'?'note':'code'};
 const views=n.views.map(v=>{const y=Math.max(0,...v.layout.map(i=>i.y+i.h));return {...v,blockIds:[...v.blockIds,id],layout:[...v.layout,{i:id,x:0,y,w:12,h:10,minW:3,minH:5}]}});
 return {...n,blocks:[...n.blocks,block],views,blockState:{...n.blockState,[sourceKey(block)]:kernel==='sql'?'SELECT * FROM source.orders LIMIT 10':kernel==='sparklab'?'result = spark.table("source.orders").limit(10)':kernel==='python'?'display(query("SELECT * FROM source.orders LIMIT 5"))':kernel==='markdown'?'Write your notes here.':''}};
}

export function setBlockKernel(n:RootNotebook,id:string,kernel:KernelId):RootNotebook {
 const type=kernel==='sql'||kernel==='dbt'?'sql':kernel==='polars'?'polars':'python';
 return {...n,blocks:n.blocks.map(b=>b.id===id?{...b,type,kernel}:b)};
}
/** Use server evidence only. Missing source checkpoint stays visibly historical. */
export function attachServerEvidence(n:RootNotebook,runs:Execution[]):RootNotebook {
 const executions:Record<string,Execution>={};
 for(const run of runs){
  const block=n.blocks.find(b=>isRunnable(b)&&b.id===run.cell_id)??n.blocks.find(b=>isRunnable(b)&&b.stepId===run.cell_id);
  if(run.notebook_id===n.id&&block&&run.status!=='skipped')executions[block.id]=run;
 }
 return {...n,executions};
}
