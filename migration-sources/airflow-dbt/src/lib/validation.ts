import type { CaseStudy } from '../types.js';
import { validateAirflowDefinition } from './airflowSimulator.js';
import { referencedResources, seedId, topologicalModels } from './dbtCompiler.js';
import { snapshotDependencyId } from './snapshotSimulator.js';

export function validateCaseStudy(study:CaseStudy):string[]{
  const errors:string[]=[];
  const taskIds=new Set(study.airflow.tasks.map((task)=>task.id));
  const modelIds=new Set(study.dbt.models.map((model)=>model.id));
  const sourceIds=new Set(study.dbt.sources.map((source)=>source.id));
  const testIds=new Set(study.dbt.tests.map((test)=>test.id));
  const seedIds=new Set(study.dbt.seeds.map(seedId));
  const snapshotIds=new Set(study.dbt.snapshots.map((snapshot)=>snapshot.id));
  const datasetIds=new Set(study.datasets.map((dataset)=>dataset.id));
  const datasetLabels=new Set(study.datasets.map((dataset)=>dataset.label));

  errors.push(...validateAirflowDefinition(study.airflow).map((error)=>`Airflow: ${error}`));
  if(taskIds.size!==study.airflow.tasks.length) errors.push('Airflow task IDs are duplicated.');
  if(modelIds.size!==study.dbt.models.length) errors.push('dbt model IDs are duplicated.');
  if(sourceIds.size!==study.dbt.sources.length) errors.push('dbt source IDs are duplicated.');
  if(testIds.size!==study.dbt.tests.length) errors.push('dbt test IDs are duplicated.');
  if(seedIds.size!==study.dbt.seeds.length) errors.push('dbt seed resource names are duplicated.');
  if(snapshotIds.size!==study.dbt.snapshots.length) errors.push('dbt snapshot IDs are duplicated.');
  for(const seed of study.dbt.seeds) if(!seed.toLowerCase().endsWith('.csv')) errors.push(`dbt seed ${seed} should be a CSV file in this teaching simulator.`);
  for(const seed of seedIds) if(modelIds.has(seed)) errors.push(`dbt seed ${seed} conflicts with a model of the same ref() name.`);
  if(datasetIds.size!==study.datasets.length) errors.push('Sample dataset IDs are duplicated.');
  if(datasetLabels.size!==study.datasets.length) errors.push('Sample dataset labels are duplicated.');

  if(study.mockProject){
    if(study.mockProject.requirements.length<3) errors.push('Mock project should declare at least three requirements.');
    if(study.mockProject.deliverables.length<3) errors.push('Mock project should declare at least three deliverables.');
    if(study.mockProject.acceptanceCriteria.length<3) errors.push('Mock project should declare at least three acceptance checks.');
    if(study.mockProject.checkpoints.length<3) errors.push('Mock project should declare at least three reasoning checkpoints.');
    const checkpointIds=study.mockProject.checkpoints.map((checkpoint)=>checkpoint.id);
    if(new Set(checkpointIds).size!==checkpointIds.length) errors.push('Mock project checkpoint IDs are duplicated.');
    for(const checkpoint of study.mockProject.checkpoints){
      if(!checkpoint.prompt.trim()||!checkpoint.hint.trim()||!checkpoint.referenceAnswer.trim()) errors.push(`Mock project checkpoint ${checkpoint.id} is missing prompt/hint/reference content.`);
    }
  }

  for(const task of study.airflow.tasks){
    for(const model of task.orchestrates??[]) if(!modelIds.has(model)) errors.push(`Airflow task ${task.id} orchestrates missing dbt model ${model}.`);
    if(!study.isScratch && !study.airflow.code.includes(task.id)) errors.push(`Airflow example code does not mention structured task ${task.id}.`);
  }

  for(const model of study.dbt.models){
    if(model.contract?.length){
      if(model.materialization==='ephemeral') errors.push(`dbt model ${model.id} cannot use the teaching contract metadata with ephemeral materialization.`);
      const contractColumns=model.contract.map((entry)=>entry.trim().split(/\s+/)[0]).filter(Boolean);
      if(new Set(contractColumns).size!==contractColumns.length) errors.push(`dbt model ${model.id} contract declares duplicate column names.`);
    }
    for(const dep of model.dependsOn) if(!modelIds.has(dep)&&!sourceIds.has(dep)&&!seedIds.has(dep)) errors.push(`dbt model ${model.id} depends on unknown resource ${dep}.`);
    const declared=new Set(model.dependsOn); const parsed=new Set(referencedResources(model.sql));
    if(declared.size!==parsed.size||[...declared].some((dep)=>!parsed.has(dep))) errors.push(`dbt model ${model.id} SQL ref/source calls differ from dependsOn metadata.`);
  }
  try{topologicalModels(study.dbt);}catch(error){errors.push(`dbt graph: ${error instanceof Error?error.message:String(error)}`);}


  for(const snapshot of study.dbt.snapshots){
    if(!/\.ya?ml$/i.test(snapshot.path)) errors.push(`dbt snapshot ${snapshot.id} should use YAML configuration in this current teaching project.`);
    const snapshotDependency=snapshotDependencyId(snapshot.relation);
    if(!snapshotDependency) errors.push(`dbt snapshot ${snapshot.id} relation must use a bounded source('name','table') or ref('resource') expression.`);
    else if(snapshotDependency.startsWith('source.')){
      if(!sourceIds.has(snapshotDependency)) errors.push(`dbt snapshot ${snapshot.id} references missing source ${snapshotDependency}.`);
    }else if(!modelIds.has(snapshotDependency)&&!seedIds.has(snapshotDependency)) errors.push(`dbt snapshot ${snapshot.id} references missing model/seed ${snapshotDependency}.`);
    if(snapshot.strategy==='timestamp'&&!snapshot.updatedAt) errors.push(`dbt snapshot ${snapshot.id} timestamp strategy requires updatedAt metadata.`);
    if(snapshot.strategy==='check'&&!(snapshot.checkCols?.length)) errors.push(`dbt snapshot ${snapshot.id} check strategy requires checkCols metadata.`);
    for(const [label,rows] of [['before',snapshot.before],['after',snapshot.after]] as const){
      const keys=rows.map((row)=>String(row[snapshot.uniqueKey]??''));
      if(keys.some((key)=>!key)) errors.push(`dbt snapshot ${snapshot.id} ${label} observation has a row missing unique key ${snapshot.uniqueKey}.`);
      if(new Set(keys).size!==keys.length) errors.push(`dbt snapshot ${snapshot.id} ${label} observation has duplicate unique keys.`);
      if(snapshot.updatedAt&&rows.some((row)=>!(snapshot.updatedAt! in row))) errors.push(`dbt snapshot ${snapshot.id} ${label} observation is missing updated_at column ${snapshot.updatedAt}.`);
      if(snapshot.checkCols?.some((column)=>rows.some((row)=>!(column in row)))) errors.push(`dbt snapshot ${snapshot.id} ${label} observation is missing a configured check column.`);
    }
  }

  for(const test of study.dbt.tests){
    if(!modelIds.has(test.model)) errors.push(`dbt test ${test.id} targets missing model ${test.model}.`);
    if(test.type==='relationships'&&test.target){const targetModel=test.target.split('.')[0];if(!modelIds.has(targetModel)) errors.push(`relationships test ${test.id} targets missing model ${targetModel}.`);}
    if(test.type==='accepted_values'&&!(test.acceptedValues?.length)) errors.push(`accepted_values test ${test.id} must declare acceptedValues.`);
  }

  for(const scenario of study.scenarios){
    const effectsRequiringTarget=new Set(['transient','permanent','late_input','sensor_timeout','bad_quality']);
    if(effectsRequiringTarget.has(scenario.effect)&&!scenario.targetTask) errors.push(`Scenario ${scenario.id} effect ${scenario.effect} requires targetTask.`);
    if(scenario.effect==='branch'&&!scenario.targetTask&&!scenario.branchTask) errors.push(`Scenario ${scenario.id} branch effect requires targetTask or branchTask.`);
    if(scenario.effect==='branch'&&!(scenario.branchSkip?.length)) errors.push(`Scenario ${scenario.id} branch effect requires at least one branchSkip target.`);
    if(scenario.failedDbtTest&&scenario.effect!=='bad_quality') errors.push(`Scenario ${scenario.id} declares failedDbtTest but is not a bad_quality scenario.`);
    if(scenario.sensorTimeoutPokes!==undefined&&(scenario.effect!=='sensor_timeout'||!Number.isInteger(scenario.sensorTimeoutPokes)||scenario.sensorTimeoutPokes<1)) errors.push(`Scenario ${scenario.id} sensorTimeoutPokes is only valid as a positive integer for sensor_timeout.`);
    if(scenario.targetTask&&!taskIds.has(scenario.targetTask)) errors.push(`Scenario ${scenario.id} targets missing task ${scenario.targetTask}.`);
    if(scenario.failedDbtTest&&!testIds.has(scenario.failedDbtTest)) errors.push(`Scenario ${scenario.id} targets missing dbt test ${scenario.failedDbtTest}.`);
    const target=study.airflow.tasks.find((task)=>task.id===scenario.targetTask);
    if((scenario.effect==='late_input'||scenario.effect==='sensor_timeout')&&target?.type!=='sensor') errors.push(`Scenario ${scenario.id} must target a sensor task.`);
    if(scenario.effect==='bad_quality'&&target&&target.type!=='quality') errors.push(`Scenario ${scenario.id} bad_quality target must be a quality task.`);
    if(scenario.effect==='bad_quality'&&scenario.targetTask&&study.hybridLinks.some((link)=>link.operation==='test'&&link.airflowTask===scenario.targetTask)&&!scenario.failedDbtTest) errors.push(`Scenario ${scenario.id} must identify the failing dbt test for its Hybrid quality gate.`);
    const branchTaskId=scenario.branchTask ?? (scenario.effect==='branch'?scenario.targetTask:undefined);
    if(branchTaskId||scenario.branchSkip?.length){
      const branchTask=study.airflow.tasks.find((task)=>task.id===branchTaskId);
      if(!branchTask) errors.push(`Scenario ${scenario.id} references missing branch task ${branchTaskId}.`);
      else if(branchTask.type!=='branch') errors.push(`Scenario ${scenario.id} branchTask must reference a branch task.`);
      if(new Set(scenario.branchSkip??[]).size!==(scenario.branchSkip??[]).length) errors.push(`Scenario ${scenario.id} branchSkip contains duplicate task IDs.`);
      for(const skipped of scenario.branchSkip??[]){
        const skippedTask=study.airflow.tasks.find((task)=>task.id===skipped);
        if(!skippedTask) errors.push(`Scenario ${scenario.id} skips missing task ${skipped}.`);
        else if(branchTaskId&&!skippedTask.dependsOn.includes(branchTaskId)) errors.push(`Scenario ${scenario.id} branchSkip should list direct non-selected branch tasks; ${skipped} is not directly downstream.`);
      }
    }
  }

  for(const task of study.airflow.tasks.filter((item)=>item.type==='dbt')){
    const linkedModels=[...new Set(study.hybridLinks.filter((link)=>link.operation==='run'&&link.airflowTask===task.id).flatMap((link)=>link.dbtModels))];
    const orchestrates=[...new Set(task.orchestrates??[])];
    if(orchestrates.length&&!linkedModels.length) errors.push(`Airflow dbt task ${task.id} declares orchestrates metadata but has no Hybrid run link.`);
    if(linkedModels.length&&(linkedModels.length!==orchestrates.length||linkedModels.some((model)=>!orchestrates.includes(model)))) errors.push(`Airflow dbt task ${task.id} orchestrates metadata differs from Hybrid run-link scope.`);
  }

  for(const link of study.hybridLinks){
    if(!taskIds.has(link.airflowTask)) errors.push(`Hybrid link targets missing Airflow task ${link.airflowTask}.`);
    const airflowTask=study.airflow.tasks.find((task)=>task.id===link.airflowTask);
    if(link.operation==='run'&&airflowTask&&airflowTask.type!=='dbt') errors.push(`Hybrid run link ${link.airflowTask} must reference an Airflow dbt task.`);
    if(link.operation==='test'&&airflowTask&&airflowTask.type!=='quality') errors.push(`Hybrid test link ${link.airflowTask} must reference an Airflow quality task.`);
    for(const model of link.dbtModels) if(!modelIds.has(model)) errors.push(`Hybrid link ${link.airflowTask} targets missing dbt model ${model}.`);
    if(link.operation==='test'&&!study.dbt.tests.some((test)=>link.dbtModels.includes(test.model))) errors.push(`Hybrid test link ${link.airflowTask} does not include any model that owns a dbt test.`);
    if(link.operation==='test') for(const model of link.dbtModels) if(!study.dbt.tests.some((test)=>test.model===model)) errors.push(`Hybrid test link ${link.airflowTask} includes ${model}, but that model owns no declared dbt test in this teaching case.`);
  }
  for(const scenario of study.scenarios.filter((item)=>item.effect==='bad_quality'&&item.targetTask&&item.failedDbtTest)){
    const failedTest=study.dbt.tests.find((test)=>test.id===scenario.failedDbtTest);
    const testLinks=study.hybridLinks.filter((link)=>link.operation==='test'&&link.airflowTask===scenario.targetTask);
    if(failedTest&&testLinks.length&&!testLinks.some((link)=>link.dbtModels.includes(failedTest.model))) errors.push(`Scenario ${scenario.id} injects dbt test ${failedTest.id}, but the Hybrid test scope for ${scenario.targetTask} does not include ${failedTest.model}.`);
  }

  if(!study.isScratch){
    for(const source of study.dbt.sources){const label=`${source.schema}.${source.table}`;if(!datasetLabels.has(label)) errors.push(`dbt source ${label} has no matching sample dataset label.`);}
  }
  for(const dataset of study.datasets){
    if(new Set(dataset.columns).size!==dataset.columns.length) errors.push(`Dataset ${dataset.id} has duplicate columns.`);
    dataset.rows.forEach((row,index)=>dataset.columns.forEach((column)=>{if(!(column in row)) errors.push(`Dataset ${dataset.id} row ${index+1} is missing column ${column}.`);}));
  }

  return errors;
}
