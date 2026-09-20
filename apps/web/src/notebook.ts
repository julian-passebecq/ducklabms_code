import type { CaseStudy, Execution, KernelId, ExerciseDefinition } from '../../../packages/contracts/src/index.ts';
import type { WorkbenchPanel } from '../../../packages/notebook-core/src/types.ts';
import type { NotebookView } from '../../../packages/notebook-core/src/v2/model.ts';
import { parseIpynb, createImportedViews, type ImportedNotebookInfo, type JupyterOutputSnapshot } from '../../../packages/notebook-core/src/v2/ipynb.ts';
import { buildIpynbDocument } from '../../../packages/notebook-core/src/v2/ipynbExport.ts';
import { parseProjectSnapshot } from '../../../packages/notebook-core/src/v2/projectExport.ts';
import {projectRemovalIds,resetViewLayoutGeometry} from '../../../packages/notebook-core/src/v2/model.ts';

export interface RootBlock extends WorkbenchPanel {kernel?:KernelId;stepId?:string;outputAsset?:string|null;role?:'code'|'help'|'result'|'note'|'problem'|'exercise-help'|'exercise-browser';readOnly?:boolean;starterSource?:string;exerciseId?:string}
export type WorkspacePresentation='studio'|'fabric'|'leetcode';
export interface RootNotebook {schemaVersion:1;id:string;title:string;blocks:RootBlock[];views:NotebookView[];blockState:Record<string,unknown>;info:ImportedNotebookInfo|null;executions:Record<string,Execution>;executedSource:Record<string,string>;practiceLayouts?:Record<string,NotebookView['layout']>;exercise?:{id:string;version:string};revealedHints?:number;solutionRevealed?:boolean;skin?:'neutral'|'fabric'|'databricks';presentation?:WorkspacePresentation;outputCheckpoints?:Record<string,string>;clearedOutputs?:string[]}
const codeTypes=new Set(['sql','python','polars']);
export const isRunnable=(b:RootBlock)=>codeTypes.has(b.type)&&!b.readOnly;
export const sourceKey=(b:RootBlock)=>`mosaic:v2:${b.type==='markdown'?'markdown':'code'}:${b.id}`;
export const sourceOf=(n:RootNotebook,b:RootBlock):string=>String(n.blockState[sourceKey(b)]??'');
export const withSource=(n:RootNotebook,id:string,value:string):RootNotebook=>{const block=n.blocks.find(b=>b.id===id);if(!block)return n;return {...n,blockState:{...n.blockState,[sourceKey(block)]:value}}};

export function createCaseNotebook(c:CaseStudy):RootNotebook {
 const blocks:RootBlock[]=[];const state:Record<string,unknown>={};
 for(const [i,step] of c.steps.entries()){
  const type=step.language==='sql'||step.language==='dbt'?'sql':step.language==='polars'?'polars':'python';
  const code:RootBlock={id:step.id,type,title:step.title,kernel:step.language,stepId:step.id,outputAsset:step.output_asset,role:'code',starterSource:step.code,notebook:{source:'ipynb',cellId:step.id,cellType:'code',originalIndex:i,language:type,cellMetadata:{datapass:{kernel:step.language,stepId:step.id,outputAsset:step.output_asset}}}};
  blocks.push(code);state[sourceKey(code)]=step.code;
  const help:RootBlock={id:`help-${step.id}`,type:'markdown',title:'Understand this step',stepId:step.id,role:'help'};
  blocks.push(help);state[sourceKey(help)]=`${step.concept}\n\nYour task\n${step.task}\n\nHint\n${step.hint||'Inspect the input, implement the rule, then check the output.'}`;
  const output:RootBlock={id:`output-${step.id}`,type:'notebook-output',title:'Result and evidence',stepId:step.id,role:'result',notebook:{source:'ipynb',cellId:`output-${step.id}`,cellType:'output',parentCellId:step.id,originalIndex:i}};
  blocks.push(output);state[`mosaic:v2:jupyter-output:${output.id}`]=[];
 }
 const sourceById=new Map(blocks.map(b=>[b.id,String(state[sourceKey(b)]??'')]));
 const views=createImportedViews(blocks,sourceById);
 const fabric=c.modules.includes('fabric-notebook');
 const databricks=c.modules.includes('databricks-notebook');
 return {schemaVersion:1,id:'case-notebook',title:c.title,blocks,views,blockState:state,info:null,executions:{},executedSource:{},presentation:fabric?'fabric':'studio',skin:fabric?'fabric':databricks?'databricks':'neutral'};
}

export function practiceView(n:RootNotebook,stepId:string):NotebookView {
 const block=n.blocks.find(b=>b.id===stepId)??n.blocks.find(isRunnable);
 if(!block)return {id:'practice',label:'Practice',description:'Choose or add a cell.',blockIds:[],layout:[]};
 const help=n.blocks.find(b=>b.id===`help-${block.id}`);
 const output=n.blocks.find(b=>b.notebook?.parentCellId===block.notebook?.cellId&&b.type==='notebook-output');
 const ids=[block.id,...(help?[help.id]:[]),...(output?[output.id]:[])];
 return {id:'practice',label:'Practice',description:'Code, explanation and output share the same cell identity.',blockIds:ids,layout:n.practiceLayouts?.[block.id]??[{i:block.id,x:0,y:0,w:help?8:12,h:12,minH:7,minW:4},...(help?[{i:help.id,x:8,y:0,w:4,h:12,minH:6,minW:3}]:[]),...(output?[{i:output.id,x:0,y:12,w:12,h:9,minH:5,minW:4}]:[])]};
}

export function recordExecution(n:RootNotebook,run:Execution,submittedSource?:string):RootNotebook {
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
 return {...n,blocks,views,clearedOutputs:n.clearedOutputs?.filter(id=>id!==code.id),outputCheckpoints:{...n.outputCheckpoints,[code.id]:run.id},executions:{...n.executions,[code.id]:run},executedSource:{...n.executedSource,[code.id]:submittedSource??sourceOf(n,code)},blockState:{...n.blockState,[`mosaic:v2:jupyter-output:${output.id}`]:snapshots}};
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
 const blocks=n.blocks.map(b=>isRunnable(b)?{...b,notebook:{...(b.notebook??{source:'ipynb' as const,cellId:b.id,cellType:'code' as const,originalIndex:0}),cellMetadata:{...b.notebook?.cellMetadata,datapass:{...(b.notebook?.cellMetadata?.datapass as Record<string,unknown>??{}),kernel:b.kernel,outputAsset:b.outputAsset,stepId:b.stepId}}}}:b);
 return buildIpynbDocument({blocks,views:n.views,notebookInfo:n.info,storage:{getItem:key=>key in n.blockState?JSON.stringify(n.blockState[key]):null}});
}

export function restoreNotebook(value:unknown):RootNotebook {
 if(!value||typeof value!=='object')throw new Error('Invalid notebook document.');
 const doc=value as Partial<RootNotebook>;
 if(doc.schemaVersion!==1||!Array.isArray(doc.blocks)||!Array.isArray(doc.views)||!doc.blockState||typeof doc.blockState!=='object')throw new Error('Unsupported notebook document version.');
 if(doc.blocks.length>300||JSON.stringify(doc).length>2_000_000)throw new Error('Notebook document exceeds limits.');
 if(doc.blocks.some(b=>!b||typeof b.id!=='string')||new Set(doc.blocks.map(b=>b.id)).size!==doc.blocks.length)throw new Error('Invalid or duplicate block identity. Current source was retained.');
 // Reuse Mosaic sanitization before geometry or imported metadata reaches the renderer.
 const practiceViews=Object.entries(doc.practiceLayouts??{}).filter(([id,layout])=>doc.blocks!.some(b=>b.id===id)&&Array.isArray(layout)).map(([id,layout])=>({...practiceView(doc as RootNotebook,id),id:'saved-practice-'+id,layout}));
 const normalized=parseProjectSnapshot(JSON.stringify({format:'mosaic-v2-notebook-project',version:'2.1.7',currentViewId:'notebook',blocks:doc.blocks,views:[...doc.views,...practiceViews],datasets:[],notebookInfo:doc.info,result:{columns:[],rows:[]},blockState:doc.blockState}));
 const byId=new Map(doc.blocks.map(b=>[b.id,b]));
 const blocks:RootBlock[]=normalized.blocks.map(b=>{const old=byId.get(b.id);return {...b,kernel:old?.kernel&&['sql','sparklab','python','polars','dbt'].includes(old.kernel)?old.kernel:undefined,stepId:typeof old?.stepId==='string'?old.stepId:undefined,outputAsset:typeof old?.outputAsset==='string'?old.outputAsset:null,role:old?.role,readOnly:!!old?.readOnly,starterSource:typeof old?.starterSource==='string'?old.starterSource:undefined,exerciseId:typeof old?.exerciseId==='string'?old.exerciseId:undefined}});
 return {schemaVersion:1,id:typeof doc.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(doc.id)?doc.id:'case-notebook',title:String(doc.title??'Notebook'),blocks,views:normalized.views.filter(v=>!v.id.startsWith('saved-practice-')),practiceLayouts:Object.fromEntries(normalized.views.filter(v=>v.id.startsWith('saved-practice-')).map(v=>[v.id.slice(15),v.layout])),blockState:normalized.blockState,info:normalized.notebookInfo,executions:{},executedSource:{},exercise:doc.exercise&&typeof doc.exercise.id==='string'&&typeof doc.exercise.version==='string'?doc.exercise:undefined,solutionRevealed:doc.solutionRevealed===true,revealedHints:Number.isInteger(doc.revealedHints)?Math.max(0,Math.min(100,doc.revealedHints!)):0,skin:['neutral','fabric','databricks'].includes(doc.skin??'')?doc.skin:'neutral',presentation:['studio','fabric','leetcode'].includes(doc.presentation??'')?doc.presentation:'studio',outputCheckpoints:Object.fromEntries(Object.entries(doc.outputCheckpoints??{}).filter(([id,run])=>byId.has(id)&&typeof run==='string')),clearedOutputs:Array.isArray(doc.clearedOutputs)?doc.clearedOutputs.filter(id=>typeof id==='string'):[]};
}

export function addCell(n:RootNotebook,kernel:KernelId|'markdown'):RootNotebook {
 const id=`cell-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
 const type=kernel==='markdown'?'markdown':kernel==='sql'||kernel==='dbt'?'sql':kernel==='polars'?'polars':'python';
 const starter=kernel==='sql'?'SELECT * FROM source.orders LIMIT 10':kernel==='sparklab'?'result = spark.table("source.orders").limit(10)':kernel==='python'?'display(query("SELECT * FROM source.orders LIMIT 5"))':kernel==='markdown'?'Write your notes here.':'';
 const block:RootBlock={id,type,starterSource:starter,title:kernel==='markdown'?'Notes':'Untitled cell',kernel:kernel==='markdown'?undefined:kernel,role:kernel==='markdown'?'note':'code'};
 const views=n.views.map(v=>{const y=Math.max(0,...v.layout.map(i=>i.y+i.h));return {...v,blockIds:[...v.blockIds,id],layout:[...v.layout,{i:id,x:0,y,w:12,h:10,minW:3,minH:5}]}});
 return {...n,blocks:[...n.blocks,block],views,blockState:{...n.blockState,[sourceKey(block)]:starter}};
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
  if(run.notebook_id===n.id&&block&&run.status!=='skipped'&&!n.clearedOutputs?.includes(block.id))executions[block.id]=run;
 }
 return {...n,executions};
}

/** Verify saved checkpoints against server hashes, never client-supplied runs. */
export async function hydrateServerEvidence(n:RootNotebook,runs:Execution[]):Promise<RootNotebook> {
 const next=attachServerEvidence(n,runs),executedSource:Record<string,string>={};
 for(const block of next.blocks){const run=next.executions[block.id];if(!run||next.outputCheckpoints?.[block.id]!==run.id||run.language!==block.kernel)continue;
  const source=sourceOf(next,block),bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash===run.source_hash)executedSource[block.id]=source;
 }
 return {...next,executedSource};
}

function interviewLayout():NotebookView['layout'] {return [{i:'exercise-browser',x:0,y:0,w:3,h:26,minW:2,minH:5},{i:'problem',x:3,y:0,w:6,h:8,minW:3,minH:4},{i:'answer',x:3,y:8,w:6,h:12,minW:4,minH:6},{i:'answer-output',x:3,y:20,w:6,h:10,minW:4,minH:5},{i:'guidance',x:9,y:0,w:3,h:30,minW:2,minH:5}]}

export function createExerciseNotebook(exercise:ExerciseDefinition):RootNotebook {
 const code:RootBlock={id:'answer',type:exercise.language==='sql'?'sql':exercise.language==='polars'?'polars':'python',kernel:exercise.language,title:'Your answer',role:'code',exerciseId:exercise.id,starterSource:exercise.starter_source,notebook:{source:'ipynb',cellId:'answer',cellType:'code',originalIndex:0}};
 const problem:RootBlock={id:'problem',type:'markdown',title:exercise.title,role:'problem',exerciseId:exercise.id};
 const help:RootBlock={id:'guidance',type:'markdown',title:'Hints, explanation and reflection',role:'exercise-help',exerciseId:exercise.id};
 const output:RootBlock={id:'answer-output',type:'notebook-output',title:'Results and checks',role:'result',exerciseId:exercise.id,notebook:{source:'ipynb',cellId:'answer-output',cellType:'output',parentCellId:'answer',originalIndex:0}};
 const browser:RootBlock={id:'exercise-browser',type:'markdown',title:'Problems and progress',role:'exercise-browser',exerciseId:exercise.id};
 const blocks=[problem,code,output,help,browser];
 const blockState={[sourceKey(code)]:exercise.starter_source,[sourceKey(problem)]:exercise.prompt,[sourceKey(help)]:exercise.explanation};
 const genericViews=createImportedViews(blocks,new Map(blocks.map(b=>[b.id,String(blockState[sourceKey(b)]??'')]))).map(v=>({...v,blockIds:v.blockIds.filter(id=>id!==browser.id),layout:v.layout.filter(i=>i.i!==browser.id)}));
 const interview:NotebookView={id:'interview',label:'Interview',description:'Problem, source, output and guidance; geometry does not change execution order.',blockIds:[browser.id,problem.id,code.id,output.id,help.id],layout:interviewLayout()};
 return {schemaVersion:1,id:`exercise-${exercise.id}-${exercise.version}`,title:exercise.title,exercise:{id:exercise.id,version:exercise.version},blocks,views:[...genericViews,interview].map(v=>({...v,defaultLayout:v.layout})),blockState,info:null,executions:{},executedSource:{},presentation:'leetcode',skin:'neutral'};
}

/** Upgrade Pass 1/2 documents without replacing source, notes or saved geometry. */
export function ensureExerciseBrowser(n:RootNotebook):RootNotebook {
 if(!n.exercise)return n;
 const existing=n.blocks.find(b=>b.role==='exercise-browser');
 const block:RootBlock=existing??{id:'exercise-browser',type:'markdown',title:'Problems and progress',role:'exercise-browser',exerciseId:n.exercise.id};
 const blocks=existing?n.blocks:[block,...n.blocks];
 const views=n.views.map(v=>{
  const withoutBrowser={...v,blockIds:v.blockIds.filter(id=>id!==block.id),layout:v.layout.filter(i=>i.i!==block.id),collapsedIds:v.collapsedIds?.filter(id=>id!==block.id),defaultLayout:v.defaultLayout?.filter(i=>i.i!==block.id)};
  if(v.id!=='interview')return withoutBrowser;
  const hasBrowser=v.blockIds.includes(block.id);
  const y=Math.max(0,...v.layout.map(i=>i.y+i.h));
  const item={i:block.id,x:0,y,w:3,h:22,minW:2,minH:5};
  return {...v,blockIds:hasBrowser?v.blockIds:[block.id,...v.blockIds],layout:hasBrowser?v.layout:[...v.layout,item],collapsedIds:v.collapsedIds,defaultLayout:[...interviewLayout(),...(v.defaultLayout??v.layout).filter(i=>!['exercise-browser','problem','answer','answer-output','guidance'].includes(i.i))]};
 });
 return {...n,blocks,views};
}

export function clearOutputs(n:RootNotebook,ids:string[]):RootNotebook {
 const selected=new Set(ids),state={...n.blockState},executions={...n.executions},executedSource={...n.executedSource},checkpoints={...n.outputCheckpoints};
 const parents=new Set(n.blocks.filter(b=>selected.has(b.id)).map(b=>b.notebook?.cellId??b.id));
 for(const id of ids){delete executions[id];delete executedSource[id];delete checkpoints[id]}
 for(const b of n.blocks)if(b.type==='notebook-output'&&parents.has(b.notebook?.parentCellId??''))state[`mosaic:v2:jupyter-output:${b.id}`]=[];
 return {...n,blocks:n.blocks.map(b=>selected.has(b.id)&&b.notebook?{...b,notebook:{...b.notebook,executionCount:null}}:b),blockState:state,executions,executedSource,outputCheckpoints:checkpoints,clearedOutputs:[...new Set([...(n.clearedOutputs??[]),...ids])]};
}

export function resetToStarter(n:RootNotebook,ids:string[],starters:Record<string,string>={}):RootNotebook {
 let next=clearOutputs(n,ids);
 for(const id of ids){const b=next.blocks.find(b=>b.id===id);if(b){const source=starters[id]??b.starterSource;if(source!==undefined)next=withSource(next,id,source)}}
 return next;
}

/** Restore only this exercise's authored blocks; personal notes/cells remain. */
export function resetExercise(n:RootNotebook,exercise:ExerciseDefinition):RootNotebook {
 if(n.exercise?.id!==exercise.id||n.exercise.version!==exercise.version)throw new Error('Starter version does not match this exercise document.');
 const template=createExerciseNotebook(exercise),missing=template.blocks.filter(b=>!n.blocks.some(old=>old.id===b.id));
 const ids=n.blocks.filter(b=>b.exerciseId===exercise.id&&isRunnable(b)).map(b=>b.id);
 let next=resetToStarter(n,ids,Object.fromEntries(ids.map(id=>[id,exercise.starter_source])));
 for(const block of missing){next={...next,blocks:[...next.blocks,block],blockState:{...next.blockState,[sourceKey(block)]:template.blockState[sourceKey(block)]??''}}}
 next={...next,views:next.views.map(view=>{const baseline=template.views.find(v=>v.id===view.id);const additions=missing.filter(b=>baseline?.blockIds.includes(b.id));let bottom=Math.max(0,...view.layout.map(i=>i.y+i.h));return {...view,blockIds:[...view.blockIds,...additions.map(b=>b.id)],layout:[...view.layout,...additions.map(b=>({i:b.id,x:0,y:(bottom+=10)-10,w:12,h:10}))]}})};
 return {...next,revealedHints:0,solutionRevealed:false};
}

export function removeBlock(n:RootNotebook,id:string,scope:'view'|'document',viewId:string):RootNotebook {
 // The canonical notebook order must never be changed by view-only hiding.
 if(scope==='view'&&viewId==='notebook')throw new Error('Use another layout to hide blocks without changing semantic notebook order.');
 const ids=new Set(projectRemovalIds(n.blocks,id));
 const clean=(v:NotebookView)=>({...v,blockIds:v.blockIds.filter(id=>!ids.has(id)),layout:v.layout.filter(i=>!ids.has(i.i)),collapsedIds:v.collapsedIds?.filter(id=>!ids.has(id))});
 if(scope==='view')return {...n,views:n.views.map(v=>v.id===viewId?clean(v):v)};
 const next=clearOutputs(n,[id]),state={...next.blockState};
 for(const key of Object.keys(state))if([...ids].some(id=>key.endsWith(':'+id)))delete state[key];
 return {...next,blocks:next.blocks.filter(b=>!ids.has(b.id)),views:next.views.map(clean),blockState:state,practiceLayouts:Object.fromEntries(Object.entries(next.practiceLayouts??{}).filter(([id])=>!ids.has(id)).map(([id,layout])=>[id,layout.filter(i=>!ids.has(i.i))]))};
}

export function resetLayout(n:RootNotebook,viewId:string):RootNotebook {
 return {...n,views:n.views.map(v=>{if(v.id!==viewId)return v;const baseline=v.defaultLayout??v.layout;const blockIds=v.id==='notebook'?v.blockIds:[...new Set([...v.blockIds,...baseline.map(i=>i.i).filter(id=>n.blocks.some(b=>b.id===id))])];return resetViewLayoutGeometry({...v,blockIds},baseline)})};
}
