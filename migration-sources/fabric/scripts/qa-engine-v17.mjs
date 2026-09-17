import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const temp=path.resolve('.qa-engine-v17'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/pipeline.ts','src/lib/operationsRuntime.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);fs.rmSync(temp,{recursive:true,force:true});process.exit(1);} fs.writeFileSync(path.join(temp,'package.json'),'{'+'"type":"commonjs"'+'}');
const require=createRequire(import.meta.url); const pipeline=require(path.join(temp,'lib/pipeline.js')); const ops=require(path.join(temp,'lib/operationsRuntime.js')); const data=require(path.join(temp,'data/caseStudies.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail}); const retail=data.caseStudies.find(c=>c.id==='retail-medallion');
{
  const config=pipeline.defaultConfig('copy');
  check('Fabric retry defaults include interval type',config.retryIntervalType==='Fixed',JSON.stringify(config));
  check('Fabric retry defaults include conditional retry fields',config.retryConditionField==='Any failure'&&config.maxRetryIntervalSeconds===3600,JSON.stringify(config));
}
{
  const n=pipeline.makeNode('copy',0); n.name='CopyRetry'; n.config.source='raw'; n.config.destination='bronze'; n.config.retry=3; n.config.retryIntervalType='Increasing Delay'; n.config.retryIntervalSeconds=30; n.config.maxRetryIntervalSeconds=20;
  const problems=pipeline.validatePipeline([n],[]);
  check('Increasing-delay validation rejects max below base',problems.some(p=>p.includes('max retry interval must be at least')),problems.join(' | '));
  n.config.maxRetryIntervalSeconds=120; n.config.retryConditionField='Error code'; n.config.retryConditionValue='';
  const conditionProblems=pipeline.validatePipeline([n],[]);
  check('Conditional retry requires a match value',conditionProblems.some(p=>p.includes('retry condition value is required')),conditionProblems.join(' | '));
}
{
  const a=pipeline.makeNode('copy',0); a.id='a'; a.name='Copy'; a.config.source='raw'; a.config.destination='bronze';
  const b=pipeline.makeNode('notebook',1); b.id='b'; b.name='Transform'; b.config.notebook='NB'; b.config.simulateFailure=true; b.config.retry=2; b.config.retryConditionField='Error code'; b.config.retryConditionValue='429'; b.config.simulateErrorCode='429'; b.config.retryIntervalType='Increasing Delay'; b.config.retryIntervalSeconds=30; b.config.maxRetryIntervalSeconds=120;
  const edges=[{id:'a-b',from:'a',to:'b',condition:'Succeeded'}];
  const status=new Map([['a','Succeeded'],['b','Failed']]);
  const params=[{id:'p1',name:'processing_date',type:'String',defaultValue:'2026-09-17'}];
  const vars=[{id:'v1',name:'batch',type:'String',defaultValue:'17',currentValue:'18'}];
  const run=pipeline.createRun(retail,'fabric',[a,b],status,params,vars,edges,'Debug');
  const failed=run.activities.find(x=>x.nodeId==='b');
  check('Run captures dependency condition snapshot',failed?.dependencies?.[0]?.nodeId==='a'&&failed?.dependencies?.[0]?.condition==='Succeeded',JSON.stringify(failed?.dependencies));
  check('Run captures runtime parameter snapshot',run.parameterValues?.processing_date==='2026-09-17',JSON.stringify(run.parameterValues));
  check('Run captures variable snapshot',run.variableValues?.batch==='18',JSON.stringify(run.variableValues));
  check('Matching conditional retry uses configured attempts',failed?.attempts===3,String(failed?.attempts));
  check('Increasing-delay retry exposes cumulative wait evidence',Number(failed?.metrics.retry_wait_seconds)===90,JSON.stringify(failed?.metrics));
  b.config.retryConditionValue='503';
  const mismatch=pipeline.createRun(retail,'fabric',[a,b],status,params,vars,edges,'Debug');
  check('Non-matching retry condition avoids pointless retries',mismatch.activities.find(x=>x.nodeId==='b')?.attempts===1,JSON.stringify(mismatch.activities.find(x=>x.nodeId==='b')?.metrics));
}
{
  const activities=[
    {nodeId:'a',name:'Copy',type:'copy',status:'Succeeded',durationMs:100,startOffsetMs:0,attempts:1,input:'',output:'copy ok',metrics:{},secureInput:false,secureOutput:false,dependencies:[]},
    {nodeId:'b',name:'Transform',type:'notebook',status:'Failed',durationMs:200,startOffsetMs:100,attempts:1,input:'',output:'failed',error:'boom',metrics:{},secureInput:false,secureOutput:false,dependencies:[{nodeId:'a',condition:'Succeeded'}]},
    {nodeId:'c',name:'Publish',type:'storedProcedure',status:'Skipped',durationMs:0,startOffsetMs:300,attempts:0,input:'',output:'skipped',metrics:{},secureInput:false,secureOutput:false,dependencies:[{nodeId:'b',condition:'Succeeded'}]},
    {nodeId:'d',name:'NotifyFailure',type:'web',status:'Succeeded',durationMs:80,startOffsetMs:300,attempts:1,input:'',output:'notified',metrics:{},secureInput:false,secureOutput:false,dependencies:[{nodeId:'b',condition:'Failed'}]},
    {nodeId:'e',name:'Audit',type:'script',status:'Succeeded',durationMs:50,startOffsetMs:100,attempts:1,input:'',output:'audit ok',metrics:{},secureInput:false,secureOutput:false,dependencies:[{nodeId:'a',condition:'Succeeded'}]},
  ];
  const source={id:'run-branch',caseStudyId:'retail-medallion',experience:'fabric',startedAt:'2026-09-17T10:00:00Z',durationMs:380,status:'Failed',trigger:'Schedule',parameterValues:{batch_date:'2026-09-17'},variableValues:{attempt:'1'},activities};
  const scope=ops.fabricRetryScopeKeys(source,'From failed activity');
  check('Failed-activity rerun scope follows graph descendants only',scope.includes('b')&&scope.includes('c')&&scope.includes('d')&&!scope.includes('e'),scope.join(','));
  const retry=ops.createFabricRetryRun(source,'From failed activity');
  check('Successful upstream Copy is preserved, not mislabeled skipped',retry.activities.find(x=>x.nodeId==='a')?.status==='Succeeded'&&retry.activities.find(x=>x.nodeId==='a')?.rerunDisposition==='Preserved',JSON.stringify(retry.activities.find(x=>x.nodeId==='a')));
  check('Independent audit branch is preserved',retry.activities.find(x=>x.nodeId==='e')?.rerunDisposition==='Preserved',JSON.stringify(retry.activities.find(x=>x.nodeId==='e')));
  check('Former failure succeeds on rerun',retry.activities.find(x=>x.nodeId==='b')?.status==='Succeeded'&&retry.activities.find(x=>x.nodeId==='b')?.rerunDisposition==='Executed');
  check('Happy-path publish runs after failed task succeeds',retry.activities.find(x=>x.nodeId==='c')?.status==='Succeeded',JSON.stringify(retry.activities.find(x=>x.nodeId==='c')));
  check('Failure-handler branch becomes skipped after source succeeds',retry.activities.find(x=>x.nodeId==='d')?.status==='Skipped',JSON.stringify(retry.activities.find(x=>x.nodeId==='d')));
  check('Fabric rerun preserves original parameter snapshot',retry.parameterValues?.batch_date==='2026-09-17',JSON.stringify(retry.parameterValues));
  const selected=ops.createFabricRetryRun(source,'From selected activity','c');
  check('Selected rerun executes only selected descendant path',selected.activities.find(x=>x.nodeId==='c')?.rerunDisposition==='Executed'&&selected.activities.find(x=>x.nodeId==='c')?.status==='Succeeded'&&selected.activities.find(x=>x.nodeId==='b')?.rerunDisposition==='Preserved'&&selected.activities.find(x=>x.nodeId==='d')?.rerunDisposition==='Preserved'&&selected.status==='Succeeded',JSON.stringify(selected.activities.map(x=>[x.nodeId,x.rerunDisposition,x.status])));
}
{
  const run=ops.simulateDatabricksJobRun(true,{processing_date:'2026-09-18',target_layer:'gold'});
  check('Independent Databricks audit branch succeeds despite quality failure',run.tasks.find(t=>t.key==='publish_audit')?.status==='Succeeded',JSON.stringify(run.tasks));
  const scope=ops.repairTaskKeys(run);
  check('Databricks repair scope includes failed and dependent tasks',scope.includes('quality_gate')&&scope.includes('aggregate_gold'),scope.join(','));
  check('Databricks repair scope excludes independent audit branch',!scope.includes('publish_audit'),scope.join(','));
  const repaired=ops.repairDatabricksJobRun(run,{target_layer:'gold_repaired'});
  check('Databricks repair preserves independent successful audit task',repaired.tasks.find(t=>t.key==='publish_audit')?.repairDisposition==='Preserved',JSON.stringify(repaired.tasks.find(t=>t.key==='publish_audit')));
  check('Databricks repair executes failed quality path',repaired.tasks.find(t=>t.key==='quality_gate')?.repairDisposition==='Executed'&&repaired.tasks.find(t=>t.key==='aggregate_gold')?.repairDisposition==='Executed');
  check('Databricks repair can override job parameters',repaired.parameters.target_layer==='gold_repaired',JSON.stringify(repaired.parameters));
}
const failed=results.filter(r=>!r.ok); for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V17 operational engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
