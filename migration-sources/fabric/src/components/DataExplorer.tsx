import { useMemo, useState } from 'react';
import { executeWorkspaceSql } from '../lib/dataRuntime';
import { queryMotherDuck } from '../lib/motherduck';
import type { CaseStudy, DataWorkspace, WorkspaceTable } from '../types/app';

export function DataExplorer({ caseStudy, workspace, onWorkspace, engineMode, catalogLabel = 'OneLake / training catalog' }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  onWorkspace: (workspace: DataWorkspace) => void;
  engineMode: 'Local workspace' | 'MotherDuck';
  catalogLabel?: string;
}) {
  const [selectedName, setSelectedName] = useState(() => qualified(workspace.tables[0]));
  const selected = useMemo(() => workspace.tables.find((table) => qualified(table) === selectedName) ?? workspace.tables[0], [workspace, selectedName]);
  const [query, setQuery] = useState(`SELECT * FROM ${selected.schema}.${selected.name} LIMIT 20;`);
  const [queryStatus, setQueryStatus] = useState('');
  const [queryRows, setQueryRows] = useState<Record<string, unknown>[] | null>(null);
  const [detailTab, setDetailTab] = useState<'Preview'|'Schema'|'History'>('Preview');

  const runQuery = async () => {
    setQueryStatus('Running…');
    try {
      if (engineMode === 'MotherDuck') {
        const result = await queryMotherDuck(query);
        setQueryRows(result.rows);
        setQueryStatus(`${result.rows.length} rows · ${result.elapsedMs} ms · MotherDuck`);
      } else {
        const result = executeWorkspaceSql(workspace, query);
        onWorkspace(result.workspace);
        setQueryRows(result.rows);
        setQueryStatus(`${result.output} · local shared workspace`);
        if (result.touchedTables[0]) setSelectedName(result.touchedTables[0]);
      }
    } catch (err) {
      setQueryRows(null);
      setQueryStatus(err instanceof Error ? err.message : 'Query failed');
    }
  };

  return (
    <div className="data-page v8-data-page">
      <aside className="data-catalog">
        <div className="pane-title">{catalogLabel}</div>
        <div className="workspace-snapshot">Snapshot <strong>{workspace.snapshot}</strong><span>{workspace.tables.length} tables</span></div>
        {(['source', 'stream', 'bronze', 'silver', 'gold', 'warehouse'] as WorkspaceTable['layer'][]).map((layer) => {
          const tables = workspace.tables.filter((table) => table.layer === layer);
          if (!tables.length) return null;
          return <section key={layer} className="catalog-group"><h4>{layer}</h4>{tables.map((table) => <button key={qualified(table)} className={selectedName === qualified(table) ? 'active' : ''} onClick={() => { setSelectedName(qualified(table)); setQuery(`SELECT * FROM ${qualified(table)} LIMIT 20;`); setQueryRows(null); setQueryStatus(''); }}><span>▦ {qualified(table)}</span><small>{table.rows.length} rows · v{table.version}</small></button>)}</section>;
        })}
      </aside>
      <main className="data-detail">
        <div className="data-title"><div><span className="eyebrow">{selected.layer} table</span><h2>{qualified(selected)}</h2><p>{selected.runtimeSource}</p></div><div className="quiet-badge">Local snapshot {workspace.snapshot} · table v{selected.version}</div></div>
        <div className="schema-summary"><div><span>Rows</span><strong>{selected.rows.length}</strong></div><div><span>Columns</span><strong>{selected.columns.length}</strong></div><div><span>Primary key</span><strong>{selected.primaryKey ?? '—'}</strong></div><div><span>Updated</span><strong>{new Date(selected.updatedAt).toLocaleTimeString()}</strong></div></div>
        <div className="data-tabs">{(['Preview','Schema','History'] as const).map((tab) => <button key={tab} className={detailTab === tab ? 'active' : ''} onClick={() => setDetailTab(tab)}>{tab}</button>)}</div>
        {detailTab === 'Preview' && <div className="data-grid-wrap large"><table className="data-grid"><thead><tr>{selected.columns.map((column) => <th key={column.name}><span className="type-tag">{column.type.split('(')[0].slice(0, 4)}</span>{column.name}</th>)}</tr></thead><tbody>{selected.rows.slice(0,50).map((row, i) => <tr key={i}>{selected.columns.map((column) => <td key={column.name}>{String(row[column.name] ?? 'NULL')}</td>)}</tr>)}</tbody></table></div>}
        {detailTab === 'Schema' && <section className="schema-table"><h3>Schema and engineering meaning</h3>{selected.columns.map((column) => <div className="schema-row" key={column.name}><code>{column.name}</code><span>{column.type}</span><p>{column.description}</p>{selected.primaryKey === column.name && <em>PK</em>}{selected.foreignKeys?.includes(column.name) && <em>FK</em>}</div>)}</section>}
        {detailTab === 'History' && <section className="workspace-history"><h3>Workspace history</h3>{workspace.history.map((item) => <div className="history-row" key={item.id}><span className="history-action">{item.action}</span><strong>{item.object}</strong><p>{item.details}</p><small>snapshot {item.snapshot} · {new Date(item.timestamp).toLocaleTimeString()}</small></div>)}</section>}
        <section className="ducklake-console"><div className="ducklake-console-head"><div><span className="eyebrow">SQL exploration</span><h3>{engineMode === 'MotherDuck' ? 'MotherDuck query console' : 'Shared local SQL workspace'}</h3></div><span className="quiet-badge">{engineMode === 'MotherDuck' ? 'MotherDuck WASM' : 'Executable training SQL'}</span></div><textarea value={query} onChange={(event) => setQuery(event.target.value)} spellCheck={false} /><div className="query-actions"><button className="primary-button" onClick={runQuery}>▶ Run query</button><span>{queryStatus}</span></div>{queryRows && queryRows.length > 0 && <div className="data-grid-wrap query-result"><table className="data-grid"><thead><tr>{Object.keys(queryRows[0]).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{queryRows.slice(0,20).map((row,i) => <tr key={i}>{Object.keys(queryRows[0]).map((key) => <td key={key}>{String(row[key] ?? 'NULL')}</td>)}</tr>)}</tbody></table></div>}</section>
        <div className="learning-box wide"><strong>Case-study data plane</strong><p>{caseStudy.title}: notebook SQL/Python cells and pipeline notebook activities now read and write this same workspace. MotherDuck remains optional and separate for external SQL exploration.</p></div>
      </main>
    </div>
  );
}

function qualified(table: WorkspaceTable): string { return `${table.schema}.${table.name}`; }
