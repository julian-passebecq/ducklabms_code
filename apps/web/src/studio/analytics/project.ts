import type {ArtifactBundle, Board, LabProject, Layer, ModelDesign, Pane, ProjectFile, StudioSession} from './types.ts';
import {array, finite, freshId, identifier, optionalString, record, safeJson, sourcePath, string, unique} from './validation.ts';
import {importRows, sampleBoard} from './charts.ts';
import {DATA_TYPES} from './modeling.ts';
export const LAB_KEY = 'datapass:analytics:v1';
export const LAYERS: Array<{id: Layer; label: string; description: string}> = [
  {id: 'notebook', label: 'Notebook', description: 'Your existing SQL, Python and free-canvas editor'},
  {id: 'dbt', label: 'dbt Studio', description: 'Models, tests, YAML and artifact evidence'},
  {id: 'lineage', label: 'Lineage', description: 'Model dependencies and change impact'},
  {id: 'model', label: 'Data model', description: 'Fact/dimension schema, keys and column mappings'},
  {id: 'scd', label: 'SCD lab', description: 'Replay Type 1, 2 and 3 changes'},
  {id: 'charts', label: 'Charts', description: 'Result-based boards and dbt Charts YAML'},
  {id: 'sparklab', label: 'Guided SparkLab', description: 'Exercise-specific integration contract; disconnected'},
  {id: 'connections', label: 'Runtime & setup', description: 'Local and optional remote capabilities'},
];
export function defaultSession(): StudioSession {
  return {panes: [{id: 'a', tabs: [{id: 'tab-notebook', layer: 'notebook', title: 'Revenue notebook'}, {id: 'tab-dbt', layer: 'dbt', title: 'dbt Studio'}], active: 'tab-notebook'}], activePane: 'a', direction: 'horizontal', ratio: 52, collapsed: null, explorerOpen: true, contextOpen: false, theme: 'fluent'};
}
export function starterFiles(): ProjectFile[] {
  return [
    {path: 'dbt_project.yml', source: `name: datapass_retail\nversion: '1.0.0'\nconfig-version: 2\nprofile: datapass_retail\nmodel-paths: [models]\nseed-paths: [seeds]\ntest-paths: [tests]\nmodels:\n  datapass_retail:\n    staging:\n      +materialized: view\n    marts:\n      +materialized: table\n`},
    {path: 'dbt_charts.yml', source: 'sources:\n  db:\n    type: dbt_profile\n    profile: datapass_retail\n    target: dev\n'},
    {path: 'models/staging/stg_orders.sql', source: `-- One row per order; invalid amounts do not contribute.\nselect\n    order_id,\n    customer_id,\n    order_month,\n    cast(net_amount as decimal(18,2)) as revenue\nfrom {{ ref('raw_orders') }}\nwhere net_amount > 0\n`},
    {path: 'models/marts/dim_customers.sql', source: `select\n    customer_id as customer_key,\n    customer_id,\n    customer_name,\n    city\nfrom {{ ref('raw_customers') }}\n`},
    {path: 'models/marts/fct_sales.sql', source: `-- Grain: one row per valid order.\nselect\n    o.order_id,\n    c.customer_key,\n    c.customer_name,\n    o.order_month,\n    o.revenue\nfrom {{ ref('stg_orders') }} as o\nleft join {{ ref('dim_customers') }} as c\n    on o.customer_id = c.customer_id\n`},
    {path: 'models/schema.yml', source: `version: 2\nmodels:\n  - name: stg_orders\n    description: One row per valid order.\n    columns:\n      - name: order_id\n        data_tests: [unique, not_null]\n  - name: dim_customers\n    columns:\n      - name: customer_key\n        data_tests: [unique, not_null]\n  - name: fct_sales\n    columns:\n      - name: order_id\n        data_tests: [unique, not_null]\n      - name: customer_key\n        data_tests:\n          - not_null\n          - relationships:\n              arguments:\n                to: ref('dim_customers')\n                field: customer_key\n`},
    {path: 'tests/assert_positive_revenue.sql', source: `-- dbt singular tests return failing rows. Zero rows means pass.\nselect *\nfrom {{ ref('fct_sales') }}\nwhere revenue <= 0 or revenue is null\n`},
    {path: 'seeds/raw_customers.csv', source: 'customer_id,customer_name,city\n101,Aster,Geneva\n102,Birch,Bergen\n'},
    {path: 'seeds/raw_orders.csv', source: 'order_id,customer_id,order_month,net_amount\n1,101,2026-01,420\n2,102,2026-01,275\n3,101,2026-02,560\n4,102,2026-02,360\n5,101,2026-03,610\n6,102,2026-03,480\n7,101,2026-04,720\n8,102,2026-04,430\n'},
  ];
}
export function starterModel(): ModelDesign {
  return {tables: [
    {id: 'customers', name: 'dim_customers', role: 'dimension', grain: 'One row per customer (Type 1).', x: 30, y: 80, columns: [
      {id: 'c-key', name: 'customer_key', type: 'INTEGER', primary: true, nullable: false},
      {id: 'c-id', name: 'customer_id', type: 'INTEGER', primary: false, nullable: false},
      {id: 'c-name', name: 'customer_name', type: 'VARCHAR', primary: false, nullable: false},
      {id: 'c-city', name: 'city', type: 'VARCHAR', primary: false, nullable: true},
    ]},
    {id: 'sales', name: 'fct_sales', role: 'fact', grain: 'One row per valid order.', x: 370, y: 190, columns: [
      {id: 's-id', name: 'order_id', type: 'INTEGER', primary: true, nullable: false},
      {id: 's-customer', name: 'customer_key', type: 'INTEGER', primary: false, nullable: false},
      {id: 's-month', name: 'order_month', type: 'VARCHAR', primary: false, nullable: false},
      {id: 's-revenue', name: 'revenue', type: 'DECIMAL(18,2)', primary: false, nullable: false},
    ]},
    {id: 'months', name: 'dim_month', role: 'dimension', grain: 'One row per calendar month.', x: 710, y: 60, columns: [
      {id: 'm-key', name: 'order_month', type: 'VARCHAR', primary: true, nullable: false},
      {id: 'm-year', name: 'year', type: 'INTEGER', primary: false, nullable: false},
      {id: 'm-quarter', name: 'quarter', type: 'INTEGER', primary: false, nullable: false},
    ]},
  ], relationships: [
    {id: 'sales-customer', fromTable: 'sales', fromColumn: 's-customer', toTable: 'customers', toColumn: 'c-key', cardinality: 'many-to-one'},
    {id: 'sales-month', fromTable: 'sales', fromColumn: 's-month', toTable: 'months', toColumn: 'm-key', cardinality: 'many-to-one'},
  ], mappings: [{id: 'map-customer', fromTable: 'customers', fromColumn: 'c-key', toTable: 'sales', toColumn: 's-customer', expression: 'Lookup using the customer business key'}]};
}
export function newProject(): LabProject {return {schemaVersion: 1, revision: 0, title: 'Retail analytics', files: starterFiles(), selectedFile: 'models/marts/fct_sales.sql', model: starterModel(), board: sampleBoard(), session: defaultSession(), scd: {type: 2, step: 3, answer: ''}};}
export function openLayer(session: StudioSession, layer: Layer, paneId = session.activePane): StudioSession {
  if (!LAYERS.some(l => l.id === layer)) throw new Error('Unknown layer.');
  if (!session.panes.some(p => p.id === paneId)) throw new Error('Missing destination pane.');
  return {...session, collapsed: session.collapsed === paneId ? null : session.collapsed, activePane: paneId, panes: session.panes.map(p => {
    if (p.id !== paneId) return p;
    const old = p.tabs.find(t => t.layer === layer);
    if (old) return {...p, active: old.id};
    if (p.tabs.length >= 12) throw new Error('Close a tab before opening more.');
    const tab = {id: freshId('tab'), layer, title: LAYERS.find(l => l.id === layer)!.label};
    return {...p, tabs: [...p.tabs, tab], active: tab.id};
  })};
}
export function splitSession(session: StudioSession, direction: StudioSession['direction']): StudioSession {
  if (session.panes.length === 2) return {...session, direction, collapsed: null};
  const pane: Pane = {id: 'b', tabs: [], active: ''};
  return {...session, panes: [...session.panes, pane], direction, activePane: 'b', collapsed: null};
}
export function closeTab(session: StudioSession, paneId: string, id: string): StudioSession {
  return {...session, panes: session.panes.map(p => {if (p.id !== paneId) return p; const index = p.tabs.findIndex(t => t.id === id); const tabs = p.tabs.filter(t => t.id !== id); return {...p, tabs, active: p.active === id ? tabs[Math.max(0, index - 1)]?.id ?? '' : p.active};})};
}
export function moveTab(session: StudioSession, from: string, id: string): StudioSession {
  const origin = session.panes.find(p => p.id === from), tab = origin?.tabs.find(t => t.id === id);
  if (!tab || session.panes.length < 2) return session;
  const other = session.panes.find(p => p.id !== from)!;
  if (other.tabs.some(t => t.layer === tab.layer)) throw new Error('That layer already has a tab in the other pane. Close it first.');
  const next = closeTab(session, from, id);
  return {...next, collapsed: null, activePane: other.id, panes: next.panes.map(p => p.id === other.id ? {...p, tabs: [...p.tabs, tab], active: id} : p)};
}
export function validateSession(value: unknown): StudioSession {
  const s = record(value, 'session');
  const panes: Pane[] = array(s.panes, 'panes', 2).map(v => {const p = record(v); if (!['a', 'b'].includes(String(p.id))) throw new Error('Invalid pane id.');
    const tabs = array(p.tabs, 'tabs', 12).map(v => {const t = record(v); const layer = string(t.layer, 'layer', 40) as Layer; if (!LAYERS.some(l => l.id === layer)) throw new Error('Unknown layer.'); return {id: string(t.id, 'tab id', 100), layer, title: string(t.title, 'tab title', 150)};});
    unique(tabs.map(t => t.id), 'tab ID'); unique(tabs.map(t => t.layer), 'pane layer'); const active = string(p.active, 'active tab', 100);
    if (tabs.length ? !tabs.some(t => t.id === active) : active !== '') throw new Error('Missing active tab.');
    return {id: p.id as Pane['id'], tabs, active};
  });
  if (!panes.length || panes[0].id !== 'a') throw new Error('Primary pane is required.');
  unique(panes.map(p => p.id), 'pane identity'); unique(panes.flatMap(p => p.tabs.map(t => t.id)), 'tab identity');
  if (!panes.some(p => p.id === s.activePane)) throw new Error('Invalid active pane.');
  if (!['horizontal', 'vertical'].includes(String(s.direction)) || !['fluent', 'neutral', 'dark'].includes(String(s.theme))) throw new Error('Invalid layout mode/theme.');
  if (s.collapsed !== null && (panes.length !== 2 || !panes.some(p => p.id === s.collapsed))) throw new Error('Invalid collapsed pane.');
  if (typeof s.explorerOpen !== 'boolean' || typeof s.contextOpen !== 'boolean') throw new Error('Invalid panel visibility.');
  return {panes, activePane: s.activePane as StudioSession['activePane'], direction: s.direction as StudioSession['direction'], ratio: finite(s.ratio, 'split ratio', 25, 75), collapsed: s.collapsed as StudioSession['collapsed'], explorerOpen: s.explorerOpen, contextOpen: s.contextOpen, theme: s.theme as StudioSession['theme']};
}
export function validateModel(value: unknown): ModelDesign {
  const m = record(value, 'model');
  const tables = array(m.tables, 'model tables', 30).map(value => {
    const t = record(value); const columns = array(t.columns, 'columns', 60).map(value => {
      const c = record(value); if (!(DATA_TYPES as readonly string[]).includes(String(c.type)) || typeof c.primary !== 'boolean' || typeof c.nullable !== 'boolean') throw new Error('Invalid column metadata.');
      return {id: string(c.id, 'column id', 100), name: identifier(c.name, 'Column name'), type: String(c.type), primary: c.primary, nullable: c.nullable};
    }); unique(columns.map(c => c.id), 'column ID');
    if (!['fact', 'dimension', 'source'].includes(String(t.role))) throw new Error('Invalid table role.');
    return {id: string(t.id, 'table ID', 100), name: identifier(t.name, 'Table name'), role: t.role as 'fact' | 'dimension' | 'source', grain: string(t.grain, 'grain', 500), columns, x: finite(t.x, 'x', 0, 4000), y: finite(t.y, 'y', 0, 4000)};
  }); unique(tables.map(t => t.id), 'table ID');
  function endpoints(value: unknown) {const r = record(value); const fromTable = string(r.fromTable, 'source table', 100), toTable = string(r.toTable, 'target table', 100), fromColumn = string(r.fromColumn, 'source column', 100), toColumn = string(r.toColumn, 'target column', 100); if (!tables.find(t => t.id === fromTable)?.columns.some(c => c.id === fromColumn) || !tables.find(t => t.id === toTable)?.columns.some(c => c.id === toColumn)) throw new Error('Dangling relationship or mapping.'); return {id: string(r.id, 'edge ID', 100), fromTable, fromColumn, toTable, toColumn};}
  const relationships = array(m.relationships, 'relationships', 120).map(value => {const r = record(value); if (!['many-to-one', 'one-to-one', 'one-to-many', 'many-to-many'].includes(String(r.cardinality))) throw new Error('Invalid cardinality.'); return {...endpoints(r), cardinality: r.cardinality as ModelDesign['relationships'][number]['cardinality']};});
  const mappings = array(m.mappings, 'column mappings', 200).map(value => ({...endpoints(value), expression: string(record(value).expression, 'mapping expression', 2000)}));
  unique(relationships.map(r => r.id), 'relationship ID'); unique(mappings.map(m => m.id), 'mapping ID');
  return {tables, relationships, mappings};
}
function validateArtifacts(value: unknown): ArtifactBundle {
  const b = record(value, 'artifact bundle');
  if (b.provenance !== 'imported-dbt-artifact') throw new Error('Invalid artifact provenance.');
  const nodes = array(b.nodes, 'artifact nodes', 400).map(v => {const n = record(v); return {id: string(n.id, 'id', 500), name: string(n.name, 'name', 250), kind: string(n.kind, 'kind', 50), path: string(n.path, 'path', 500), description: string(n.description, 'description', 20_000), materialization: string(n.materialization, 'materialization', 80), dependencies: array(n.dependencies, 'dependencies', 400).map(d => string(d, 'dependency', 500)), columns: array(n.columns, 'columns', 250).map(v => {const c = record(v); return {name: string(c.name, 'column', 200), type: string(c.type, 'type', 100), description: string(c.description, 'description')};}), source: string(n.source, 'source', 100_000), compiled: string(n.compiled, 'compiled', 100_000)};});
  unique(nodes.map(n => n.id), 'node ID');
  const results = array(b.results, 'artifact results', 400).map(v => {const r = record(v); const id = string(r.id, 'result id', 500); if (!nodes.some(n => n.id === id)) throw new Error('Orphan run result.'); return {id, status: string(r.status, 'status', 100), seconds: r.seconds === null ? null : finite(r.seconds, 'duration', 0, 1e9), failures: r.failures === null ? null : finite(r.failures, 'failures', 0, 1e12), message: string(r.message, 'message', 10_000)};}); unique(results.map(r => r.id), 'result ID');
  const invocationId = string(b.invocationId, 'invocation', 100), resultInvocationId = optionalString(b.resultInvocationId, 100);
  if (results.length && (!invocationId || invocationId !== resultInvocationId)) throw new Error('Mismatched saved run evidence.');
  if (![9, 10, 11, 12].includes(Number(b.schema)) || nodes.reduce((n, a) => n + a.dependencies.length, 0) > 3000) throw new Error('Unsupported or excessive manifest metadata.');
  return {schema: Number(b.schema), projectName: string(b.projectName, 'project', 200), generatedAt: string(b.generatedAt, 'date', 100), invocationId, nodes, results, resultInvocationId, resultGeneratedAt: optionalString(b.resultGeneratedAt, 100), warnings: array(b.warnings, 'warnings', 3000).map(w => string(w, 'warning', 1500)), provenance: 'imported-dbt-artifact'};
}
export function validateProject(value: unknown): LabProject {
  const p = record(value, 'analytics document'); if (p.schemaVersion !== 1) throw new Error('Unsupported analytics document version.');
  const files = array(p.files, 'project files', 60).map(v => {const f = record(v); return {path: sourcePath(f.path), source: string(f.source, 'source', 100_000)};}); unique(files.map(f => f.path.toLowerCase()), 'file path');
  if (!files.length || files.reduce((n, f) => n + f.source.length, 0) > 1_500_000) throw new Error('Project is empty or too large.');
  const selectedFile = string(p.selectedFile, 'selected file', 220); if (!files.some(f => f.path === selectedFile)) throw new Error('Selected file is missing.');
  const b = record(p.board, 'board'), snapshotValue = record(b.snapshot, 'snapshot');
  const query = string(b.query, 'query', 100_000); const snapshot = importRows(JSON.stringify(snapshotValue.rows), string(snapshotValue.query, 'snapshot query', 100_000), optionalString(snapshotValue.importedAt, 100));
  if (!['sample', 'imported', 'real_local'].includes(String(snapshotValue.origin))) throw new Error('Invalid snapshot origin.');
  if(snapshotValue.importedAt==null)delete snapshot.importedAt;
  snapshot.label = string(snapshotValue.label, 'snapshot label', 200); snapshot.origin = snapshotValue.origin as 'sample' | 'imported' | 'real_local';
  if(snapshotValue.run_id)snapshot.run_id=string(snapshotValue.run_id,'run identity',100);
  if(snapshotValue.workspace_id)snapshot.workspace_id=string(snapshotValue.workspace_id,'workspace identity',100);
  const columns=array(snapshotValue.columns,'snapshot columns',100).map(c=>string(c,'column',100));unique(columns,'snapshot column');
  if(snapshot.rows.length&&(columns.length!==snapshot.columns.length||columns.some((c,i)=>c!==snapshot.columns[i])))throw new Error('Snapshot schema does not match result rows.');
  snapshot.columns=columns; // Empty real results still carry their authoritative schema.
  if(snapshotValue.input_versions!=null){const versions=Object.entries(record(snapshotValue.input_versions,'input versions'));if(versions.length>200)throw new Error('Too many tracked chart inputs.');snapshot.input_versions=Object.fromEntries(versions.map(([k,v])=>[string(k,'input reference',100),v===null?null:string(v,'input version',100)]));}

  if(snapshot.origin==='real_local'&&(!snapshot.run_id||!snapshot.workspace_id))throw new Error('Local snapshot is missing execution provenance.');
  if (!['bar', 'line', 'table', 'kpi'].includes(String(b.chartType)) || !['sum', 'mean', 'count'].includes(String(b.aggregation))) throw new Error('Invalid chart mode.');
  const board: Board = {title: string(b.title, 'board title', 200), query, chartType: b.chartType as Board['chartType'], x: string(b.x, 'dimension', 100), y: string(b.y, 'measure', 100), aggregation: b.aggregation as Board['aggregation'], snapshot};
  const scd = record(p.scd); if (![1, 2, 3].includes(Number(scd.type))) throw new Error('Invalid SCD type.'); const step = finite(scd.step, 'replay step', 0, 5); if (!Number.isInteger(step)) throw new Error('Invalid replay step.');
  if (!Number.isSafeInteger(p.revision)) throw new Error('Invalid revision.');
  return {schemaVersion: 1, revision: finite(p.revision, 'revision', 0, Number.MAX_SAFE_INTEGER), title: string(p.title, 'project title', 150), files, selectedFile, ...(p.artifacts ? {artifacts: validateArtifacts(p.artifacts)} : {}), model: validateModel(p.model), board, session: validateSession(p.session), scd: {type: Number(scd.type) as 1 | 2 | 3, step, answer: string(scd.answer, 'answer', 100)}};
}
export function importProject(text: string): LabProject {return validateProject(safeJson(text));}
export function readProject(value: unknown): {project: LabProject; error: string} {
  if (value === undefined) return {project: newProject(), error: ''};
  try {return {project: validateProject(value), error: ''};} catch (e) {return {project: newProject(), error: `Stored analytics document could not be opened: ${e instanceof Error ? e.message : String(e)}. The original value is retained; export the owner notebook before replacing it.`};}
}
export function updateFile(project: LabProject, path: string, source: string): LabProject {
  string(source, 'file source', 100_000);
  if (!project.files.some(f => f.path === path)) throw new Error('File not found.');
  return {...project, revision: project.revision + 1, files: project.files.map(f => f.path === path ? {...f, source} : f)};
}

/** Close only extra views. Source, files, model, board and run evidence are untouched. */
export function singlePaneSession(session: StudioSession): StudioSession {
  const active = session.panes.find(p => p.id === session.activePane);
  const selectedLayer = active?.tabs.find(t => t.id === active.active)?.layer;
  const tabs: Pane['tabs'] = [];
  for (const pane of session.panes) for (const tab of pane.tabs) if (!tabs.some(t => t.layer === tab.layer)) tabs.push(tab);
  return {...session, panes: [{id: 'a', tabs, active: tabs.find(t => t.layer === selectedLayer)?.id ?? tabs[0]?.id ?? ''}], activePane: 'a', collapsed: null};
}

/** RootNotebook restore hook. The generic Mosaic importer intentionally strips
 * non-cell keys; retain this bounded namespaced attachment at the root adapter.
 * Invalid schema versions remain visible to readProject's recovery UI, never
 * silently replaced with a new empty design. Unsafe JSON fails the whole restore.
 */
export function preserveAnalyticsAttachment(blockState: unknown): Record<string, unknown> {
  if (!blockState || typeof blockState !== 'object' || Array.isArray(blockState) || !Object.hasOwn(blockState, LAB_KEY)) return {};
  const value = (blockState as Record<string, unknown>)[LAB_KEY];
  return {[LAB_KEY]: safeJson(JSON.stringify(value), 1_200_000)};
}
