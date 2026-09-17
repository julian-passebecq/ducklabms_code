import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExerciseNotebook,createCaseNotebook,withSource,sourceOf,resetToStarter,resetExercise,clearOutputs,removeBlock,resetLayout,restoreNotebook,recordExecution,hydrateServerEvidence,exportNotebook,importNotebook} from '../apps/web/src/notebook.ts';
const exercise={id:'demo-sum',version:'1',title:'Internal demo',language:'sql',starter_source:'SELECT 0 AS total',prompt:'Return sum',explanation:'Use actual input'} as any;
const answer=(n:any)=>n.blocks.find((b:any)=>b.id==='answer');
test('interview shares source and semantic order; geometry survives restore and view reset',()=>{
 let n=createExerciseNotebook(exercise);const order=n.views.find(v=>v.id==='notebook')!.blockIds;
 n=withSource(n,'answer','SELECT SUM(value) FROM input');
 n={...n,views:n.views.map(v=>v.id==='interview'?{...v,layout:v.layout.map(i=>({...i,h:i.h+4}))}:v)};
 const restored=restoreNotebook(n);assert.equal(sourceOf(restored,answer(restored)),'SELECT SUM(value) FROM input');
 assert.deepEqual(restored.views.find(v=>v.id==='interview')!.layout,n.views.find(v=>v.id==='interview')!.layout);
 assert.deepEqual(restored.views.find(v=>v.id==='notebook')!.blockIds,order);
 assert.notDeepEqual(resetLayout(restored,'interview').views.at(-1)!.layout,restored.views.at(-1)!.layout);
});
test('scoped reset and clear preserve unrelated notes, geometry and source',()=>{
 let n=withSource(createExerciseNotebook(exercise),'answer','SELECT 999');n=withSource(n,'problem','Personal context');
 const cleared=clearOutputs(n,['answer']);assert.equal(sourceOf(cleared,answer(cleared)),'SELECT 999');
 const reset=resetToStarter(n,['answer']);assert.equal(sourceOf(reset,answer(reset)),exercise.starter_source);
 assert.equal(sourceOf(reset,reset.blocks[0]),'Personal context');assert.deepEqual(reset.views,n.views);
});
test('hide is view-only, reset restores hidden references, deletion groups output',()=>{
 const n=createExerciseNotebook(exercise),hidden=removeBlock(n,'answer','view','interview');
 assert.equal(hidden.blocks.length,n.blocks.length);assert.ok(!hidden.views.at(-1)!.blockIds.includes('answer-output'));
 assert.ok(resetLayout(hidden,'interview').views.at(-1)!.blockIds.includes('answer'));
 assert.throws(()=>removeBlock(n,'answer','view','notebook'));
 const deleted=removeBlock(n,'answer','document','interview');assert.ok(!deleted.blocks.some(b=>b.id==='answer'||b.id==='answer-output'));
 assert.ok(deleted.views.every(v=>!v.blockIds.includes('answer')));
});
test('exercise reset recovers deleted answer and preserves personal notes',()=>{
 const n=withSource(createExerciseNotebook(exercise),'problem','Personal notes');
 const restored=resetExercise(removeBlock(n,'answer','document','interview'),exercise);
 assert.equal(sourceOf(restored,answer(restored)),exercise.starter_source);
 assert.equal(sourceOf(restored,restored.blocks.find(b=>b.id==='problem')!),'Personal notes');
 assert.ok(restored.views.at(-1)!.blockIds.includes('answer-output'));
});
test('server hashes hydrate current source, edits stay historical, reset cannot resurrect output',async()=>{
 const n=createExerciseNotebook(exercise),source=sourceOf(n,answer(n));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');
 const run={id:'run1',notebook_id:n.id,cell_id:'answer',source_hash:hash,language:'sql',status:'success',sequence:1,input_versions:{}} as any;
 const recorded=recordExecution(n,run,source),restored=restoreNotebook(recorded);
 assert.equal((await hydrateServerEvidence(restored,[run])).executedSource.answer,source);
 assert.equal((await hydrateServerEvidence(withSource(restored,'answer','SELECT 9'),[run])).executedSource.answer,undefined);
 assert.deepEqual((await hydrateServerEvidence(restoreNotebook(clearOutputs(recorded,['answer'])),[run])).executions,{});
 const late=recordExecution(withSource(n,'answer','SELECT 8'),run,source);assert.notEqual(late.executedSource.answer,sourceOf(late,answer(late)));
});
test('failed import leaves current notebook intact; unknown metadata and attachments roundtrip',()=>{
 const n=createExerciseNotebook(exercise),before=JSON.stringify(n);
 assert.throws(()=>restoreNotebook({...n,blocks:[n.blocks[0],n.blocks[0]]}));assert.equal(JSON.stringify(n),before);
 const raw={nbformat:4,nbformat_minor:5,metadata:{custom:42},cells:[{cell_type:'markdown',id:'note',source:'note',metadata:{custom:1},attachments:{'x.txt':{'text/plain':'hello'}}},{cell_type:'code',id:'code',source:'SELECT 1',metadata:{datapass:{kernel:'sql',future:'keep'}},outputs:[],execution_count:null}]};
 const out=exportNotebook(importNotebook(JSON.stringify(raw),'x.ipynb')) as any;
 assert.equal(out.metadata.custom,42);assert.equal(out.cells[1].metadata.datapass.future,'keep');assert.equal(out.cells[0].attachments['x.txt']['text/plain'],'hello');
});
