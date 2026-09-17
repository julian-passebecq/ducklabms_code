import { useMemo, useState } from 'react';
import { LearningGraph } from '../graph-engine/LearningGraph';
import {
  defaultAirflowDag,
  generateAirflowDagCode,
  parseAirflowDagCode,
  runAirflowDag,
  validateAirflowDag,
  type AirflowDagDefinition,
  type AirflowTaskType,
} from '../lib/airflowRuntime';
import type { CaseStudy, DataWorkspace, NotebookDocument, PipelineNode } from '../types/app';

const taskOptions: { type: AirflowTaskType; label: string; item: string }[] = [
  { type: 'copyJob', label: 'Fabric Copy Job', item: 'CJ_Ingest_Incremental' },
  { type: 'notebook', label: 'Fabric Notebook', item: 'NB_Transform' },
  { type: 'dbt', label: 'Fabric dbt Job', item: 'dbt_transform' },
  { type: 'pipeline', label: 'Fabric Pipeline', item: 'PL_Orchestration' },
  { type: 'sparkJob', label: 'Spark Job Definition', item: 'SJD_LargeScale' },
  { type: 'sqlCheck', label: 'SQL quality check', item: 'SQL_Check' },
];

export function AirflowStudio({ caseStudy, workspace, notebook, pipelineNodes, onWorkspace, onNotebook }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  notebook: NotebookDocument;
  pipelineNodes: PipelineNode[];
  onWorkspace: (workspace: DataWorkspace) => void;
  onNotebook: (notebook: NotebookDocument) => void;
}) {
  const [dag, setDag] = useState<AirflowDagDefinition>(() => defaultAirflowDag(caseStudy));
  const [code, setCode] = useState(() => generateAirflowDagCode(defaultAirflowDag(caseStudy)));
  const [selectedId, setSelectedId] = useState<string | null>(dag.tasks[0]?.id ?? null);
  const [dirtyCode, setDirtyCode] = useState(false);
  const [message, setMessage] = useState('DAG ready. Graph and Python code describe the same orchestration plan.');
  const [runLog, setRunLog] = useState<string[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const selected = dag.tasks.find((task) => task.id === selectedId) ?? null;
  const problems = useMemo(() => validateAirflowDag(dag), [dag]);
  const graphNodes = dag.tasks.map((task) => ({
    id: task.id,
    x: task.x,
    y: task.y,
    title: task.label,
    subtitle: `${taskOptions.find((option) => option.type === task.type)?.label ?? task.type} · ${task.itemName}`,
    kind: task.type === 'dbt' ? 'dataflow' : task.type === 'notebook' || task.type === 'sparkJob' ? 'notebook' : 'pipeline',
    status: taskStatuses[task.id] ?? 'Not run',
  }));
  const graphEdges = dag.edges.map((edge) => ({ id: edge.id, source: edge.from, target: edge.to, label: '>>' }));

  const mutateDag = (next: AirflowDagDefinition) => { setDag(next); setDirtyCode(true); };
  const syncCode = () => { setCode(generateAirflowDagCode(dag)); setDirtyCode(false); setMessage('Python code regenerated from the DAG graph.'); };
  const applyCode = () => {
    const parsed = parseAirflowDagCode(code);
    const validation = validateAirflowDag(parsed);
    if (validation.length) { setMessage(`Code not applied: ${validation.join(' ')}`); return; }
    setDag(parsed); setSelectedId(parsed.tasks[0]?.id ?? null); setDirtyCode(false); setMessage(`Parsed ${parsed.tasks.length} tasks and ${parsed.edges.length} dependencies from the learning Airflow subset.`);
  };
  const run = () => {
    const result = runAirflowDag({ dag, caseStudy, workspace, notebook, pipelineNodes });
    onWorkspace(result.workspace); onNotebook(result.notebook); setRunLog(result.log);
    setTaskStatuses(Object.fromEntries(result.taskRuns.map((task) => [task.taskId, task.status])));
    setMessage(`DAG run ${result.status} · ${result.taskRuns.filter((task) => task.status === 'Succeeded').length}/${result.taskRuns.length} tasks succeeded · workspace snapshot ${result.workspace.snapshot}.`);
  };
  const addTask = (type: AirflowTaskType) => {
    const option = taskOptions.find((item) => item.type === type)!;
    const index = dag.tasks.length;
    const id = `task-${type}-${Date.now()}`;
    mutateDag({ ...dag, tasks: [...dag.tasks, { id, variable: `${type}_${index + 1}`.replace(/[^a-zA-Z0-9_]/g, '_'), label: option.label, type, itemName: option.item, retries: 1, retryDelaySeconds: 60, triggerRule: 'all_success', x: 80 + (index % 4) * 280, y: 120 + Math.floor(index / 4) * 190 }] });
    setSelectedId(id);
  };

  return <div className="studio-page airflow-studio">
    <div className="page-heading studio-heading"><div><span className="eyebrow">Fabric Data Factory · advanced orchestration</span><h1>Apache Airflow Job</h1><p>Practice code-first DAG orchestration while reusing the same Notebook, dbt, Copy Job, Pipeline and simulated Spark items from the case study.</p></div><div className="airflow-heading-actions"><span className={`status-pill ${problems.length ? 'warning' : 'success'}`}>{problems.length ? `${problems.length} validation issue${problems.length === 1 ? '' : 's'}` : 'DAG valid'}</span><button className="primary-button" disabled={problems.length > 0} onClick={run}>▶ Run DAG</button></div></div>
    <div className="airflow-commandbar"><label>DAG id<input value={dag.dagId} onChange={(event) => mutateDag({ ...dag, dagId: event.target.value })} /></label><label>Schedule<input value={dag.schedule} onChange={(event) => mutateDag({ ...dag, schedule: event.target.value })} /></label><label className="airflow-check"><input type="checkbox" checked={dag.catchup} onChange={(event) => mutateDag({ ...dag, catchup: event.target.checked })} /> Catchup</label><select defaultValue="" onChange={(event) => { if (event.target.value) addTask(event.target.value as AirflowTaskType); event.target.value = ''; }}><option value="">+ Add task</option>{taskOptions.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}</select><button className="secondary-button" onClick={syncCode}>{dirtyCode ? 'Sync graph → code *' : 'Sync graph → code'}</button></div>
    <div className="airflow-grid">
      <section className="airflow-graph surface-card"><div className="surface-card-title"><div><strong>DAG graph</strong><span>{dag.tasks.length} tasks · {dag.edges.length} dependencies</span></div><span className="status-pill">Managed Airflow simulated</span></div><LearningGraph nodes={graphNodes} edges={graphEdges} selectedId={selectedId} onSelect={setSelectedId} onMove={(id, x, y) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === id ? { ...task, x, y } : task) })} onConnect={(from, to) => { if (from === to || dag.edges.some((edge) => edge.from === from && edge.to === to)) return; mutateDag({ ...dag, edges: [...dag.edges, { id: `air-edge-${Date.now()}`, from, to }] }); }} onDeleteNodes={(ids) => mutateDag({ ...dag, tasks: dag.tasks.filter((task) => !ids.includes(task.id)), edges: dag.edges.filter((edge) => !ids.includes(edge.from) && !ids.includes(edge.to)) })} onDeleteEdges={(ids) => mutateDag({ ...dag, edges: dag.edges.filter((edge) => !ids.includes(edge.id)) })} /></section>
      <aside className="airflow-properties surface-card"><div className="pane-title">Task</div>{selected ? <><label>Task label<input value={selected.label} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, label: event.target.value } : task) })} /></label><label>Operator<select value={selected.type} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, type: event.target.value as AirflowTaskType } : task) })}>{taskOptions.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}</select></label><label>Fabric item<input value={selected.itemName} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, itemName: event.target.value } : task) })} /></label><label>Retries<input type="number" min={0} max={10} value={selected.retries} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, retries: Number(event.target.value) } : task) })} /></label><label>Retry delay (seconds)<input type="number" min={0} value={selected.retryDelaySeconds} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, retryDelaySeconds: Number(event.target.value) } : task) })} /></label><label>Trigger rule<select value={selected.triggerRule} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, triggerRule: event.target.value as 'all_success' | 'all_done' } : task) })}><option value="all_success">all_success</option><option value="all_done">all_done</option></select></label><label className="airflow-check"><input type="checkbox" checked={Boolean(selected.simulateFailure)} onChange={(event) => mutateDag({ ...dag, tasks: dag.tasks.map((task) => task.id === selected.id ? { ...task, simulateFailure: event.target.checked } : task) })} /> Simulate task failure</label><div className="learning-box"><strong>Execution boundary</strong><p>Notebook, dbt, Copy Job, authored Pipeline and SQL checks can mutate the local learning workspace. Spark Job Definition keeps realistic orchestration and data effects but its distributed compute is simulated. Retries and trigger rules are executed by the learning DAG runtime.</p></div></> : <div className="empty-pane">Select a task to edit it.</div>}<div className="airflow-validation">{problems.length ? problems.map((problem) => <span key={problem}>✕ {problem}</span>) : <span>✓ DAG is acyclic and task ids are valid.</span>}</div></aside>
      <section className="airflow-code surface-card"><div className="surface-card-title"><div><strong>DAG Python</strong><span>Editable learning subset · FabricRunItemOperator</span></div><button className="secondary-button" onClick={applyCode}>Apply code → graph</button></div><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false}/><div className="learning-box compact"><strong>Pipeline or Airflow?</strong><p>Use Fabric Pipeline for visual, Fabric-native orchestration. Use Airflow when the team wants Python DAGs, code-first dependencies and reusable orchestration logic. dbt still owns transformation-model dependencies inside the dbt project.</p></div></section>
      <aside className="airflow-run surface-card"><div className="pane-title">Run / task logs</div><p className="airflow-message">{message}</p><div className="airflow-log">{runLog.length ? runLog.map((line, index) => <pre key={index}>{line}</pre>) : <div className="empty-inline">Run the DAG to inspect task execution.</div>}</div><div className="learning-box"><strong>Why this belongs in Fabric training</strong><p>The DAG can orchestrate Fabric items such as notebooks, dbt jobs, Copy Jobs, Spark Job Definitions and pipelines. We simulate the managed Airflow service while executing the lightweight learning data effects locally.</p></div></aside>
    </div>
  </div>;
}
