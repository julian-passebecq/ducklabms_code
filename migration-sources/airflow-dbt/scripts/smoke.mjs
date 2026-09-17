import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root=resolve(import.meta.dirname,'..');
execFileSync(process.platform==='win32'?'node.exe':'node',[resolve(root,'scripts/build.mjs')],{cwd:root,stdio:'inherit'});
const dist=resolve(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
  const raw=(req.url??'/').split('?')[0];
  const candidate=normalize(join(dist,raw));
  const file=(candidate===dist||candidate.startsWith(dist+sep))&&existsSync(candidate)&&statSync(candidate).isFile()?candidate:join(dist,'index.html');
  res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'});res.end(readFileSync(file));
});
await new Promise((resolvePromise)=>server.listen(0,'127.0.0.1',resolvePromise));
try{
  const address=server.address(); assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}`;
  for(const route of ['/airflow','/dbt','/hybrid']){
    const response=await fetch(base+route); const text=await response.text();
    assert.equal(response.status,200,`${route} status`); assert.match(text,/id="root"/); assert.match(text,/type="importmap"/); assert.match(text,/UI runtime could not be loaded/); assert.match(text,/showBootError/); assert.match(text,/import\('\/src\/main\.js'\)/);
  }
  const main=await fetch(`${base}/src/main.js`); assert.equal(main.status,200); const mainText=await main.text(); assert.match(mainText,/createRoot/); assert.match(mainText,/appReady/);
  const snapshotModule=await fetch(`${base}/src/lib/snapshotSimulator.js`); assert.equal(snapshotModule.status,200); const snapshotText=await snapshotModule.text(); assert.match(snapshotText,/simulateSnapshot/); assert.match(snapshotText,/dbt_valid_from/);
  const caseModule=await fetch(`${base}/src/data/caseStudies.js`); assert.equal(caseModule.status,200); const caseText=await caseModule.text(); assert.match(caseText,/mock_marketplace/); assert.match(caseText,/daily_fulfillment_sla/);
  const overviewModule=await fetch(`${base}/src/components/CaseOverview.js`); assert.equal(overviewModule.status,200); const overviewText=await overviewModule.text(); assert.match(overviewText,/Start from the requirements/); assert.match(overviewText,/Reveal after you make your own plan/); assert.match(overviewText,/Your design note/); assert.match(overviewText,/Clear practice state/); assert.match(overviewText,/self-review/); assert.match(overviewText,/Browser storage is unavailable/);
  const hybridModule=await fetch(`${base}/src/lib/hybridSimulator.js`); assert.equal(hybridModule.status,200); const hybridText=await hybridModule.text(); assert.match(hybridText,/runPhaseStatus/); assert.match(hybridText,/testPhaseStatus/);
  const airflowModule=await fetch(`${base}/src/lib/airflowSimulator.js`); assert.equal(airflowModule.status,200); const airflowText=await airflowModule.text(); assert.match(airflowText,/simulationStepBudget/);
  const dbtModule=await fetch(`${base}/src/lib/dbtSimulator.js`); assert.equal(dbtModule.status,200); const dbtText=await dbtModule.text(); assert.match(dbtText,/runEligibleProjectSnapshots/); assert.match(dbtText,/referenced model/);
  const graphModule=await fetch(`${base}/src/components/GraphCanvas.js`); assert.equal(graphModule.status,200); const graphText=await graphModule.text(); assert.match(graphText,/graph-arrow-/);
  const css=await fetch(`${base}/styles.css`); assert.equal(css.status,200); const cssText=await css.text(); assert.match(cssText,/schedule-panel/); assert.match(cssText,/snapshot-lab/); assert.match(cssText,/contract-section/); assert.match(cssText,/boot-fallback/);
  assert.match(cssText,/mock-project-card/); assert.match(cssText,/mock-answer/); assert.match(cssText,/mock-progress/); assert.match(cssText,/mock-review-list/); assert.match(cssText,/phase-chip/); assert.match(cssText,/graph-node\.static/);
  console.log('PASS static SPA route/module/style smoke');
}finally{await new Promise((resolvePromise,reject)=>server.close((error)=>error?reject(error):resolvePromise()));}
