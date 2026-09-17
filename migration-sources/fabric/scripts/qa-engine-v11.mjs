import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp = path.resolve('.qa-engine-v11');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });
const compile = spawnSync('tsc', [
  'src/types/app.ts',
  'src/lib/dataRuntime.ts',
  'src/lib/workspaceInsights.ts',
  'src/lib/reliability.ts',
  'src/lib/pipeline.ts',
  'src/lib/expressions.ts',
  'src/lib/nestedActivities.ts',
  'src/lib/copyMapping.ts',
  'src/data/caseStudies.ts',
  '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', temp,
  '--esModuleInterop', '--skipLibCheck', '--strict'
], { encoding: 'utf8' });
if (compile.status !== 0) { console.error(compile.stdout || compile.stderr); process.exit(1); }
fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const runtime = require(path.join(temp, 'lib/dataRuntime.js'));
const reliability = require(path.join(temp, 'lib/reliability.js'));
const insights = require(path.join(temp, 'lib/workspaceInsights.js'));
const pipeline = require(path.join(temp, 'lib/pipeline.js'));
const data = require(path.join(temp, 'data/caseStudies.js'));
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
const retail = data.caseStudies.find((c) => c.id === 'retail-medallion');
const turbine = data.caseStudies.find((c) => c.id === 'turbine-realtime');
const erp = data.caseStudies.find((c) => c.id === 'erp-incremental');

for (const caseStudy of [retail, turbine, erp]) {
  const assessment = reliability.assessReliability(runtime.seedWorkspace(caseStudy));
  check(`Baseline reliability is healthy: ${caseStudy.id}`, assessment.status === 'Healthy' && assessment.failed === 0, JSON.stringify(assessment));
}

let retailWs = runtime.seedWorkspace(retail);
const retailBaselineSnapshot = retailWs.snapshot;
retailWs = reliability.injectReliabilityIncident(retailWs);
let retailAssessment = reliability.assessReliability(retailWs);
check('Retail incident auto-creates safe checkpoint', retailWs.checkpoints.some((cp) => cp.label === 'Pre-incident safe point' && cp.snapshot === retailBaselineSnapshot), JSON.stringify(retailWs.checkpoints));
check('Retail incident breaks duplicate-key rule', retailAssessment.rules.some((r) => r.id === 'retail-unique-sale' && !r.passed), JSON.stringify(retailAssessment.rules));
check('Retail incident breaks positive-quantity rule', retailAssessment.rules.some((r) => r.id === 'retail-positive-qty' && !r.passed), JSON.stringify(retailAssessment.rules));
let retailDbt = reliability.runReliabilityDbt(retailWs);
check('Retail bad Bronze blocks dbt promotion', retailDbt.failed > 0 && retailDbt.log.some((line) => line.includes('FAIL test unique_')), retailDbt.log.join(' | '));
retailWs = reliability.repairReliabilityIncident(retailWs);
retailAssessment = reliability.assessReliability(retailWs);
check('Retail targeted repair restores data contract', retailAssessment.status === 'Healthy', JSON.stringify(retailAssessment));
check('Retail rejected records are quarantined', (runtime.findWorkspaceTable(retailWs, 'quarantine.sales_rejected')?.rows.length ?? 0) >= 2, String(runtime.findWorkspaceTable(retailWs, 'quarantine.sales_rejected')?.rows.length));
retailDbt = reliability.runReliabilityDbt(retailWs);
check('Retail dbt gate passes after repair', retailDbt.failed === 0, retailDbt.log.join(' | '));

let turbineWs = reliability.injectReliabilityIncident(runtime.seedWorkspace(turbine));
let turbineAssessment = reliability.assessReliability(turbineWs);
check('Turbine incident catches replay duplicate', turbineAssessment.rules.some((r) => r.id === 'turbine-unique-event' && !r.passed), JSON.stringify(turbineAssessment.rules));
check('Turbine incident catches contract drift', turbineAssessment.rules.some((r) => r.id === 'turbine-temperature' && !r.passed), JSON.stringify(turbineAssessment.rules));
turbineWs = reliability.repairReliabilityIncident(turbineWs);
check('Turbine targeted repair restores healthy input', reliability.assessReliability(turbineWs).status === 'Healthy', JSON.stringify(reliability.assessReliability(turbineWs)));
check('Turbine malformed events are quarantined', (runtime.findWorkspaceTable(turbineWs, 'quarantine.turbine_events_rejected')?.rows.length ?? 0) >= 2, String(runtime.findWorkspaceTable(turbineWs, 'quarantine.turbine_events_rejected')?.rows.length));

let erpWs = reliability.injectReliabilityIncident(runtime.seedWorkspace(erp));
let erpAssessment = reliability.assessReliability(erpWs);
check('ERP incident detects duplicate customer business key', erpAssessment.rules.some((r) => r.id === 'erp-unique-customer' && !r.passed), JSON.stringify(erpAssessment.rules));
check('ERP incident detects poisoned future watermark', erpAssessment.rules.some((r) => r.id === 'erp-watermark' && !r.passed), JSON.stringify(erpAssessment.rules));
let erpDbt = reliability.runReliabilityDbt(erpWs);
check('ERP duplicate change set fails dbt uniqueness gate', erpDbt.failed > 0 && erpDbt.log.some((line) => line.includes('FAIL test unique_')), erpDbt.log.join(' | '));
erpWs = reliability.repairReliabilityIncident(erpWs);
erpAssessment = reliability.assessReliability(erpWs);
check('ERP targeted repair fixes duplicate key and watermark state', erpAssessment.status === 'Healthy', JSON.stringify(erpAssessment));
check('ERP duplicate change is quarantined', (runtime.findWorkspaceTable(erpWs, 'quarantine.customer_changes_rejected')?.rows.length ?? 0) >= 1, String(runtime.findWorkspaceTable(erpWs, 'quarantine.customer_changes_rejected')?.rows.length));
erpDbt = reliability.runReliabilityDbt(erpWs);
check('ERP dbt gate passes after repair', erpDbt.failed === 0, erpDbt.log.join(' | '));

let stagedErpWs = runtime.seedWorkspace(erp);
const stagedErpNotebook = runtime.seedNotebook(erp);
const stageCopy = { id: 'stage-copy', type: 'copyJob', name: 'Stage_ERP', x: 0, y: 0, status: 'Not run', config: {} };
stagedErpWs = runtime.executePipelineLearningData(stagedErpWs, stagedErpNotebook, [stageCopy], new Map([[stageCopy.id, 'Succeeded']])).workspace;
stagedErpWs = reliability.injectReliabilityIncident(stagedErpWs);
check('ERP incident corrupts already-existing incremental staging too', (runtime.findWorkspaceTable(stagedErpWs, 'staging.customer_incremental')?.rows.filter((row) => row.customer_id === 'C104').length ?? 0) > 1, JSON.stringify(runtime.findWorkspaceTable(stagedErpWs, 'staging.customer_incremental')?.rows));
const stagedBadDbt = reliability.runReliabilityDbt(stagedErpWs);
check('ERP staged duplicate is caught by dbt on rerun scenario', stagedBadDbt.failed > 0, stagedBadDbt.log.join(' | '));
stagedErpWs = reliability.repairReliabilityIncident(stagedErpWs);
const stagedGoodDbt = reliability.runReliabilityDbt(stagedErpWs);
check('ERP staged rerun becomes clean after targeted repair', stagedGoodDbt.failed === 0, stagedGoodDbt.log.join(' | '));

let restoreWs = reliability.injectReliabilityIncident(runtime.seedWorkspace(retail));
const safeCp = restoreWs.checkpoints.find((cp) => cp.label === 'Pre-incident safe point');
restoreWs = insights.restoreWorkspaceCheckpoint(restoreWs, safeCp.id);
check('Checkpoint rollback restores retail contract without manual repair', reliability.assessReliability(restoreWs).status === 'Healthy', JSON.stringify(reliability.assessReliability(restoreWs)));

let pipelineWs = reliability.injectReliabilityIncident(runtime.seedWorkspace(retail));
const notebook = runtime.seedNotebook(retail);
const dbtNode = { id: 'dbt-quality', type: 'dbt', name: 'Build_And_Test', x: 0, y: 0, status: 'Not run', config: { project: 'retail', command: 'dbt build', threads: 4 } };
const spNode = { id: 'publish', type: 'storedProcedure', name: 'Publish_Fact', x: 1, y: 0, status: 'Not run', config: { procedure: 'dw.usp_merge_fact_sales' } };
const recoveryNode = { id: 'recover', type: 'wait', name: 'Notify_And_Contain', x: 1, y: 1, status: 'Not run', config: { seconds: 1 } };
const edges = [
  { id: 'e1', from: dbtNode.id, to: spNode.id, condition: 'Succeeded' },
  { id: 'e2', from: dbtNode.id, to: recoveryNode.id, condition: 'Failed' },
];
const beforeFactRows = runtime.findWorkspaceTable(pipelineWs, 'dw.fact_sales').rows.length;
const effect = runtime.executePipelineLearningData(pipelineWs, notebook, [dbtNode, spNode, recoveryNode], new Map([[dbtNode.id, 'Succeeded'], [spNode.id, 'Succeeded'], [recoveryNode.id, 'Succeeded']]), edges);
check('Runtime dbt test failure marks pipeline activity Failed', effect.statusByNode.get(dbtNode.id) === 'Failed', JSON.stringify(Object.fromEntries(effect.statusByNode)));
check('Runtime failure skips Succeeded-only downstream activity', effect.statusByNode.get(spNode.id) === 'Skipped', JSON.stringify(Object.fromEntries(effect.statusByNode)));
check('Runtime failure activates Failed dependency recovery branch', effect.statusByNode.get(recoveryNode.id) === 'Succeeded', JSON.stringify(Object.fromEntries(effect.statusByNode)));
check('Runtime failure preserves root-cause diagnostic', Boolean(effect.runtimeErrors[dbtNode.id]?.includes('dbt quality gate failed')), JSON.stringify(effect.runtimeErrors));
check('Skipped downstream stored procedure does not mutate fact table', runtime.findWorkspaceTable(effect.workspace, 'dw.fact_sales').rows.length === beforeFactRows, String(runtime.findWorkspaceTable(effect.workspace, 'dw.fact_sales').rows.length));
const run = pipeline.createRun(retail, 'fabric', [dbtNode, spNode, recoveryNode], effect.statusByNode, [], [], edges, 'Debug', effect.runtimeErrors);
const failedActivity = run.activities.find((a) => a.nodeId === dbtNode.id);
check('Monitor run records learning-runtime root cause', run.status === 'Failed' && failedActivity?.error?.includes('LearningDataRuntimeError'), JSON.stringify(failedActivity));
check('Monitor run records downstream skip after runtime failure', run.activities.find((a) => a.nodeId === spNode.id)?.status === 'Skipped', JSON.stringify(run.activities));
check('Monitor run records successful failure-handler branch', run.activities.find((a) => a.nodeId === recoveryNode.id)?.status === 'Succeeded', JSON.stringify(run.activities));

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` :: ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} V11 reliability/recovery engine tests passed.`);
fs.rmSync(temp, { recursive: true, force: true });
if (failed.length) process.exit(1);
