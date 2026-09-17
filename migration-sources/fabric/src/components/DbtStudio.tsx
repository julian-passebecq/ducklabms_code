import { useMemo, useState } from 'react';
import { LearningGraph } from '../graph-engine/LearningGraph';
import {
  compileDbtModel,
  dbtDependencies,
  dbtSourceStatuses,
  defaultDbtProject,
  runDbtCommand,
  type DbtCommand,
  type DbtProjectDefinition,
} from '../lib/dataRuntime';
import type { CaseStudy, DataWorkspace } from '../types/app';

export function DbtStudio({ caseStudy, workspace, onWorkspace }: { caseStudy: CaseStudy; workspace: DataWorkspace; onWorkspace: (workspace: DataWorkspace) => void }) {
  const [project, setProject] = useState<DbtProjectDefinition>(() => defaultDbtProject(workspace));
  const [selectedId, setSelectedId] = useState(project.models[0]?.id ?? '');
  const [log, setLog] = useState<string[]>(['dbt project ready']);
  const [command, setCommand] = useState<DbtCommand>('dbt build');
  const [select, setSelect] = useState('');
  const [exclude, setExclude] = useState('');
  const [fullRefresh, setFullRefresh] = useState(false);
  const [failFast, setFailFast] = useState(false);
  const [threads, setThreads] = useState(4);
  const [lastResult, setLastResult] = useState<{ passed: number; failed: number; command: DbtCommand } | null>(null);
  const model = project.models.find((item) => item.id === selectedId) ?? project.models[0];
  const edges = useMemo(() => dbtDependencies(project), [project]);
  const sourceStatuses = useMemo(() => dbtSourceStatuses(workspace, project), [workspace, project]);
  const graphNodes = project.models.map((item, index) => ({ id: item.id, x: 80 + index * 300, y: 120, title: item.name, subtitle: `${item.materialization} → ${item.output}`, kind: 'dataflow', status: log.some((line) => line.includes(item.output) && line.includes('OK')) ? 'Succeeded' : 'Ready' }));
  const graphEdges = edges.map((edge) => ({ id: `${edge.from}-${edge.to}`, source: edge.from, target: edge.to, label: 'ref()' }));

  const patchModel = (changes: Partial<DbtProjectDefinition['models'][number]>) => setProject({ ...project, models: project.models.map((item) => item.id === model.id ? { ...item, ...changes } : item) });
  const run = () => {
    const result = runDbtCommand(workspace, project, { command, select, exclude, fullRefresh, failFast, threads });
    onWorkspace(result.workspace);
    setLog(result.log);
    setLastResult({ passed: result.passed, failed: result.failed, command });
  };

  return <div className="studio-page dbt-studio">
    <div className="studio-toolbar"><div><strong>{project.name}</strong><span>Fabric dbt Job learning workbench · {caseStudy.title}</span></div><div className="command-group"><select value={command} onChange={(event) => setCommand(event.target.value as DbtCommand)}><option>dbt build</option><option>dbt run</option><option>dbt compile</option><option>dbt test</option></select><button className="command-button primary-command" onClick={run}>▶ {command}</button></div></div>
    <div className="dbt-layout">
      <aside className="dbt-project-tree"><div className="pane-title">Project</div><strong>sources/</strong>{sourceStatuses.map(({ source, status, rowCount }) => <span className={`dbt-source ${status.toLowerCase()}`} key={source.id}>◉ {source.name}.{source.table}<small>{source.schema}.{source.table} · {rowCount} rows · {status}</small></span>)}<hr/><strong>models/</strong>{project.models.map((item) => <button className={selectedId === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}>▱ {item.name}.sql<small>{item.materialization} · {item.output}</small></button>)}<hr/><strong>Tests</strong>{project.models.flatMap((item) => item.tests.map((test) => <span className="dbt-test" key={`${item.id}-${test.type}-${test.column}`}>✓ {test.type}: {item.name}.{test.column}</span>))}<div className="learning-box compact"><strong>Use dbt when</strong><p>The transformation is SQL-first and benefits from <code>source()</code>, <code>ref()</code>, tests, materializations and lineage. Incremental models are useful when rebuilding the complete target every run would be wasteful.</p></div></aside>
      <main className="dbt-main"><div className="dbt-dag"><LearningGraph nodes={graphNodes} edges={graphEdges} selectedId={selectedId} onSelect={(id) => id && setSelectedId(id)} onMove={() => {}} onConnect={() => {}} onDeleteNodes={() => {}} onDeleteEdges={() => {}} emptyTitle="No dbt models" emptySubtitle="Add a model to build the dependency graph." /></div>{model && <div className="dbt-editor"><div className="code-tab">models/{model.name}.sql <span>→ {model.output}</span></div><div className="dbt-model-settings"><label>Materialization<select value={model.materialization} onChange={(event) => patchModel({ materialization: event.target.value as typeof model.materialization })}><option value="view">view</option><option value="table">table</option><option value="incremental">incremental</option></select></label>{model.materialization === 'incremental' && <label>Unique key<input value={model.uniqueKey ?? ''} onChange={(event) => patchModel({ uniqueKey: event.target.value })} placeholder="order_id" /></label>}<span>{model.materialization === 'incremental' ? 'Existing rows are merged by unique key unless --full-refresh is enabled.' : model.materialization === 'view' ? 'The learning runtime materializes representative rows but labels the model as a view.' : 'Table models are rebuilt on each run.'}</span></div><textarea value={model.sql} onChange={(event) => patchModel({ sql: event.target.value })} spellCheck={false}/><div className="compiled-preview"><strong>Compiled SQL</strong><pre>{safeCompile(project, model)}</pre></div></div>}</main>
      <aside className="dbt-run-panel"><div className="pane-title">Invocation</div><label className="dbt-option">Select<input value={select} onChange={(event) => setSelect(event.target.value)} placeholder="model or stg_*" /></label><label className="dbt-option">Exclude<input value={exclude} onChange={(event) => setExclude(event.target.value)} placeholder="optional" /></label><label className="dbt-option">Threads<input type="number" min={1} max={64} value={threads} onChange={(event) => setThreads(Number(event.target.value))} /></label><label className="dbt-check"><input type="checkbox" checked={fullRefresh} onChange={(event) => setFullRefresh(event.target.checked)} /> Full refresh</label><label className="dbt-check"><input type="checkbox" checked={failFast} onChange={(event) => setFailFast(event.target.checked)} /> Fail fast</label><div className="review-row"><span>Target</span><strong>dev</strong></div><div className="review-row"><span>Engine</span><strong>Shared training SQL</strong></div><div className="review-row"><span>Snapshot</span><strong>{workspace.snapshot}</strong></div><div className="review-row"><span>Lineage edges</span><strong>{workspace.lineage?.length ?? 0}</strong></div>{lastResult && <div className={`dbt-promotion-gate ${lastResult.failed ? 'blocked' : 'ready'}`}><span>Promotion gate</span><strong>{lastResult.failed ? 'BLOCKED' : 'READY'}</strong><small>{lastResult.command} · PASS={lastResult.passed} ERROR={lastResult.failed}</small></div>}<div className="dbt-log">{log.map((line, index) => <pre key={index}>{line}</pre>)}</div><div className="learning-box"><strong>What is real here?</strong><p><code>source()</code> and <code>ref()</code> compile to workspace tables, models execute in dependency order, incremental models merge representative rows, tests inspect resulting data, and lineage is emitted. Fabric-managed dbt compute remains simulated.</p></div></aside>
    </div>
  </div>;
}

function safeCompile(project: DbtProjectDefinition, model: DbtProjectDefinition['models'][number]): string { try { return compileDbtModel(project, model); } catch (error) { return `-- ${error instanceof Error ? error.message : 'compile failed'}`; } }
