import { Button, Tab, TabList } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import type { AirflowRunState, AirflowTaskState, CaseStudy } from '../types.js';
import { createAirflowRun, runAirflowToEnd, stepAirflow } from '../lib/airflowSimulator.js';
import { codeKey, isLocalStorageUsable, loadString, removeStored, saveString } from '../lib/persistence.js';
import { CaseOverview } from '../components/CaseOverview.js';
import { CodeEditor } from '../components/CodeEditor.js';
import { DataPreview } from '../components/DataPreview.js';
import { Explorer, type ExplorerItem } from '../components/Explorer.js';
import { GraphCanvas } from '../components/GraphCanvas.js';
import { Inspector } from '../components/Inspector.js';
import { SchedulePanel } from '../components/SchedulePanel.js';
import { StatusPill } from '../components/StatusPill.js';

interface Props { study:CaseStudy; resetToken:number; }
type AirflowTab='overview'|'graph'|'grid'|'schedule'|'code'|'logs'|'data';

interface HistoryRun { id:string; status:'success'|'failed'; tasks:Record<string,AirflowTaskState>; }

function makeExplorer(study:CaseStudy):ExplorerItem[]{
  return [
    {id:'dags',label:'dags',path:'dags',kind:'folder',depth:0},
    {id:'dagpy',label:`${study.airflow.dagId}.py`,path:`dags/${study.airflow.dagId}.py`,kind:'file',depth:1,accent:'PY'},
    {id:'data',label:'sample_data',path:'sample_data',kind:'folder',depth:0},
    ...study.datasets.map((data,index)=>({id:`data-${index}`,label:`${data.id}.csv`,path:`sample_data/${data.id}.csv`,kind:'file' as const,depth:1,accent:'CSV'})),
    {id:'readme',label:'README_learning.md',path:'README_learning.md',kind:'file',depth:0,accent:'MD'},
  ];
}

function seededHistory(study:CaseStudy):HistoryRun[]{
  const normal=study.scenarios.find((scenario)=>scenario.effect==='normal')??study.scenarios[0];
  const failure=study.scenarios.find((scenario)=>scenario.effect==='permanent')??study.scenarios.find((scenario)=>scenario.effect==='bad_quality')??normal;
  const scenarios=[normal,normal,failure,normal].filter((item):item is NonNullable<typeof item>=>Boolean(item));
  return scenarios.map((scenario,index)=>{
    const completed=runAirflowToEnd(study,scenario,createAirflowRun(study.airflow,100+index));
    const tasks=Object.fromEntries(Object.entries(completed.tasks).map(([id,runtime])=>[id,runtime.state])) as Record<string,AirflowTaskState>;
    return {id:`sim__2026-09-${String(13+index).padStart(2,'0')}`,status:completed.status==='failed'?'failed':'success',tasks};
  });
}

export function AirflowLab({study,resetToken}:Props){
  const dagPath=`dags/${study.airflow.dagId}.py`;
  const [tab,setTab]=useState<AirflowTab>('overview');
  const [selectedTaskId,setSelectedTaskId]=useState(study.airflow.tasks[0]?.id??'');
  const [selectedPath,setSelectedPath]=useState(dagPath);
  const [selectedDatasetId,setSelectedDatasetId]=useState(study.datasets[0]?.id??'');
  const [scenarioId,setScenarioId]=useState(study.scenarios[0]?.id??'normal');
  const [run,setRun]=useState<AirflowRunState>(()=>createAirflowRun(study.airflow));
  const [runCounter,setRunCounter]=useState(1);
  const [history,setHistory]=useState<HistoryRun[]>(()=>seededHistory(study));
  const storageKey=codeKey(study.id,dagPath);
  const [code,setCodeState]=useState(()=>loadString(storageKey,study.airflow.code));
  const [storageOk,setStorageOk]=useState(()=>isLocalStorageUsable());
  const scenario=study.scenarios.find((item)=>item.id===scenarioId)??study.scenarios[0];
  const selectedTask=study.airflow.tasks.find((task)=>task.id===selectedTaskId);
  const selectedRuntime=selectedTask?run.tasks[selectedTask.id]:undefined;

  useEffect(()=>{
    const nextDagPath=`dags/${study.airflow.dagId}.py`;
    setTab('overview'); setSelectedTaskId(study.airflow.tasks[0]?.id??''); setSelectedPath(nextDagPath); setSelectedDatasetId(study.datasets[0]?.id??''); setScenarioId(study.scenarios[0]?.id??'normal'); setRun(createAirflowRun(study.airflow)); setRunCounter(1); setHistory(seededHistory(study));
    const key=codeKey(study.id,nextDagPath); setCodeState(loadString(key,study.airflow.code)); setStorageOk(isLocalStorageUsable());
  },[study.id,resetToken]);

  const setCode=(value:string)=>{setCodeState(value);setStorageOk(saveString(storageKey,value));};
  const restoreCode=()=>{setStorageOk(removeStored(storageKey));setCodeState(study.airflow.code);};
  const resetRun=()=>{const next=runCounter+1;setRunCounter(next);setRun(createAirflowRun(study.airflow,next));};
  const doStep=()=>setRun((previous)=>stepAirflow(study,scenario,previous));
  const doRun=()=>{
    const terminal=run.status==='success'||run.status==='failed';
    const next=terminal?runCounter+1:runCounter;
    const start=terminal?createAirflowRun(study.airflow,next):run;
    const completed=runAirflowToEnd(study,scenario,start);
    const taskSnapshot=Object.fromEntries(Object.entries(completed.tasks).map(([id,runtime])=>[id,runtime.state])) as Record<string,AirflowTaskState>;
    const historyStatus:'success'|'failed'=completed.status==='failed'?'failed':'success';
    setRun(completed); setRunCounter(next); setHistory((items)=>[...items.slice(-4),{id:completed.runId,status:historyStatus,tasks:taskSnapshot}]);
  };
  const changeScenario=(id:string)=>{setScenarioId(id);const next=runCounter+1;setRunCounter(next);setRun(createAirflowRun(study.airflow,next));};

  const graphItems=useMemo(()=>study.airflow.tasks.map((task)=>({id:task.id,label:task.label,subLabel:task.type,group:task.taskGroup,dependsOn:task.dependsOn,state:run.tasks[task.id]?.state??'idle'})),[study,run]);
  const explorer=useMemo(()=>makeExplorer(study),[study]);
  const onExplorer=(path:string)=>{
    setSelectedPath(path);
    if(path.endsWith('.py')) setTab('code');
    else if(path.endsWith('.csv')) {const id=path.split('/').pop()?.replace('.csv','')??'';setSelectedDatasetId(id);setTab('data');}
    else setTab('overview');
  };

  return <div className="lab-layout">
    <Explorer title={study.airflow.dagId} items={explorer} selectedPath={selectedPath} onSelect={onExplorer}/>
    <main className="workspace">
      <div className="workspace-header">
        <div><div className="eyebrow">AIRFLOW LAB</div><h1>{study.airflow.dagId}</h1><span className="meta-line">{study.airflow.schedule} · catchup={String(study.airflow.catchup)} · {study.airflow.tasks.length} structured tasks</span></div>
        <div className="run-controls">
          <label>Scenario<select value={scenarioId} onChange={(event)=>changeScenario(event.target.value)}>{study.scenarios.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <Button appearance="secondary" onClick={resetRun}>Reset run</Button>
          <Button appearance="secondary" onClick={doStep} disabled={study.isScratch||run.status==='success'||run.status==='failed'}>Step</Button>
          <Button appearance="primary" onClick={doRun} disabled={study.isScratch}>Run simulation</Button>
        </div>
      </div>
      <div className="truth-strip"><strong>SIMULATED DAG EXECUTION</strong><span>Code practice is separate. Structured task metadata drives the deterministic run state machine.</span><span className="elapsed-time">{run.elapsedSeconds}s simulated</span><StatusPill state={run.status}/></div>
      <TabList selectedValue={tab} onTabSelect={(_e:any,data:any)=>setTab(String(data.value) as AirflowTab)} className="workspace-tabs">
        <Tab value="overview">Overview</Tab><Tab value="graph">Graph</Tab><Tab value="grid">Grid</Tab><Tab value="schedule">Schedule</Tab><Tab value="code">Code</Tab><Tab value="logs">Logs</Tab><Tab value="data">Sample data</Tab>
      </TabList>
      <div className="workspace-body">
        {tab==='overview'&&<CaseOverview study={study}/>} 
        {tab==='graph'&&<GraphCanvas items={graphItems} selectedId={selectedTaskId} onSelect={setSelectedTaskId} emptyMessage="Scratch Python is not parsed into DAG nodes. Use a structured case study for execution simulation."/>}
        {tab==='grid'&&<div className="grid-view">
          <div className="grid-explainer"><strong>Run history</strong><span>Airflow-style matrix: rows are tasks; columns are simulated DAG runs.</span></div>
          <div className="run-grid" style={{gridTemplateColumns:`220px repeat(${history.length+1}, minmax(96px,1fr))`}}>
            <div className="grid-head task-col">Task</div>{history.map((h)=><div className="grid-head" key={h.id}>{h.id.replace('sim__','').slice(0,10)}<StatusPill state={h.status}/></div>)}<div className="grid-head current">current<StatusPill state={run.status}/></div>
            {study.airflow.tasks.map((task)=><div className="grid-row-fragment" key={task.id} style={{display:'contents'}}><button className="task-name-cell" onClick={()=>setSelectedTaskId(task.id)}>{task.label}<small>{task.taskGroup??task.type}</small></button>{history.map((historic)=><div key={historic.id} className="state-cell"><span className={`state-square state-${historic.tasks[task.id]??'idle'}`}></span></div>)}<div className="state-cell current"><span className={`state-square state-${run.tasks[task.id]?.state??'idle'}`}></span><small>{run.tasks[task.id]?.attempts||0} tries{run.tasks[task.id]?.sensorPokes?` · ${run.tasks[task.id].sensorPokes} pokes`:''}</small></div></div>)}
          </div>
        </div>}
        {tab==='schedule'&&<SchedulePanel definition={study.airflow}/>} 
        {tab==='code'&&<CodeEditor label={dagPath} language="Python · Airflow Task SDK" value={code} onChange={setCode} dirty={code!==study.airflow.code} onReset={restoreCode} footer={`CODE PRACTICE only. Editing this text does not mutate the structured simulator graph. ${storageOk?'Edits are saved in this browser.':'Browser storage unavailable — edits currently live only in this open tab.'}`}/>}
        {tab==='logs'&&<div className="logs-panel">{run.logs.map((entry,index)=><div key={index} className={`log-line ${entry.level.toLowerCase()}`}><span>{String(entry.step).padStart(2,'0')}</span><strong>{entry.level}</strong><code>{entry.taskId??'dag'}</code><p>{entry.message}</p></div>)}</div>}
        {tab==='data'&&<DataPreview datasets={study.datasets} selectedId={selectedDatasetId} onSelect={setSelectedDatasetId}/>} 
      </div>
    </main>
    <Inspector task={selectedTask} taskRuntime={selectedRuntime} scenario={scenario}/>
  </div>;
}
