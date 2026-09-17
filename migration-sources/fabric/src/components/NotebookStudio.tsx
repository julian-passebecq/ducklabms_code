import { useMemo, useState } from 'react';
import { executeNotebook, executeNotebookCell } from '../lib/dataRuntime';
import type { CaseStudy, DataWorkspace, NotebookCell, NotebookDocument, WorkspaceTable } from '../types/app';

export function NotebookStudio({ caseStudy, workspace, notebook, onWorkspace, onNotebook }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  notebook: NotebookDocument;
  onWorkspace: (workspace: DataWorkspace) => void;
  onNotebook: (notebook: NotebookDocument) => void;
}) {
  const [running, setRunning] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState(() => workspace.tables.find((table) => table.layer === 'bronze') ? qualified(workspace.tables.find((table) => table.layer === 'bronze')!) : qualified(workspace.tables[0]));
  const [message, setMessage] = useState('Notebook ready · lightweight SQL + pandas-style runtime');
  const selected = useMemo(() => workspace.tables.find((table) => qualified(table) === selectedName) ?? workspace.tables[0], [workspace, selectedName]);
  const productionSparkCell = useMemo(() => {
    const sparkIsJustified = caseStudy.engineeringDecision?.preferred.toLowerCase().includes('spark is justified');
    if (!sparkIsJustified) return undefined;
    return caseStudy.notebook.find((cell) => cell.language === 'python' && cell.source.includes('spark.'));
  }, [caseStudy]);

  const updateCell = (id: string, patch: Partial<NotebookCell>) => {
    onNotebook({ ...notebook, updatedAt: new Date().toISOString(), cells: notebook.cells.map((cell) => cell.id === id ? { ...cell, ...patch } : cell) });
  };

  const addCell = (language: NotebookCell['language']) => {
    const id = `cell-${Date.now()}`;
    const source = language === 'markdown'
      ? '# New section\nExplain what this transformation is doing.'
      : language === 'sql'
        ? `SELECT * FROM ${selected ? qualified(selected) : 'bronze.table'} LIMIT 20;`
        : `df = table("${selected ? qualified(selected) : 'bronze.table'}")\ndisplay(df)`;
    onNotebook({ ...notebook, updatedAt: new Date().toISOString(), cells: [...notebook.cells, { id, language, source }] });
  };

  const deleteCell = (id: string) => onNotebook({ ...notebook, updatedAt: new Date().toISOString(), cells: notebook.cells.filter((cell) => cell.id !== id) });

  const runCell = (cell: NotebookCell) => {
    setRunning(cell.id);
    try {
      const result = executeNotebookCell(workspace, cell);
      onWorkspace(result.workspace);
      updateCell(cell.id, { output: result.output });
      if (result.touchedTables[0]) setSelectedName(result.touchedTables[0]);
      setMessage(`${cell.language.toUpperCase()} cell succeeded${result.touchedTables.length ? ` · updated ${result.touchedTables.join(', ')}` : ''}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Cell failed.';
      updateCell(cell.id, { output: `ERROR: ${text}` });
      setMessage(`Cell failed · ${text}`);
    } finally {
      setRunning(null);
    }
  };

  const runAll = () => {
    setRunning('all');
    try {
      const result = executeNotebook(workspace, notebook);
      onWorkspace(result.workspace);
      onNotebook(result.notebook);
      if (result.touchedTables[0]) setSelectedName(result.touchedTables.at(-1) ?? selectedName);
      setMessage(`Run all succeeded · ${result.touchedTables.length ? `updated ${result.touchedTables.join(', ')}` : 'no table writes'}`);
    } catch (error) {
      setMessage(`Run all failed · ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="studio-page notebook-page v8-notebook-page">
      <div className="studio-toolbar">
        <div><strong>{notebook.name}</strong><span>Fabric notebook · executable training runtime · snapshot {workspace.snapshot}</span></div>
        <div className="command-group">
          <button className="command-button" onClick={() => addCell('python')}>+ Python</button>
          <button className="command-button" onClick={() => addCell('sql')}>+ SQL</button>
          <button className="command-button" onClick={() => addCell('markdown')}>+ Markdown</button>
          <button className="command-button primary-command" onClick={runAll} disabled={running !== null}>{running === 'all' ? 'Running…' : '▶ Run all'}</button>
        </div>
      </div>
      <div className="notebook-runtime-bar"><span className="runtime-dot" /> <strong>Local learning runtime</strong><span>SQL changes shared tables immediately</span><span>Python uses a constrained pandas-style API</span><span>{message}</span></div>
      <div className="notebook-layout v8-notebook-layout">
        <aside className="notebook-explorer live-explorer">
          <div className="pane-title">Lakehouse · live</div>
          {(['source','stream','bronze','silver','gold','warehouse'] as WorkspaceTable['layer'][]).map((layer) => {
            const tables = workspace.tables.filter((table) => table.layer === layer);
            if (!tables.length) return null;
            return <section className="notebook-tree-group" key={layer}><strong>{layer}</strong>{tables.map((table) => <button key={qualified(table)} className={selectedName === qualified(table) ? 'active' : ''} onClick={() => setSelectedName(qualified(table))}><span>▦ {qualified(table)}</span><small>{table.rows.length} rows · v{table.version}</small></button>)}</section>;
          })}
          <div className="live-history-mini"><strong>Recent changes</strong>{workspace.history.slice(0,5).map((item) => <div key={item.id}><span>{item.action}</span><small>{item.object}</small></div>)}</div>
        </aside>
        <main className="notebook-cells">
          {notebook.cells.map((cell, index) => (
            <section className={`notebook-cell lang-${cell.language}`} key={cell.id}>
              <div className="cell-gutter"><span>[{index + 1}]</span>{cell.language !== 'markdown' && <button onClick={() => runCell(cell)} disabled={running !== null}>{running === cell.id ? '…' : '▶'}</button>}</div>
              <div className="cell-body">
                <div className="cell-language-row"><select value={cell.language} onChange={(event) => updateCell(cell.id, { language: event.target.value as NotebookCell['language'], output: undefined })}><option value="python">Python</option><option value="sql">SQL</option><option value="markdown">Markdown</option></select><span>{cell.language === 'python' ? 'pandas-style learning API' : cell.language === 'sql' ? 'shared workspace SQL' : 'documentation'}</span><button className="cell-delete" onClick={() => deleteCell(cell.id)}>Delete</button></div>
                {cell.language === 'markdown'
                  ? <div className="markdown-preview"><strong>{cell.source.split('\n')[0].replace(/^#\s*/, '')}</strong><p>{cell.source.split('\n').slice(1).join(' ')}</p><textarea className="markdown-source" value={cell.source} onChange={(event) => updateCell(cell.id, { source: event.target.value })} /></div>
                  : <textarea className="code-editor" value={cell.source} onChange={(event) => updateCell(cell.id, { source: event.target.value, output: undefined })} spellCheck={false} />}
                {cell.output && <div className={`cell-output ${cell.output.startsWith('ERROR:') ? 'error-output' : ''}`}><span>Output</span><pre>{cell.output}</pre></div>}
              </div>
            </section>
          ))}
          {!notebook.cells.length && <div className="empty-notebook"><strong>No cells yet</strong><span>Add a Python, SQL or Markdown cell from the toolbar.</span></div>}
        </main>
        <aside className="notebook-help v8-table-inspector">
          <div className="pane-title">Selected table</div>
          {selected ? <><span className="eyebrow">{selected.layer} · snapshot {workspace.snapshot}</span><h3>{qualified(selected)}</h3><p>{selected.rows.length} rows · {selected.columns.length} columns · version {selected.version}</p><div className="mini-schema">{selected.columns.slice(0,10).map((column) => <div key={column.name}><code>{column.name}</code><span>{column.type}</span></div>)}</div><div className="data-grid-wrap notebook-preview"><table className="data-grid"><thead><tr>{selected.columns.slice(0,5).map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{selected.rows.slice(0,5).map((row, rowIndex) => <tr key={rowIndex}>{selected.columns.slice(0,5).map((column) => <td key={column.name}>{String(row[column.name] ?? 'NULL')}</td>)}</tr>)}</tbody></table></div></> : <p>No table selected.</p>}
          {productionSparkCell && <details className="learning-box production-spark-equivalent"><summary><strong>Production PySpark equivalent</strong></summary><p>The executable learning cell uses representative local rows. At the production scale described by this case study, this is the PySpark-style implementation you would expect to discuss and operate in Fabric.</p><pre>{productionSparkCell.source}</pre><small>Distributed Spark compute is intentionally simulated; the tutorial teaches the decision, code shape, orchestration and operational implications.</small></details>}
          <div className="learning-box"><strong>Python API</strong><pre>{`df = table("bronze.orders")
df = df.filter("amount > 0")
df = df.drop_duplicates(["order_id"])
df = df.rename(columns={"qty":"quantity"})
df = df.fillna({"status":"UNKNOWN"})
joined = df.merge(customers, on="customer_id", how="left")
daily = joined.groupby("order_date").agg({"amount":"sum"})
write_table("silver.orders", df)
display(df)`}</pre></div>
        </aside>
      </div>
    </div>
  );
}

function qualified(table: WorkspaceTable): string { return `${table.schema}.${table.name}`; }
