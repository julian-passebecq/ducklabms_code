import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addResource,assertGraph,assertWorkbench,closePane,closeView,connectGraph,deleteGraphItems,emptyWorkbench,exampleResource,moveView,openResource,patchView,removeResource,replaceResource,splitPane} from '../packages/contracts/src/workbench.ts';
import {evidenceOf,projectGraph,runtimeTargets,type RootWorkbench,type GraphResource} from '../packages/contracts/src/foundation.ts';
import type {Execution} from '../packages/contracts/src/index.ts';
const fixture=():RootWorkbench=>JSON.parse(readFileSync(new URL('./fixtures/foundation.json',import.meta.url),'utf8'));

test('shared server/client fixture has valid references',()=>assertWorkbench(fixture()));
test('two panes reference exactly one notebook resource',()=>{
 const a=openResource(fixture(),'notebook-fixture'),before=structuredClone(a),b=splitPane(a);
 assert.equal(b.resources.filter(r=>r.kind==='notebook').length,1);
 assert.equal(b.views.filter(v=>v.resource_id==='notebook-fixture').length,2);
 assert.deepEqual(a,before);assertWorkbench(b);
});
test('opening an already-open resource focuses without duplicating tabs',()=>{
 const a=fixture(),b=openResource(a,'workflow-fixture');assert.equal(a.views.length,b.views.length);
});
test('geometry/selection does not revise domain source',()=>{
 const a=fixture(),b=patchView(a,'view-workflow',{positions:{ingest:{x:900,y:10}},selected_node:null});
 assert.equal(a.resources,b.resources);assert.equal(b.resources[0].revision,0);
});
test('semantic update is shared by all views and advances the resource revision',()=>{
 const a=splitPane(fixture()),r=a.resources[0],b=replaceResource(a,{...r,title:'Updated once'});
 assert.equal(b.resources[0].revision,1);assert.equal(b.views.length,2);
 assert.equal(new Set(b.views.map(v=>v.resource_id)).size,1);assert.equal(a.resources[0].title,'Ingest and transform');
});
test('closing views or panes never deletes source and maintains one placement',()=>{
 const a=splitPane(fixture()),b=closePane(a,a.panes[1].id);assert.equal(b.views.length,2);assert.equal(b.panes.length,1);
 const c=closeView(b,b.views[0].id);assert.equal(c.resources.length,a.resources.length);assertWorkbench(c);
});
test('moving a tab preserves view identity and layout',()=>{
 const a=splitPane(fixture()),id=a.views[0].id,b=moveView(a,id,a.panes[1].id);
 assert.deepEqual(b.views.find(v=>v.id===id),a.views.find(v=>v.id===id));assertWorkbench(b);
});
test('pane limit fails without mutating original',()=>{
 const a=splitPane(splitPane(fixture())),before=structuredClone(a);assert.throws(()=>splitPane(a),/Three panes/);assert.deepEqual(a,before);
});
test('dependency and derivation cycles fail closed',()=>{
 const w=exampleResource('workflow'),l=exampleResource('lineage');assert.throws(()=>connectGraph(w,'transform','ingest'),/cycle/);assert.throws(()=>connectGraph(l,'gold','bronze'),/cycle/);
});
test('relationship cycles and distinct column relationships are not dependency cycles',()=>{
 const r=exampleResource('data-model');assert.equal(r.kind,'data-model');if(r.kind!=='data-model')return;
 const reverse={...r,relationships:[...r.relationships,{id:'reverse',source:'sales',target:'customer',source_column:'customer_key',target_column:'customer_key',cardinality:'many-to-one' as const}]};
 assertGraph(reverse);assert.throws(()=>assertGraph({...r,relationships:[...r.relationships,{...r.relationships[0],id:'duplicate'}]}),/Duplicate/);
});
test('model relationships require actual declared columns',()=>{
 const r=exampleResource('data-model');if(r.kind!=='data-model')return;assert.throws(()=>assertGraph({...r,tables:r.tables.map(t=>({...t,columns:[]}))}),/column/);
});
test('deleting a node cleans all view selections and incident edges',()=>{
 const a=splitPane(fixture()),resource=a.resources[0] as GraphResource,b=replaceResource(a,deleteGraphItems(resource,['ingest'],[]));
 assert.equal(projectGraph(b.resources[0] as GraphResource).edges.length,0);
 for(const v of b.views){assert.equal(v.selected_node,null);assert.equal(v.positions.ingest,undefined)}
});
test('missing notebook links and duplicate canonical references are rejected',()=>{
 const a=fixture(),n=a.resources.find(r=>r.kind==='notebook')!;assert.throws(()=>addResource(a,{...n,id:'another-notebook'}),/canonical notebook/);
 assert.throws(()=>removeResource(a,n.id),/Unlink/);
});
test('removing a design detaches its views without deleting the underlying notebook reference',()=>{
 const a=removeResource(fixture(),'workflow-fixture');assert.equal(a.views.length,0);assert.equal(a.resources.some(r=>r.kind==='notebook'),true);assertWorkbench(a);
});
test('unknown edge endpoints reject without accepting a partial graph',()=>{
 const r=exampleResource('workflow'),before=structuredClone(r);assert.throws(()=>connectGraph(r,'missing','ingest'),/endpoint/);assert.deepEqual(r,before);
});
test('MotherDuck is a first-class but unavailable target, never a fake successful executor',()=>{
 const targets=runtimeTargets(null);assert.equal(targets.find(t=>t.id==='remote.motherduck')?.available,false);assert.equal(targets.find(t=>t.id==='remote.motherduck')?.execution,'unavailable');assert.equal(targets.filter(t=>t.available).length,0);
});
test('measured local and modeled Spark times remain distinct',()=>{
 const run={status:'success',language:'sparklab',elapsed_ms:12,simulation:{status:'modeled',metrics:{total_duration_s:900}}} as Execution;
 assert.deepEqual(evidenceOf(run),{semantic:'emulated',simulation:'simulated',measured_local_ms:12,modeled_duration_s:900});
 assert.equal(evidenceOf({...run,simulation:{status:'unavailable'}}).modeled_duration_s,null);
});
test('minimal empty workspace is a valid additive envelope',()=>assertWorkbench(emptyWorkbench()));
