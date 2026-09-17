import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp=path.resolve('.qa-engine-v6');
fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/expressions.ts','src/lib/triggers.ts','src/lib/pipeline.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);process.exit(1);}
fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
const require=createRequire(import.meta.url);
const expressions=require(path.join(temp,'lib/expressions.js'));
const pipeline=require(path.join(temp,'lib/pipeline.js'));
const triggers=require(path.join(temp,'lib/triggers.js'));
const { caseStudies }=require(path.join(temp,'data/caseStudies.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
const params=[{id:'p1',name:'batch_date',type:'String',defaultValue:'2026-09-16'}];
const vars=[{id:'v1',name:'run_mode',type:'String',defaultValue:'incremental',currentValue:'incremental'}];
const fakeCase={id:'retail-medallion',title:'Demo',subtitle:'',industry:'',difficulty:'Beginner',duration:'',purpose:'',scenario:'',learningGoals:[],tools:[],architecture:[],tables:[],notebook:[],storedProcedure:'',storedProcedureName:'',steps:[]};
const base=(id,type,name,config={})=>({id,type,name,x:0,y:0,status:'Not run',config:{...pipeline.defaultConfig(type),...config}});

const score=base('score','notebook','Score_Turbine_Risk',{notebook:'Risk scorer'});
const risk=base('risk','if','Risk_Gate',{expression:"@greater(activity('Score_Turbine_Risk').output.maxRisk, 0.8)",trueActivities:'Open alert',falseActivities:'Archive'});
const ctx={parameters:params,variables:vars,nodes:[score,risk]};
check('Nested activity expression evaluates true',expressions.evaluateExpression(risk.config.expression,ctx)===true);
check('Trigger filename expression resolves',expressions.evaluateExpression('@pipeline()?.TriggerEvent?.FileName',ctx)==='orders_2026-09-16.parquet');
check('Tumbling window expression resolves',String(expressions.evaluateExpression('@trigger().outputs.windowStartTime',ctx)).includes('2026-09-16'));

const badSp=base('sp','storedProcedure','Bad_SP',{connection:'Warehouse',procedure:'dbo.usp_x',parametersJson:'{bad'});
check('Invalid stored procedure parameter JSON rejected',pipeline.validatePipeline([badSp],[],params,vars).some((p)=>p.includes('JSON array')));
const invokeMissing=base('inv','invokePipeline','Invoke_Child',{workspace:'DE',pipeline:'Child',parametersJson:'{"date":"@pipeline().parameters.missing"}'});
check('Nested Invoke parameter missing reference detected',pipeline.validatePipeline([invokeMissing],[],params,vars).some((p)=>p.includes('missing pipeline parameter missing')));
const invokeMissingActivity=base('inv2','invokePipeline','Invoke_Child_2',{workspace:'DE',pipeline:'Child',parametersJson:'{"risk":"@activity(\'No_Such_Activity\').output.maxRisk"}'});
check('Nested missing activity reference detected',pipeline.validatePipeline([invokeMissingActivity],[],params,vars).some((p)=>p.includes('missing activity No_Such_Activity')));
const invokeOk=base('inv3','invokePipeline','Invoke_OK',{workspace:'DE',pipeline:'Child',parametersJson:'{"date":"@pipeline().parameters.batch_date"}'});
check('Valid Fabric Invoke Pipeline validates',pipeline.validatePipeline([invokeOk],[],params,vars).length===0,pipeline.validatePipeline([invokeOk],[],params,vars).join('; '));
const retryBad=base('r','wait','Retry_Bad',{seconds:1,retry:2,retryIntervalSeconds:10});
check('Retry interval below 30 seconds rejected',pipeline.validatePipeline([retryBad],[],params,vars).some((p)=>p.includes('at least 30 seconds')));

const failed=base('f','copy','Copy_Fails',{source:'ADLS',destination:'Lakehouse',retry:2,secureInput:true,secureOutput:true,simulateFailure:true});
const success=base('s','wait','Parallel_Root',{seconds:1});
const child=base('c','script','Child_Script',{connection:'Warehouse',script:'SELECT 1;'});
const edges=[{id:'e1',from:'f',to:'c',condition:'Failed'}];
const plan=pipeline.buildDebugPlan([failed,success,child],edges);
const statusMap=new Map(plan.map((p)=>[p.nodeId,p.finalStatus]));
const run=pipeline.createRun(fakeCase,'fabric',[failed,success,child],statusMap,params,vars,edges,'Debug');
const failAct=run.activities.find((a)=>a.nodeId==='f'); const rootAct=run.activities.find((a)=>a.nodeId==='s'); const childAct=run.activities.find((a)=>a.nodeId==='c');
check('Failed activity reports retry attempts',failAct?.attempts===3);
check('Secure input/output flags preserved',failAct?.secureInput===true && failAct?.secureOutput===true);
check('Copy diagnostics include rows/data/throughput',Boolean(failAct?.metrics?.rowsRead) && 'dataReadBytes' in failAct.metrics && 'throughputMBps' in failAct.metrics);
check('Parallel roots start at offset zero',failAct?.startOffsetMs===0 && rootAct?.startOffsetMs===0);
check('Dependent activity starts after parent',Number(childAct?.startOffsetMs)>=Number(failAct?.durationMs));
const sequentialSum=run.activities.reduce((sum,a)=>sum+a.durationMs,0);
check('Run duration uses critical path not sequential sum',run.durationMs<sequentialSum,`${run.durationMs} < ${sequentialSum}`);

const ifRun=pipeline.createRun({ ...fakeCase,id:'turbine-realtime' },'fabric',[score,risk],undefined,params,vars,[{id:'sr',from:'score',to:'risk',condition:'Succeeded'}]);
const riskOut=ifRun.activities.find((a)=>a.nodeId==='risk')?.output ?? '';
check('If runtime sees upstream activity context',riskOut.includes('True'),riskOut);

const fixed={enabled:true,kind:'Fixed schedule',frequency:'Daily',interval:1,startDate:'2026-09-16',endDate:'',time:'08:00',timeZone:'Europe/Oslo',eventSource:'',eventType:'',subjectFilter:'',parametersJson:'{}',failureNotifications:''};
check('Fabric fixed schedule requires end date',triggers.validateTriggerDefinition(fixed,'fabric',params).some((p)=>p.includes('end date')));
const event={...fixed,kind:'Event',endDate:'',eventSource:'',eventType:''};
check('Fabric event requires source and event type',triggers.validateTriggerDefinition(event,'fabric',params).filter((p)=>p.includes('required')).length>=2);
const tumble={...fixed,kind:'Tumbling window',endDate:'',parametersJson:'{"batch_date":"2026-09-17"}'};
check('ADF tumbling window definition validates',triggers.validateTriggerDefinition(tumble,'azure',params).length===0,triggers.validateTriggerDefinition(tumble,'azure',params).join('; '));
const mapped=triggers.applyTriggerParameterValues(tumble,params);
check('Trigger parameter mapping overrides runtime default',mapped[0].defaultValue==='2026-09-17');
const unknown={...tumble,parametersJson:'{"unknown":"x"}'};
check('Unknown trigger parameter rejected',triggers.validateTriggerDefinition(unknown,'azure',params).some((p)=>p.includes('does not match')));

const lookup=base('l','lookup','Lookup_Control',{connection:'Warehouse',lookupMode:'Query',query:'SELECT 1',firstRowOnly:true});
const lookupRun=pipeline.createRun(fakeCase,'fabric',[lookup],undefined,params,vars);
check('Lookup run exposes firstRow behavior',lookupRun.activities[0].output.includes('output.firstRow'));
const spValid=base('sp2','storedProcedure','Merge_Fact',{connection:'Warehouse',procedure:'dw.usp_merge_fact_sales',parametersJson:'[{"name":"batch_date","value":"@pipeline().parameters.batch_date"}]'});
check('Stored procedure nested valid parameter expression validates',pipeline.validatePipeline([spValid],[],params,vars).length===0,pipeline.validatePipeline([spValid],[],params,vars).join('; '));


for (const study of caseStudies) {
  let solutionNodes=[]; let solutionEdges=[];
  for (const step of study.steps) {
    const applied=pipeline.applyStepSolution(step,solutionNodes,solutionEdges);
    solutionNodes=applied.nodes; solutionEdges=applied.edges;
  }
  const problems=pipeline.validatePipeline(solutionNodes,solutionEdges,params,vars);
  check(`Applied solution validates: ${study.id}`,problems.length===0,problems.join('; '));
}

const failedResults=results.filter((r)=>!r.ok);
for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`);
console.log(`\n${results.length-failedResults.length}/${results.length} V6 behavioral engine tests passed.`);
fs.rmSync(temp,{recursive:true,force:true});
if(failedResults.length) process.exit(1);
