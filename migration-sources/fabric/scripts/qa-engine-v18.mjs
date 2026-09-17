import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const temp=path.resolve('.qa-engine-v18'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/dataRuntime.ts','src/lib/workspaceInsights.ts','src/lib/productionWorkflow.ts','src/lib/operationsRuntime.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);fs.rmSync(temp,{recursive:true,force:true});process.exit(1);} fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
const require=createRequire(import.meta.url); const data=require(path.join(temp,'data/caseStudies.js')); const runtime=require(path.join(temp,'lib/dataRuntime.js')); const production=require(path.join(temp,'lib/productionWorkflow.js')); const ops=require(path.join(temp,'lib/operationsRuntime.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail}); const getCase=(id)=>data.caseStudies.find(c=>c.id===id);
{
  const c=getCase('retail-medallion'); let w=runtime.seedWorkspace(c);
  const direct=runtime.findWorkspaceTable(w,'training.raw.sales_csv');
  check('Three-level lookup resolves training.raw.sales_csv',direct?.name==='sales_csv',direct?`${direct.schema}.${direct.name}`:'missing');
  const select=runtime.executeWorkspaceSql(w,'SELECT sale_id, qty FROM training.raw.sales_csv ORDER BY sale_id DESC LIMIT 2',{actor:'Databricks SQL Warehouse'});
  check('Databricks SQL reads three-level source name',select.rows.length===2&&select.columns.includes('sale_id'),JSON.stringify(select.rows));
  const ctas=runtime.executeWorkspaceSql(w,'CREATE TABLE training.gold.sql_probe AS SELECT sale_id, qty FROM training.raw.sales_csv LIMIT 3',{actor:'Databricks SQL Warehouse',operation:'CTAS learning drill'});
  w=ctas.workspace;
  const target=runtime.findWorkspaceTable(w,'training.gold.sql_probe');
  check('Three-level CTAS stores local schema.table object',Boolean(target)&&target.schema==='gold'&&target.name==='sql_probe',target?`${target.schema}.${target.name}`:'missing');
  check('Three-level CTAS preserves lineage source',w.lineage.some(e=>e.to==='gold.sql_probe'&&e.from==='training.raw.sales_csv'),JSON.stringify(w.lineage.slice(0,3)));
  const count=runtime.executeWorkspaceSql(w,'SELECT COUNT(*) AS row_count FROM training.gold.sql_probe');
  check('Databricks SQL reads CTAS output through catalog name',count.rows[0]?.row_count===3,JSON.stringify(count.rows));
}
for(const [caseId,target] of [['retail-medallion','bronze.dbx_sales_raw'],['turbine-realtime','bronze.dbx_turbine_events'],['erp-incremental','bronze.dbx_customer_changes']]){
  const c=getCase(caseId); let w=runtime.seedWorkspace(c); w=production.runDatabricksProductionStage(w,c,'ingest').workspace;
  const table=runtime.findWorkspaceTable(w,target);
  check(`Auto Loader workbench evidence exists: ${caseId}`,Boolean(table)&&table.rows.length>0,table?`${table.rows.length} rows`:'missing');
  check(`Auto Loader emits lineage: ${caseId}`,w.lineage.some(e=>e.actor==='Auto Loader'&&e.to===target),String(w.lineage.length));
}
{
  const c=getCase('turbine-realtime'); let w=runtime.seedWorkspace(c); w=production.runDatabricksProductionStage(w,c,'ingest').workspace;
  const before=runtime.findWorkspaceTable(w,'bronze.dbx_turbine_events'); const beforeVersion=before?.version??0;
  const evolved=ops.applyAutoLoaderSchemaDriftToWorkspace(w,'bronze.dbx_turbine_events','addNewColumns');
  const after=runtime.findWorkspaceTable(evolved,'bronze.dbx_turbine_events');
  check('Auto Loader additive evolution changes live target schema',after?.columns.some(c=>c.name==='firmware_version'),after?.columns.map(c=>c.name).join(','));
  check('Auto Loader additive evolution increments table version',(after?.version??0)>beforeVersion,`${beforeVersion}->${after?.version}`);
  const rescued=ops.applyAutoLoaderSchemaDriftToWorkspace(w,'bronze.dbx_turbine_events','rescue'); const rescuedTable=runtime.findWorkspaceTable(rescued,'bronze.dbx_turbine_events');
  check('Auto Loader rescue writes _rescued_data evidence',rescuedTable?.columns.some(c=>c.name==='_rescued_data')&&Boolean(rescuedTable.rows[0]?._rescued_data),JSON.stringify(rescuedTable?.rows[0]));
}
for(const caseId of ['retail-medallion','turbine-realtime','erp-incremental']){
  const c=getCase(caseId); let w=runtime.seedWorkspace(c); w=production.runDatabricksProductionStage(w,c,'ingest').workspace; w=production.runDatabricksProductionStage(w,c,'transform').workspace; w=production.runDatabricksProductionStage(w,c,'serve').workspace;
  const expected=caseId==='retail-medallion'?['bronze.dbx_sales_raw','silver.dbx_sales_clean','gold.dbx_daily_sales']:caseId==='turbine-realtime'?['bronze.dbx_turbine_events','silver.dbx_turbine_features','gold.dbx_turbine_risk']:['bronze.dbx_customer_changes','silver.dbx_customer_cdc','gold.dbx_customer_current'];
  check(`Lakeflow representative medallion materializes: ${caseId}`,expected.every(name=>Boolean(runtime.findWorkspaceTable(w,name))),expected.map(name=>`${name}:${Boolean(runtime.findWorkspaceTable(w,name))}`).join(' '));
  check(`Lakeflow lineage connects medallion stages: ${caseId}`,w.lineage.some(e=>e.to===expected[1])&&w.lineage.some(e=>e.to===expected[2]),String(w.lineage.length));
  const gold=runtime.findWorkspaceTable(w,expected[2]); const first=gold?.columns[0]?.name??'*';
  const sql=runtime.executeWorkspaceSql(w,`SELECT ${first} FROM training.${expected[2]} LIMIT 5`,{actor:'Databricks SQL Warehouse'});
  check(`SQL Warehouse reads Lakeflow Gold output: ${caseId}`,sql.rows.length>0,JSON.stringify(sql.rows));
}
const failed=results.filter(r=>!r.ok); for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` :: ${r.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V18 shared Databricks workspace engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
