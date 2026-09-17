import { Button, Tab, TabList } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import type { CaseStudy } from '../types.js';
import { createAirflowRun } from '../lib/airflowSimulator.js';
import { createDbtBuild } from '../lib/dbtSimulator.js';
import { runHybridSimulation, type HybridPhaseStatus } from '../lib/hybridSimulator.js';
import { CaseOverview } from '../components/CaseOverview.js';
import { DataPreview } from '../components/DataPreview.js';
import { GraphCanvas } from '../components/GraphCanvas.js';
import { Inspector } from '../components/Inspector.js';
import { StatusPill } from '../components/StatusPill.js';

type HybridTab='overview'|'map'|'airflow'|'dbt'|'execution'|'data';
interface Props{study:CaseStudy;resetToken:number;}

export function HybridLab({study,resetToken}:Props){
  const [tab,setTab]=useState<HybridTab>('overview');
  const [scenarioId,setScenarioId]=useState(study.scenarios[0]?.id??'normal');
  const [selectedAirflow,setSelectedAirflow]=useState(study.hybridLinks[0]?.airflowTask??study.airflow.tasks[0]?.id??'');
  const [selectedModel,setSelectedModel]=useState(study.hybridLinks[0]?.dbtModels[0]??study.dbt.models[0]?.id??'');
  const [airflowRun,setAirflowRun]=useState(()=>createAirflowRun(study.airflow));
  const [dbtBuild,setDbtBuild]=useState(()=>createDbtBuild(study));
  const [selectedKind,setSelectedKind]=useState<'airflow'|'dbt'>('airflow');
  const [runCounter,setRunCounter]=useState(1);
  const [runPhaseStatus,setRunPhaseStatus]=useState<HybridPhaseStatus>('not_run');
  const [testPhaseStatus,setTestPhaseStatus]=useState<HybridPhaseStatus>('not_run');
  const scenario=study.scenarios.find((item)=>item.id===scenarioId)??study.scenarios[0];

  useEffect(()=>{setTab('overview');setScenarioId(study.scenarios[0]?.id??'normal');setSelectedAirflow(study.hybridLinks[0]?.airflowTask??study.airflow.tasks[0]?.id??'');setSelectedModel(study.hybridLinks[0]?.dbtModels[0]??study.dbt.models[0]?.id??'');setAirflowRun(createAirflowRun(study.airflow));setDbtBuild(createDbtBuild(study));setSelectedKind('airflow');setRunCounter(1);setRunPhaseStatus('not_run');setTestPhaseStatus('not_run');},[study.id,resetToken]);

  const runHybrid=()=>{
    const result=runHybridSimulation(study,scenario,runCounter);
    setAirflowRun(result.airflow); setDbtBuild(result.dbt); setRunPhaseStatus(result.runPhaseStatus); setTestPhaseStatus(result.testPhaseStatus); setRunCounter((value)=>value+1);
  };
  const resetHybrid=()=>{setAirflowRun(createAirflowRun(study.airflow));setDbtBuild(createDbtBuild(study));setRunPhaseStatus('not_run');setTestPhaseStatus('not_run');};
  const changeScenario=(id:string)=>{setScenarioId(id);resetHybrid();};
  const selectedTaskDef=study.airflow.tasks.find((task)=>task.id===selectedAirflow);
  const selectedModelDef=study.dbt.models.find((model)=>model.id===selectedModel);
  const modelRunTask=study.hybridLinks.find((link)=>link.operation==='run'&&link.dbtModels.includes(selectedModel))?.airflowTask;
  const modelTestTask=study.hybridLinks.find((link)=>link.operation==='test'&&link.dbtModels.includes(selectedModel))?.airflowTask;
  const modelOrchestrator=modelRunTask?`${study.airflow.dagId} → ${modelRunTask}`:undefined;
  const modelTestGate=modelTestTask?`${study.airflow.dagId} → ${modelTestTask}`:undefined;

  const airflowItems=useMemo(()=>study.airflow.tasks.map((task)=>({id:task.id,label:task.label,subLabel:task.orchestrates?.length?`dbt ×${task.orchestrates.length}`:task.taskGroup??task.type,dependsOn:task.dependsOn,state:airflowRun.tasks[task.id]?.state??'idle'})),[study,airflowRun]);
  const dbtItems=useMemo(()=>[
    ...study.dbt.sources.map((source)=>({id:source.id,label:`${source.schema}.${source.table}`,subLabel:'source',dependsOn:[],state:'idle',selectable:false})),
    ...study.dbt.seeds.map((seed)=>({id:seed.replace(/\.csv$/i,''),label:seed,subLabel:'seed',dependsOn:[],state:dbtBuild.seedStates[seed.replace(/\.csv$/i,'')]??'idle',selectable:false})),
    ...study.dbt.models.map((model)=>({id:model.id,label:model.id,subLabel:model.materialization,dependsOn:model.dependsOn,state:dbtBuild.modelStates[model.id]??'idle'}))
  ],[study,dbtBuild]);

  return <div className="hybrid-layout">
    <main className="workspace hybrid-workspace">
      <div className="workspace-header">
        <div><div className="eyebrow">HYBRID AIRFLOW + DBT</div><h1>{study.name}</h1><span className="meta-line">External orchestration + transformation lineage, cross-linked deliberately</span></div>
        <div className="run-controls"><label>Scenario<select value={scenarioId} onChange={(event)=>changeScenario(event.target.value)}>{study.scenarios.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><Button appearance="secondary" onClick={resetHybrid}>Reset</Button><Button appearance="primary" onClick={runHybrid} disabled={study.isScratch}>Run hybrid simulation</Button></div>
      </div>
      <div className="truth-strip"><strong>OWNERSHIP BOUNDARY</strong><span>Airflow controls readiness/orchestration. dbt controls SQL model dependency order, compilation and data tests.</span><span className="phase-chips"><span className={`phase-chip phase-${runPhaseStatus}`}>run scope: {runPhaseStatus.replace('_',' ')}</span><span className={`phase-chip phase-${testPhaseStatus}`}>test gate: {testPhaseStatus.replace('_',' ')}</span></span><span className="dual-status"><StatusPill state={airflowRun.status}/><StatusPill state={dbtBuild.status}/></span></div>
      <TabList selectedValue={tab} onTabSelect={(_e:any,data:any)=>setTab(String(data.value) as HybridTab)} className="workspace-tabs"><Tab value="overview">Overview</Tab><Tab value="map">Cross-link map</Tab><Tab value="airflow">Airflow DAG</Tab><Tab value="dbt">dbt lineage</Tab><Tab value="execution">Execution</Tab><Tab value="data">Sample data</Tab></TabList>
      <div className="workspace-body">
        {tab==='overview'&&<CaseOverview study={study}/>} 
        {tab==='map'&&<div className="crosslink-panel">
          <div className="crosslink-header"><div><span>Airflow orchestration tasks</span><strong>Click a task to highlight its dbt scope</strong></div><div><span>dbt resources</span><strong>Click a model to see its orchestrator</strong></div></div>
          <div className="crosslink-grid">
            <div className="link-list">{study.airflow.tasks.map((task)=>{const link=study.hybridLinks.find((item)=>item.airflowTask===task.id);return <button key={task.id} className={`link-card ${selectedAirflow===task.id?'active':''} ${link?'has-link':''}`} onClick={()=>{setSelectedKind('airflow');setSelectedAirflow(task.id);if(link?.dbtModels[0])setSelectedModel(link.dbtModels[0]);}}><span>{task.label}</span><small>{link?`${link.operation} · ${link.dbtModels.length} dbt resources`:'Airflow-only responsibility'}</small><StatusPill state={airflowRun.tasks[task.id]?.state??'idle'}/></button>;})}</div>
            <div className="mapping-center"><span>orchestrates</span>{study.hybridLinks.filter((link)=>link.airflowTask===selectedAirflow).map((link)=><p key={link.airflowTask}>{link.explanation}</p>)}{!study.hybridLinks.some((link)=>link.airflowTask===selectedAirflow)&&<p>This task does not own dbt model execution.</p>}</div>
            <div className="link-list">{study.dbt.models.map((model)=>{const orchestrator=study.hybridLinks.find((link)=>link.dbtModels.includes(model.id));const highlighted=study.hybridLinks.find((link)=>link.airflowTask===selectedAirflow)?.dbtModels.includes(model.id);return <button key={model.id} className={`link-card ${selectedModel===model.id?'active':''} ${highlighted?'linked':''}`} onClick={()=>{setSelectedKind('dbt');setSelectedModel(model.id);if(orchestrator)setSelectedAirflow(orchestrator.airflowTask);}}><span>{model.id}</span><small>{model.layer} · {model.materialization}</small><StatusPill state={dbtBuild.modelStates[model.id]??'idle'}/></button>;})}</div>
          </div>
        </div>}
        {tab==='airflow'&&<GraphCanvas items={airflowItems} selectedId={selectedAirflow} onSelect={(id)=>{setSelectedKind('airflow');setSelectedAirflow(id);}} emptyMessage="Scratch mode has no structured Airflow execution graph."/>}
        {tab==='dbt'&&<GraphCanvas items={dbtItems} selectedId={selectedModel} onSelect={(id)=>{if(study.dbt.models.some((model)=>model.id===id)){setSelectedKind('dbt');setSelectedModel(id);}}} emptyMessage="Scratch mode has no structured dbt lineage beyond editable practice."/>}
        {tab==='execution'&&<div className="execution-split"><section><div className="section-heading"><h3>Airflow task execution</h3><StatusPill state={airflowRun.status}/></div>{study.airflow.tasks.map((task)=>{const linked=study.hybridLinks.find((link)=>link.airflowTask===task.id);return <button key={task.id} className="execution-row" onClick={()=>{setSelectedKind('airflow');setSelectedAirflow(task.id);}}><span>{task.label}</span><small>{linked?`${linked.operation} dbt scope: ${linked.dbtModels.join(', ')}`:task.type}</small><StatusPill state={airflowRun.tasks[task.id]?.state??'idle'}/></button>;})}</section><section><div className="section-heading"><h3>dbt run scopes + tests</h3><StatusPill state={dbtBuild.status}/></div>{study.dbt.models.map((model)=><button key={model.id} className="execution-row" onClick={()=>{setSelectedKind('dbt');setSelectedModel(model.id);}}><span>{model.id}</span><small>{model.materialization==='ephemeral'?'inline only · no relation':model.materialization}</small><StatusPill state={dbtBuild.modelStates[model.id]??'idle'}/></button>)}{study.dbt.tests.map((test)=><div key={test.id} className="execution-row test"><span>{test.id}</span><small>{test.type}</small><StatusPill state={dbtBuild.testStates[test.id]??'idle'}/></div>)}</section></div>}
        {tab==='data'&&<DataPreview datasets={study.datasets}/>} 
      </div>
    </main>
    <Inspector task={selectedKind==='airflow'?selectedTaskDef:undefined} taskRuntime={selectedKind==='airflow'&&selectedTaskDef?airflowRun.tasks[selectedTaskDef.id]:undefined} model={selectedKind==='dbt'?selectedModelDef:undefined} modelState={selectedKind==='dbt'&&selectedModelDef?dbtBuild.modelStates[selectedModelDef.id]:undefined} compileErrors={selectedKind==='dbt'&&selectedModelDef?dbtBuild.compileErrors[selectedModelDef.id]:undefined} scenario={scenario} orchestrator={selectedKind==='dbt'?modelOrchestrator:undefined} testOrchestrator={selectedKind==='dbt'?modelTestGate:undefined}/>
  </div>;
}
