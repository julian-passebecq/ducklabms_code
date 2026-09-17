import { useMemo, useState } from 'react';
import { runDataflowGen2Publish } from '../lib/dataRuntime';
import type { CaseStudy, DataWorkspace, WorkspaceTable } from '../types/app';

export function DataflowStudio({ caseStudy, workspace, onWorkspace }: { caseStudy: CaseStudy; workspace: DataWorkspace; onWorkspace: (workspace: DataWorkspace) => void }) {
  const source = useMemo<WorkspaceTable>(() => workspace.tables.find((t) => t.layer === 'bronze') ?? workspace.tables.find((t) => t.layer === 'source') ?? workspace.tables[0], [workspace]);
  const [steps, setSteps] = useState(['Source', 'Changed Type', 'Removed Errors', 'Merged Queries', 'Expanded reference columns', 'Selected Columns']);
  const [selected, setSelected] = useState(steps[steps.length - 1]);
  const [published, setPublished] = useState('');
  const publish = () => {
    const result = runDataflowGen2Publish(workspace, `${source.schema}.${source.name}`, steps);
    onWorkspace(result.workspace);
    setPublished(`${result.touchedTables[0]} · ${result.rows.length} rows · snapshot ${result.workspace.snapshot}`);
  };
  return (
    <div className="studio-page dataflow-page">
      <div className="power-query-ribbon"><div><strong>Dataflow Gen2</strong><span>DF_{caseStudy.id.replaceAll('-', '_')}</span></div><div className="ribbon-tabs"><button>Home</button><button>Transform</button><button>Add column</button><button>View</button><button>Options</button></div><button className="primary-button" onClick={publish}>Publish</button></div>
      <div className="dataflow-layout">
        <aside className="queries-pane"><div className="pane-title">Queries</div><div className="query-row active">▦ {source.name}</div><button className="text-button">+ New query</button><div className="concept-card"><strong>Live source</strong><span>{source.schema}.{source.name} · {source.rows.length} rows · v{source.version}</span></div></aside>
        <main className="query-editor">
          <div className="formula-bar"><span>fx</span><code>= Table.SelectColumns(#"Expanded reference columns", &#123;{source.columns.slice(0,3).map((c)=>`"${c.name}"`).join(', ')}&#125;)</code></div>
          <div className="data-grid-wrap"><table className="data-grid"><thead><tr>{source.columns.map((c) => <th key={c.name}><span className="type-tag">ABC</span>{c.name}</th>)}</tr></thead><tbody>{source.rows.slice(0,30).map((row, i) => <tr key={i}>{source.columns.map((c) => <td key={c.name}>{String(row[c.name] ?? '')}</td>)}</tr>)}</tbody></table></div>
          <div className="column-profile"><div><strong>Column quality</strong><span>Valid 100%</span></div><div><strong>Column distribution</strong><span>Distinct {source.rows.length}</span></div><div><strong>Column profile</strong><span>No errors</span></div></div>
          {published&&<div className="run-success-box"><strong>Dataflow published</strong><span>{published}</span></div>}
        </main>
        <aside className="applied-steps"><div className="pane-title">Query settings</div><label className="form-field"><span>Name</span><input value={source.name} readOnly /></label><h4>Applied steps</h4>{steps.map((s) => <button key={s} className={selected === s ? 'active' : ''} onClick={() => setSelected(s)}><span>⚙</span>{s}<span onClick={(e) => { e.stopPropagation(); setSteps(steps.filter((x) => x !== s)); }}>×</span></button>)}<div className="learning-box"><strong>Shared workspace</strong><p>Publish writes a representative Silver table and lineage edge. You can inspect it immediately in Lakehouse, OneLake Catalog or SQL.</p></div></aside>
      </div>
    </div>
  );
}
