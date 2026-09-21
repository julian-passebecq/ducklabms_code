/** UI harness fixtures only. Not an execution engine, exercise pack or second notebook format. */
import type {RootBlock, RootNotebook} from '../notebook.ts';
import {safeJson} from './analytics/validation.ts';
import type {Asset, ExerciseDefinition} from '../../../../packages/contracts/src/index.ts';

export const PREVIEW_STORAGE_KEY = 'datapass:ui-fixture-notebooks:m1';
export const PREVIEW_ASSETS: Asset[] = [
  {name: 'source.orders', layer: 'source', row_count: 8, fresh: true},
  {name: 'source.customers', layer: 'source', row_count: 2, fresh: true},
  {name: 'bronze.orders_raw', layer: 'bronze', row_count: 8, fresh: true, producer: 'Fixture: ingestion'},
  {name: 'silver.orders_clean', layer: 'silver', row_count: 8, fresh: true, producer: 'Fixture: validation'},
  {name: 'gold.customer_revenue', layer: 'gold', row_count: 2, fresh: false, producer: 'Fixture: aggregation'},
];
export const SAMPLE_ROWS = [
  {customer_id: 101, orders: 4, revenue: 2310},
  {customer_id: 102, orders: 4, revenue: 1545},
];
export function fixtureKey(block: RootBlock): string {return `mosaic:v2:${block.type === 'markdown' ? 'markdown' : 'code'}:${block.id}`;}
export function fixtureSource(notebook: RootNotebook, block: RootBlock): string {return String(notebook.blockState[fixtureKey(block)] ?? '');}
function block(id: string, title: string, kernel?: 'sql' | 'python', role: RootBlock['role'] = 'code'): RootBlock {
  const type = kernel ?? 'markdown';
  return {id, title, type, kernel, role: kernel ? role : 'note', notebook: {source: 'ipynb', cellId: id, cellType: kernel ? 'code' : 'markdown', originalIndex: 0}};
}
function document(id: string, title: string, cells: Array<{block: RootBlock; source: string}>): RootNotebook {
  const blocks = cells.map(c => c.block);
  return {schemaVersion: 1, id, title, blocks, info: null, blockState: Object.fromEntries(cells.map(c => [fixtureKey(c.block), c.source])),
    executions: {}, executedSource: {}, presentation: 'fabric', skin: 'fabric',
    views: [
      {id: 'notebook', label: 'Notebook', description: 'Semantic source order', blockIds: blocks.map(b => b.id), layout: blocks.map((b, i) => ({i: b.id, x: 0, y: i * 12, w: 12, h: 12}))},
      {id: 'free', label: 'Free canvas', description: 'Geometry only, no execution-order change', blockIds: blocks.map(b => b.id), layout: blocks.map((b, i) => ({i: b.id, x: i % 2 * 6, y: Math.floor(i / 2) * 14, w: 6, h: 13, minW: 4, minH: 8}))},
    ],
  };
}
export function makeNotebookFixture(): RootNotebook {
  const output: RootBlock = {id: 'out-revenue', type: 'notebook-output', title: 'Example result shape', role: 'result', notebook: {source: 'ipynb', cellId: 'out-revenue', parentCellId: 'revenue', cellType: 'output', originalIndex: 2}};
  return document('m1-explore', 'Explore customer revenue', [
    {block: block('intro', 'A small lakehouse, a complete story'), source: '# Customer revenue\n\nStart with orders, keep valid transactions, and summarize revenue by customer.\n\nThis is a UI fixture: edit freely. The example output below is not an execution result.'},
    {block: block('revenue', '01 / Aggregate valid orders', 'sql'), source: '-- Revenue by customer\nSELECT\n    customer_id,\n    COUNT(*) AS orders,\n    ROUND(SUM(net_amount), 2) AS revenue\nFROM source.orders\nWHERE net_amount > 0\nGROUP BY customer_id\nORDER BY revenue DESC;'},
    {block: output, source: ''},
    {block: block('python', '02 / Inspect with Python', 'python'), source: '# Runs only with the trusted-local Python runtime enabled\nrows = query("SELECT * FROM source.orders")\nvalid_orders = [row for row in rows if row["net_amount"] > 0]\n\ndisplay(valid_orders[:5])'},
  ]);
}
function spec(id: string, language: 'sql' | 'python', title: string, prompt: string, starter: string): ExerciseDefinition {
  return {
    schema_version: 1, id, version: 'ui-fixture-1', title, difficulty: 'easy', topics: [language === 'sql' ? 'aggregation' : 'deduplication', 'data quality'], tags: ['UI fixture'], origin: 'internal-demo', language,
    runtime: language === 'sql' ? 'Local SQL runtime (not connected)' : 'Trusted-local Python (not connected)', prompt,
    sections: [{title: 'Your task', body: language === 'sql' ? 'Keep only orders where net_amount is greater than zero. Return customer_id, orders and revenue. Sort by revenue descending.' : 'Return a new list containing only the first occurrence of each order_id. Preserve input order and do not mutate the input.'},
      {title: 'Expected shape', body: language === 'sql' ? 'customer_id (integer), orders (integer), revenue (number)' : 'A list of order dictionaries; one dictionary per order_id.'}],
    starter_source: starter, fixtures: [{id: 'orders-ui', version: '1'}], visible_checks: language === 'sql' ? [{id: 'positive-only', description: 'Ignore zero and negative amounts.'}] : [{id: 'first-occurrence', description: 'Keep the first full row for each order_id in input order.'}], hidden_check_refs: [], edge_check_refs: [],
    hints: [language === 'sql' ? 'Filter before aggregating. Use WHERE, GROUP BY, then ORDER BY.' : 'Track seen identifiers in a set. Append a row only when its identifier is new.'],
    solution: {available: false, reveal: 'explicit'}, explanation: 'This preview has no validator and never awards a passed status.', follow_ups: ['What changes when duplicate orders arrive?'],
    canonical_placement: {domain: 'analytics', topic: 'aggregation'}, related_associations: [], validator_version: 'not-installed-ui-preview',
    validation: {kind: 'rows', ordered: true, duplicate_sensitive: true, relative_tolerance: 0, absolute_tolerance: 0},
    data_context: [{name: 'source.orders', columns: {order_id: 'INTEGER', customer_id: 'INTEGER', net_amount: 'DECIMAL'}, sample_rows: [{order_id: 1, customer_id: 101, net_amount: 125.5}, {order_id: 2, customer_id: 101, net_amount: 0}, {order_id: 3, customer_id: 102, net_amount: 89}]}],
  };
}
export const PREVIEW_EXERCISES = [
  spec('ui-revenue', 'sql', 'Revenue by customer', 'Build a customer revenue summary from order transactions. Invalid amounts must not affect your totals.', '-- Write your solution here\nSELECT\n    customer_id,\n    COUNT(*) AS orders,\n    SUM(net_amount) AS revenue\nFROM source.orders\n-- Filter, group, and sort below\n'),
  spec('ui-deduplicate', 'python', 'Keep the first order', 'An ingestion feed can deliver an order more than once. Keep the first occurrence of each order_id.', 'def solve(rows):\n    """Return the first row for each order_id, in input order."""\n    result = []\n    # Track identifiers already seen\n    return result\n'),
];
export function makeExerciseFixture(exercise: ExerciseDefinition): RootNotebook {
  const answer = {...block('answer', 'Your solution', exercise.language as 'sql' | 'python'), exerciseId: exercise.id};
  const doc = document(`exercise-${exercise.id}-${exercise.version}`, exercise.title, [{block: answer, source: exercise.starter_source}]);
  const panels: RootBlock[] = [
    {id: 'problem', type: 'markdown', title: exercise.title, role: 'problem'},
    {id: 'guidance', type: 'markdown', title: 'Hints and context', role: 'exercise-help'},
    {id: 'exercise-browser', type: 'markdown', title: 'Problem browser', role: 'exercise-browser'},
    {id: 'answer-output', type: 'notebook-output', title: 'Result evidence', role: 'result', notebook: {source: 'ipynb', cellId: 'answer-output', parentCellId: 'answer', cellType: 'output', originalIndex: 0}},
  ];
  return {...doc, exercise: {id: exercise.id, version: exercise.version}, presentation: 'leetcode', blocks: [...doc.blocks, ...panels],
    views: [...doc.views.map(v => ({...v, blockIds: [...v.blockIds, 'answer-output'], layout: [...v.layout, {i: 'answer-output', x: 0, y: 15, w: 12, h: 8}]})),
      {id: 'leetcode', label: 'Arena', description: 'Shared exercise source', blockIds: ['problem', 'answer', 'answer-output', 'guidance', 'exercise-browser'], layout: []}],
  };
}
/** Strictly bounded fixture restore. Does not claim to replace the real project importer. */
export function readFixtureDocuments(text: string): Record<string, RootNotebook> {
  const docs: unknown = safeJson(text, 8_000_000);
  if (!docs || typeof docs !== 'object' || Array.isArray(docs)) throw new Error('Invalid preview backup');
  const entries = Object.entries(docs);
  if (entries.length > 10) throw new Error('Too many preview notebooks');
  const result: Record<string, RootNotebook> = Object.create(null);
  for (const [id, value] of entries) {
    const n = value as RootNotebook;
    if (!n || n.schemaVersion !== 1 || n.id !== id || typeof n.title !== 'string' || !Array.isArray(n.blocks) || !Array.isArray(n.views) || n.blocks.length > 300 || !n.blockState || typeof n.blockState !== 'object' || Array.isArray(n.blockState)) throw new Error('Invalid preview notebook');
    if (n.blocks.some(b => !b || typeof b.id !== 'string' || typeof b.title !== 'string' || !['sql', 'python', 'polars', 'markdown', 'notebook-output'].includes(b.type)) || new Set(n.blocks.map(b => b.id)).size !== n.blocks.length) throw new Error('Invalid block identity');
    if (n.views.some(v => !v || typeof v.id !== 'string' || !Array.isArray(v.blockIds) || v.blockIds.some(id => typeof id !== 'string') || !Array.isArray(v.layout) || v.layout.some(i => !i || typeof i.i !== 'string' || ![i.x, i.y, i.w, i.h].every(Number.isFinite) || i.x < 0 || i.y < 0 || i.y > 10000 || i.w < 1 || i.w > 12 || i.h < 1 || i.h > 100 || i.x + i.w > 12))) throw new Error('Invalid layout');
    if (n.blocks.some(b => typeof n.blockState[fixtureKey(b)] !== 'undefined' && typeof n.blockState[fixtureKey(b)] !== 'string')) throw new Error('Invalid source value');
    // Saved browser data is never accepted as authentic execution evidence.
    result[id] = {...n, executions: {}, executedSource: {}, outputCheckpoints: {}, clearedOutputs: []};
  }
  return result;
}
