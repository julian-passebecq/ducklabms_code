import { useMemo, useState } from 'react';
import { LearningGraph } from '../graph-engine/LearningGraph';
import { createWorkspaceCheckpoint, profileWorkspace, profileWorkspaceTable, restoreWorkspaceCheckpoint } from '../lib/workspaceInsights';
import type { CaseStudy, DataWorkspace, WorkspaceTable } from '../types/app';

const layerX: Record<string, number> = { source: 40, stream: 40, bronze: 300, silver: 560, gold: 820, warehouse: 820 };

export function FabricLakehouseStudio({ caseStudy, workspace, onWorkspace }: { caseStudy: CaseStudy; workspace: DataWorkspace; onWorkspace: (workspace: DataWorkspace) => void }) {
  const [selected, setSelected] = useState(workspace.tables[0]?.name ?? '');
  const [shortcut, setShortcut] = useState(false);
  const [deltaLoaded, setDeltaLoaded] = useState(false);
  const [sqlRan, setSqlRan] = useState(false);
  const [tab, setTab] = useState<'Explorer' | 'SQL endpoint' | 'Medallion' | 'Data quality' | 'Lineage & history' | 'Mirroring'>('Explorer');
  const [mirrorRunning, setMirrorRunning] = useState(false);
  const [validation, setValidation] = useState<string>('');
  const [checkpointLabel, setCheckpointLabel] = useState('Before experiment');
  const table = useMemo<WorkspaceTable | undefined>(() => workspace.tables.find(t => t.name === selected) ?? workspace.tables[0], [workspace.tables, selected]);
  const profiles = useMemo(() => profileWorkspace(workspace), [workspace]);
  const selectedProfile = useMemo(() => table ? profileWorkspaceTable(table) : undefined, [table]);
  const lineageNodes = useMemo(() => workspace.tables.map((item, index) => ({
    id: `${item.schema}.${item.name}`,
    x: layerX[item.layer] ?? 300,
    y: 60 + workspace.tables.filter((candidate, candidateIndex) => candidateIndex < index && candidate.layer === item.layer).length * 135,
    title: `${item.schema}.${item.name}`,
    subtitle: `${item.layer} · ${item.rows.length} rows · v${item.version}`,
    kind: 'dataflow',
    status: 'Ready',
  })), [workspace.tables]);
  const lineageEdges = useMemo(() => (workspace.lineage ?? []).filter((edge) => lineageNodes.some((node) => node.id === edge.from) && lineageNodes.some((node) => node.id === edge.to)).map((edge) => ({ id: edge.id, source: edge.from, target: edge.to, label: `${edge.operation} · ${edge.actor}` })), [workspace.lineage, lineageNodes]);

  const validate = () => {
    if (shortcut && deltaLoaded && sqlRan) setValidation('Success: you linked external data, materialized a Delta table, and queried the serving layer.');
    else setValidation(`Incomplete: ${!shortcut ? 'create a OneLake shortcut; ' : ''}${!deltaLoaded ? 'load a file/table to Delta; ' : ''}${!sqlRan ? 'run a SQL endpoint query.' : ''}`);
  };

  const createCheckpoint = () => onWorkspace(createWorkspaceCheckpoint(workspace, checkpointLabel));

  return <div className="studio-page fabric-lakehouse-studio">
    <div className="studio-commandbar"><div><span className="fabric-item-icon">LH</span><strong>LH_{caseStudy.id.replaceAll('-', '_')}</strong><span className="muted">Lakehouse · snapshot {workspace.snapshot}</span></div><div><button className="toolbar-button">Open notebook</button><button className="toolbar-button">New SQL query</button><button className="primary-button" onClick={() => setShortcut(true)}>+ New shortcut</button></div></div>
    <div className="studio-tabs">{(['Explorer','SQL endpoint','Medallion','Data quality','Lineage & history','Mirroring'] as const).map(t => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    {tab === 'Explorer' && <div className="lakehouse-layout">
      <aside className="object-explorer">
        <div className="pane-title">Explorer</div>
        <div className="tree-section"><strong>Tables</strong>{workspace.tables.filter(t => t.layer !== 'source' && t.layer !== 'stream').map(t => <button className={table?.name === t.name ? 'active' : ''} key={`${t.schema}.${t.name}`} onClick={() => setSelected(t.name)}>▦ {t.schema}.{t.name}</button>)}</div>
        <div className="tree-section"><strong>Files</strong><button className={table?.name === workspace.tables[0]?.name ? 'active' : ''} onClick={() => setSelected(workspace.tables[0]?.name ?? '')}>▱ Files/source/{workspace.tables[0]?.name}.csv</button></div>
        <div className="tree-section"><strong>Shortcuts</strong>{shortcut ? <button className="active">↗ external_source</button> : <span className="empty-tree">No shortcuts yet</span>}</div>
      </aside>
      <main className="lakehouse-main">
        <div className="item-header"><div><span className="eyebrow">OneLake item</span><h2>{table ? `${table.schema}.${table.name}` : 'Lakehouse'}</h2><p>{table?.columns.length ?? 0} columns · {table?.rows.length ?? 0} preview rows · layer: {table?.layer ?? '—'} · version {table?.version ?? '—'}</p></div><div className="item-actions"><button className="secondary-button" onClick={() => setDeltaLoaded(true)}>Load to Delta table</button><button className="secondary-button" onClick={() => setSqlRan(true)}>Query SQL endpoint</button></div></div>
        {table && <><div className="data-grid-wrap large"><table className="data-grid"><thead><tr>{table.columns.map(c => <th key={c.name}>{c.name}<div className="column-type">{c.type}</div></th>)}</tr></thead><tbody>{table.rows.map((r, i) => <tr key={i}>{table.columns.map(c => <td key={c.name}>{String(r[c.name] ?? '')}</td>)}</tr>)}</tbody></table></div>
        <div className="schema-table"><h3>Schema</h3>{table.columns.map(c => <div className="schema-row" key={c.name}><code>{c.name}</code><span>{c.type}</span><p>{c.description}</p><em>{c.name === table.primaryKey ? 'PK' : table.foreignKeys?.includes(c.name) ? 'FK' : ''}</em></div>)}</div></>}
      </main>
      <aside className="learning-side-panel"><div className="pane-title">Guided task · Lakehouse</div><div className="learning-task-list">
        <Task done={shortcut} n="1" title="Create a shortcut" text="Reference external storage without copying the physical files into this lakehouse." />
        <Task done={deltaLoaded} n="2" title="Materialize Delta" text="Convert/load raw data into a managed analytical table." />
        <Task done={sqlRan} n="3" title="Use SQL endpoint" text="Read the same lakehouse data with the SQL serving engine." />
      </div><button className="primary-button wide-button" onClick={validate}>Validate task</button>{validation && <div className={`validation-message ${validation.startsWith('Success') ? 'success' : 'warning'}`}>{validation}</div>}
      <div className="learning-box"><strong>Why this matters</strong><p>OneLake is the common storage layer. A Lakehouse exposes the same data to Spark and a SQL analytics endpoint, while shortcuts let you virtualize data from other locations.</p></div></aside>
    </div>}
    {tab === 'SQL endpoint' && <div className="center-practice"><div className="practice-card"><span className="eyebrow">SQL analytics endpoint</span><h2>Query Lakehouse tables without moving them</h2><pre>SELECT customer_id, SUM(net_sales) AS revenue{`\n`}FROM silver.sales_clean{`\n`}GROUP BY customer_id{`\n`}ORDER BY revenue DESC;</pre><button className="primary-button" onClick={() => setSqlRan(true)}>▶ Run query</button>{sqlRan && <div className="mock-result">Representative endpoint result · query completed against the learning Lakehouse.</div>}</div></div>}
    {tab === 'Medallion' && <div className="center-practice"><div className="medallion-diagram"><Layer title="Bronze" subtitle="Raw / replayable" items={workspace.tables.filter(t => t.layer === 'bronze' || t.layer === 'source').map(t => t.name)} /><span>→</span><Layer title="Silver" subtitle="Clean / conformed" items={workspace.tables.filter(t => t.layer === 'silver').map(t => t.name)} /><span>→</span><Layer title="Gold" subtitle="Business-ready" items={workspace.tables.filter(t => t.layer === 'gold' || t.layer === 'warehouse').map(t => t.name)} /></div></div>}
    {tab === 'Data quality' && <div className="quality-workbench"><aside className="quality-table-list surface-card"><div className="pane-title">Table profiles</div>{profiles.map((profile) => <button className={selectedProfile?.qualifiedName === profile.qualifiedName ? 'active' : ''} onClick={() => setSelected(profile.qualifiedName.split('.').at(-1) ?? '')} key={profile.qualifiedName}><strong>{profile.qualifiedName}</strong><span>{profile.rowCount} rows · {profile.columnCount} cols</span><em className={profile.qualityScore >= 95 ? 'good' : profile.qualityScore >= 80 ? 'warn' : 'bad'}>{profile.qualityScore}%</em></button>)}</aside><main className="quality-main surface-card">{selectedProfile ? <><div className="quality-summary"><div><span>Rows</span><strong>{selectedProfile.rowCount}</strong></div><div><span>Columns</span><strong>{selectedProfile.columnCount}</strong></div><div><span>Duplicate PK rows</span><strong>{selectedProfile.duplicatePrimaryKeyRows}</strong></div><div><span>Quality score</span><strong>{selectedProfile.qualityScore}%</strong></div></div><table className="manage-table"><thead><tr><th>Column</th><th>Type</th><th>Nulls</th><th>Distinct</th><th>Min</th><th>Max</th></tr></thead><tbody>{selectedProfile.columns.map((column) => <tr key={column.name}><td><strong>{column.name}</strong></td><td>{column.type}</td><td>{column.nullCount} ({column.nullPercent}%)</td><td>{column.distinctCount}</td><td>{String(column.min ?? '—')}</td><td>{String(column.max ?? '—')}</td></tr>)}</tbody></table><div className="learning-box wide"><strong>Interpret the profile</strong><p>Use null rate, distinct count, key duplication and ranges to decide whether a table is ready for Silver/Gold. The score is a teaching heuristic, not a Fabric service metric.</p></div></> : <div className="choice-placeholder">Select a table to profile.</div>}</main></div>}
    {tab === 'Lineage & history' && <div className="lineage-workbench"><main className="lineage-canvas surface-card"><div className="surface-card-title"><div><strong>Generated lineage</strong><span>{lineageEdges.length} recorded source→target relationships · snapshot {workspace.snapshot}</span></div></div><div className="lineage-graph-frame"><LearningGraph nodes={lineageNodes} edges={lineageEdges} selectedId={table ? `${table.schema}.${table.name}` : null} onSelect={(id) => { if (id) setSelected(id.split('.').at(-1) ?? ''); }} onMove={() => {}} onConnect={() => {}} onDeleteNodes={() => {}} onDeleteEdges={() => {}} emptyTitle="No runtime lineage yet" emptySubtitle="Run a Notebook, SQL CTAS, Copy activity or dbt model to create lineage." /></div></main><aside className="lineage-side surface-card"><div className="pane-title">Checkpoints & history</div><div className="checkpoint-create"><input value={checkpointLabel} onChange={(event) => setCheckpointLabel(event.target.value)} /><button className="primary-button" onClick={createCheckpoint}>Create checkpoint</button></div><div className="checkpoint-list">{(workspace.checkpoints ?? []).map((checkpoint) => <div key={checkpoint.id}><div><strong>{checkpoint.label}</strong><span>snapshot {checkpoint.snapshot} · {checkpoint.tables.length} tables</span></div><button onClick={() => onWorkspace(restoreWorkspaceCheckpoint(workspace, checkpoint.id))}>Restore</button></div>)}</div><hr/><strong>Recent workspace events</strong><div className="workspace-history">{workspace.history.slice(0, 14).map((item) => <div key={item.id}><span>{item.action}</span><strong>{item.object}</strong><small>#{item.snapshot} · {item.details}</small></div>)}</div></aside></div>}
    {tab === 'Mirroring' && <div className="center-practice"><div className="practice-card"><span className="eyebrow">Zero-ETL pattern</span><h2>Mirror operational data into OneLake</h2><div className="review-panel"><div className="review-row"><span>Source</span><strong>Azure SQL Database · ERP_Operations</strong></div><div className="review-row"><span>Target</span><strong>Mirrored database · OneLake Delta</strong></div><div className="review-row"><span>Replication</span><strong>{mirrorRunning ? 'Running · near real-time · lag 4s' : 'Stopped'}</strong></div><div className="review-row"><span>Serving</span><strong>Read-only SQL analytics endpoint</strong></div></div><button className="primary-button" onClick={() => setMirrorRunning(true)}>{mirrorRunning ? '✓ Mirroring active' : 'Start mirroring'}</button><div className="learning-box wide"><strong>Why mirroring?</strong><p>For supported operational sources, mirroring continuously replicates changes into OneLake so analytics can use up-to-date Delta data without building a scheduled ETL pipeline.</p></div></div></div>}
  </div>;
}

function Task({ done, n, title, text }: { done: boolean; n: string; title: string; text: string }) { return <div className={`learning-task ${done ? 'done' : ''}`}><span>{done ? '✓' : n}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
function Layer({ title, subtitle, items }: { title: string; subtitle: string; items: string[] }) { return <div className={`medallion-layer ${title.toLowerCase()}`}><span>{title}</span><strong>{subtitle}</strong>{items.map(i => <small key={i}>{i}</small>)}</div>; }
