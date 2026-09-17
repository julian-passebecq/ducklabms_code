import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp=path.resolve('.qa-engine-v16');
fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/operationsRuntime.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);fs.rmSync(temp,{recursive:true,force:true});process.exit(1);}
fs.writeFileSync(path.join(temp,'package.json'),'{'+'"type":"commonjs"'+'}');
const require=createRequire(import.meta.url); const ops=require(path.join(temp,'lib/operationsRuntime.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
const source={
  id:'run-source',caseStudyId:'retail-medallion',experience:'fabric',startedAt:'2026-09-17T10:00:00Z',durationMs:3000,status:'Failed',trigger:'Debug',activities:[
    {nodeId:'a',name:'Copy',type:'copy',status:'Succeeded',durationMs:1000,startOffsetMs:0,attempts:1,input:'{}',output:'copied',metrics:{},secureInput:false,secureOutput:false,dependencies:[]},
    {nodeId:'b',name:'dbt',type:'dbt',status:'Failed',durationMs:1000,startOffsetMs:1000,attempts:1,input:'{}',output:'failed',error:'test failed',metrics:{},secureInput:false,secureOutput:false,dependencies:[{nodeId:'a',condition:'Succeeded'}]},
    {nodeId:'c',name:'Publish',type:'storedProcedure',status:'Skipped',durationMs:0,startOffsetMs:2000,attempts:0,input:'{}',output:'skipped',metrics:{},secureInput:false,secureOutput:false,dependencies:[{nodeId:'b',condition:'Succeeded'}]},
  ]
};
{
  const retry=ops.createFabricRetryRun(source,'Full retry');
  check('Fabric full retry records parent run',retry.parentRunId==='run-source',retry.parentRunId);
  check('Fabric full retry succeeds all representative activities',retry.activities.every(a=>a.status==='Succeeded'),retry.activities.map(a=>a.status).join(','));
}
{
  const retry=ops.createFabricRetryRun(source,'From failed activity');
  check('Retry from failure preserves successful upstream',retry.activities[0].status==='Succeeded'&&retry.activities[0].rerunDisposition==='Preserved',JSON.stringify(retry.activities[0]));
  check('Retry from failure reruns failed and downstream path',retry.activities[1].status==='Succeeded'&&retry.activities[2].status==='Succeeded',retry.activities.map(a=>a.status).join(','));
  check('Retry from failure records start node',retry.rerunFromNodeId==='b',retry.rerunFromNodeId);
}
{
  const retry=ops.createFabricRetryRun(source,'From selected activity','c');
  check('Selected-activity rerun preserves earlier path',retry.activities[0].rerunDisposition==='Preserved'&&retry.activities[1].rerunDisposition==='Preserved',retry.activities.map(a=>a.status).join(','));
  check('Selected-activity rerun executes chosen activity',retry.activities[2].status==='Succeeded',retry.activities[2].status);
}
{
  const first=ops.simulateAutoLoaderSchemaDrift('addNewColumns',false);
  const restarted=ops.simulateAutoLoaderSchemaDrift('addNewColumns',true);
  check('Auto Loader additive drift requires restart on first detection',first.restartRequired&&first.status==='Restart required',JSON.stringify(first));
  check('Auto Loader additive drift succeeds after restart',!restarted.restartRequired&&restarted.status==='Succeeded'&&restarted.targetColumns.includes('firmware_version'),JSON.stringify(restarted));
}
{
  const widened=ops.simulateAutoLoaderSchemaDrift('addNewColumnsWithTypeWidening',true);
  check('Auto Loader widening mode teaches compatible type widening',widened.message.includes('widened to DOUBLE'),widened.message);
  const strict=ops.simulateAutoLoaderSchemaDrift('failOnNewColumns',false);
  check('Auto Loader strict contract fails on new columns',strict.status==='Failed'&&!strict.schemaChanged,JSON.stringify(strict));
  const rescue=ops.simulateAutoLoaderSchemaDrift('rescue',false);
  check('Auto Loader rescue keeps target schema and captures unexpected fields',rescue.status==='Rescued'&&rescue.rescuedRecords>0&&rescue.targetColumns.includes('_rescued_data'),JSON.stringify(rescue));
}
{
  const run=ops.simulateDatabricksJobRun(true,{processing_date:'2026-09-18',target_layer:'gold'});
  check('Databricks failed job marks quality task failed',run.tasks.find(t=>t.key==='quality_gate')?.status==='Failed',JSON.stringify(run.tasks));
  check('Databricks failed job skips dependent task',run.tasks.find(t=>t.key==='aggregate_gold')?.status==='Skipped',JSON.stringify(run.tasks));
  check('Databricks job emits task values',run.tasks.find(t=>t.key==='ingest_bronze')?.taskValues?.rows_ingested===4820,JSON.stringify(run.tasks[0]));
  const repair=ops.repairDatabricksJobRun(run,{target_layer:'gold_repaired'});
  check('Databricks repair succeeds failed/skipped subset',repair.status==='Succeeded'&&repair.tasks.every(t=>t.status==='Succeeded'),JSON.stringify(repair.tasks));
  check('Databricks repair preserves successful upstream tasks',repair.tasks.find(t=>t.key==='ingest_bronze')?.output.includes('Preserved from parent run'),repair.tasks.find(t=>t.key==='ingest_bronze')?.output);
  check('Databricks repair accepts parameter override',repair.parameters.target_layer==='gold_repaired',JSON.stringify(repair.parameters));
  check('Databricks repair identifies parent run',repair.repairedFrom===run.id,repair.repairedFrom);
}
const failed=results.filter(r=>!r.ok); for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V16 operational engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
