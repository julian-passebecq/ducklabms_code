import { Button, Switch, Tab, TabList } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import type { CaseStudy, DbtModelDefinition } from '../types.js';
import { compileDbtModel, type ModelSqlOverrides } from '../lib/dbtCompiler.js';
import { createDbtBuild, runDbtBuild, selectDbtModels, type DbtCommand, type DbtSelectionMode } from '../lib/dbtSimulator.js';
import { codeKey, isLocalStorageUsable, loadString, removeStored, saveString } from '../lib/persistence.js';
import { simulateSnapshot, snapshotDependencyId, snapshotYaml } from '../lib/snapshotSimulator.js';
import { CaseOverview } from '../components/CaseOverview.js';
import { CodeEditor } from '../components/CodeEditor.js';
import { DataPreview } from '../components/DataPreview.js';
import { Explorer, type ExplorerItem } from '../components/Explorer.js';
import { GraphCanvas } from '../components/GraphCanvas.js';
import { Inspector } from '../components/Inspector.js';
import { StatusPill } from '../components/StatusPill.js';

type DbtTab='overview'|'lineage'|'model'|'compiled'|'build'|'tests'|'snapshots'|'docs'|'data';
interface Props{study:CaseStudy;resetToken:number;}

function explorerItems(study:CaseStudy):ExplorerItem[]{
  const layerItems=(layer:string)=>study.dbt.models.filter((m)=>m.layer===layer).map((m,index)=>({id:`model-${layer}-${index}`,label:m.path.split('/').pop()??m.id,path:m.path,kind:'file' as const,depth:2,accent:'SQL'}));
  return [
    {id:'models',label:'models',path:'models',kind:'folder',depth:0},
    {id:'staging',label:'staging',path:'models/staging',kind:'folder',depth:1},...layerItems('staging'),
    {id:'intermediate',label:'intermediate',path:'models/intermediate',kind:'folder',depth:1},...layerItems('intermediate'),
    {id:'marts',label:'marts',path:'models/marts',kind:'folder',depth:1},...layerItems('marts'),
    {id:'tests',label:'tests',path:'tests',kind:'folder',depth:0},...study.dbt.tests.filter((test)=>test.type==='singular').map((test,index)=>({id:`singular-${index}`,label:`${test.id}.sql`,path:`tests/${test.id}.sql`,kind:'file' as const,depth:1,accent:'SQL'})),
    {id:'seeds',label:'seeds',path:'seeds',kind:'folder',depth:0},...study.dbt.seeds.map((seed,index)=>({id:`seed-${index}`,label:seed,path:`seeds/${seed}`,kind:'file' as const,depth:1,accent:'CSV'})),
    {id:'snapshots',label:'snapshots',path:'snapshots',kind:'folder',depth:0},...study.dbt.snapshots.map((snap,index)=>({id:`snap-${index}`,label:snap.path.split('/').pop()??snap.id,path:snap.path,kind:'file' as const,depth:1,accent:'YML'})),
    {id:'macros',label:'macros',path:'macros',kind:'folder',depth:0},...study.dbt.macros.map((macro,index)=>({id:`macro-${index}`,label:macro,path:`macros/${macro}`,kind:'file' as const,depth:1,accent:'SQL'})),
    {id:'modelsyml',label:'models.yml',path:'models.yml',kind:'file',depth:0,accent:'YML'},
    {id:'projectyml',label:'dbt_project.yml',path:'dbt_project.yml',kind:'file',depth:0,accent:'YML'}
  ];
}

function SnapshotTable({rows}:{rows:Array<Record<string,string|number|boolean|null>>}){
  const columns=rows.length?Object.keys(rows[0]):[];
  return <div className="table-scroll snapshot-table"><table><thead><tr>{columns.map((column)=><th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{columns.map((column)=><td key={column}><code>{row[column]===null?'null':String(row[column])}</code></td>)}</tr>)}</tbody></table></div>;
}

function languageFor(path:string):string{
  if(path.endsWith('.yml')||path.endsWith('.yaml')) return 'YAML';
  if(path.endsWith('.csv')) return 'CSV';
  return 'SQL + Jinja';
}

export function DbtLab({study,resetToken}:Props){
  const firstModel=study.dbt.models[0];
  const [tab,setTab]=useState<DbtTab>('overview');
  const [selectedPath,setSelectedPath]=useState(firstModel?.path??'dbt_project.yml');
  const [selectedModelId,setSelectedModelId]=useState(firstModel?.id??'');
  const [scenarioId,setScenarioId]=useState((study.scenarios.find((item)=>item.effect==='normal')??study.scenarios[0])?.id??'normal');
  const [incremental,setIncremental]=useState(false);
  const [command,setCommand]=useState<DbtCommand>('build');
  const [selectionMode,setSelectionMode]=useState<DbtSelectionMode>('all');
  const [build,setBuild]=useState(()=>createDbtBuild(study));
  const [selectedSnapshotId,setSelectedSnapshotId]=useState(study.dbt.snapshots[0]?.id??'');
  const [selectedDatasetId,setSelectedDatasetId]=useState(study.datasets[0]?.id??'');
  const [selectedLineageId,setSelectedLineageId]=useState(firstModel?.id??'');
  const selectedModel=study.dbt.models.find((model)=>model.id===selectedModelId);
  const dbtScenarios=study.scenarios.filter((item)=>item.effect==='normal'||item.effect==='bad_quality');
  const scenario=dbtScenarios.find((item)=>item.id===scenarioId)??dbtScenarios[0]??study.scenarios[0];

  const defaultContentFor=(path:string):string=>{
    const model=study.dbt.models.find((item)=>item.path===path); if(model)return model.sql;
    if(path==='dbt_project.yml')return study.dbt.projectYaml;
    if(path==='models.yml')return study.dbt.modelsYaml;
    if(path.startsWith('seeds/')){
      if(path.includes('country_codes')) return `country_code,country_name\nNO,Norway\nCH,Switzerland\nFR,France`;
      if(path.includes('bot_user_agents')) return `pattern,label\nKnownBot/*,bot\nSyntheticCrawler/*,bot`;
      if(path.includes('account_mapping')) return `account_code,reporting_group\n4000,Revenue\n5000,Operating expense`;
      if(path.includes('sla_targets')) return `region,service_tier,target_hours\nNO,priority,12\nCH,standard,24`;
      return `key,value\nexample,1`;
    }
    if(path.startsWith('tests/')){const testId=path.split('/').pop()?.replace(/\.sql$/,'')??'';const test=study.dbt.tests.find((item)=>item.id===testId);return `-- singular data test: ${test?.description??testId}\n-- A real dbt singular test returns failing rows. Zero rows means pass.\nselect * from analytics.${test?.model??study.dbt.models.at(-1)?.id??'model'} where 1 = 0`;}
    if(path.startsWith('macros/')){
      if(path.includes('cents_to_currency')) return `{% macro cents_to_currency(column_name) %}\n  ({{ column_name }} / 100.0)\n{% endmacro %}`;
      if(path.includes('session_key')) return `{% macro session_key(user_col, session_col) %}\n  concat({{ user_col }}, '-', cast({{ session_col }} as string))\n{% endmacro %}`;
      return `{% macro normalized_reference(column_name) %}\n  upper(trim({{ column_name }}))\n{% endmacro %}`;
    }
    if(path.startsWith('snapshots/')){const snapshot=study.dbt.snapshots.find((item)=>item.path===path);return snapshot?snapshotYaml(snapshot):'# Snapshot definition';}
    return '# Static learning file';
  };
  const contentFor=(path:string):string=>loadString(codeKey(study.id,path),defaultContentFor(path));
  const [code,setCodeState]=useState(()=>contentFor(selectedPath));
  const [storageOk,setStorageOk]=useState(()=>isLocalStorageUsable());

  useEffect(()=>{
    const model=study.dbt.models[0]; const path=model?.path??'dbt_project.yml';
    setTab('overview'); setSelectedModelId(model?.id??''); setSelectedPath(path); setScenarioId((study.scenarios.find((item)=>item.effect==='normal')??study.scenarios[0])?.id??'normal'); setIncremental(false); setCommand('build'); setSelectionMode('all'); setBuild(createDbtBuild(study)); setSelectedSnapshotId(study.dbt.snapshots[0]?.id??''); setSelectedDatasetId(study.datasets[0]?.id??''); setSelectedLineageId(model?.id??''); setCodeState(contentFor(path)); setStorageOk(isLocalStorageUsable());
  },[study.id,resetToken]);

  const choosePath=(path:string)=>{
    setSelectedPath(path); const model=study.dbt.models.find((item)=>item.path===path); setSelectedModelId(model?.id??'');
    const snapshot=study.dbt.snapshots.find((item)=>item.path===path); if(snapshot)setSelectedSnapshotId(snapshot.id);
    const seed=study.dbt.seeds.find((item)=>`seeds/${item}`===path);
    setSelectedLineageId(model?.id??snapshot?.id??seed?.replace(/\.csv$/i,'')??'');
    setCodeState(contentFor(path)); setTab('model');
  };
  const chooseModel=(model:DbtModelDefinition,goToModel=false)=>{setSelectedModelId(model.id);setSelectedLineageId(model.id);setSelectedPath(model.path);setCodeState(contentFor(model.path));if(goToModel)setTab('model');};
  const setCode=(value:string)=>{setCodeState(value);setStorageOk(saveString(codeKey(study.id,selectedPath),value));};
  const restoreFile=()=>{setStorageOk(removeStored(codeKey(study.id,selectedPath)));setCodeState(defaultContentFor(selectedPath));};
  const modelSqlOverrides=():ModelSqlOverrides=>Object.fromEntries(study.dbt.models.map((model)=>[model.id,loadString(codeKey(study.id,model.path),model.sql)]));
  const compiled=selectedModel?compileDbtModel(selectedModel,study.dbt,incremental,modelSqlOverrides()):{ok:false,sql:'Select a dbt model file to compile.',errors:['The selected project resource is not a dbt model.'],replacements:[]};
  const changeScenario=(id:string)=>{setScenarioId(id);setBuild(createDbtBuild(study));};
  const selectedCommandModels=selectDbtModels(study.dbt,selectedModel?.id,selectionMode);
  const runCommand=()=>setBuild(runDbtBuild(study,scenario,modelSqlOverrides(),{command,selectedModels:selectedCommandModels,selectionReason:`${selectionMode} selector from ${selectedModel?.id??'project'}`,includeProjectResources:command==='build'&&selectionMode==='all'}));
  const selectedSnapshot=study.dbt.snapshots.find((snapshot)=>snapshot.id===selectedSnapshotId)??study.dbt.snapshots[0];
  const snapshotSimulation=selectedSnapshot?simulateSnapshot(selectedSnapshot):undefined;

  const graphItems=useMemo(()=>[
    ...study.dbt.sources.map((source)=>({id:source.id,label:`${source.schema}.${source.table}`,subLabel:'source',dependsOn:[],state:'idle'})),
    ...study.dbt.seeds.map((seed)=>({id:seed.replace(/\.csv$/i,''),label:seed,subLabel:'seed',dependsOn:[],state:build.seedStates[seed.replace(/\.csv$/i,'')]??'idle'})),
    ...study.dbt.models.map((model)=>({id:model.id,label:model.id,subLabel:`${model.layer} · ${model.materialization}`,dependsOn:model.dependsOn,state:build.modelStates[model.id]??'idle'})),
    ...study.dbt.snapshots.map((snapshot)=>({id:snapshot.id,label:snapshot.id,subLabel:`snapshot · ${snapshot.strategy}`,dependsOn:[snapshotDependencyId(snapshot.relation)].filter((id):id is string=>Boolean(id)),state:build.snapshotStates[snapshot.id]??'idle'}))
  ],[study,build]);
  const lineageSelectedId=selectedLineageId;
  const runOrchestrator=selectedModel?study.hybridLinks.find((link)=>link.operation==='run'&&link.dbtModels.includes(selectedModel.id))?.airflowTask:undefined;
  const testOrchestrator=selectedModel?study.hybridLinks.find((link)=>link.operation==='test'&&link.dbtModels.includes(selectedModel.id))?.airflowTask:undefined;
  const orchestrator=runOrchestrator?`${study.airflow.dagId} → ${runOrchestrator}`:undefined;
  const testGate=testOrchestrator?`${study.airflow.dagId} → ${testOrchestrator}`:undefined;

  return <div className="lab-layout">
    <Explorer title={study.dbt.projectName} items={explorerItems(study)} selectedPath={selectedPath} onSelect={choosePath}/>
    <main className="workspace">
      <div className="workspace-header">
        <div><div className="eyebrow">DBT LAB</div><h1>{study.dbt.projectName}</h1><span className="meta-line">{study.dbt.models.length} models · {study.dbt.tests.length} tests · target: {study.dbt.profileTarget}</span></div>
        <div className="run-controls"><label>Scenario<select value={scenarioId} onChange={(event)=>changeScenario(event.target.value)}>{dbtScenarios.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Command<select value={command} onChange={(event)=>{setCommand(event.target.value as DbtCommand);setBuild(createDbtBuild(study));}}><option value="build">dbt build</option><option value="run">dbt run</option><option value="test">dbt test</option></select></label><label>Selection<select value={selectionMode} onChange={(event)=>{setSelectionMode(event.target.value as DbtSelectionMode);setBuild(createDbtBuild(study));}}><option value="all">entire project</option><option value="exact">current model only</option><option value="parents">current + parents</option><option value="children">current + children</option><option value="parents_children">current ± lineage</option></select></label><Button appearance="secondary" onClick={()=>setBuild(createDbtBuild(study))}>Reset command</Button><Button appearance="primary" onClick={runCommand} disabled={study.isScratch||selectedCommandModels.length===0}>Run {command} (simulated)</Button></div>
      </div>
      <div className="truth-strip"><strong>BOUNDED LEARNING COMPILER</strong><span>`ref`, `source`, `config`, `is_incremental`, `this`, ephemeral-ref inlining, seed refs, and the lesson macros are modeled. Unsupported Jinja is rejected.</span><StatusPill state={build.status}/></div>
      <TabList selectedValue={tab} onTabSelect={(_e:any,data:any)=>setTab(String(data.value) as DbtTab)} className="workspace-tabs"><Tab value="overview">Overview</Tab><Tab value="lineage">Lineage</Tab><Tab value="model">File / model</Tab><Tab value="compiled">Compiled SQL</Tab><Tab value="build">Command</Tab><Tab value="tests">Tests & contracts</Tab><Tab value="snapshots">Snapshots</Tab><Tab value="docs">Docs</Tab><Tab value="data">Sample data</Tab></TabList>
      <div className="workspace-body">
        {tab==='overview'&&<CaseOverview study={study}/>} 
        {tab==='lineage'&&<GraphCanvas items={graphItems} selectedId={lineageSelectedId} onSelect={(id)=>{setSelectedLineageId(id);const model=study.dbt.models.find((m)=>m.id===id);if(model){chooseModel(model);return;}const snapshot=study.dbt.snapshots.find((item)=>item.id===id);if(snapshot){setSelectedModelId('');setSelectedSnapshotId(snapshot.id);setSelectedPath(snapshot.path);setCodeState(contentFor(snapshot.path));setTab('snapshots');return;}const seed=study.dbt.seeds.find((item)=>item.replace(/\.csv$/i,'')===id);if(seed){setSelectedModelId('');setSelectedPath(`seeds/${seed}`);setCodeState(contentFor(`seeds/${seed}`));setTab('model');return;}const source=study.dbt.sources.find((item)=>item.id===id);if(source){const dataset=study.datasets.find((item)=>item.label===`${source.schema}.${source.table}`);setSelectedModelId('');if(dataset)setSelectedDatasetId(dataset.id);setTab('data');}}} emptyMessage="Scratch mode has only the editable model unless you load a structured case study."/>}
        {tab==='model'&&<CodeEditor label={selectedPath} language={languageFor(selectedPath)} value={code} onChange={setCode} dirty={code!==defaultContentFor(selectedPath)} onReset={restoreFile} footer={selectedModel?`${storageOk?'Saved in this browser.':'Browser storage unavailable — edit lives only in this open tab.'} Model edits feed the bounded compiler and simulated build; no database is invoked.`:`${storageOk?'Saved in this browser.':'Browser storage unavailable — edit lives only in this open tab.'} Non-model resources are editable for project-structure practice but are not executed by the bounded compiler.`}/>} 
        {tab==='compiled'&&<div className="compiled-layout"><div className="compile-toolbar"><Switch checked={incremental} onChange={(_e:any,data:any)=>setIncremental(Boolean(data.checked))} label="Incremental run context"/><div className={compiled.ok?'compile-ok':'compile-error'}>{compiled.ok?'Compile supported':'Compile rejected'}</div></div>{compiled.errors.length>0&&<div className="error-box">{compiled.errors.map((error)=><p key={error}>{error}</p>)}</div>}<CodeEditor label={`${selectedModel?.id??'resource'} · compiled.sql`} language="SQL" value={compiled.sql} onChange={()=>{}} readOnly footer={compiled.replacements.join(' · ')||'No compiler substitutions were required.'}/></div>}
        {tab==='build'&&<div className="build-panel"><div className="build-summary"><StatusPill state={build.status}/><span><code>dbt {command}</code> · selection: {selectedCommandModels.join(', ')||'none'}{selectionMode!=='all'&&selectedCommandModels.length===0?' — select a dbt model file to run this selector.':''}. Contracts are build-time preflight checks, not data tests. Project-wide build also simulates declared seeds/snapshots; model-scoped selectors intentionally leave those resource types out. Failing selected upstream tests can block descendants.</span></div><div className="build-columns"><div><h3>Models</h3>{study.dbt.models.map((model)=><button className="build-row" key={model.id} onClick={()=>chooseModel(model)}><span>{model.id}</span><small>{model.materialization==='ephemeral'?'ephemeral · inline only':model.materialization}</small><StatusPill state={build.modelStates[model.id]??'idle'}/></button>)}{(study.dbt.seeds.length>0||study.dbt.snapshots.length>0)&&<><h3>Project resources</h3>{study.dbt.seeds.map((seed)=><div className="build-row static" key={seed}><span>{seed}</span><small>seed</small><StatusPill state={build.seedStates[seed.replace(/\.csv$/i,'')]??'idle'}/></div>)}{study.dbt.snapshots.map((snapshot)=><button className="build-row" key={snapshot.id} onClick={()=>{setSelectedSnapshotId(snapshot.id);setTab('snapshots');}}><span>{snapshot.id}</span><small>snapshot · {snapshot.strategy}</small><StatusPill state={build.snapshotStates[snapshot.id]??'idle'}/></button>)}</>}</div><div><h3>Command log</h3><div className="logs-panel compact">{build.logs.map((line,index)=><div className={`log-line ${line.startsWith('FAIL')?'error':line.startsWith('SKIP')?'warning':'info'}`} key={index}><span>{String(index).padStart(2,'0')}</span><p>{line}</p></div>)}</div></div></div></div>}
        {tab==='tests'&&<div className="tests-table"><section className="contract-section"><div className="section-heading"><h3>Model contracts</h3><span>Build-time shape guarantees; they are not <code>dbt test</code> resources.</span></div>{study.dbt.models.filter((model)=>model.contract?.length).length?<div className="contract-grid">{study.dbt.models.filter((model)=>model.contract?.length).map((model)=><button key={model.id} className="build-row" onClick={()=>chooseModel(model)}><span>{model.id}</span><small>{model.contract?.join(' · ')}</small><StatusPill state={build.contractStates[model.id]??'idle'}/></button>)}</div>:<div className="empty-state"><strong>No contracted models</strong><span>This case study does not declare model contracts.</span></div>}</section><div className="section-heading"><h3>Data tests</h3><span>Assertions run by simulated <code>dbt test</code> / <code>dbt build</code>.</span></div><div className="table-scroll"><table><thead><tr><th>Test</th><th>Model</th><th>Type</th><th>Column / target / values</th><th>State</th><th>Why</th></tr></thead><tbody>{study.dbt.tests.map((test)=><tr key={test.id}><td><code>{test.id}</code></td><td><button className="table-link" onClick={()=>{const model=study.dbt.models.find((item)=>item.id===test.model);if(model)chooseModel(model);}}>{test.model}</button></td><td>{test.type}</td><td>{test.acceptedValues?.join(', ')??test.target??test.column??'—'}</td><td><StatusPill state={build.testStates[test.id]??'idle'}/></td><td>{test.description}</td></tr>)}</tbody></table></div></div>}
        {tab==='snapshots'&&<div className="snapshot-lab">{selectedSnapshot&&snapshotSimulation?<><div className="snapshot-toolbar"><label>Snapshot<select value={selectedSnapshot.id} onChange={(event)=>setSelectedSnapshotId(event.target.value)}>{study.dbt.snapshots.map((snapshot)=><option value={snapshot.id} key={snapshot.id}>{snapshot.id}</option>)}</select></label><div><strong>{selectedSnapshot.strategy} strategy</strong><span>unique_key={selectedSnapshot.uniqueKey}{selectedSnapshot.updatedAt?` · updated_at=${selectedSnapshot.updatedAt}`:''}{selectedSnapshot.checkCols?.length?` · check_cols=${selectedSnapshot.checkCols.join(', ')}`:''}</span></div></div><div className="snapshot-explainer"><strong>SCD2 simulation</strong><p>{selectedSnapshot.description}</p><p>This bounded lesson compares two observations and emits <code>dbt_valid_from</code>/<code>dbt_valid_to</code>. Hard-delete policies, adapter SQL, and warehouse execution are intentionally not simulated.</p></div><div className="snapshot-stats"><div><span>Changed</span><strong>{snapshotSimulation.changedKeys.length}</strong><small>{snapshotSimulation.changedKeys.join(', ')||'none'}</small></div><div><span>Inserted</span><strong>{snapshotSimulation.insertedKeys.length}</strong><small>{snapshotSimulation.insertedKeys.join(', ')||'none'}</small></div><div><span>Unchanged</span><strong>{snapshotSimulation.unchangedKeys.length}</strong><small>{snapshotSimulation.unchangedKeys.join(', ')||'none'}</small></div></div><div className="snapshot-columns"><section><h3>Observation 1</h3><SnapshotTable rows={selectedSnapshot.before}/></section><section><h3>Observation 2</h3><SnapshotTable rows={selectedSnapshot.after}/></section></div><section><div className="section-heading"><h3>Simulated snapshot history</h3><span>Type-2 history after the second observation</span></div><SnapshotTable rows={snapshotSimulation.history}/></section></>:<div className="empty-state"><strong>No snapshots in this project</strong><span>Choose e-commerce or finance to practice timestamp/check snapshot behavior.</span></div>}</div>}
        {tab==='docs'&&<div className="docs-catalog"><section><div className="section-heading"><h3>Model catalog</h3><span>Descriptions are project metadata, not generated claims.</span></div>{study.dbt.models.map((model)=><button className="doc-row" key={model.id} onClick={()=>chooseModel(model,true)}><div><strong>{model.id}</strong><small>{model.path}</small></div><p>{model.description}</p><div><span>{model.layer}</span><span>{model.materialization}</span>{model.contract&&<span>contract ×{model.contract.length}</span>}</div></button>)}</section><section className="resource-docs"><h3>Project resources</h3><dl><dt>Sources</dt><dd>{study.dbt.sources.map((s)=>`${s.schema}.${s.table}${s.freshness?` (${s.freshness})`:''}`).join(' · ')||'none'}</dd><dt>Seeds</dt><dd>{study.dbt.seeds.join(' · ')||'none'}</dd><dt>Snapshots</dt><dd>{study.dbt.snapshots.map((snapshot)=>snapshot.id).join(' · ')||'none'}</dd><dt>Macros</dt><dd>{study.dbt.macros.join(' · ')||'none'}</dd></dl></section></div>}
        {tab==='data'&&<DataPreview datasets={study.datasets} selectedId={selectedDatasetId} onSelect={setSelectedDatasetId}/>} 
      </div>
    </main>
    <Inspector model={selectedModel} modelState={selectedModel?build.modelStates[selectedModel.id]:undefined} contractState={selectedModel?build.contractStates[selectedModel.id]:undefined} compileErrors={selectedModel?build.compileErrors[selectedModel.id]:undefined} scenario={scenario} orchestrator={orchestrator} testOrchestrator={testGate}/>
  </div>;
}
