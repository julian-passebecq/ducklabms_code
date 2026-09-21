const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {loadTs} = require('../scripts/ui-m1-load-ts.cjs');
const base = path.resolve(__dirname,'../apps/web/src/studio');
const m = loadTs(path.join(base,'desktopModel.ts'));
const ed = loadTs(path.join(base,'editorEdits.ts'));
const fx = loadTs(path.join(base,'previewFixtures.ts'));
const worker = loadTs(path.resolve(__dirname,'../cloudflare/worker.ts')).default;
const cases = [null,undefined,[],{},0,'invalid',true,{version:2},{version:1,explorerWidth:NaN,resultHeight:Infinity}];
for (const value of cases) test(`layout safely normalizes ${JSON.stringify(value)}`,()=>{
  const result=m.normalizeLayout(value);assert.equal(result.version,1);assert.ok(result.explorerWidth>=180&&result.explorerWidth<=460);assert.ok(Number.isFinite(result.resultHeight));
});
test('layout keeps supported values, clamps bounds and ignores injected fields',()=>{
  const result=m.normalizeLayout({version:1,explorerSide:'right',explorerOpen:false,inspectorOpen:true,explorerWidth:1000,inspectorWidth:1,resultHeight:999,problemWidth:-10,compact:true,source:'bad'});
  assert.deepEqual(result,{version:1,explorerSide:'right',explorerOpen:false,inspectorOpen:true,explorerWidth:460,inspectorWidth:200,resultHeight:560,problemWidth:240,compact:true});
});
test('layout default object cannot be polluted by returned state',()=>{const a=m.normalizeLayout(null);a.explorerWidth=400;assert.equal(m.normalizeLayout(null).explorerWidth,244);});
test('workspace and notebook layout keys do not collide',()=>{assert.notEqual(m.layoutKey('a:b','c'),m.layoutKey('a','b:c'));assert.notEqual(m.layoutKey('x','a'),m.layoutKey('y','a'));});
test('layout persists and restores through the StoragePort contract',()=>{
  const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,val)=>map.set(key,val)};
  const layout={...m.DEFAULT_LAYOUT,explorerSide:'right',explorerWidth:320};
  assert.equal(m.writeLayout(storage,'key',layout),'');assert.deepEqual(m.readLayout(storage,'key').layout,layout);
});
test('corrupt layout recovers without mutating source',()=>{const result=m.readLayout({getItem:()=>'{broken',setItem:()=>{}},'key');assert.deepEqual(result.layout,m.DEFAULT_LAYOUT);assert.match(result.warning,/unavailable/);});
test('quota/security errors are visible not swallowed',()=>{const storage={getItem(){throw new Error('SecurityError');},setItem(){throw new Error('QuotaExceededError');}};assert.ok(m.readLayout(storage,'key').warning);assert.ok(m.writeLayout(storage,'key',m.DEFAULT_LAYOUT));assert.ok(m.writeLayout(null,'key',m.DEFAULT_LAYOUT));});
const blocks=[{id:'a',type:'sql',title:'A',exerciseId:'ex',notebook:{cellId:'c-a'}},{id:'out',type:'notebook-output',title:'Out',notebook:{cellId:'c-out',parentCellId:'c-a'}},{id:'b',type:'python',title:'B'},{id:'help',type:'markdown',title:'Help',role:'exercise-help'},{id:'problem',type:'markdown',title:'Question',role:'problem'}];
const notebook={id:'n',title:'N',blocks,views:[{id:'notebook',blockIds:['b','a','out']},{id:'free',blockIds:['out','a','b']}],exercise:{id:'ex',version:'1'}};
test('semantic order ignores physical block order and canvas placement',()=>{
  const before=JSON.stringify(notebook);assert.deepEqual(m.semanticBlocks(notebook).map(b=>b.id),['b','a','out']);assert.equal(JSON.stringify(notebook),before);
});
test('missing/duplicate view references do not duplicate render cells',()=>{assert.deepEqual(m.semanticBlocks({...notebook,views:[{id:'notebook',blockIds:['missing','b','b','a']}]}).map(b=>b.id),['b','a']);});
test('no notebook view falls back to canonical blocks, without sorting',()=>{assert.deepEqual(m.semanticBlocks({...notebook,views:[]}),blocks);});
test('arena uses exercise answer identity, separates scratch and groups its output',()=>{const result=m.arenaBlocks(notebook);assert.deepEqual(result.answers.map(b=>b.id),['a']);assert.deepEqual(result.scratch.map(b=>b.id),['b']);assert.deepEqual(result.results.map(b=>b.id),['out']);assert.equal(result.help[0].id,'help');});
test('plain notebook cannot accidentally become an arena answer',()=>{assert.equal(m.arenaBlocks({...notebook,exercise:undefined}).answers.length,0);});
test('read-only imported code is not runnable',()=>{assert.equal(m.isCode({id:'x',title:'X',type:'python',readOnly:true}),false);assert.equal(m.isCode({id:'x',title:'X',type:'markdown'}),false);});
test('catalog does not lose custom layers or mutate source order',()=>{
  const assets=[{name:'z.extra',layer:'custom',row_count:2,fresh:true},{name:'s.b',layer:'silver',row_count:1,fresh:true},{name:'source.a',layer:'source',row_count:8,fresh:true}];
  const before=JSON.stringify(assets);assert.deepEqual(m.groupCatalog(assets,'').map(g=>g.layer),['source','silver','custom']);assert.equal(JSON.stringify(assets),before);assert.equal(m.groupCatalog(assets,'SOURCE.A')[0].assets.length,1);assert.equal(m.groupCatalog(assets,'none').length,0);
});
test('SQL table names are quoted, not interpolated as statements',()=>{
  assert.equal(m.previewSql('source.orders'),'SELECT * FROM "source"."orders" LIMIT 100');
  assert.equal(m.previewSql('a"; DROP TABLE x;--'),'SELECT * FROM "a""; DROP TABLE x;--" LIMIT 100');
  for(const value of ['', 'a..b', 'a\0b', '.a']) assert.throws(()=>m.previewSql(value));
});
for (const width of [320,640,899,900,1024,1180,1500]) test(`responsive panels leave usable center at width ${width}`,()=>{
  const sizes=m.visiblePanelSizes({...m.DEFAULT_LAYOUT,inspectorOpen:true,explorerWidth:460,inspectorWidth:460},width,false);
  assert.ok(sizes.explorer>=0&&sizes.inspector>=0);assert.ok(width-sizes.explorer-sizes.inspector>=Math.min(width,420));if(width<900)assert.equal(sizes.explorer,0);
});
test('focus hides sidebars without changing stored geometry',()=>{const layout={...m.DEFAULT_LAYOUT,inspectorOpen:true};const before=JSON.stringify(layout);assert.equal(m.visiblePanelSizes(layout,1500,true).explorer,0);assert.equal(m.visiblePanelSizes(layout,1500,true).inspector,0);assert.equal(JSON.stringify(layout),before);});
test('command search matches every term and bounds result count',()=>{const commands=Array.from({length:100},(_,i)=>({id:String(i),label:`Table order ${i}`,detail:'source warehouse',kind:'table',run(){}}));assert.equal(m.filterCommands(commands,'table source').length,80);assert.equal(m.filterCommands(commands,'missing').length,0);assert.equal(m.filterCommands(commands,'order 99')[0].id,'99');});
for (const [source,start,end,expected] of [['abc',1,1,'a    bc'],['a\nb\nc',0,4,'    a\n    b\nc'],['\na',0,0,'    \na'],['a\nb',0,3,'    a\n    b']]) test(`indent selection ${JSON.stringify(source)} ${start}:${end}`,()=>{assert.equal(ed.indentSelection(source,start,end).value,expected);});
test('multiline indentation can be exactly reversed',()=>{const source='one\n  two\nthree';const a=ed.indentSelection(source,0,source.length);const b=ed.indentSelection(a.value,a.start,a.end,true);assert.equal(b.value,source);assert.equal(b.end,source.length);});
test('outdent handles a tab and short indentation',()=>{assert.equal(ed.indentSelection('\tx\n  y',0,6,true).value,'x\ny');});
test('outdent cursor within leading spaces never goes negative',()=>{const r=ed.indentSelection('    x',2,2,true);assert.deepEqual(r,{value:'x',start:0,end:0});});
test('blank first line outdent keeps following line intact',()=>{assert.equal(ed.indentSelection('\nabc',0,0,true).value,'\nabc');});
test('python colon newline adds one indentation level',()=>{assert.deepEqual(ed.insertNewline('    if ok:',10,10,'python'),{value:'    if ok:\n        ',start:19,end:19});});
test('SQL newline copies indentation without Python colon rules',()=>{assert.equal(ed.insertNewline('  label:',8,8,'sql').value,'  label:\n  ');});
test('newline at start of blank line does not eat source',()=>{assert.deepEqual(ed.insertNewline('\na',0,0,'python'),{value:'\n\na',start:1,end:1});});
test('SQL and Python comment toggles round-trip multi-line source',()=>{for(const language of ['sql','python']){const source='  a\nb\n\nc';const a=ed.toggleLineComment(source,0,source.length,language);const b=ed.toggleLineComment(a.value,a.start,a.end,language);assert.equal(b.value,source);}});
test('comment selection ending at next line does not touch next line',()=>{assert.equal(ed.toggleLineComment('a\nb',0,2,'sql').value,'-- a\nb');});
test('comment cursor at start of empty line does not modify next line',()=>{assert.equal(ed.toggleLineComment('\na',0,0,'python').value,'\na');});
test('invalid selection positions are bounded',()=>{for(const fn of [ed.indentSelection,(s,a,b)=>ed.insertNewline(s,a,b,'sql'),(s,a,b)=>ed.toggleLineComment(s,a,b,'sql')]){const r=fn('abc',-9,900);assert.ok(r.start>=0&&r.end>=r.start&&r.end<=r.value.length);}});
test('fixture documents use RootNotebook-shaped source and views, no evidence',()=>{
  for(const doc of [fx.makeNotebookFixture(),...fx.PREVIEW_EXERCISES.map(fx.makeExerciseFixture)]){assert.equal(doc.schemaVersion,1);assert.equal(Object.keys(doc.executions).length,0);const restored=fx.readFixtureDocuments(JSON.stringify({[doc.id]:doc}));assert.equal(restored[doc.id].id,doc.id);}
});
test('fixture storage strips claimed execution evidence',()=>{const doc=fx.makeNotebookFixture();doc.executions={forged:{status:'success'}};doc.executedSource={forged:'x'};doc.outputCheckpoints={forged:'x'};const result=fx.readFixtureDocuments(JSON.stringify({[doc.id]:doc}))[doc.id];assert.deepEqual(result.executions,{});assert.deepEqual(result.executedSource,{});assert.deepEqual(result.outputCheckpoints,{});});
test('fixture restore rejects duplicate IDs, oversized files and hostile geometry',()=>{
  const doc=fx.makeNotebookFixture();doc.blocks.push(doc.blocks[0]);assert.throws(()=>fx.readFixtureDocuments(JSON.stringify({[doc.id]:doc})));
  assert.throws(()=>fx.readFixtureDocuments(' '.repeat(2_000_001)));
  const bad=fx.makeNotebookFixture();bad.views[0].layout[0].x=100;assert.throws(()=>fx.readFixtureDocuments(JSON.stringify({[bad.id]:bad})));
});
for(const pathname of ['/api','/api/workspaces','/api/foo?x=1'])test(`static worker never serves HTML as API success ${pathname}`,async()=>{
  let calls=0;const response=await worker.fetch(new Request('https://example.test'+pathname),{ASSETS:{fetch:async()=>{calls++;return new Response('html');}}});assert.equal(response.status,503);assert.equal(calls,0);assert.equal((await response.json()).compute,'none');assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('static worker forwards non-API requests unchanged',async()=>{const request=new Request('https://example.test/?preview=1');let received;const response=await worker.fetch(request,{ASSETS:{fetch:async r=>{received=r;return new Response('UI');}}});assert.equal(received,request);assert.equal(await response.text(),'UI');});

test('preferred view restores only known views and never internal practice snapshots',()=>{
  const views=[{id:'notebook'},{id:'free'},{id:'saved-practice-cell'}];
  assert.equal(m.normalizePreferredView('free',views),'free');assert.equal(m.normalizePreferredView('practice',views),'practice');
  for(const value of [undefined,null,4,'missing','saved-practice-cell',''])assert.equal(m.normalizePreferredView(value,views),undefined);
});
test('outdent selection ending inside last-line indentation maps to its new start',()=>{
  const result=ed.indentSelection('    x\n    y',0,7,true);assert.deepEqual(result,{value:'x\ny',start:0,end:2});
});
test('prefix edits preserve ordered, bounded selections over exhaustive small examples',()=>{
  for(const source of ['    x\n    y','\na\n', '\tx\n  y','a\n b\nc'])for(let a=0;a<=source.length;a++)for(let b=a;b<=source.length;b++){
    for(const edit of [ed.indentSelection(source,a,b),ed.indentSelection(source,a,b,true),ed.toggleLineComment(source,a,b,'sql')]){
      assert.ok(edit.start>=0&&edit.end>=edit.start&&edit.end<=edit.value.length,JSON.stringify({source,a,b,edit}));
    }
  }
});
