import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const temp=path.resolve('.qa-engine-v19'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/dataRuntime.ts','src/lib/workspaceInsights.ts','src/lib/productionWorkflow.ts','src/lib/operationsRuntime.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);fs.rmSync(temp,{recursive:true,force:true});process.exit(1);} fs.writeFileSync(path.join(temp,'package.json'),'{'+'"type":"commonjs"'+'}');
const require=createRequire(import.meta.url); const data=require(path.join(temp,'data/caseStudies.js')); const runtime=require(path.join(temp,'lib/dataRuntime.js')); const ops=require(path.join(temp,'lib/operationsRuntime.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail}); const getCase=(id)=>data.caseStudies.find(c=>c.id===id);
for(const [caseId,bronze,silver,gold] of [
 ['retail-medallion','bronze.dbx_sales_raw','silver.dbx_sales_clean','gold.dbx_daily_sales'],
 ['turbine-realtime','bronze.dbx_turbine_events','silver.dbx_turbine_features','gold.dbx_turbine_risk'],
 ['erp-incremental','bronze.dbx_customer_changes','silver.dbx_customer_cdc','gold.dbx_customer_current'],
]){
  const c=getCase(caseId); let w=runtime.seedWorkspace(c);
  const failedRun=ops.simulateDatabricksJobRun(true,{processing_date:'2026-09-17',target_layer:'gold'});
  w=ops.applyDatabricksJobRunToWorkspace(w,c,failedRun).workspace;
  const b=runtime.findWorkspaceTable(w,bronze); const s=runtime.findWorkspaceTable(w,silver); const g=runtime.findWorkspaceTable(w,gold);
  check(`Failed job keeps completed Bronze evidence: ${caseId}`,Boolean(b)&&b.rows.length>0,b?`${b.version}:${b.rows.length}`:'missing');
  check(`Failed job keeps completed Silver evidence: ${caseId}`,Boolean(s)&&s.rows.length>0,s?`${s.version}:${s.rows.length}`:'missing');
  check(`Failed job does not materialize skipped Gold: ${caseId}`,!g,g?`${g.version}:${g.rows.length}`:'absent');
  const runTable=runtime.findWorkspaceTable(w,'ops.databricks_job_runs'); const taskTable=runtime.findWorkspaceTable(w,'ops.databricks_job_tasks');
  check(`Failed job persists run row: ${caseId}`,runTable?.rows.some(r=>r.run_id===failedRun.id&&r.status==='Failed'),JSON.stringify(runTable?.rows.slice(-2)));
  check(`Failed job persists failed/skipped task statuses: ${caseId}`,taskTable?.rows.some(r=>r.run_id===failedRun.id&&r.task_key==='quality_gate'&&r.task_status==='Failed')&&taskTable?.rows.some(r=>r.run_id===failedRun.id&&r.task_key==='aggregate_gold'&&r.task_status==='Skipped'),String(taskTable?.rows.length));
  const restored=ops.loadDatabricksJobRunsFromWorkspace(w);
  check(`Job matrix reconstructs after remount: ${caseId}`,restored[0]?.id===failedRun.id&&restored[0]?.tasks.find(t=>t.key==='quality_gate')?.status==='Failed',restored[0]?.id??'missing');
  const bVersion=b?.version??0; const sVersion=s?.version??0; const auditBefore=(runtime.findWorkspaceTable(w,'ops.databricks_run_audit')?.rows??[]).filter(r=>r.stage==='orchestrate').length;
  const repair=ops.repairDatabricksJobRun(failedRun,{processing_date:'2026-09-18'});
  w=ops.applyDatabricksJobRunToWorkspace(w,c,repair).workspace;
  const b2=runtime.findWorkspaceTable(w,bronze); const s2=runtime.findWorkspaceTable(w,silver); const g2=runtime.findWorkspaceTable(w,gold);
  check(`Repair preserves successful Bronze version: ${caseId}`,(b2?.version??0)===bVersion,`${bVersion}->${b2?.version}`);
  check(`Repair preserves successful Silver version: ${caseId}`,(s2?.version??0)===sVersion,`${sVersion}->${s2?.version}`);
  check(`Repair materializes missing Gold only: ${caseId}`,Boolean(g2)&&g2.rows.length>0,g2?`${g2.version}:${g2.rows.length}`:'missing');
  const auditAfter=(runtime.findWorkspaceTable(w,'ops.databricks_run_audit')?.rows??[]).filter(r=>r.stage==='orchestrate').length;
  check(`Repair preserves independent audit branch: ${caseId}`,auditAfter===auditBefore,`${auditBefore}->${auditAfter}`);
  const restoredAfter=ops.loadDatabricksJobRunsFromWorkspace(w);
  check(`Repair run persists parent relationship: ${caseId}`,restoredAfter[0]?.repairedFrom===failedRun.id&&restoredAfter[0]?.status==='Succeeded',JSON.stringify(restoredAfter[0]));
  check(`Repair task matrix marks preserved branch: ${caseId}`,restoredAfter[0]?.tasks.find(t=>t.key==='publish_audit')?.repairDisposition==='Preserved',restoredAfter[0]?.tasks.find(t=>t.key==='publish_audit')?.repairDisposition??'missing');
}
{
  const c=getCase('retail-medallion'); let w=runtime.seedWorkspace(c);
  const ingest=require(path.join(temp,'lib/productionWorkflow.js')).runFabricProductionStage(w,c,'ingest');
  w=ingest.workspace;
  const bronze=runtime.findWorkspaceTable(w,'bronze.fabric_sales_raw');
  check('Fabric Copy Job runtime materializes Bronze evidence',Boolean(bronze)&&bronze.rows.length>0,bronze?`${bronze.rows.length} rows`:'missing');
  const flow=runtime.runDataflowGen2Publish(w,'bronze.fabric_sales_raw',['Source','Changed Type','Removed Errors','Selected Columns']);
  w=flow.workspace;
  const target=runtime.findWorkspaceTable(w,'silver.df_fabric_sales_raw');
  check('Dataflow Gen2 runtime materializes Silver evidence',Boolean(target)&&target.rows.length===bronze.rows.length,target?`${target.rows.length} rows`:'missing');
  check('Dataflow Gen2 emits live lineage',w.lineage.some(e=>e.actor==='Dataflow Gen2'&&e.from==='bronze.fabric_sales_raw'&&e.to==='silver.df_fabric_sales_raw'),JSON.stringify(w.lineage.slice(0,3)));
  check('Dataflow Gen2 selected-columns projection is bounded',(target?.columns.length??99)<=6,String(target?.columns.length));
}
const failed=results.filter(r=>!r.ok); for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V19 durable Lakeflow Jobs engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
