import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const temp=path.resolve('.qa-engine-v21'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/dataRuntime.ts','src/lib/workspaceInsights.ts','src/lib/productionWorkflow.ts','src/lib/caseStudyEvidence.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);fs.rmSync(temp,{recursive:true,force:true});process.exit(1);} fs.writeFileSync(path.join(temp,'package.json'),'{'+'"type":"commonjs"'+'}');
const require=createRequire(import.meta.url); const data=require(path.join(temp,'data/caseStudies.js')); const runtime=require(path.join(temp,'lib/dataRuntime.js')); const prod=require(path.join(temp,'lib/productionWorkflow.js')); const evidence=require(path.join(temp,'lib/caseStudyEvidence.js')); const insights=require(path.join(temp,'lib/workspaceInsights.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
const stages=['design','govern','ingest','transform','orchestrate','serve','operate'];
for(const c of data.caseStudies){
  for(const platform of ['fabric','databricks']){
    const runStage=platform==='fabric'?prod.runFabricProductionStage:prod.runDatabricksProductionStage;
    let w=runtime.seedWorkspace(c);
    for(const stage of stages) w=runStage(w,c,stage).workspace;
    check(`${platform} starts fully fresh: ${c.id}`,prod.productionLifecycleEvidence(w,c,platform).every(x=>x.status==='fresh'),JSON.stringify(prod.productionLifecycleEvidence(w,c,platform)));
    check(`${platform} starts at 100% acceptance: ${c.id}`,evidence.caseStudyAcceptanceScore(c,w).percent===100,JSON.stringify(evidence.caseStudyAcceptanceScore(c,w)));

    const beforeServe=prod.productionStageEvidence(w,c,platform,'serve');
    w=runStage(w,c,'ingest').workspace;
    const afterIngest=prod.productionLifecycleEvidence(w,c,platform);
    check(`${platform} ingest rerun remains fresh: ${c.id}`,afterIngest.find(x=>x.stage==='ingest')?.status==='fresh',JSON.stringify(afterIngest));
    check(`${platform} transform becomes stale after ingest rerun: ${c.id}`,afterIngest.find(x=>x.stage==='transform')?.status==='stale',JSON.stringify(afterIngest));
    check(`${platform} serve becomes stale after ingest rerun: ${c.id}`,afterIngest.find(x=>x.stage==='serve')?.status==='stale',JSON.stringify(afterIngest));
    check(`${platform} operate becomes stale after ingest rerun: ${c.id}`,afterIngest.find(x=>x.stage==='operate')?.status==='stale',JSON.stringify(afterIngest));
    const staleScore=evidence.caseStudyAcceptanceScore(c,w);
    check(`${platform} stale downstream drops acceptance below 100: ${c.id}`,staleScore.percent<100,JSON.stringify(staleScore));
    check(`${platform} serving object write snapshot did not magically change: ${c.id}`,prod.productionStageEvidence(w,c,platform,'serve').snapshot===beforeServe.snapshot,JSON.stringify(prod.productionStageEvidence(w,c,platform,'serve')));

    for(const stage of ['transform','orchestrate','serve','operate']) w=runStage(w,c,stage).workspace;
    check(`${platform} affected path returns to 7/7 fresh: ${c.id}`,prod.productionCompletedStages(w,c,platform).length===7,prod.productionCompletedStages(w,c,platform).join(','));
    check(`${platform} acceptance returns to 100 after reprocess: ${c.id}`,evidence.caseStudyAcceptanceScore(c,w).percent===100,JSON.stringify(evidence.caseStudyAcceptanceScore(c,w)));
  }
}

// Fresh candidate must win over a stale artifact from the other platform.
{
  const c=data.caseStudies.find(x=>x.id==='retail-medallion');
  let w=runtime.seedWorkspace(c);
  for(const stage of stages) w=prod.runFabricProductionStage(w,c,stage).workspace;
  for(const stage of stages) w=prod.runDatabricksProductionStage(w,c,stage).workspace;
  w=prod.runFabricProductionStage(w,c,'ingest').workspace;
  const fabricSilver=insights.workspaceObjectFreshness(w,'silver.fabric_sales_clean');
  const dbxSilver=insights.workspaceObjectFreshness(w,'silver.dbx_sales_clean');
  check('Mixed-platform workspace has stale Fabric Silver after Fabric ingest rerun',fabricSilver.status==='stale',JSON.stringify(fabricSilver));
  check('Mixed-platform workspace keeps Databricks Silver fresh',dbxSilver.status==='fresh',JSON.stringify(dbxSilver));
  const silver=evidence.evaluateCaseStudyAcceptance(c,w).find(x=>x.id==='retail-silver');
  check('Business acceptance uses fresh Databricks candidate instead of stale Fabric candidate',silver?.passed===true&&silver.status==='pass',JSON.stringify(silver));
}

// Three-level Databricks aliases must share the same freshness/history identity as local schema.table objects.
{
  const c=data.caseStudies.find(x=>x.id==='retail-medallion');
  let w=runtime.seedWorkspace(c);
  w=prod.runDatabricksProductionStage(w,c,'ingest').workspace;
  const before=insights.workspaceObjectWriteSnapshot(w,'training.bronze.dbx_sales_raw');
  w=prod.runDatabricksProductionStage(w,c,'ingest').workspace;
  const after=insights.workspaceObjectWriteSnapshot(w,'training.bronze.dbx_sales_raw');
  check('Three-level Databricks alias resolves current history snapshot',after>before,`${before} -> ${after}`);
  check('Three-level alias canonicalizes to local workspace object',insights.workspaceObjectCanonicalName(w,'training.bronze.dbx_sales_raw')==='bronze.dbx_sales_raw',insights.workspaceObjectCanonicalName(w,'training.bronze.dbx_sales_raw'));
}

const failed=results.filter(r=>!r.ok); for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V21 freshness/consistency engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
