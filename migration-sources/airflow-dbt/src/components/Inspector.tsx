import { Tab, TabList } from '@fluentui/react-components';
import { useState } from 'react';
import type { AirflowTaskDefinition, AirflowTaskRuntime, DbtModelDefinition, DbtNodeState, ScenarioDefinition } from '../types.js';
import { ConceptCard } from './ConceptCard.js';
import { StatusPill } from './StatusPill.js';

interface Props {
  task?:AirflowTaskDefinition;
  taskRuntime?:AirflowTaskRuntime;
  model?:DbtModelDefinition;
  modelState?:DbtNodeState;
  contractState?:DbtNodeState;
  compileErrors?:string[];
  scenario?:ScenarioDefinition;
  orchestrator?:string;
  testOrchestrator?:string;
}

const taskConcept=(task?:AirflowTaskDefinition)=> task?.type==='sensor'?'sensors':task?.type==='branch'?'branching':task?.type==='dbt'?'orchestration':task?.triggerRule&&task.triggerRule!=='all_success'?'trigger-rules':task?.xcomPush?'xcom':(task?.retries??0)>0?'retries':task?.taskGroup?'task-groups':'retries';
const modelConcept=(model?:DbtModelDefinition)=>model?.materialization==='incremental'?'incremental':model?.materialization==='ephemeral'?'ephemeral':'ref';

export function Inspector({task,taskRuntime,model,modelState,contractState,compileErrors,scenario,orchestrator,testOrchestrator}:Props){
  const [tab,setTab]=useState('details');
  const conceptId=task?taskConcept(task):model?modelConcept(model):'orchestration';
  return <aside className="inspector">
    <div className="pane-title"><span>INSPECTOR</span><strong>{task?.label??model?.id??'Learning context'}</strong></div>
    <TabList selectedValue={tab} onTabSelect={(_e:any,data:any)=>setTab(String(data.value))} size="small"><Tab value="details">Details</Tab><Tab value="learn">Learn</Tab></TabList>
    <div className="inspector-body">
      {tab==='learn'?<ConceptCard conceptId={conceptId}/>:<>
        {task&&<div className="detail-stack">
          {taskRuntime&&<div><span>Runtime state</span><strong><StatusPill state={taskRuntime.state}/></strong></div>}
          <div><span>Type</span><strong>{task.type}</strong></div>
          <div><span>Upstream</span><strong>{task.dependsOn.join(', ')||'none'}</strong></div>
          <div><span>Trigger rule</span><strong>{task.triggerRule??'all_success'}</strong></div>
          <div><span>Retries</span><strong>{task.retries}{task.retryDelaySeconds?` · delay ${task.retryDelaySeconds}s`:''}</strong></div>
          <div><span>Duration</span><strong>{task.durationSeconds}s simulated per attempt</strong></div>
          {taskRuntime?.firstStartedAtSeconds!==undefined&&<div><span>Logical start</span><strong>t+{taskRuntime.firstStartedAtSeconds}s</strong></div>}
          {taskRuntime?.completedAtSeconds!==undefined&&<div><span>Logical finish</span><strong>t+{taskRuntime.completedAtSeconds}s</strong></div>}
          {task.type==='sensor'&&<div><span>Sensor pokes</span><strong>{taskRuntime?.sensorPokes??0}{task.sensorPokeIntervalSeconds?` · interval ${task.sensorPokeIntervalSeconds}s`:''}</strong></div>}
          {task.taskGroup&&<div><span>Task group</span><strong>{task.taskGroup}</strong></div>}
          {task.xcomPush&&<div><span>XCom concept</span><strong>{taskRuntime?.xcomValue??task.xcomPush}</strong></div>}
          {task.orchestrates?.length&&<div><span>dbt models</span><strong>{task.orchestrates.join(', ')}</strong></div>}
          <p>{task.description}</p>
        </div>}
        {model&&<div className="detail-stack">
          {modelState&&<div><span>Build state</span><strong><StatusPill state={modelState}/></strong></div>}
          <div><span>Layer</span><strong>{model.layer}</strong></div><div><span>Materialization</span><strong>{model.materialization}</strong></div><div><span>Dependencies</span><strong>{model.dependsOn.join(', ')||'none'}</strong></div>
          {model.contract&&<><div><span>Contract</span><strong>{model.contract.join(' · ')}</strong></div>{contractState&&<div><span>Contract preflight</span><strong><StatusPill state={contractState}/></strong></div>}</>}
          {orchestrator&&<div><span>Run by Airflow</span><strong>{orchestrator}</strong></div>}
          {testOrchestrator&&<div><span>Test gate</span><strong>{testOrchestrator}</strong></div>}
          {compileErrors?.length?<div><span>Compile diagnostics</span><strong>{compileErrors.join(' · ')}</strong></div>:null}
          <p>{model.description}</p>
        </div>}
        {!task&&!model&&<p className="muted">Select a task or model to inspect its role, dependencies and learning notes.</p>}
        {scenario&&<div className="scenario-note"><span>Active scenario</span><strong>{scenario.label}</strong><p>{scenario.description}</p></div>}
      </>}
    </div>
  </aside>;
}
