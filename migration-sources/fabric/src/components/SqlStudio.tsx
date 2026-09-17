import { useState } from 'react';
import { executeWorkspaceSql } from '../lib/dataRuntime';
import type { CaseStudy, DataWorkspace } from '../types/app';

export function SqlStudio({ caseStudy, workspace, onWorkspace }: { caseStudy: CaseStudy; workspace: DataWorkspace; onWorkspace: (workspace: DataWorkspace) => void }) {
  const [mode, setMode] = useState<'query'|'procedure'>('query');
  const first = workspace.tables.find((table) => table.layer === 'silver') ?? workspace.tables[0];
  const [sql, setSql] = useState(`SELECT * FROM ${first.schema}.${first.name} LIMIT 20;`);
  const [procedureSql, setProcedureSql] = useState(caseStudy.storedProcedure);
  const [result, setResult] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  const run = () => {
    if (mode === 'procedure') {
      setRows([]);
      setResult(caseStudy.id === 'erp-incremental' ? 'Simulated procedure completed · SCD transaction committed.' : caseStudy.id === 'turbine-realtime' ? 'Simulated procedure completed · maintenance alert transaction committed.' : 'Simulated procedure completed · fact rows merged.');
      return;
    }
    try {
      const execution = executeWorkspaceSql(workspace, sql);
      onWorkspace(execution.workspace);
      setRows(execution.rows);
      setResult(execution.output);
    } catch (error) {
      setRows([]);
      setResult(`ERROR: ${error instanceof Error ? error.message : 'Query failed'}`);
    }
  };

  return <div className="studio-page sql-page v8-sql-page">
    <div className="studio-toolbar"><div><strong>Fabric Warehouse SQL</strong><span>Queries execute against the shared learning workspace</span></div><div className="command-group"><button className="command-button">Format</button><button className="command-button">Explain</button><button className="command-button primary-command" onClick={run}>▶ Run</button></div></div>
    <div className="sql-layout">
      <aside className="sql-object-explorer"><div className="pane-title">Object explorer · snapshot {workspace.snapshot}</div><div className="tree-row tree-root">▾ Tables</div>{workspace.tables.map((table) => <button className="tree-row indent" key={`${table.schema}.${table.name}`} onClick={() => { setMode('query'); setSql(`SELECT * FROM ${table.schema}.${table.name} LIMIT 20;`); }}>▦ {table.schema}.{table.name}<small>{table.rows.length}</small></button>)}<div className="tree-row tree-root">▾ Stored procedures</div><button className={`tree-row indent ${mode === 'procedure' ? 'active' : ''}`} onClick={() => setMode('procedure')}>SP {caseStudy.storedProcedureName}</button></aside>
      <main className="sql-editor-area">
        <div className="sql-tabs"><button className={mode === 'query' ? 'active' : ''} onClick={() => setMode('query')}>SQL query</button><button className={mode === 'procedure' ? 'active' : ''} onClick={() => setMode('procedure')}>{caseStudy.storedProcedureName}</button></div>
        <textarea className="sql-code-editor" value={mode === 'query' ? sql : procedureSql} onChange={(event) => mode === 'query' ? setSql(event.target.value) : setProcedureSql(event.target.value)} spellCheck={false} />
        <div className="sql-results"><div className="results-tabs"><button className="active">Results</button><button>Messages</button></div><pre>{result || (mode === 'query' ? 'Run SELECT or CREATE TABLE ... AS SELECT to change the learning workspace.' : 'Stored procedures remain simulated; query SQL is executable.')}</pre>{rows.length > 0 && <div className="data-grid-wrap query-result"><table className="data-grid"><thead><tr>{Object.keys(rows[0]).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{rows.slice(0,25).map((row,index) => <tr key={index}>{Object.keys(rows[0]).map((key) => <td key={key}>{String(row[key] ?? 'NULL')}</td>)}</tr>)}</tbody></table></div>}</div>
      </main>
      <aside className="sql-learning"><div className="pane-title">Runtime boundary</div><div className="learning-box"><strong>Executable now</strong><p>SELECT, WHERE, GROUP BY aggregates, ORDER BY, LIMIT, CREATE TABLE AS SELECT and INSERT SELECT operate on the shared case-study tables.</p></div><div className="learning-box"><strong>Still simulated</strong><p>T-SQL procedure creation/execution is represented as a warehouse-side operation because the local learning runtime is not SQL Server.</p></div><label className="form-field"><span>Procedure</span><input value={caseStudy.storedProcedureName} readOnly /></label></aside>
    </div>
  </div>;
}
