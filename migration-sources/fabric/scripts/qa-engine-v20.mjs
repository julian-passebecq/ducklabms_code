import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const temp=path.resolve('.qa-engine-v20'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/dataRuntime.ts','src/lib/workspaceInsights.ts','src/lib/productionWorkflow.ts','src/lib/caseStudyEvidence.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);fs.rmSync(temp,{recursive:true,force:true});process.exit(1);} fs.writeFileSync(path.join(temp,'package.json'),'{'+'"type":"commonjs"'+'}');
const require=createRequire(import.meta.url); const data=require(path.join(temp,'data/caseStudies.js')); const runtime=require(path.join(temp,'lib/dataRuntime.js')); const prod=require(path.join(temp,'lib/productionWorkflow.js')); const evidence=require(path.join(temp,'lib/caseStudyEvidence.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
const stages=['design','govern','ingest','transform','orchestrate','serve','operate'];
for(const c of data.caseStudies){
  check(`Case brief exists: ${c.id}`,Boolean(c.brief),c.brief?.businessProblem??'missing');
  check(`Case has production source estate: ${c.id}`,(c.brief?.sourceSystems?.length??0)>=1,String(c.brief?.sourceSystems?.length??0));
  check(`Case has data contracts: ${c.id}`,(c.brief?.dataContracts?.length??0)>=2,String(c.brief?.dataContracts?.length??0));
  check(`Case has five acceptance gates: ${c.id}`,(c.brief?.acceptanceCriteria?.length??0)===5,String(c.brief?.acceptanceCriteria?.length??0));
  let seed=runtime.seedWorkspace(c);
  const seedScore=evidence.caseStudyAcceptanceScore(c,seed);
  check(`Seed data does not falsely complete case: ${c.id}`,seedScore.passed===0,JSON.stringify(seedScore));
  check(`Baseline checkpoint is not recovery evidence: ${c.id}`,!evidence.evaluateCaseStudyAcceptance(c,seed).some(x=>x.id.endsWith('recovery')&&x.passed),JSON.stringify(evidence.evaluateCaseStudyAcceptance(c,seed)));

  let fw=runtime.seedWorkspace(c);
  for(const stage of stages) fw=prod.runFabricProductionStage(fw,c,stage).workspace;
  const fScore=evidence.caseStudyAcceptanceScore(c,fw);
  check(`Fabric production track satisfies case acceptance: ${c.id}`,fScore.passed===fScore.total&&fScore.total===5,JSON.stringify(fScore));
  const fCompleted=prod.productionCompletedStages(fw,c,'fabric');
  check(`Fabric lifecycle evidence reaches 7/7: ${c.id}`,fCompleted.length===7,fCompleted.join(','));
  check(`Fabric case creates non-seed lineage: ${c.id}`,fw.lineage.length>0,String(fw.lineage.length));
  check(`Fabric case creates recovery checkpoint: ${c.id}`,fw.checkpoints.some(cp=>cp.id!=='baseline'),String(fw.checkpoints.length));

  let dw=runtime.seedWorkspace(c);
  for(const stage of stages) dw=prod.runDatabricksProductionStage(dw,c,stage).workspace;
  const dScore=evidence.caseStudyAcceptanceScore(c,dw);
  check(`Databricks production track satisfies case acceptance: ${c.id}`,dScore.passed===dScore.total&&dScore.total===5,JSON.stringify(dScore));
  const dCompleted=prod.productionCompletedStages(dw,c,'databricks');
  check(`Databricks lifecycle evidence reaches 7/7: ${c.id}`,dCompleted.length===7,dCompleted.join(','));
  check(`Databricks case creates non-seed lineage: ${c.id}`,dw.lineage.length>0,String(dw.lineage.length));
  check(`Databricks case creates recovery checkpoint: ${c.id}`,dw.checkpoints.some(cp=>cp.id!=='baseline'),String(dw.checkpoints.length));
}
const failed=results.filter(r=>!r.ok); for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V20 case-study engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
