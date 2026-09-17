import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
execFileSync(process.platform==='win32'?'tsc.cmd':'tsc',['-p','tsconfig.build.json'],{cwd:root,stdio:'inherit'});
const stamp=Date.now();
const { caseStudies }=await import(`${resolve(root,'.compiled/data/caseStudies.js')}?t=${stamp}`);
const { createAirflowRun, stepAirflow, runAirflowToEnd, simulationStepBudget, validateAirflowDefinition }=await import(`${resolve(root,'.compiled/lib/airflowSimulator.js')}?t=${stamp}`);
const { compileDbtModel, referencedResources, topologicalModels }=await import(`${resolve(root,'.compiled/lib/dbtCompiler.js')}?t=${stamp}`);
const { runDbtBuild, selectDbtModels }=await import(`${resolve(root,'.compiled/lib/dbtSimulator.js')}?t=${stamp}`);
const { validateCaseStudy }=await import(`${resolve(root,'.compiled/lib/validation.js')}?t=${stamp}`);
const { runHybridSimulation }=await import(`${resolve(root,'.compiled/lib/hybridSimulator.js')}?t=${stamp}`);
const { parseBoundedCron, previewDataIntervals }=await import(`${resolve(root,'.compiled/lib/scheduleSimulator.js')}?t=${stamp}`);
const { simulateSnapshot, snapshotDependencyId, snapshotYaml }=await import(`${resolve(root,'.compiled/lib/snapshotSimulator.js')}?t=${stamp}`);

const ecommerce=caseStudies.find((c)=>c.id==='ecommerce'); assert.ok(ecommerce);
const transient=ecommerce.scenarios.find((s)=>s.effect==='transient'); assert.ok(transient);
let state=createAirflowRun(ecommerce.airflow);
for(let i=0;i<2;i++) state=stepAirflow(ecommerce,transient,state);
assert.equal(state.tasks.ingest_orders.state,'retrying','transient failure should enter retrying');
state=stepAirflow(ecommerce,transient,state);
assert.equal(state.tasks.ingest_orders.state,'success','retry should succeed on next simulated step');
assert.ok(state.elapsedSeconds>=ecommerce.airflow.tasks.find((t)=>t.id==='ingest_orders').retryDelaySeconds,'retry delay should contribute to simulated elapsed time');

const permanent=ecommerce.scenarios.find((s)=>s.effect==='permanent'); assert.ok(permanent);
const failed=runAirflowToEnd(ecommerce,permanent,createAirflowRun(ecommerce.airflow));
assert.equal(failed.status,'failed');
assert.equal(failed.tasks.ingest_orders.attempts,ecommerce.airflow.tasks.find((t)=>t.id==='ingest_orders').retries+1);
assert.equal(failed.tasks.run_dbt_staging.state,'upstream_failed');

const late=ecommerce.scenarios.find((s)=>s.effect==='late_input'); assert.ok(late);
let waiting=createAirflowRun(ecommerce.airflow); waiting=stepAirflow(ecommerce,late,waiting); waiting=stepAirflow(ecommerce,late,waiting);
assert.equal(waiting.tasks.wait_for_orders.sensorPokes,2); waiting=stepAirflow(ecommerce,late,waiting); assert.equal(waiting.tasks.wait_for_orders.state,'success');
assert.match(waiting.tasks.wait_for_orders.xcomValue,/partition date/);

const timeout=ecommerce.scenarios.find((s)=>s.effect==='sensor_timeout'); assert.ok(timeout);
const timedOut=runAirflowToEnd(ecommerce,timeout,createAirflowRun(ecommerce.airflow));
assert.equal(timedOut.status,'failed'); assert.equal(timedOut.tasks.wait_for_orders.state,'failed'); assert.equal(timedOut.tasks.ingest_orders.state,'upstream_failed'); assert.equal(timedOut.tasks.wait_for_orders.sensorPokes,3);

const clickstream=caseStudies.find((c)=>c.id==='clickstream'); assert.ok(clickstream);
const clickNormal=clickstream.scenarios.find((s)=>s.id==='normal'); assert.ok(clickNormal);
const normalClickRun=runAirflowToEnd(clickstream,clickNormal,createAirflowRun(clickstream.airflow));
assert.equal(normalClickRun.status,'success'); assert.equal(normalClickRun.tasks.transform_sessions.state,'success'); assert.equal(normalClickRun.tasks.quarantine_events.state,'skipped','normal branch must not run the quarantine path'); assert.equal(normalClickRun.tasks.finalize_hour.state,'success');
const branch=clickstream.scenarios.find((s)=>s.effect==='branch'); assert.ok(branch);
const branched=runAirflowToEnd(clickstream,branch,createAirflowRun(clickstream.airflow));
assert.equal(branched.status,'success'); assert.equal(branched.tasks.transform_sessions.state,'skipped'); assert.equal(branched.tasks.quarantine_events.state,'success'); assert.equal(branched.tasks.build_funnel.state,'skipped'); assert.equal(branched.tasks.finalize_hour.state,'success','none_failed_min_one_success join should run after the quarantine branch succeeds');

const finance=caseStudies.find((c)=>c.id==='finance'); assert.ok(finance);
const bankFailure=finance.scenarios.find((s)=>s.effect==='permanent'); assert.ok(bankFailure);
const financeRun=runAirflowToEnd(finance,bankFailure,createAirflowRun(finance.airflow));
assert.equal(financeRun.tasks.load_bank_transactions.state,'failed'); assert.equal(financeRun.tasks.load_ledger.state,'success','independent upstream work should still complete'); assert.equal(financeRun.tasks.run_dbt_reconciliation.state,'upstream_failed');
const financeNormal=runAirflowToEnd(finance,finance.scenarios.find((s)=>s.id==='normal'),createAirflowRun(finance.airflow));
assert.equal(financeNormal.tasks.load_bank_transactions.firstStartedAtSeconds,0);
assert.equal(financeNormal.tasks.load_ledger.firstStartedAtSeconds,0,'independent root tasks should share logical start time even though step-through evaluates them one at a time');
assert.equal(financeNormal.tasks.run_dbt_reconciliation.firstStartedAtSeconds,24,'downstream task should start after the slower parallel upstream finishes');
assert.equal(financeNormal.elapsedSeconds,66,'logical elapsed time should be critical-path makespan, not the sum of parallel task durations');
const allDoneStudy={...ecommerce,airflow:{...ecommerce.airflow,tasks:[
  {id:'fail_root',label:'fail_root',type:'task',dependsOn:[],retries:0,durationSeconds:1,description:'synthetic failure root'},
  {id:'cleanup',label:'cleanup',type:'task',dependsOn:['fail_root'],retries:0,durationSeconds:1,triggerRule:'all_done',description:'synthetic all_done leaf'}
]}};
const allDoneScenario={id:'all-done-caveat',label:'all done caveat',description:'synthetic leaf-state regression',effect:'permanent',targetTask:'fail_root'};
const allDoneRun=runAirflowToEnd(allDoneStudy,allDoneScenario,createAirflowRun(allDoneStudy.airflow));
assert.equal(allDoneRun.tasks.fail_root.state,'failed'); assert.equal(allDoneRun.tasks.cleanup.state,'success'); assert.equal(allDoneRun.status,'success','Airflow DagRun terminal state is evaluated from leaf tasks; a successful all_done leaf can mask an upstream failure');

assert.deepEqual(validateAirflowDefinition(ecommerce.airflow),[]);
const cyclic={...ecommerce.airflow,tasks:[{...ecommerce.airflow.tasks[0],id:'a',dependsOn:['b']},{...ecommerce.airflow.tasks[1],id:'b',dependsOn:['a']} ]};
assert.ok(validateAirflowDefinition(cyclic).some((e)=>e.includes('cycle')));
const negativeRetryDelay={...ecommerce.airflow,tasks:ecommerce.airflow.tasks.map((task,index)=>index===0?{...task,retryDelaySeconds:-1}:task)};
assert.ok(validateAirflowDefinition(negativeRetryDelay).some((e)=>e.includes('retryDelaySeconds')),'negative retry delay must be rejected');
const longSensorStudy={...ecommerce,airflow:{...ecommerce.airflow,tasks:[{id:'long_sensor',label:'long_sensor',type:'sensor',dependsOn:[],retries:0,durationSeconds:1,sensorPokeIntervalSeconds:1,description:'synthetic long sensor lesson'}]}};
const longSensorScenario={id:'long-timeout',label:'long timeout',description:'exercise dynamic simulation guard',effect:'sensor_timeout',targetTask:'long_sensor',sensorTimeoutPokes:130};
assert.ok(simulationStepBudget(longSensorStudy,longSensorScenario)>130,'dynamic guard must scale with long sensor lessons');
const longSensorRun=runAirflowToEnd(longSensorStudy,longSensorScenario,createAirflowRun(longSensorStudy.airflow));
assert.equal(longSensorRun.tasks.long_sensor.sensorPokes,130); assert.equal(longSensorRun.tasks.long_sensor.state,'failed'); assert.ok(!longSensorRun.logs.some((entry)=>entry.message.includes('Simulation guard stopped')),'valid long sensor scenario must not trip the deadlock guard');
console.log('PASS Airflow retry/sensor/branch/failure/validation tests');

const orderingStudy={...ecommerce,airflow:{...ecommerce.airflow,tasks:[
  {id:'sensor_root',label:'sensor_root',type:'sensor',dependsOn:[],retries:0,durationSeconds:1,sensorPokeIntervalSeconds:60,description:'synthetic waiting root'},
  {id:'independent_root',label:'independent_root',type:'task',dependsOn:[],retries:0,durationSeconds:2,description:'synthetic independent root'},
  {id:'join',label:'join',type:'task',dependsOn:['sensor_root','independent_root'],retries:0,durationSeconds:1,description:'synthetic join'}
]}};
const orderingScenario={id:'ordering',label:'ordering',description:'waiting sensor must not jump ahead of earlier logical work',effect:'late_input',targetTask:'sensor_root'};
let ordered=createAirflowRun(orderingStudy.airflow); ordered=stepAirflow(orderingStudy,orderingScenario,ordered); ordered=stepAirflow(orderingStudy,orderingScenario,ordered);
assert.equal(ordered.tasks.independent_root.state,'success','scheduler step should choose the runnable task with the earliest logical start');
assert.equal(ordered.tasks.independent_root.firstStartedAtSeconds,0); assert.equal(ordered.tasks.sensor_root.sensorPokes,1,'sensor second poke should remain pending until earlier logical work is evaluated');
const dailyIntervals=previewDataIntervals(ecommerce.airflow,2,new Date('2026-09-17T15:00:00Z'));
assert.equal(dailyIntervals.length,2); assert.match(dailyIntervals[0].end,/06:00 UTC/); assert.ok(parseBoundedCron('@daily')); assert.equal(parseBoundedCron('*/5 * * * *'),undefined,'unsupported cron syntax must be rejected rather than guessed'); assert.equal(parseBoundedCron('0 7 * * 8'),undefined,'cron weekday 8 must be rejected rather than wrapped modulo 7'); assert.equal(parseBoundedCron('0 7 * * 8-9'),undefined,'invalid cron weekday ranges must be rejected rather than wrapped modulo 7'); assert.equal(parseBoundedCron('0 7 * * 5-1'),undefined,'bounded cron parser must reject wrap-around weekday ranges rather than inventing semantics'); assert.ok(parseBoundedCron('0 7 * * 7'),'weekday 7 is a valid Sunday alias in cron');
const weekdayIntervals=previewDataIntervals(finance.airflow,3,new Date('2026-09-14T08:00:00Z'));
assert.ok(weekdayIntervals.some((interval)=>interval.start.startsWith('2026-09-11')&&interval.end.startsWith('2026-09-14')),'weekday schedule preview should show the Friday→Monday data interval across the weekend');
console.log('PASS logical scheduler ordering + bounded cron/data-interval tests');


const model=ecommerce.dbt.models.find((m)=>m.id==='fct_customer_sales'); assert.ok(model);
const full=compileDbtModel(model,ecommerce.dbt,false); const incremental=compileDbtModel(model,ecommerce.dbt,true);
assert.equal(full.ok,true); assert.equal(incremental.ok,true); assert.ok(!full.sql.includes('dateadd(day, -2')); assert.ok(incremental.sql.includes('dateadd(day, -2'));
assert.ok(!full.sql.includes('analytics.int_customer_orders'),'ephemeral ref should not compile as a physical analytics relation');
assert.ok(full.sql.includes('analytics.stg_orders')&&full.sql.includes('analytics.stg_customers'),'ephemeral SQL should be inlined with its physical dependencies resolved');
assert.ok(full.replacements.some((item)=>item.includes('Inlined ephemeral')));
const stgOrders=ecommerce.dbt.models.find((m)=>m.id==='stg_orders'); assert.ok(stgOrders);
const macroOrders=compileDbtModel(stgOrders,ecommerce.dbt,false);
assert.equal(macroOrders.ok,true); assert.ok(macroOrders.sql.includes('(amount_cents / 100.0)'),'supported cents_to_currency macro should expand deterministically'); assert.ok(macroOrders.replacements.some((item)=>item.includes('cents_to_currency')));
const bankModel=finance.dbt.models.find((m)=>m.id==='stg_bank_transactions'); assert.ok(bankModel);
const macroBank=compileDbtModel(bankModel,finance.dbt,false);
assert.equal(macroBank.ok,true); assert.ok(macroBank.sql.includes('upper(trim(reference))'),'supported normalized_reference macro should expand deterministically'); assert.ok(macroBank.replacements.some((item)=>item.includes('normalized_reference')));
const customerSeedModel=ecommerce.dbt.models.find((m)=>m.id==='stg_customers'); assert.ok(customerSeedModel);
const customerSeedCompiled=compileDbtModel(customerSeedModel,ecommerce.dbt,false);
assert.equal(customerSeedCompiled.ok,true); assert.ok(customerSeedCompiled.sql.includes('analytics.country_codes'),'e-commerce seed should participate in compiled staging SQL');
const ledgerSeedModel=finance.dbt.models.find((m)=>m.id==='stg_ledger'); assert.ok(ledgerSeedModel);
const ledgerSeedCompiled=compileDbtModel(ledgerSeedModel,finance.dbt,false);
assert.equal(ledgerSeedCompiled.ok,true); assert.ok(ledgerSeedCompiled.sql.includes('analytics.account_mapping'),'finance seed should participate in compiled staging SQL');
const clickStaging=clickstream.dbt.models.find((m)=>m.id==='stg_events'); assert.ok(clickStaging);
const clickStagingCompiled=compileDbtModel(clickStaging,clickstream.dbt,false);
assert.equal(clickStagingCompiled.ok,true); assert.ok(clickStagingCompiled.sql.includes('analytics.bot_user_agents'),'dbt seed ref should compile as a relation'); assert.ok(clickStagingCompiled.replacements.some((item)=>item.includes("Resolved seed ref('bot_user_agents')")));
const clickSessions=clickstream.dbt.models.find((m)=>m.id==='int_sessions'); assert.ok(clickSessions);
const clickSessionsCompiled=compileDbtModel(clickSessions,clickstream.dbt,false);
assert.equal(clickSessionsCompiled.ok,true); assert.ok(clickSessionsCompiled.sql.includes("concat(user_id, '-', cast(session_number as string))"),'session_key lesson macro should expand deterministically');
const clickBuild=runDbtBuild(clickstream,clickNormal,{}, {command:'build',includeProjectResources:true}); assert.equal(clickBuild.status,'success'); assert.equal(clickBuild.modelStates.stg_events,'success'); assert.equal(clickBuild.seedStates.bot_user_agents,'success');
assert.ok(Object.values(clickBuild.snapshotStates).every((state)=>state==='success'));
assert.deepEqual(new Set(referencedResources(model.sql)),new Set(model.dependsOn));
assert.equal(topologicalModels(ecommerce.dbt).at(-1)?.id,'fct_customer_sales');

const unsupported=compileDbtModel({...model,id:'unsupported_demo',sql:"select {{ unknown_macro('x') }} as x",dependsOn:[]},ecommerce.dbt,false);
assert.equal(unsupported.ok,false); assert.ok(unsupported.errors.some((error)=>error.includes('Unsupported Jinja')));

const quality=ecommerce.scenarios.find((s)=>s.effect==='bad_quality'); assert.ok(quality);
const build=runDbtBuild(ecommerce,quality); assert.equal(build.status,'failed'); assert.equal(build.testStates[quality.failedDbtTest],'failed');
const compileFailBuild=runDbtBuild(ecommerce,ecommerce.scenarios[0],{stg_orders:"select * from {{ ref('missing_model') }}"});
assert.equal(compileFailBuild.status,'failed'); assert.equal(compileFailBuild.modelStates.stg_orders,'failed'); assert.equal(compileFailBuild.modelStates.int_customer_orders,'skipped'); assert.equal(compileFailBuild.modelStates.fct_customer_sales,'skipped'); assert.equal(compileFailBuild.testStates.stg_orders_order_id_unique,'skipped'); assert.ok(compileFailBuild.compileErrors.stg_orders?.length);
console.log('PASS dbt compiler/ephemeral/build-propagation tests');

const parents=selectDbtModels(ecommerce.dbt,'fct_customer_sales','parents');
for(const expected of ['fct_customer_sales','int_customer_orders','stg_orders','stg_customers','stg_products','stg_returns']) assert.ok(parents.includes(expected),`parents selector missing ${expected}`);
const children=selectDbtModels(ecommerce.dbt,'stg_orders','children'); assert.ok(children.includes('int_customer_orders')&&children.includes('fct_customer_sales'));
assert.deepEqual(selectDbtModels(ecommerce.dbt,undefined,'exact'),[],'model-scoped selector should not silently broaden to the whole project when a non-model file is selected');
const exactRun=runDbtBuild(ecommerce,ecommerce.scenarios[0],{}, {command:'run',selectedModels:['fct_customer_sales']});
assert.equal(exactRun.modelStates.fct_customer_sales,'success','dbt run --select child can use pre-existing unselected physical parents'); assert.ok(Object.values(exactRun.testStates).every((state)=>state==='skipped'));
const exactTest=runDbtBuild(ecommerce,ecommerce.scenarios[0],{}, {command:'test',selectedModels:['fct_customer_sales']});
assert.equal(exactTest.modelStates.fct_customer_sales,'skipped'); assert.equal(exactTest.testStates.fct_sales_revenue_nonnegative,'success'); assert.equal(exactTest.contractStates.fct_customer_sales,'skipped','dbt test must not re-run model contracts');
const upstreamTestFailure={id:'upstream-test-fail',label:'upstream test fail',description:'synthetic dbt build gating regression',effect:'bad_quality',failedDbtTest:'stg_orders_order_id_unique'};
const gatedBuild=runDbtBuild(ecommerce,upstreamTestFailure,{}, {command:'build'});
assert.equal(gatedBuild.modelStates.stg_orders,'success'); assert.equal(gatedBuild.testStates.stg_orders_order_id_unique,'failed'); assert.equal(gatedBuild.modelStates.int_customer_orders,'skipped','dbt build should block selected descendants after an error-level upstream test failure'); assert.equal(gatedBuild.modelStates.fct_customer_sales,'skipped');
const exactOrdersTest=runDbtBuild(ecommerce,ecommerce.scenarios[0],{}, {command:'test',selectedModels:['stg_orders']});
assert.equal(exactOrdersTest.testStates.stg_orders_order_id_unique,'success');
assert.equal(exactOrdersTest.testStates.stg_orders_customer_relationship,'skipped','relationships tests with unselected model parents must not be invented as selected');
assert.equal(exactOrdersTest.testStates.stg_orders_product_relationship,'skipped');
const relationshipFailure={id:'relationship-fail',label:'relationship fail',description:'synthetic multi-parent test gating regression',effect:'bad_quality',failedDbtTest:'stg_orders_customer_relationship'};
const relationshipBuild=runDbtBuild(ecommerce,relationshipFailure,{}, {command:'build'});
assert.equal(relationshipBuild.testStates.stg_orders_customer_relationship,'failed');
assert.equal(relationshipBuild.modelStates.int_customer_orders,'skipped','a failed relationships test should block a descendant that depends on both model parents');
const contractRun=runDbtBuild(ecommerce,ecommerce.scenarios[0],{}, {command:'run',selectedModels:['fct_customer_sales']});
assert.equal(contractRun.contractStates.fct_customer_sales,'success','contracts are build-time checks even in dbt run');
assert.ok(Object.values(contractRun.testStates).every((state)=>state==='skipped'));
const contractMismatchSql=`with orders as (select * from {{ ref('int_customer_orders') }}), returns as (select * from {{ ref('stg_returns') }})
select o.customer_id, o.product_id, cast(o.order_ts as date) as sales_date
from orders o left join returns r using (order_id)`;
const contractMismatch=runDbtBuild(ecommerce,ecommerce.scenarios[0],{fct_customer_sales:contractMismatchSql},{command:'run',selectedModels:['fct_customer_sales']});
assert.equal(contractMismatch.contractStates.fct_customer_sales,'failed'); assert.equal(contractMismatch.modelStates.fct_customer_sales,'failed'); assert.ok(contractMismatch.compileErrors.fct_customer_sales?.some((error)=>error.includes('missing: net_revenue')));
const ecommerceSnapshot=ecommerce.dbt.snapshots.find((snapshot)=>snapshot.id==='snap_customers'); assert.ok(ecommerceSnapshot);
const snapshotResult=simulateSnapshot(ecommerceSnapshot); assert.deepEqual(snapshotResult.changedKeys,['101']); assert.deepEqual(snapshotResult.insertedKeys,['103']); assert.deepEqual(snapshotResult.unchangedKeys,['102']);
assert.equal(snapshotResult.history.filter((row)=>String(row.customer_id)==='101').length,2); assert.ok(snapshotResult.history.some((row)=>String(row.customer_id)==='101'&&row.dbt_valid_to==='2026-09-18T04:50:00Z'));
assert.match(snapshotYaml(ecommerceSnapshot),/strategy: timestamp/); assert.match(snapshotYaml(ecommerceSnapshot),/updated_at: updated_at/); assert.equal(snapshotDependencyId(ecommerceSnapshot.relation),'source.raw.customers');
const financeSnapshot=finance.dbt.snapshots.find((snapshot)=>snapshot.id==='snap_account_mapping'); assert.ok(financeSnapshot); const financeSnapshotResult=simulateSnapshot(financeSnapshot); assert.deepEqual(financeSnapshotResult.changedKeys,['5000']); assert.deepEqual(financeSnapshotResult.insertedKeys,['5100']); assert.match(snapshotYaml(financeSnapshot),/strategy: check/); assert.equal(snapshotDependencyId(financeSnapshot.relation),'account_mapping');
const projectBuild=runDbtBuild(ecommerce,ecommerce.scenarios[0],{}, {command:'build',includeProjectResources:true}); assert.equal(projectBuild.seedStates.country_codes,'success'); assert.equal(projectBuild.snapshotStates.snap_customers,'success');
const dependentSnapshot={...ecommerceSnapshot,id:'snap_sales_mart',path:'snapshots/snap_sales_mart.yml',relation:"ref('fct_customer_sales')",description:'synthetic model-dependent snapshot ordering regression'};
const snapshotDependencyStudy={...ecommerce,dbt:{...ecommerce.dbt,snapshots:[...ecommerce.dbt.snapshots,dependentSnapshot]}};
const dependentSnapshotBuild=runDbtBuild(snapshotDependencyStudy,ecommerce.scenarios[0],{}, {command:'build',includeProjectResources:true});
assert.equal(dependentSnapshotBuild.snapshotStates.snap_sales_mart,'success'); assert.ok(dependentSnapshotBuild.logs.findIndex((line)=>line.includes('OK model fct_customer_sales'))<dependentSnapshotBuild.logs.findIndex((line)=>line.includes('OK snapshot snap_sales_mart')),'snapshot ref(model) must run after its model dependency succeeds');
const blockedSnapshotBuild=runDbtBuild(snapshotDependencyStudy,ecommerce.scenarios[0],{fct_customer_sales:"select * from {{ ref('missing_model') }}"},{command:'build',includeProjectResources:true});
assert.equal(blockedSnapshotBuild.modelStates.fct_customer_sales,'failed'); assert.equal(blockedSnapshotBuild.snapshotStates.snap_sales_mart,'skipped','snapshot ref(model) must be skipped when its model dependency fails');
const scopedBuild=runDbtBuild(ecommerce,ecommerce.scenarios[0],{}, {command:'build',selectedModels:['fct_customer_sales']}); assert.equal(scopedBuild.seedStates.country_codes,'skipped'); assert.equal(scopedBuild.snapshotStates.snap_customers,'skipped');
console.log('PASS dbt run/test/build command + selector/test-gating/contract/snapshot tests');


const hybridNormal=runHybridSimulation(ecommerce,ecommerce.scenarios.find((s)=>s.id==='normal'),3);
assert.equal(hybridNormal.airflow.status,'success'); assert.equal(hybridNormal.dbt.status,'success'); assert.equal(hybridNormal.runPhaseStatus,'success'); assert.equal(hybridNormal.testPhaseStatus,'success'); assert.ok(hybridNormal.successfulBoundaryTasks.includes('run_dbt_staging'));
const hybridUpstreamFail=runHybridSimulation(ecommerce,permanent,4);
assert.equal(hybridUpstreamFail.airflow.status,'failed'); assert.equal(hybridUpstreamFail.dbt.status,'skipped'); assert.equal(hybridUpstreamFail.runPhaseStatus,'not_run'); assert.equal(hybridUpstreamFail.testPhaseStatus,'not_run'); assert.deepEqual(hybridUpstreamFail.successfulBoundaryTasks,[]);
const hybridQuality=runHybridSimulation(ecommerce,quality,5);
assert.equal(hybridQuality.airflow.status,'failed'); assert.equal(hybridQuality.dbt.status,'failed'); assert.equal(hybridQuality.runPhaseStatus,'success'); assert.equal(hybridQuality.testPhaseStatus,'failed'); assert.equal(hybridQuality.dbt.testStates[quality.failedDbtTest],'failed');
const hybridQuarantine=runHybridSimulation(clickstream,branch,6);
assert.equal(hybridQuarantine.airflow.status,'success'); assert.equal(hybridQuarantine.dbt.status,'skipped','quarantine-only branch must not pretend dbt ran');
const martsPhaseFailure={id:'marts-fail',label:'Marts command fails',description:'Synthetic regression case for scoped hybrid execution.',effect:'permanent',targetTask:'run_dbt_marts'};
const hybridPartial=runHybridSimulation(ecommerce,martsPhaseFailure,7);
assert.equal(hybridPartial.airflow.status,'failed'); assert.equal(hybridPartial.dbt.status,'failed'); assert.equal(hybridPartial.runPhaseStatus,'partial'); assert.equal(hybridPartial.testPhaseStatus,'not_run');
assert.equal(hybridPartial.dbt.modelStates.stg_orders,'success','successful staging scope should remain visible');
assert.equal(hybridPartial.dbt.modelStates.int_customer_orders,'skipped','failed marts Airflow phase must not invent downstream dbt model success');
assert.equal(hybridPartial.dbt.modelStates.fct_customer_sales,'skipped'); assert.ok(hybridPartial.dbt.logs.some((line)=>line.includes('AIRFLOW DBT PHASE FAILURE')));
const noRetryTransient={id:'no-retry-transient',label:'No retry',description:'Synthetic no-retry semantics test.',effect:'transient',targetTask:'validate_raw'};
const noRetryRun=runAirflowToEnd(ecommerce,noRetryTransient,createAirflowRun(ecommerce.airflow));
assert.equal(noRetryRun.tasks.validate_raw.state,'failed','a transient failure cannot retry when retries=0'); assert.equal(noRetryRun.tasks.validate_raw.attempts,1);

const operationalTestFailure={id:'test-wrapper-fail',label:'Test wrapper fails',description:'Synthetic operational failure before modeled dbt tests execute.',effect:'permanent',targetTask:'run_dbt_tests'};
const hybridOperationalTestFailure=runHybridSimulation(ecommerce,operationalTestFailure,71);
assert.equal(hybridOperationalTestFailure.airflow.status,'failed'); assert.equal(hybridOperationalTestFailure.runPhaseStatus,'success'); assert.equal(hybridOperationalTestFailure.testPhaseStatus,'failed');
assert.equal(hybridOperationalTestFailure.dbt.status,'success','successful model transformations should remain successful when the later Airflow test wrapper fails operationally');
assert.ok(Object.values(hybridOperationalTestFailure.dbt.testStates).every((state)=>state==='skipped'),'operational Airflow test-wrapper failure must not invent dbt test pass/fail results');
assert.ok(hybridOperationalTestFailure.dbt.logs.some((line)=>line.includes('TEST PHASE FAILURE')));
console.log('PASS hybrid Airflow↔dbt scoped-boundary and no-retry tests');

const financeQuality=finance.scenarios.find((scenario)=>scenario.effect==='bad_quality'); assert.ok(financeQuality);
const hybridFinanceQuality=runHybridSimulation(finance,financeQuality,8);
assert.equal(hybridFinanceQuality.dbt.modelStates.fct_reconciliation_exceptions,'success','separate Airflow dbt run phase should finish models before a later test/control phase fails');
assert.equal(hybridFinanceQuality.dbt.testStates.reconciliation_control_total,'failed'); assert.equal(hybridFinanceQuality.dbt.status,'failed');
console.log('PASS hybrid run-phase vs test-phase separation');

const mockStudy=caseStudies.find((c)=>c.id==='mock_marketplace'); assert.ok(mockStudy); assert.ok(mockStudy.mockProject);
assert.ok(mockStudy.mockProject.checkpoints.length>=5); assert.ok(mockStudy.mockProject.acceptanceCriteria.some((item)=>item.includes('sla_targets')));
const mockNormal=mockStudy.scenarios.find((s)=>s.id==='normal'); assert.ok(mockNormal);
const mockNormalRun=runAirflowToEnd(mockStudy,mockNormal,createAirflowRun(mockStudy.airflow));
assert.equal(mockNormalRun.status,'success');
assert.equal(mockNormalRun.tasks.load_order_events.firstStartedAtSeconds,0);
assert.equal(mockNormalRun.tasks.wait_for_shipments.firstStartedAtSeconds,0,'mock reference design should demonstrate independent readiness/ingestion work');
const mockTransient=mockStudy.scenarios.find((s)=>s.effect==='transient'); assert.ok(mockTransient);
const mockTransientRun=runAirflowToEnd(mockStudy,mockTransient,createAirflowRun(mockStudy.airflow));
assert.equal(mockTransientRun.tasks.load_shipments.state,'success'); assert.equal(mockTransientRun.tasks.load_shipments.attempts,2);
const mockMart=mockStudy.dbt.models.find((m)=>m.id==='fct_fulfillment_sla'); assert.ok(mockMart);
const mockCompiled=compileDbtModel(mockMart,mockStudy.dbt,true);
assert.equal(mockCompiled.ok,true); assert.ok(mockCompiled.sql.includes('analytics.sla_targets')); assert.ok(mockCompiled.sql.includes('dateadd(day, -2'));
const mockQuality=mockStudy.scenarios.find((s)=>s.effect==='bad_quality'); assert.ok(mockQuality);
const mockHybridQuality=runHybridSimulation(mockStudy,mockQuality,9);
assert.equal(mockHybridQuality.airflow.tasks.run_dbt_tests.state,'failed'); assert.equal(mockHybridQuality.airflow.tasks.publish_sla_dashboard.state,'upstream_failed');
assert.equal(mockHybridQuality.dbt.modelStates.fct_fulfillment_sla,'success'); assert.equal(mockHybridQuality.dbt.testStates.sla_rows_have_target,'failed'); assert.equal(mockHybridQuality.dbt.status,'failed');
console.log('PASS guided mock-project Airflow/dbt/Hybrid reference-solution tests');


const invalidEphemeralContract={...ecommerce,dbt:{...ecommerce.dbt,models:ecommerce.dbt.models.map((item)=>item.id==='int_customer_orders'?{...item,contract:['customer_id integer']}:item)}};
assert.ok(validateCaseStudy(invalidEphemeralContract).some((error)=>error.includes('ephemeral materialization')),'case validation must reject contract metadata on an ephemeral teaching model');
const invalidTimestampSnapshot={...ecommerce,dbt:{...ecommerce.dbt,snapshots:ecommerce.dbt.snapshots.map((item)=>item.id==='snap_customers'?{...item,updatedAt:undefined}:item)}};
assert.ok(validateCaseStudy(invalidTimestampSnapshot).some((error)=>error.includes('requires updatedAt')),'timestamp snapshots must declare the updated_at teaching field');
const invalidDuplicateSnapshotKey={...ecommerce,dbt:{...ecommerce.dbt,snapshots:ecommerce.dbt.snapshots.map((item)=>item.id==='snap_customers'?{...item,before:[...item.before,{...item.before[0]}]}:item)}};
assert.ok(validateCaseStudy(invalidDuplicateSnapshotKey).some((error)=>error.includes('duplicate unique keys')),'snapshot observations must reject duplicate unique keys');
const invalidSnapshotRelation={...ecommerce,dbt:{...ecommerce.dbt,snapshots:ecommerce.dbt.snapshots.map((item)=>item.id==='snap_customers'?{...item,relation:"source('raw','missing_customers')"}:item)}};
assert.ok(validateCaseStudy(invalidSnapshotRelation).some((error)=>error.includes('references missing source')),'snapshot relation metadata must resolve to a declared project source/ref resource');
const invalidQualityTarget={...mockStudy,scenarios:mockStudy.scenarios.map((item)=>item.effect==='bad_quality'?{...item,targetTask:'load_shipments'}:item)};
assert.ok(validateCaseStudy(invalidQualityTarget).some((error)=>error.includes('bad_quality target must be a quality task')),'bad_quality scenarios must target a quality task');
const missingQualityTest={...mockStudy,scenarios:mockStudy.scenarios.map((item)=>item.effect==='bad_quality'?{...item,failedDbtTest:undefined}:item)};
assert.ok(validateCaseStudy(missingQualityTest).some((error)=>error.includes('must identify the failing dbt test')),'Hybrid bad-quality scenarios must identify the injected failing dbt test');



const missingTransientTarget={...ecommerce,scenarios:[{id:'broken-transient',label:'broken',description:'missing target',effect:'transient'}]};
assert.ok(validateCaseStudy(missingTransientTarget).some((error)=>error.includes('requires targetTask')),'transient scenarios must not silently become no-op runs');
const missingBranchChoice={...clickstream,scenarios:[{id:'broken-branch',label:'broken',description:'missing selected-path metadata',effect:'branch',targetTask:'route_quality'}]};
assert.ok(validateCaseStudy(missingBranchChoice).some((error)=>error.includes('requires at least one branchSkip')),'branch scenarios must declare a non-selected direct branch path');
const misplacedFailedTest={...ecommerce,scenarios:[{...ecommerce.scenarios.find((item)=>item.id==='normal'),failedDbtTest:'orders_order_id_unique'}]};
assert.ok(validateCaseStudy(misplacedFailedTest).some((error)=>error.includes('not a bad_quality scenario')),'failedDbtTest injection metadata must only appear on bad_quality scenarios');
const invalidSensorPokes={...ecommerce,scenarios:[{...timeout,sensorTimeoutPokes:0}]};
assert.ok(validateCaseStudy(invalidSensorPokes).some((error)=>error.includes('positive integer')),'sensor timeout poke counts must be positive integers');

for(const study of caseStudies){assert.deepEqual(validateCaseStudy(study),[],`${study.id}: ${validateCaseStudy(study).join(' | ')}`);}
console.log(`PASS semantic case-study validation across ${caseStudies.length} projects`);

const transientAirflowStates=new Set(['idle','queued','running','waiting','retrying']);
for(const study of caseStudies.filter((item)=>!item.isScratch)){
  for(const [index,studyScenario] of study.scenarios.entries()){
    const airflowMatrix=runAirflowToEnd(study,studyScenario,createAirflowRun(study.airflow,50+index));
    assert.ok(airflowMatrix.status==='success'||airflowMatrix.status==='failed',`${study.id}/${studyScenario.id}: Airflow must reach a terminal run status`);
    for(const [taskId,runtime] of Object.entries(airflowMatrix.tasks)) assert.ok(!transientAirflowStates.has(runtime.state),`${study.id}/${studyScenario.id}/${taskId}: transient task state leaked after run-to-end`);
    const targetTask=studyScenario.targetTask?study.airflow.tasks.find((task)=>task.id===studyScenario.targetTask):undefined;
    const targetRuntime=studyScenario.targetTask?airflowMatrix.tasks[studyScenario.targetTask]:undefined;
    if(studyScenario.effect==='normal') assert.equal(airflowMatrix.status,'success',`${study.id}/${studyScenario.id}: normal scenario should finish successfully`);
    if(studyScenario.effect==='transient'&&targetTask&&targetRuntime){
      assert.equal(targetRuntime.attempts,targetTask.retries>0?2:1,`${study.id}/${studyScenario.id}: transient scenario must inject exactly one initial failure`);
      assert.equal(targetRuntime.state,targetTask.retries>0?'success':'failed',`${study.id}/${studyScenario.id}: transient target outcome must reflect retry availability`);
    }
    if(studyScenario.effect==='permanent'&&targetTask&&targetRuntime){assert.equal(targetRuntime.state,'failed',`${study.id}/${studyScenario.id}: permanent target must fail`);assert.equal(targetRuntime.attempts,targetTask.retries+1,`${study.id}/${studyScenario.id}: permanent target must exhaust configured retries`);}
    if(studyScenario.effect==='late_input'&&targetRuntime){assert.equal(targetRuntime.sensorPokes,2,`${study.id}/${studyScenario.id}: late-input lesson must show two unsuccessful pokes before success`);assert.equal(targetRuntime.state,'success');}
    if(studyScenario.effect==='sensor_timeout'&&targetRuntime){assert.equal(targetRuntime.sensorPokes,studyScenario.sensorTimeoutPokes??3,`${study.id}/${studyScenario.id}: sensor timeout must honor configured poke count`);assert.equal(targetRuntime.state,'failed');}
    if(studyScenario.effect==='bad_quality'&&targetRuntime) assert.equal(targetRuntime.state,'failed',`${study.id}/${studyScenario.id}: quality gate must fail in bad_quality scenario`);
    if(studyScenario.effect==='branch') for(const skipped of studyScenario.branchSkip??[]) assert.equal(airflowMatrix.tasks[skipped]?.state,'skipped',`${study.id}/${studyScenario.id}: declared non-selected branch ${skipped} must be skipped`);
    const hybridMatrix=runHybridSimulation(study,studyScenario,70+index);
    assert.ok(hybridMatrix.dbt.status!=='idle'&&hybridMatrix.dbt.status!=='running',`${study.id}/${studyScenario.id}: Hybrid dbt side must be terminal`);
    if(studyScenario.failedDbtTest) assert.equal(hybridMatrix.dbt.testStates[studyScenario.failedDbtTest],'failed',`${study.id}/${studyScenario.id}: declared failing dbt test must actually fail`);
  }
}
console.log('PASS full scenario-matrix terminal-state + advertised-effect regression');

const persistence=await import(`${resolve(root,'.compiled/lib/persistence.js')}?t=${stamp}`);
const memory=new Map(); globalThis.localStorage={getItem:(k)=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:(k)=>memory.delete(k),clear:()=>memory.clear()};
persistence.saveJson('audit-key',{caseId:'ecommerce'}); assert.deepEqual(persistence.loadJson('audit-key',{}),{caseId:'ecommerce'}); assert.equal(persistence.codeKey('finance','models/x.sql'),'orchestration-studio.code.finance.models/x.sql');
assert.equal(persistence.mockAnswersKey('mock_marketplace'),'orchestration-studio.mock-answers.mock_marketplace'); assert.equal(persistence.mockReviewKey('mock_marketplace'),'orchestration-studio.mock-review.mock_marketplace');
persistence.saveJson(persistence.mockAnswersKey('mock_marketplace'),{ownership:'my draft',invalid:42}); assert.deepEqual(persistence.loadStringRecord(persistence.mockAnswersKey('mock_marketplace')),{ownership:'my draft'},'mock answer loader must keep only string drafts'); persistence.saveJson(persistence.mockReviewKey('mock_marketplace'),{'acceptance-0':true,invalid:'yes'}); assert.deepEqual(persistence.loadBooleanRecord(persistence.mockReviewKey('mock_marketplace')),{'acceptance-0':true},'mock review loader must keep only boolean self-review values'); assert.equal(persistence.isLocalStorageUsable(),true);
persistence.saveJson('bad-record',['not','a','record']); assert.deepEqual(persistence.loadStringRecord('bad-record'),{},'mock answer loader must reject array-shaped storage payloads');
globalThis.localStorage.setItem(persistence.codeKey('ecommerce','models/staging/stg_orders.sql'),'edited'); globalThis.localStorage.removeItem(persistence.codeKey('ecommerce','models/staging/stg_orders.sql')); assert.equal(globalThis.localStorage.getItem(persistence.codeKey('ecommerce','models/staging/stg_orders.sql')),null);
globalThis.localStorage={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');},clear:()=>{}};
assert.equal(persistence.loadString('x','fallback'),'fallback'); assert.equal(persistence.saveString('x','y'),false); assert.equal(persistence.removeStored('x'),false); assert.deepEqual(persistence.loadJson('x',{safe:true}),{safe:true}); assert.equal(persistence.saveJson('x',{safe:true}),false); assert.equal(persistence.isLocalStorageUsable(),false);
console.log('PASS persistence/restore primitives + blocked-storage fallback');
