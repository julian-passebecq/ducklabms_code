import type { AirflowRunState, CaseStudy, DbtBuildState, ScenarioDefinition } from '../types.js';
import { createAirflowRun, runAirflowToEnd } from './airflowSimulator.js';
import { runDbtBuild, skipDbtBuild } from './dbtSimulator.js';

export type HybridPhaseStatus='not_run'|'partial'|'success'|'failed';

export interface HybridSimulationResult {
  airflow:AirflowRunState;
  dbt:DbtBuildState;
  successfulBoundaryTasks:string[];
  runPhaseStatus:HybridPhaseStatus;
  testPhaseStatus:HybridPhaseStatus;
}

function summarizeBoundaryPhase(taskIds:string[],airflow:AirflowRunState):HybridPhaseStatus{
  const unique=[...new Set(taskIds)];
  if(!unique.length) return 'not_run';
  const states=unique.map((taskId)=>airflow.tasks[taskId]?.state).filter(Boolean);
  const successes=states.filter((state)=>state==='success').length;
  if(successes===unique.length) return 'success';
  if(successes>0) return 'partial';
  if(states.some((state)=>state==='failed')) return 'failed';
  return 'not_run';
}

export function runHybridSimulation(study:CaseStudy,scenario:ScenarioDefinition,runIndex=1):HybridSimulationResult{
  const airflow=runAirflowToEnd(study,scenario,createAirflowRun(study.airflow,runIndex));
  const successfulBoundaryTasks=study.hybridLinks.map((link)=>link.airflowTask).filter((taskId,index,all)=>all.indexOf(taskId)===index&&airflow.tasks[taskId]?.state==='success');
  const successfulRunLinks=study.hybridLinks.filter((link)=>link.operation==='run'&&airflow.tasks[link.airflowTask]?.state==='success');
  const executedTestLinks=study.hybridLinks.filter((link)=>link.operation==='test'&&(airflow.tasks[link.airflowTask]?.state==='success'||(scenario.effect==='bad_quality'&&scenario.targetTask===link.airflowTask&&Boolean(scenario.failedDbtTest))));
  const failedRunLinks=study.hybridLinks.filter((link)=>link.operation==='run'&&airflow.tasks[link.airflowTask]?.state==='failed');
  const failedTestLinks=study.hybridLinks.filter((link)=>link.operation==='test'&&airflow.tasks[link.airflowTask]?.state==='failed');
  const selectedModels=[...new Set(successfulRunLinks.flatMap((link)=>link.dbtModels))];
  const testModels=[...new Set(executedTestLinks.flatMap((link)=>link.dbtModels))];

  const dbt=selectedModels.length
    ? runDbtBuild(study,scenario,{}, {command:'run',selectedModels,runTests:false,selectionReason:'derived from successful Airflow dbt run phases'})
    : skipDbtBuild(study,failedRunLinks.length?'the Airflow dbt run phase failed before any modeled dbt scope completed':'no Airflow dbt run phase completed successfully');

  if(selectedModels.length&&executedTestLinks.length){
    const testResult=runDbtBuild(study,scenario,{}, {command:'test',selectedModels:testModels,testModels,selectionReason:'derived from the Airflow dbt test/quality phase'});
    dbt.testStates=testResult.testStates;
    dbt.logs.push('--- SIMULATED AIRFLOW TEST PHASE ---',...testResult.logs.slice(1));
    if(testResult.status==='failed') dbt.status='failed';
  }

  if(failedRunLinks.length){
    dbt.status='failed';
    dbt.logs.push(`AIRFLOW DBT PHASE FAILURE — ${failedRunLinks.map((link)=>link.airflowTask).join(', ')} failed; uncompleted dbt model scopes remain skipped rather than being invented as successful.`);
  }
  if(failedTestLinks.length&&!executedTestLinks.length){
    dbt.logs.push(`AIRFLOW DBT TEST PHASE FAILURE — ${failedTestLinks.map((link)=>link.airflowTask).join(', ')} failed before this simulator modeled a dbt test command; dbt test states remain skipped rather than being invented as pass/fail results.`);
  }
  const runPhaseStatus=summarizeBoundaryPhase(study.hybridLinks.filter((link)=>link.operation==='run').map((link)=>link.airflowTask),airflow);
  const testPhaseStatus=summarizeBoundaryPhase(study.hybridLinks.filter((link)=>link.operation==='test').map((link)=>link.airflowTask),airflow);
  return {airflow,dbt,successfulBoundaryTasks,runPhaseStatus,testPhaseStatus};
}
