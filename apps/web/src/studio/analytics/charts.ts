import type {Board, ResultSnapshot, Scalar} from './types.ts';
import {array, record, safeJson, string, unique} from './validation.ts';
import {parseDocument} from 'yaml';

/** Bounded single-chart interoperability; imported SQL never executes on import. */
export function importBoardYaml(text: string): Board {
  if (text.length > 100_000) throw new Error('Board YAML exceeds 100 KB.');
  const doc = parseDocument(text, {uniqueKeys:true});
  if (doc.errors.length || doc.warnings.length) throw new Error('Invalid or unsupported YAML.');
  const raw = record(doc.toJS({maxAliasCount:0}), 'board');
  const keys = (value:Record<string,unknown>, allowed:string[]) => {
    if (Object.keys(value).some(k=>!allowed.includes(k))) throw new Error('Unsupported dbt Charts option; import supports one SQL chart without variables, remote sources or custom rendering.');
  };
  keys(raw,['title','source','queries','charts','rows']);
  if (raw.source !== 'db') throw new Error('Only source: db is supported. Review SQL before running it on the shared workspace catalog.');
  const charts = record(raw.charts,'charts'), queries = record(raw.queries,'queries');
  if (Object.keys(charts).length !== 1 || Object.keys(queries).length !== 1) throw new Error('Import exactly one named query and chart.');
  const [id, value] = Object.entries(charts)[0], chart = record(value,'chart');
  keys(chart,['title','query','type','x','y','value']);
  if (!Array.isArray(raw.rows) || raw.rows.length !== 1 || raw.rows[0] !== id) throw new Error('Import requires rows: [chart_name].');
  const queryName = string(chart.query,'query reference',100);
  if (!Object.hasOwn(queries,queryName)) throw new Error('Missing named SQL query.');
  const query = string(queries[queryName],'SQL query',100_000);
  const chartType = string(chart.type,'chart type',20);
  if (!['bar','line','kpi','table'].includes(chartType)) throw new Error('Supported chart types: bar, line, kpi, table.');
  const y = chartType === 'kpi' ? string(chart.value,'KPI value',100) : chartType === 'table' ? 'metric' : string(chart.y,'measure',100);
  const x = chartType === 'kpi' ? y : chartType === 'table' ? 'dimension' : string(chart.x,'dimension',100);
  return {title:string(chart.title??raw.title??'Imported board','title',120),chartType:chartType as Board['chartType'],x,y,aggregation:'sum',query,
    snapshot:{origin:'imported',label:'Imported YAML design; no query executed',query,columns:[],rows:[]}};
}
export function importRows(text: string, query: string, now = new Date().toISOString()): ResultSnapshot {
  const raw = safeJson(text, 2_000_000);
  const values = Array.isArray(raw) ? raw : record(raw, 'result').rows;
  const rows = array(values, 'result rows', 1000).map(value => {
    const row = record(value, 'row'); const entries = Object.entries(row);
    if (!entries.length || entries.length > 100) throw new Error('Rows must have 1-100 columns.');
    const next: Record<string, Scalar> = Object.create(null);
    for (const [key, value] of entries) {
      string(key, 'column name', 100);
      if (!(value === null || typeof value === 'string' && value.length <= 4000 || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value))) throw new Error('Result cells must be bounded strings, finite numbers, booleans, or null.');
      next[key] = value as Scalar;
    } return next;
  });
  const columns = rows.length ? Object.keys(rows[0]) : [];
  unique(columns, 'column name');
  if (rows.some(r => Object.keys(r).length !== columns.length || !columns.every(c => Object.hasOwn(r, c)))) throw new Error('Every result row must have the same columns.');
  return {label: 'Imported result rows', rows, columns, query, importedAt: now, origin: 'imported'};
}
export interface Point {label: string; value: number}
export function aggregateBoard(board: Board): {points: Point[]; ignored: number; stale: boolean; total: number; groups: number} {
  const {snapshot, x, y, aggregation} = board;
  if (!snapshot.columns.includes(x) || aggregation !== 'count' && !snapshot.columns.includes(y)) return {points: [], ignored: snapshot.rows.length, stale: snapshot.query !== board.query, total: 0, groups: 0};
  const groups = new Map<string, {label: string; sum: number; count: number}>(); let ignored = 0, rawSum = 0, rawCount = 0;
  for (const row of snapshot.rows) {
    const dimension = row[x];
    const label = dimension == null ? '(null)' : String(dimension);
    // A null group, a string '(null)', and numbers/strings with the same text are distinct.
    const key = JSON.stringify([typeof dimension, dimension]);
    const value = aggregation === 'count' ? 1 : row[y];
    if (typeof value !== 'number' || !Number.isFinite(value)) {ignored++; continue;}
    rawSum += value; rawCount++;
    const group = groups.get(key) ?? {label, sum: 0, count: 0}; group.sum += value; group.count++; groups.set(key, group);
  }
  const points = [...groups.values()].sort((a, b) => a.label < b.label ? -1 : a.label > b.label ? 1 : 0).map(g => ({label: g.label, value: aggregation === 'mean' ? g.sum / g.count : g.sum}));
  if (!Number.isFinite(rawSum) || points.some(p => !Number.isFinite(p.value))) throw new Error('Numeric overflow in imported chart data.');
  return {points: points.slice(0, 80), groups: points.length, ignored, stale: snapshot.query !== board.query, total: aggregation === 'mean' ? rawSum / (rawCount || 1) : rawSum};
}
const yaml = (s: string) => JSON.stringify(s); // JSON quoted strings are valid YAML scalars.
/** Exports the documented dbt Charts DSL. Rendering remains the external dct CLI's job. */
export function boardYaml(board: Board): string {
  const query = `WITH board_source AS (\n${board.query.replace(/;\s*$/, '').split('\n').map(s => '  ' + s).join('\n')}\n)\nSELECT "${board.x.replaceAll('"', '""')}" AS dimension,\n       ${board.aggregation === 'count' ? 'COUNT(*)' : `${board.aggregation === 'mean' ? 'AVG' : 'SUM'}("${board.y.replaceAll('"', '""')}")`} AS metric\nFROM board_source\nGROUP BY 1\nORDER BY 1`;
  const chart = board.chartType === 'kpi' ? '    value: metric\n' : board.chartType === 'table' ? '' : '    x: dimension\n    y: metric\n';
  const kpiQuery = board.chartType === 'kpi' ? `SELECT ${board.aggregation === 'count' ? 'COUNT(*)' : `${board.aggregation === 'mean' ? 'AVG' : 'SUM'}("${board.y.replaceAll('"', '""')}")`} AS metric FROM (\n${board.query.replace(/;\s*$/, '')}\n) AS board_source` : query;
  return `# Generated by Datapass. Validate using dct validate, then render with dct.\n# Browser preview is NOT the dbt Charts renderer. No query ran during export.\ntitle: ${yaml(board.title)}\nsource: db\n\nqueries:\n  analysis: |\n${kpiQuery.split('\n').map(l => '    ' + l).join('\n')}\n\ncharts:\n  analysis_chart:\n    query: analysis\n    type: ${board.chartType}\n${chart}\nrows:\n  - analysis_chart\n`;
}
export function sampleBoard(): Board {
  const query = "SELECT order_month, customer_name, revenue\nFROM {{ ref('fct_sales') }}\nORDER BY order_month, customer_name";
  const rows = [
    {order_month: '2026-01', customer_name: 'Aster', revenue: 420}, {order_month: '2026-01', customer_name: 'Birch', revenue: 275},
    {order_month: '2026-02', customer_name: 'Aster', revenue: 560}, {order_month: '2026-02', customer_name: 'Birch', revenue: 360},
    {order_month: '2026-03', customer_name: 'Aster', revenue: 610}, {order_month: '2026-03', customer_name: 'Birch', revenue: 480},
    {order_month: '2026-04', customer_name: 'Aster', revenue: 720}, {order_month: '2026-04', customer_name: 'Birch', revenue: 430},
  ];
  return {title: 'Revenue over time', chartType: 'bar', x: 'order_month', y: 'revenue', aggregation: 'sum', query, snapshot: {label: 'Retail teaching fixture', origin: 'sample', columns: ['order_month', 'customer_name', 'revenue'], rows, query}};
}

/** Best-effort registered direct-input freshness, never a universal SQL lineage claim. */
export function snapshotFreshness(snapshot:ResultSnapshot,assets?:Array<{name:string;version?:string;fresh:boolean}>):{state:'current'|'stale'|'unknown';message:string} {
  if(snapshot.origin!=='real_local')return {state:'unknown',message:'Imported/sample rows have no verified live-input freshness.'};
  const inputs=Object.entries(snapshot.input_versions??{});
  if(!assets||!inputs.length)return {state:'unknown',message:'No tracked direct inputs to compare. This is a saved result, not a live dashboard.'};
  const stale=inputs.filter(([name,version])=>{const asset=assets.find(a=>a.name.toLowerCase()===name.toLowerCase());return !asset||version===null||asset.version!==version||!asset.fresh});
  return stale.length?{state:'stale',message:'Registered input changed, is missing, or is stale: '+stale.map(([name])=>name).join(', ')}:{state:'current',message:'Registered direct-input versions match the last catalog refresh. Untracked SQL dependencies and external writers are not covered.'};
}
