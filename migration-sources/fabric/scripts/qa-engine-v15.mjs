import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp = path.resolve('.qa-engine-v15');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });

const compile = spawnSync('tsc', [
  'src/types/app.ts',
  'src/lib/dataRuntime.ts',
  'src/lib/workspaceInsights.ts',
  'src/lib/productionWorkflow.ts',
  'src/data/caseStudies.ts',
  '--target', 'ES2022',
  '--module', 'commonjs',
  '--moduleResolution', 'node',
  '--outDir', temp,
  '--esModuleInterop',
  '--skipLibCheck',
  '--strict',
], { encoding: 'utf8' });

if (compile.status !== 0) {
  console.error(compile.stdout || compile.stderr);
  fs.rmSync(temp, { recursive: true, force: true });
  process.exit(1);
}

fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const data = require(path.join(temp, 'data/caseStudies.js'));
const runtime = require(path.join(temp, 'lib/dataRuntime.js'));
const production = require(path.join(temp, 'lib/productionWorkflow.js'));

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
const getCase = (id) => data.caseStudies.find((c) => c.id === id);
const stages = ['design', 'govern', 'ingest', 'transform', 'orchestrate', 'serve', 'operate'];

for (const c of data.caseStudies) {
  const fp = production.productionPlan(c, 'fabric');
  const dp = production.productionPlan(c, 'databricks');
  check(`Fabric production plan has seven stages: ${c.id}`, fp.stages.length === 7, String(fp.stages.length));
  check(`Databricks production plan has seven stages: ${c.id}`, dp.stages.length === 7, String(dp.stages.length));
}

{
  const c = getCase('retail-medallion');
  let w = runtime.seedWorkspace(c);
  for (const stage of stages) w = production.runFabricProductionStage(w, c, stage).workspace;
  check('Fabric retail production creates Bronze table', Boolean(runtime.findWorkspaceTable(w, 'bronze.fabric_sales_raw')));
  check('Fabric retail production creates Silver table', Boolean(runtime.findWorkspaceTable(w, 'silver.fabric_sales_clean')));
  check('Fabric retail production creates Gold serving table', Boolean(runtime.findWorkspaceTable(w, 'gold.fabric_daily_sales')));
  check('Fabric production records operational audit', Boolean(runtime.findWorkspaceTable(w, 'ops.fabric_run_audit')));
  check('Fabric production creates recovery checkpoint', w.checkpoints.some((x) => x.label.includes('Fabric production checkpoint')), String(w.checkpoints.length));
  check('Fabric production creates lineage', w.lineage.some((x) => x.actor === 'Copy Job') && w.lineage.some((x) => x.actor === 'Notebook'), String(w.lineage.length));
  check('Fabric production completion derives from workspace evidence', stages.every((stage) => production.productionStageCompleted(w, c, 'fabric', stage)), production.productionCompletedStages(w, c, 'fabric').join(','));
}

{
  const c = getCase('turbine-realtime');
  let w = runtime.seedWorkspace(c);
  const ingest1 = production.runDatabricksProductionStage(w, c, 'ingest').workspace;
  const first = runtime.findWorkspaceTable(ingest1, 'bronze.dbx_turbine_events')?.rows.length ?? -1;
  const ingest2 = production.runDatabricksProductionStage(ingest1, c, 'ingest').workspace;
  const second = runtime.findWorkspaceTable(ingest2, 'bronze.dbx_turbine_events')?.rows.length ?? -2;
  check('Databricks Auto Loader learning ingest is idempotent for replayed sample', first === second, `${first} -> ${second}`);
  w = ingest2;
  for (const stage of ['design', 'govern']) w = production.runDatabricksProductionStage(w, c, stage).workspace;
  // V21 freshness semantics: after Design/Govern change, rerun ingestion so downstream evidence is current.
  w = production.runDatabricksProductionStage(w, c, 'ingest').workspace;
  for (const stage of ['transform', 'orchestrate', 'serve', 'operate']) {
    w = production.runDatabricksProductionStage(w, c, stage).workspace;
  }
  check('Databricks turbine creates Silver features', Boolean(runtime.findWorkspaceTable(w, 'silver.dbx_turbine_features')));
  check('Databricks turbine creates Gold risk serving table', Boolean(runtime.findWorkspaceTable(w, 'gold.dbx_turbine_risk')));
  check('Databricks production writes Auto Loader lineage', w.lineage.some((x) => x.actor === 'Auto Loader'));
  check('Databricks production writes Lakeflow lineage', w.lineage.some((x) => x.actor === 'Lakeflow pipelines'));
  check('Databricks production creates recovery checkpoint', w.checkpoints.some((x) => x.label.includes('Databricks production checkpoint')));
  check('Databricks production completion derives from workspace evidence', stages.every((stage) => production.productionStageCompleted(w, c, 'databricks', stage)), production.productionCompletedStages(w, c, 'databricks').join(','));
}

{
  const c = getCase('erp-incremental');
  let w = runtime.seedWorkspace(c);
  for (const stage of stages) w = production.runDatabricksProductionStage(w, c, stage).workspace;
  check('Databricks ERP creates Bronze order-change table', Boolean(runtime.findWorkspaceTable(w, 'bronze.dbx_sales_order_changes')));
  check('Databricks ERP creates Bronze customer-change table', Boolean(runtime.findWorkspaceTable(w, 'bronze.dbx_customer_changes')));
  check('Databricks ERP simulates AUTO CDC SCD2 table', Boolean(runtime.findWorkspaceTable(w, 'silver.dbx_customer_cdc')));
  check('Databricks ERP creates governed Gold current-customer table', Boolean(runtime.findWorkspaceTable(w, 'gold.dbx_customer_current')));
  check('Databricks ERP lineage records AUTO CDC semantics', w.lineage.some((x) => x.operation.includes('AUTO CDC SCD2')), w.lineage.map((x) => x.operation).join(' | '));
  const cdcEdge = w.lineage.find((x) => x.to === 'silver.dbx_customer_cdc');
  check('Databricks AUTO CDC consumes the staged Bronze customer feed', cdcEdge?.from === 'bronze.dbx_customer_changes', JSON.stringify(cdcEdge));
}

{
  const c = getCase('erp-incremental');
  let w = runtime.seedWorkspace(c);
  w = production.runFabricProductionStage(w, c, 'design').workspace;
  w = production.runFabricProductionStage(w, c, 'govern').workspace;
  w = production.runFabricProductionStage(w, c, 'ingest').workspace;
  check('Fabric ERP stages incremental sales orders', Boolean(runtime.findWorkspaceTable(w, 'staging.fabric_sales_order_incremental')));
  check('Fabric ERP stages incremental customers', Boolean(runtime.findWorkspaceTable(w, 'staging.fabric_customer_incremental')));
  w = production.runFabricProductionStage(w, c, 'transform').workspace;
  const edge = w.lineage.find((x) => x.to === 'staging.fabric_customer_changes' && x.from === 'staging.fabric_customer_incremental');
  check('Fabric ERP dbt transform consumes staged customer feed', Boolean(edge), JSON.stringify(w.lineage.filter((x) => x.to === 'staging.fabric_customer_changes')));
}

{
  const retail = getCase('retail-medallion');
  const turbine = getCase('turbine-realtime');
  const erp = getCase('erp-incremental');
  check('Fabric retail explicitly avoids default Spark', /do not introduce Spark by default/i.test(production.productionPlan(retail, 'fabric').stages.find((s) => s.id === 'transform')?.productionBehavior ?? ''));
  check('Fabric turbine explicitly justifies Spark semantics', /Spark/i.test(production.productionPlan(turbine, 'fabric').stages.find((s) => s.id === 'transform')?.productionBehavior ?? ''));
  check('Databricks ERP avoids handwritten PySpark as default', /Do not make every Databricks transformation a hand-written PySpark notebook/i.test(production.productionPlan(erp, 'databricks').avoid));
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` :: ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} V15 production workflow engine tests passed.`);
fs.rmSync(temp, { recursive: true, force: true });
if (failed.length) process.exit(1);
