import type { CaseStudy, DataWorkspace, FakeTable, NotebookCell, NotebookDocument, WorkspaceEvent, WorkspaceTable } from '../types/app';

export interface DataExecutionResult {
  workspace: DataWorkspace;
  output: string;
  rows: Record<string, unknown>[];
  columns: string[];
  touchedTables: string[];
}

type Row = Record<string, unknown>;
type Frame = { rows: Row[]; sources: string[] };

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const tableKey = (schema: string, name: string) => `${schema}.${name}`;
const nowIso = () => new Date().toISOString();

function inferType(values: unknown[]): string {
  const sample = values.find((value) => value !== null && value !== undefined);
  if (sample === undefined) return 'VARCHAR';
  if (typeof sample === 'boolean') return 'BOOLEAN';
  if (typeof sample === 'number') return Number.isInteger(sample) ? 'INTEGER' : 'DOUBLE';
  if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) return sample.includes('T') || sample.includes(' ') ? 'TIMESTAMP' : 'DATE';
  return 'VARCHAR';
}

function inferColumns(rows: Row[]): WorkspaceTable['columns'] {
  const names = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return names.map((name) => ({ name, type: inferType(rows.map((row) => row[name])), description: 'Created by the local learning runtime.' }));
}

function event(action: WorkspaceEvent['action'], object: string, details: string, snapshot: number): WorkspaceEvent {
  return { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: nowIso(), action, object, details, snapshot };
}

function toWorkspaceTable(table: FakeTable, index: number): WorkspaceTable {
  return {
    ...deepClone(table),
    version: 1,
    updatedAt: nowIso(),
    runtimeSource: index === 0 ? 'Case-study seed' : 'Case-study seed',
  };
}

export function seedWorkspace(caseStudy: CaseStudy): DataWorkspace {
  const tables = caseStudy.tables.map(toWorkspaceTable);
  const createdAt = nowIso();
  return {
    caseStudyId: caseStudy.id,
    snapshot: 1,
    tables,
    history: [event('seed', caseStudy.id, `Seeded ${caseStudy.tables.length} training tables.`, 1)],
    lineage: [],
    checkpoints: [{ id: 'baseline', label: 'Case-study baseline', createdAt, snapshot: 1, tables: deepClone(tables) }],
  };
}

export function seedNotebook(caseStudy: CaseStudy): NotebookDocument {
  const learningCells = caseStudy.notebook.map((cell) => migrateNotebookCell(caseStudy.id, cell));
  return {
    id: `nb-${caseStudy.id}`,
    name: `NB_${caseStudy.id.replaceAll('-', '_')}`,
    cells: learningCells,
    updatedAt: nowIso(),
  };
}

function migrateNotebookCell(caseStudyId: string, cell: NotebookCell): NotebookCell {
  if (cell.language !== 'python') return { ...cell };
  if (caseStudyId === 'retail-medallion') {
    return {
      ...cell,
      source: `# pandas-style learning runtime\nbronze = table("bronze.sales_raw")\nclean = bronze.drop_duplicates(["sale_id"])\nclean = clean.filter("qty > 0 AND unit_price >= 0")\nclean["net_sales"] = clean["qty"] * clean["unit_price"]\nclean["sale_date"] = to_date(clean["sale_ts"])\nwrite_table("silver.sales_clean", clean, layer="silver")\ndisplay(clean)`,
      output: undefined,
    };
  }
  if (caseStudyId === 'turbine-realtime') {
    return {
      ...cell,
      source: `# lightweight pandas-style feature engineering\nevents = table("iot.turbine_events")\nfeatures = events.copy()\nfeatures["temperature_delta"] = features["gearbox_temp_c"] - 65\nfeatures["risk_score"] = risk_score(features["vibration_mm_s"], features["temperature_delta"])\nwrite_table("silver.turbine_features", features, layer="silver", mode="append")\ndisplay(features)`,
      output: undefined,
    };
  }
  if (caseStudyId === 'erp-incremental') {
    return {
      ...cell,
      source: `# incremental training transform\norders = table("erp.sales_order")\nchanged = orders.filter("modified_ts >= '2026-09-16'")\nwrite_table("silver.erp_sales_changed", changed, layer="silver")\ndisplay(changed)`,
      output: undefined,
    };
  }
  return { ...cell, source: '# Use table("schema.table") and write_table("schema.table", dataframe)\n' + cell.source, output: undefined };
}

export function runDataflowGen2Publish(workspace: DataWorkspace, sourceQualifiedName: string, steps: string[]): DataExecutionResult {
  const source = findWorkspaceTable(workspace, sourceQualifiedName);
  if (!source) throw new Error(`Dataflow source not found: ${sourceQualifiedName}`);
  const selectedColumns = source.columns.slice(0, Math.min(6, source.columns.length)).map((column) => column.name);
  let rows: Row[] = source.rows.map((row) => ({ ...row }));
  if (steps.includes('Removed Errors')) rows = rows.filter((row) => Object.values(row).every((value) => value !== undefined));
  if (steps.includes('Selected Columns')) rows = rows.map((row) => Object.fromEntries(selectedColumns.map((name) => [name, row[name]])));
  const target = `silver.df_${source.name.replace(/[^A-Za-z0-9_]/g, '_')}`;
  const next = upsertWorkspaceTable(workspace, target, rows, {
    layer: 'silver',
    source: 'Fabric Dataflow Gen2',
    sources: [`${source.schema}.${source.name}`],
    actor: 'Dataflow Gen2',
    operation: `Power Query steps: ${steps.join(' → ')}`,
  });
  const table = findWorkspaceTable(next, target);
  return { workspace: next, output: `Published ${target}: ${rows.length} row(s).`, rows: table?.rows ?? rows, columns: table?.columns.map((column) => column.name) ?? selectedColumns, touchedTables: [target] };
}

export function findWorkspaceTable(workspace: DataWorkspace, qualifiedName: string): WorkspaceTable | undefined {
  const normalized = qualifiedName.trim().replace(/[\[\]`]/g, '').toLowerCase();
  const parts = normalized.split('.').filter(Boolean);
  const schemaTable = parts.length >= 2 ? parts.slice(-2).join('.') : normalized;
  const tableOnly = parts.at(-1) ?? normalized;
  return workspace.tables.find((table) => {
    const key = tableKey(table.schema, table.name).toLowerCase();
    return key === normalized || key === schemaTable || table.name.toLowerCase() === tableOnly;
  });
}

export function upsertWorkspaceTable(workspace: DataWorkspace, qualifiedName: string, rows: Row[], options: { layer?: WorkspaceTable['layer']; mode?: 'overwrite' | 'append'; source?: string; sources?: string[]; actor?: string; operation?: string } = {}): DataWorkspace {
  const next = deepClone(workspace);
  const parts = qualifiedName.replace(/[\[\]`]/g, '').split('.').filter(Boolean);
  const objectParts = parts.length >= 3 ? parts.slice(-2) : parts;
  const schema = objectParts.length > 1 ? objectParts.slice(0, -1).join('.') : 'main';
  const name = objectParts.at(-1) || 'table';
  const existingIndex = next.tables.findIndex((table) => tableKey(table.schema, table.name).toLowerCase() === `${schema}.${name}`.toLowerCase());
  const existing = existingIndex >= 0 ? next.tables[existingIndex] : undefined;
  const mode = options.mode ?? 'overwrite';
  const combinedRows = mode === 'append' && existing ? [...existing.rows, ...deepClone(rows)] : deepClone(rows);
  const snapshot = next.snapshot + 1;
  const updated: WorkspaceTable = {
    schema,
    name,
    layer: options.layer ?? existing?.layer ?? inferLayer(schema),
    primaryKey: existing?.primaryKey,
    foreignKeys: existing?.foreignKeys,
    columns: inferColumns(combinedRows),
    rows: combinedRows as WorkspaceTable['rows'],
    version: (existing?.version ?? 0) + 1,
    updatedAt: nowIso(),
    runtimeSource: options.source ?? 'Notebook / SQL runtime',
  };
  if (existingIndex >= 0) next.tables[existingIndex] = updated;
  else next.tables.push(updated);
  next.snapshot = snapshot;
  next.history.unshift(event(existing ? 'update' : 'create', `${schema}.${name}`, `${mode === 'append' ? 'Appended to' : 'Wrote'} ${schema}.${name}: ${rows.length} row(s).`, snapshot));
  const target = `${schema}.${name}`;
  const sources = Array.from(new Set((options.sources ?? []).map((value) => value.replace(/[\[\]`]/g, '')).filter((value) => value && value.toLowerCase() !== target.toLowerCase())));
  const timestamp = nowIso();
  const newEdges = sources.map((from, index) => ({
    id: `lin-${snapshot}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    from, to: target,
    operation: options.operation ?? (mode === 'append' ? 'append' : 'transform'),
    actor: options.actor ?? options.source ?? 'Learning runtime',
    snapshot, timestamp,
  }));
  next.lineage = [...newEdges, ...(next.lineage ?? [])].slice(0, 300);
  next.checkpoints = next.checkpoints ?? [];
  return next;
}

function inferLayer(schema: string): WorkspaceTable['layer'] {
  const s = schema.toLowerCase();
  if (s.includes('bronze')) return 'bronze';
  if (s.includes('silver')) return 'silver';
  if (s.includes('gold')) return 'gold';
  if (s.includes('dw') || s.includes('warehouse') || s.includes('ops') || s.includes('control')) return 'warehouse';
  if (s.includes('iot') || s.includes('stream')) return 'stream';
  return 'source';
}

function valueFromToken(token: string, row: Row): unknown {
  const trimmed = token.trim();
  const typedLiteral = trimmed.match(/^(?:TIMESTAMP|DATE)\s+['"]([^'"]+)['"]$/i);
  if (typedLiteral) return typedLiteral[1];
  if (/^'.*'$/.test(trimmed) || /^".*"$/.test(trimmed)) return trimmed.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  const cleaned = trimmed.replace(/[\[\]`]/g, '');
  if (cleaned in row) return row[cleaned];
  const key = cleaned.split('.').at(-1) ?? cleaned;
  return row[key];
}

function compare(left: unknown, operator: string, right: unknown): boolean {
  const l = left as any; const r = right as any;
  switch (operator) {
    case '=': case '==': return l == r;
    case '!=': case '<>': return l != r;
    case '>': return l > r;
    case '>=': return l >= r;
    case '<': return l < r;
    case '<=': return l <= r;
    default: return false;
  }
}

function rowMatches(row: Row, expression: string): boolean {
  const clauses = expression.split(/\s+AND\s+/i).map((part) => part.trim()).filter(Boolean);
  return clauses.every((clause) => {
    const isNull = clause.match(/^([\w.\[\]`]+)\s+IS\s+(NOT\s+)?NULL$/i);
    if (isNull) {
      const value = valueFromToken(isNull[1], row);
      return isNull[2] ? value !== null && value !== undefined : value === null || value === undefined;
    }
    const match = clause.match(/^(.+?)\s*(>=|<=|<>|!=|==|=|>|<)\s*(.+)$/);
    if (!match) return true;
    return compare(valueFromToken(match[1], row), match[2], valueFromToken(match[3], row));
  });
}

function parseSelect(sql: string, workspace: DataWorkspace): { rows: Row[]; columns: string[] } {
  const cleaned = sql.trim().replace(/;$/, '');
  const match = cleaned.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([\w.\[\]`]+)(?:\s+(?:AS\s+)?((?!(?:LEFT|INNER|JOIN|WHERE|GROUP|ORDER|LIMIT)\b)[A-Za-z_]\w*))?([\s\S]*)$/i);
  if (!match) throw new Error('Training SQL supports SELECT ... FROM ... queries.');
  const selectPart = match[1].trim();
  const sourceName = match[2].replace(/[\[\]`]/g, '');
  const sourceAlias = match[3] || sourceName.split('.').at(-1) || sourceName;
  let tail = match[4] ?? '';
  const source = findWorkspaceTable(workspace, sourceName);
  if (!source) throw new Error(`Table ${sourceName} was not found in the learning workspace.`);
  const hasJoin = /\bJOIN\b/i.test(tail);
  const qualify = (row: Row, alias: string, qualifiedName: string): Row => {
    const out: Row = { ...row };
    const tableName = qualifiedName.split('.').at(-1) || qualifiedName;
    for (const [key, value] of Object.entries(row)) {
      out[`${alias}.${key}`] = value;
      out[`${tableName}.${key}`] = value;
    }
    return out;
  };
  let rows: Row[] = hasJoin ? (deepClone(source.rows) as Row[]).map((row) => qualify(row, sourceAlias, sourceName)) : deepClone(source.rows) as Row[];

  if (hasJoin) {
    let remainder = tail;
    while (/^\s*(?:(?:LEFT|INNER)\s+)?JOIN\b/i.test(remainder)) {
      const join = remainder.match(/^\s*(?:(LEFT|INNER)\s+)?JOIN\s+([\w.\[\]`]+)(?:\s+(?:AS\s+)?((?!(?:LEFT|INNER|JOIN|WHERE|GROUP|ORDER|LIMIT|ON)\b)[A-Za-z_]\w*))?\s+ON\s+([\w.\[\]`]+)\s*=\s*([\w.\[\]`]+)([\s\S]*)$/i);
      if (!join) throw new Error('Training SQL JOIN supports INNER/LEFT JOIN ... ON left_column = right_column.');
      const joinType = (join[1] || 'INNER').toUpperCase();
      const rightName = join[2].replace(/[\[\]`]/g, '');
      const rightAlias = join[3] || rightName.split('.').at(-1) || rightName;
      const leftToken = join[4].replace(/[\[\]`]/g, '');
      const rightToken = join[5].replace(/[\[\]`]/g, '');
      const rightTable = findWorkspaceTable(workspace, rightName);
      if (!rightTable) throw new Error(`Table ${rightName} was not found in the learning workspace.`);
      const rightRows = (deepClone(rightTable.rows) as Row[]).map((row) => qualify(row, rightAlias, rightName));
      const joined: Row[] = [];
      for (const leftRow of rows) {
        const matches = rightRows.filter((rightRow) => valueFromToken(leftToken, leftRow) == valueFromToken(rightToken, rightRow));
        if (!matches.length && joinType === 'LEFT') { joined.push({ ...leftRow }); continue; }
        for (const rightRow of matches) {
          const merged: Row = { ...leftRow };
          for (const [key, value] of Object.entries(rightRow)) if (!(key in merged) || key.includes('.')) merged[key] = value;
          joined.push(merged);
        }
      }
      rows = joined;
      remainder = join[6] ?? '';
    }
    tail = remainder;
  }

  const where = tail.match(/\bWHERE\s+([\s\S]*?)(?=\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|$)/i)?.[1]?.trim();
  const groupBy = tail.match(/\bGROUP\s+BY\s+([\s\S]*?)(?=\bORDER\s+BY\b|\bLIMIT\b|$)/i)?.[1]?.trim();
  const orderBy = tail.match(/\bORDER\s+BY\s+([\s\S]*?)(?=\bLIMIT\b|$)/i)?.[1]?.trim();
  const limit = Number(tail.match(/\bLIMIT\s+(\d+)/i)?.[1] ?? 0);
  if (where) rows = rows.filter((row) => rowMatches(row, where));

  const expressions = selectPart === '*' ? ['*'] : splitComma(selectPart);
  const aggregate = expressions.some((expr) => /^(SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(expr.trim()));
  let projected: Row[];
  if (aggregate || groupBy) {
    const keys = groupBy ? splitComma(groupBy).map((key) => key.replace(/[\[\]`]/g, '').split('.').at(-1) || key) : [];
    const groups = new Map<string, Row[]>();
    for (const row of rows) {
      const key = JSON.stringify(keys.map((name) => row[name]));
      const bucket = groups.get(key) ?? [];
      bucket.push(row); groups.set(key, bucket);
    }
    if (!groups.size) groups.set('[]', []);
    projected = Array.from(groups.values()).map((bucket) => projectAggregateRow(bucket, expressions, keys));
  } else if (expressions[0] === '*') projected = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !key.includes('.'))));
  else projected = rows.map((row) => projectRow(row, expressions));

  if (orderBy) {
    const [rawKey, rawDir] = orderBy.split(/\s+/);
    const key = rawKey.replace(/[\[\]`]/g, '').split('.').at(-1) || rawKey;
    const direction = rawDir?.toUpperCase() === 'DESC' ? -1 : 1;
    projected.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true }) * direction);
  }
  if (limit > 0) projected = projected.slice(0, limit);
  return { rows: projected, columns: projected.length ? Object.keys(projected[0]) : expressions.map(aliasForExpression) };
}

function splitComma(input: string): string[] {
  const result: string[] = []; let current = ''; let depth = 0;
  for (const char of input) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function aliasForExpression(expression: string): string {
  const alias = expression.match(/\s+AS\s+([\w_]+)/i)?.[1];
  if (alias) return alias;
  return expression.replace(/[\[\]`]/g, '').split('.').at(-1)?.trim() || expression.trim();
}

function projectRow(row: Row, expressions: string[]): Row {
  const out: Row = {};
  for (const expression of expressions) {
    const alias = aliasForExpression(expression);
    const base = expression.replace(/\s+AS\s+[\w_]+$/i, '').trim();
    out[alias] = valueFromToken(base, row);
  }
  return out;
}

function projectAggregateRow(rows: Row[], expressions: string[], keys: string[]): Row {
  const first = rows[0] ?? {};
  const out: Row = {};
  for (const expression of expressions) {
    const alias = aliasForExpression(expression);
    const base = expression.replace(/\s+AS\s+[\w_]+$/i, '').trim();
    const agg = base.match(/^(SUM|COUNT|AVG|MIN|MAX)\s*\(([^)]+)\)$/i);
    if (!agg) { out[alias] = valueFromToken(base, first); continue; }
    const fn = agg[1].toUpperCase();
    const column = agg[2].trim().replace(/[\[\]`]/g, '').split('.').at(-1) || agg[2].trim();
    const values = column === '*' ? rows.map(() => 1) : rows.map((row) => Number(row[column] ?? 0));
    if (fn === 'COUNT') out[alias] = rows.length;
    if (fn === 'SUM') out[alias] = values.reduce((sum, value) => sum + value, 0);
    if (fn === 'AVG') out[alias] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    if (fn === 'MIN') out[alias] = values.length ? Math.min(...values) : null;
    if (fn === 'MAX') out[alias] = values.length ? Math.max(...values) : null;
  }
  for (const key of keys) if (!(key in out)) out[key] = first[key];
  return out;
}

export function extractSqlSourceNames(sql: string): string[] {
  const sources: string[] = [];
  for (const match of sql.matchAll(/\b(?:FROM|JOIN)\s+([\w.\[\]`]+)/gi)) {
    const name = match[1].replace(/[\[\]`]/g, '');
    if (name && !sources.some((value) => value.toLowerCase() === name.toLowerCase())) sources.push(name);
  }
  return sources;
}

export interface WorkspaceExecutionContext { actor?: string; operation?: string }

export function executeWorkspaceSql(workspace: DataWorkspace, sql: string, context: WorkspaceExecutionContext = {}): DataExecutionResult {
  const statement = sql.trim();
  if (!statement) return { workspace, output: 'No SQL to execute.', rows: [], columns: [], touchedTables: [] };
  const ctas = statement.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+([\w.\[\]`]+)\s+AS\s+([\s\S]+)$/i);
  if (ctas) {
    const tableName = ctas[1].replace(/[\[\]`]/g, '');
    const result = parseSelect(ctas[2], workspace);
    const next = upsertWorkspaceTable(workspace, tableName, result.rows, { source: context.actor ?? 'SQL CTAS', sources: extractSqlSourceNames(ctas[2]), actor: context.actor ?? 'SQL', operation: context.operation ?? 'CTAS' });
    return { workspace: next, output: `Created ${tableName} with ${result.rows.length} row(s). Snapshot ${next.snapshot}.`, rows: result.rows, columns: result.columns, touchedTables: [tableName] };
  }
  const insert = statement.match(/^INSERT\s+INTO\s+([\w.\[\]`]+)\s+([\s\S]*SELECT[\s\S]+)$/i);
  if (insert) {
    const tableName = insert[1].replace(/[\[\]`]/g, '');
    const result = parseSelect(insert[2], workspace);
    const next = upsertWorkspaceTable(workspace, tableName, result.rows, { mode: 'append', source: context.actor ?? 'SQL INSERT SELECT', sources: extractSqlSourceNames(insert[2]), actor: context.actor ?? 'SQL', operation: context.operation ?? 'INSERT SELECT' });
    return { workspace: next, output: `Inserted ${result.rows.length} row(s) into ${tableName}. Snapshot ${next.snapshot}.`, rows: result.rows, columns: result.columns, touchedTables: [tableName] };
  }
  const select = parseSelect(statement, workspace);
  return { workspace, output: `${select.rows.length} row(s) returned.`, rows: select.rows, columns: select.columns, touchedTables: [] };
}

function cloneFrame(frame: Frame): Frame { return { rows: deepClone(frame.rows), sources: [...frame.sources] }; }

function parseList(input: string): string[] {
  return Array.from(input.matchAll(/["']([^"']+)["']/g)).map((match) => match[1]);
}

function parsePythonDict(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of input.matchAll(/["']([^"']+)["']\s*:\s*["']([^"']*)["']/g)) result[match[1]] = match[2];
  return result;
}

function aggregateRows(rows: Row[], groupColumn: string, aggregations: Record<string, string>): Row[] {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = JSON.stringify(row[groupColumn]);
    const bucket = groups.get(key) ?? []; bucket.push(row); groups.set(key, bucket);
  }
  return Array.from(groups.values()).map((bucket) => {
    const output: Row = { [groupColumn]: bucket[0]?.[groupColumn] };
    for (const [column, operationRaw] of Object.entries(aggregations)) {
      const operation = operationRaw.toLowerCase();
      const values = bucket.map((row) => Number(row[column] ?? 0));
      if (operation === 'sum') output[column] = values.reduce((a, b) => a + b, 0);
      else if (operation === 'mean' || operation === 'avg') output[column] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      else if (operation === 'max') output[column] = values.length ? Math.max(...values) : null;
      else if (operation === 'min') output[column] = values.length ? Math.min(...values) : null;
      else if (operation === 'count') output[column] = bucket.length;
      else output[column] = bucket[0]?.[column];
    }
    return output;
  });
}

function evaluateSeriesExpression(expression: string, row: Row): unknown {
  const toDate = expression.match(/^to_date\((\w+)\[["']([^"']+)["']\]\)$/);
  if (toDate) return String(row[toDate[2]] ?? '').slice(0, 10);
  const binary = expression.match(/^(\w+)\[["']([^"']+)["']\]\s*([+\-*/])\s*(?:(\w+)\[["']([^"']+)["']\]|(-?\d+(?:\.\d+)?))$/);
  if (binary) {
    const left = Number(row[binary[2]] ?? 0);
    const right = binary[5] ? Number(row[binary[5]] ?? 0) : Number(binary[6] ?? 0);
    if (binary[3] === '+') return left + right;
    if (binary[3] === '-') return left - right;
    if (binary[3] === '*') return left * right;
    if (binary[3] === '/') return right === 0 ? null : left / right;
  }
  return expression;
}

export function executePythonLearning(workspace: DataWorkspace, source: string): DataExecutionResult {
  const frames = new Map<string, Frame>();
  let next = deepClone(workspace);
  const messages: string[] = [];
  const touched = new Set<string>();
  let preview: Row[] = [];

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    let match = line.match(/^(\w+)\s*=\s*table\(["']([^"']+)["']\)$/);
    if (match) {
      const table = findWorkspaceTable(next, match[2]);
      if (!table) throw new Error(`table(): ${match[2]} was not found.`);
      frames.set(match[1], { rows: deepClone(table.rows) as Row[], sources: [`${table.schema}.${table.name}`] });
      messages.push(`${match[1]} ← ${match[2]} (${table.rows.length} rows)`);
      continue;
    }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.copy\(\)$/);
    if (match) { const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`); frames.set(match[1], cloneFrame(frame)); continue; }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.drop_duplicates\((.+)\)$/);
    if (match) {
      const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`);
      const columns = parseList(match[3]); const seen = new Set<string>();
      frames.set(match[1], { rows: frame.rows.filter((row) => { const key = JSON.stringify(columns.map((column) => row[column])); if (seen.has(key)) return false; seen.add(key); return true; }), sources: [...frame.sources] });
      continue;
    }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.dropna\(\)$/);
    if (match) { const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`); frames.set(match[1], { rows: frame.rows.filter((row) => Object.values(row).every((value) => value !== null && value !== undefined && value !== '')), sources: [...frame.sources] }); continue; }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.rename\(columns\s*=\s*(\{.*\})\)$/);
    if (match) {
      const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`);
      const mapping = parsePythonDict(match[3]);
      frames.set(match[1], { rows: frame.rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [mapping[key] ?? key, value]))), sources: [...frame.sources] });
      continue;
    }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.fillna\((\{.*\})\)$/);
    if (match) {
      const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`);
      const mapping = parsePythonDict(match[3]);
      frames.set(match[1], { rows: frame.rows.map((row) => { const nextRow = { ...row }; for (const [column, value] of Object.entries(mapping)) if (nextRow[column] === null || nextRow[column] === undefined || nextRow[column] === '') nextRow[column] = value; return nextRow; }), sources: [...frame.sources] });
      continue;
    }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.merge\((\w+)\s*,\s*on\s*=\s*["']([^"']+)["'](?:\s*,\s*how\s*=\s*["']([^"']+)["'])?\)$/);
    if (match) {
      const left = frames.get(match[2]); const right = frames.get(match[3]); if (!left || !right) throw new Error('merge(): both dataframes must be defined.');
      const key = match[4]; const how = (match[5] ?? 'inner').toLowerCase(); const rightIndex = new Map<string, Row[]>();
      for (const row of right.rows) { const bucket = rightIndex.get(JSON.stringify(row[key])) ?? []; bucket.push(row); rightIndex.set(JSON.stringify(row[key]), bucket); }
      const rows: Row[] = [];
      for (const leftRow of left.rows) { const matches = rightIndex.get(JSON.stringify(leftRow[key])) ?? []; if (matches.length) for (const rightRow of matches) rows.push({ ...rightRow, ...leftRow }); else if (how === 'left') rows.push({ ...leftRow }); }
      frames.set(match[1], { rows, sources: Array.from(new Set([...left.sources, ...right.sources])) });
      continue;
    }
    match = line.match(/^(\w+)\s*=\s*(\w+)\[\[(.+)\]\]$/);
    if (match) { const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`); const columns = parseList(match[3]); frames.set(match[1], { rows: frame.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column]]))), sources: [...frame.sources] }); continue; }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.groupby\(["']([^"']+)["']\)\.agg\((\{.*\})\)$/);
    if (match) { const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`); const aggregations = parsePythonDict(match[4]); frames.set(match[1], { rows: aggregateRows(frame.rows, match[3], aggregations), sources: [...frame.sources] }); continue; }
    match = line.match(/^(\w+)\s*=\s*(\w+)\.filter\(["'](.+)["']\)$/);
    if (match) { const targetName = match[1]; const sourceName = match[2]; const condition = match[3]; const frame = frames.get(sourceName); if (!frame) throw new Error(`${sourceName} is not defined.`); frames.set(targetName, { rows: frame.rows.filter((row) => rowMatches(row, condition)), sources: [...frame.sources] }); continue; }
    match = line.match(/^(\w+)\[["']([^"']+)["']\]\s*=\s*(.+)$/);
    if (match) {
      const frame = frames.get(match[1]); if (!frame) throw new Error(`${match[1]} is not defined.`);
      const column = match[2]; const expression = match[3].trim();
      if (/^risk_score\(/.test(expression)) {
        frame.rows = frame.rows.map((row) => {
          const vibration = Number(row.vibration_mm_s ?? 0); const delta = Number(row.temperature_delta ?? 0);
          return { ...row, [column]: Math.min(1, Math.abs(vibration - 3) / 8 + Math.max(0, delta) / 40) };
        });
      } else frame.rows = frame.rows.map((row) => ({ ...row, [column]: evaluateSeriesExpression(expression, row) }));
      continue;
    }
    match = line.match(/^write_table\(["']([^"']+)["']\s*,\s*(\w+)([\s\S]*)\)$/);
    if (match) {
      const frame = frames.get(match[2]); if (!frame) throw new Error(`${match[2]} is not defined.`);
      const layer = match[3].match(/layer\s*=\s*["']([^"']+)["']/)?.[1] as WorkspaceTable['layer'] | undefined;
      const mode = match[3].match(/mode\s*=\s*["']([^"']+)["']/)?.[1] as 'append' | 'overwrite' | undefined;
      next = upsertWorkspaceTable(next, match[1], frame.rows, { layer, mode, source: 'Python notebook learning runtime', sources: frame.sources, actor: 'Fabric Notebook · Python', operation: mode === 'append' ? 'append' : 'transform' });
      touched.add(match[1]); messages.push(`write_table → ${match[1]} (${frame.rows.length} rows)`); preview = frame.rows.slice(0, 20); continue;
    }
    match = line.match(/^display\((\w+)\)$/);
    if (match) { const frame = frames.get(match[1]); if (!frame) throw new Error(`${match[1]} is not defined.`); preview = frame.rows.slice(0, 20); messages.push(`display(${match[1]}) → ${frame.rows.length} rows`); continue; }
    if (/^print\(/.test(line)) { messages.push(line.replace(/^print\((.*)\)$/, '$1').replace(/^['"]|['"]$/g, '')); continue; }
    throw new Error(`Unsupported learning-Python statement: ${line}`);
  }
  return { workspace: next, output: messages.join('\n') || 'Python cell completed.', rows: preview, columns: preview.length ? Object.keys(preview[0]) : [], touchedTables: Array.from(touched) };
}

export function executeNotebookCell(workspace: DataWorkspace, cell: NotebookCell): DataExecutionResult {
  if (cell.language === 'markdown') return { workspace, output: 'Markdown cell rendered.', rows: [], columns: [], touchedTables: [] };
  if (cell.language === 'sql') return executeWorkspaceSql(workspace, cell.source);
  return executePythonLearning(workspace, cell.source);
}

export function executeNotebook(workspace: DataWorkspace, notebook: NotebookDocument): { workspace: DataWorkspace; notebook: NotebookDocument; output: string; touchedTables: string[] } {
  let nextWorkspace = workspace;
  const nextNotebook = deepClone(notebook);
  const outputs: string[] = [];
  const touched = new Set<string>();
  for (const cell of nextNotebook.cells) {
    if (cell.language === 'markdown') continue;
    const result = executeNotebookCell(nextWorkspace, cell);
    nextWorkspace = result.workspace;
    cell.output = result.output;
    outputs.push(`[${cell.language}] ${result.output}`);
    result.touchedTables.forEach((table) => touched.add(table));
  }
  nextNotebook.updatedAt = nowIso();
  return { workspace: nextWorkspace, notebook: nextNotebook, output: outputs.join('\n'), touchedTables: Array.from(touched) };
}

export function resetWorkspaceToCaseStudy(caseStudy: CaseStudy): { workspace: DataWorkspace; notebook: NotebookDocument } {
  return { workspace: seedWorkspace(caseStudy), notebook: seedNotebook(caseStudy) };
}

function executeStoredProcedureLearning(workspace: DataWorkspace, procedure: string): { workspace: DataWorkspace; message: string } {
  const normalized = procedure.toLowerCase();
  if (normalized.includes('usp_merge_fact_sales')) {
    const staging = findWorkspaceTable(workspace, 'staging.sales_ready') ?? findWorkspaceTable(workspace, 'silver.sales_clean');
    if (!staging) return { workspace, message: 'Stored procedure simulated; staging.sales_ready was not available.' };
    const mapped = (staging.rows as Row[]).map((row) => {
      const customer = Number(String(row.customer_id ?? '').replace(/\D/g, '')) || 0;
      const product = Number(String(row.product_id ?? '').replace(/\D/g, '')) || 0;
      const date = String(row.sale_date ?? row.sale_ts ?? '').slice(0, 10).replaceAll('-', '');
      return { sale_key: Number(row.sale_id), customer_key: customer, product_key: product, date_key: Number(date || 0), quantity: Number(row.quantity ?? row.qty ?? 0), net_sales: Number(row.net_sales ?? 0) };
    });
    const existing = findWorkspaceTable(workspace, 'dw.fact_sales');
    const byKey = new Map((existing?.rows as Row[] ?? []).map((row) => [String(row.sale_key), row]));
    mapped.forEach((row) => byKey.set(String(row.sale_key), row));
    const next = upsertWorkspaceTable(workspace, 'dw.fact_sales', Array.from(byKey.values()), { source: `Stored procedure ${procedure}`, sources: [`${staging.schema}.${staging.name}`], actor: `Stored procedure · ${procedure}`, operation: 'MERGE fact table' });
    return { workspace: next, message: `${procedure} merged ${mapped.length} staged sale row(s) into dw.fact_sales.` };
  }
  if (normalized.includes('usp_open_maintenance_alert')) {
    const features = findWorkspaceTable(workspace, 'silver.turbine_features');
    const risky = (features?.rows as Row[] ?? []).filter((row) => Number(row.risk_score ?? 0) > 0.8).sort((a, b) => Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0));
    if (!features || !risky.length) return { workspace, message: 'No risky turbine feature row was available; no alert inserted.' };
    const alerts = findWorkspaceTable(workspace, 'ops.maintenance_alerts');
    const maxId = Math.max(7000, ...(alerts?.rows as Row[] ?? []).map((row) => Number(row.alert_id ?? 0)));
    const candidate = risky[0];
    const row = { alert_id: maxId + 1, turbine_id: candidate.turbine_id, opened_at: nowIso(), risk_score: candidate.risk_score, severity: Number(candidate.risk_score) >= 0.9 ? 'High' : 'Medium' };
    const next = upsertWorkspaceTable(workspace, 'ops.maintenance_alerts', [row], { mode: 'append', source: `Stored procedure ${procedure}`, sources: ['silver.turbine_features'], actor: `Stored procedure · ${procedure}`, operation: 'Insert operational alert' });
    return { workspace: next, message: `${procedure} inserted alert ${row.alert_id} for ${row.turbine_id}.` };
  }
  if (normalized.includes('usp_merge_customer_scd2')) {
    const changes = findWorkspaceTable(workspace, 'staging.customer_changes');
    const dimension = findWorkspaceTable(workspace, 'dw.dim_customer');
    if (!changes || !dimension) return { workspace, message: 'SCD2 procedure simulated; staging.customer_changes or dw.dim_customer was unavailable.' };
    const now = nowIso();
    const rows = deepClone(dimension.rows) as Row[];
    let nextKey = Math.max(0, ...rows.map((row) => Number(row.customer_key ?? 0))) + 1;
    let inserted = 0; let closed = 0;
    for (const change of changes.rows as Row[]) {
      const id = String(change.customer_id ?? '');
      const name = String(change.customer_name ?? '');
      if (!id || !name) continue;
      const current = rows.find((row) => String(row.customer_id) === id && Boolean(row.is_current));
      if (current && String(current.customer_name) === name) continue;
      if (current) { current.is_current = false; current.valid_to = now; closed += 1; }
      rows.push({ customer_key: nextKey++, customer_id: id, customer_name: name, valid_from: now, valid_to: null, is_current: true });
      inserted += 1;
    }
    let next = upsertWorkspaceTable(workspace, 'dw.dim_customer', rows, { source: `Stored procedure ${procedure}`, sources: ['staging.customer_changes'], actor: `Stored procedure · ${procedure}`, operation: 'SCD Type 2 merge' });
    const watermarkTable = findWorkspaceTable(next, 'control.watermarks');
    if (watermarkTable) {
      const watermarks = deepClone(watermarkTable.rows) as Row[];
      for (const watermark of watermarks) {
        const entity = String(watermark.entity_name ?? '');
        const source = findWorkspaceTable(next, `erp.${entity}`);
        const timestamps = (source?.rows as Row[] ?? []).map((row) => String(row.modified_at ?? '')).filter(Boolean).sort();
        if (timestamps.length) watermark.last_successful_ts = timestamps.at(-1)!;
      }
      next = upsertWorkspaceTable(next, 'control.watermarks', watermarks, { source: `Stored procedure ${procedure}`, sources: ['erp.sales_order', 'erp.customer'], actor: `Stored procedure · ${procedure}`, operation: 'Advance watermarks' });
    }
    return { workspace: next, message: `${procedure} closed ${closed} old dimension version(s), inserted ${inserted} current version(s), and advanced watermarks.` };
  }
  return { workspace, message: `${procedure || 'Stored procedure'} executed in infrastructure-only simulation mode.` };
}

export function executePipelineLearningData(
  workspace: DataWorkspace,
  notebook: NotebookDocument,
  nodes: import('../types/app').PipelineNode[],
  statusByNode: Map<string, import('../types/app').RunStatus>,
  edges: import('../types/app').PipelineEdge[] = [],
): { workspace: DataWorkspace; notebook: NotebookDocument; messages: string[]; statusByNode: Map<string, import('../types/app').RunStatus>; runtimeErrors: Record<string, string> } {
  let nextWorkspace = workspace;
  let nextNotebook = notebook;
  const messages: string[] = [];
  const effectiveStatus = new Map(statusByNode);
  const runtimeErrors: Record<string, string> = {};
  const dependencyMatches = (condition: import('../types/app').PipelineEdge['condition'], sourceStatus: import('../types/app').RunStatus) => {
    if (condition === 'Succeeded') return sourceStatus === 'Succeeded';
    if (condition === 'Failed') return sourceStatus === 'Failed';
    if (condition === 'Skipped') return sourceStatus === 'Skipped';
    return sourceStatus === 'Succeeded' || sourceStatus === 'Failed' || sourceStatus === 'Skipped';
  };

  for (const node of nodes) {
    const configuredStatus = statusByNode.get(node.id);
    if (configuredStatus === 'Failed' || configuredStatus === 'Skipped') continue;
    const incoming = edges.filter((edge) => edge.to === node.id);
    if (incoming.length && !incoming.every((edge) => dependencyMatches(edge.condition, effectiveStatus.get(edge.from) ?? 'Not run'))) {
      effectiveStatus.set(node.id, 'Skipped');
      messages.push(`${node.name}: skipped because a runtime dependency condition was not satisfied.`);
      continue;
    }
    if (configuredStatus !== 'Succeeded') continue;

    try {
      if (node.type === 'copy') {
        const destinationRaw = String(node.config.destination ?? '').replace(/^Lakehouse\s+/i, '').trim();
        if (!destinationRaw) continue;
        const sourceText = String(node.config.source ?? '').toLowerCase();
        const source = nextWorkspace.tables.find((table) => table.layer === 'source' && (sourceText.includes(table.name.toLowerCase().replace(/_/g, '')) || sourceText.includes(table.name.toLowerCase()) || sourceText.includes(table.schema.toLowerCase())))
          ?? nextWorkspace.tables.find((table) => table.layer === 'source' || table.layer === 'stream');
        if (!source) throw new Error('No compatible source table exists in the learning workspace.');
        nextWorkspace = upsertWorkspaceTable(nextWorkspace, destinationRaw, source.rows as Row[], {
          mode: String(node.config.writeMode ?? '').toLowerCase() === 'append' ? 'append' : 'overwrite',
          source: `Pipeline Copy: ${node.name}`, sources: [`${source.schema}.${source.name}`], actor: `Pipeline · ${node.name}`, operation: 'Copy',
        });
        messages.push(`${node.name}: ${source.schema}.${source.name} → ${destinationRaw}`);
      }
      if (node.type === 'copyJob') {
        if (nextWorkspace.caseStudyId === 'erp-incremental') {
          const watermarkTable = findWorkspaceTable(nextWorkspace, 'control.watermarks');
          const watermarks = new Map((watermarkTable?.rows ?? []).map((row) => [String(row.entity_name), String(row.last_successful_ts)]));
          let totalChanged = 0;
          for (const entity of ['sales_order', 'customer']) {
            const source = findWorkspaceTable(nextWorkspace, `erp.${entity}`);
            if (!source) continue;
            const watermark = watermarks.get(entity) ?? '';
            const changed = (source.rows as Row[]).filter((row) => !watermark || String(row.modified_at ?? '') > watermark);
            totalChanged += changed.length;
            const destination = `staging.${entity}_incremental`;
            nextWorkspace = upsertWorkspaceTable(nextWorkspace, destination, changed, { mode: 'overwrite', source: `Pipeline Copy Job: ${node.name}`, sources: [`erp.${entity}`, 'control.watermarks'], actor: `Copy Job · ${node.name}`, operation: `Incremental copy after ${watermark || 'baseline'}` });
            messages.push(`${node.name}: ${entity} watermark ${watermark || 'baseline'} → ${changed.length} changed row(s) → ${destination}`);
          }
          if (totalChanged === 0) messages.push(`${node.name}: no changed ERP rows matched the current watermarks.`);
        } else {
          const source = nextWorkspace.tables.find((table) => table.layer === 'source');
          if (!source) throw new Error('No source table is available for the Copy Job.');
          const destination = `staging.${source.name}_incremental`;
          nextWorkspace = upsertWorkspaceTable(nextWorkspace, destination, source.rows as Row[], { mode: 'overwrite', source: `Pipeline Copy Job: ${node.name}`, sources: [`${source.schema}.${source.name}`], actor: `Copy Job · ${node.name}`, operation: 'Incremental copy' });
          messages.push(`${node.name}: incremental batch → ${destination}`);
        }
      }
      if (node.type === 'dataflow') {
        const destination = String(node.config.destination ?? '').trim();
        const source = [...nextWorkspace.tables].reverse().find((table) => table.layer === 'silver' || table.layer === 'bronze');
        if (!destination || !source) throw new Error('Dataflow requires a destination and an available Silver/Bronze source.');
        nextWorkspace = upsertWorkspaceTable(nextWorkspace, destination, source.rows as Row[], { mode: 'overwrite', source: `Dataflow Gen2 simulation: ${node.name}`, sources: [`${source.schema}.${source.name}`], actor: `Dataflow Gen2 · ${node.name}`, operation: 'Transform' });
        messages.push(`${node.name}: shaped ${source.schema}.${source.name} → ${destination}`);
      }
      if (node.type === 'notebook') {
        const result = executeNotebook(nextWorkspace, nextNotebook);
        nextWorkspace = result.workspace;
        nextNotebook = result.notebook;
        messages.push(`${node.name}: executed ${nextNotebook.name}; touched ${result.touchedTables.join(', ') || 'no tables'}.`);
      }
      if (node.type === 'dbt') {
        const project = defaultDbtProject(nextWorkspace);
        const result = runDbtCommand(nextWorkspace, project, {
          command: String(node.config.command ?? 'dbt build') as DbtCommand,
          select: String(node.config.select ?? ''),
          exclude: String(node.config.exclude ?? ''),
          fullRefresh: Boolean(node.config.fullRefresh),
          failFast: Boolean(node.config.failFast),
          threads: Number(node.config.threads ?? 4),
        });
        nextWorkspace = result.workspace;
        messages.push(`${node.name}: ${node.config.command || 'dbt build'} · PASS=${result.passed} ERROR=${result.failed}`);
        if (result.failed > 0) throw new Error(`dbt quality gate failed with ${result.failed} error(s). Review dbt test/model output before promoting downstream data.`);
      }
      if (node.type === 'storedProcedure') {
        const result = executeStoredProcedureLearning(nextWorkspace, String(node.config.procedure ?? ''));
        nextWorkspace = result.workspace;
        messages.push(`${node.name}: ${result.message}`);
      }
      effectiveStatus.set(node.id, 'Succeeded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Learning runtime activity failed.';
      effectiveStatus.set(node.id, 'Failed');
      runtimeErrors[node.id] = message;
      messages.push(`${node.name}: RUNTIME FAILURE · ${message}`);
    }
  }
  if (messages.length) {
    const snapshot = nextWorkspace.snapshot;
    nextWorkspace = {
      ...nextWorkspace,
      history: [event('pipeline', 'pipeline', messages.join(' · '), snapshot), ...nextWorkspace.history],
    };
  }
  return { workspace: nextWorkspace, notebook: nextNotebook, messages, statusByNode: effectiveStatus, runtimeErrors };
}

export interface DbtSourceDefinition {
  id: string;
  name: string;
  schema: string;
  table: string;
  description: string;
}

export interface DbtModelDefinition {
  id: string;
  name: string;
  sql: string;
  output: string;
  materialization: 'table' | 'view' | 'incremental';
  uniqueKey?: string;
  tests: { type: 'not_null' | 'unique'; column: string }[];
}

export interface DbtProjectDefinition {
  name: string;
  sources: DbtSourceDefinition[];
  models: DbtModelDefinition[];
}

export interface DbtBuildResult {
  workspace: DataWorkspace;
  log: string[];
  passed: number;
  failed: number;
}

export function defaultDbtProject(workspace: DataWorkspace): DbtProjectDefinition {
  const source = workspace.caseStudyId === 'erp-incremental'
    ? workspace.tables.find((table) => `${table.schema}.${table.name}` === 'staging.customer_incremental') ?? workspace.tables.find((table) => `${table.schema}.${table.name}` === 'erp.customer') ?? workspace.tables[0]
    : workspace.tables.find((table) => table.layer === 'bronze') ?? workspace.tables.find((table) => table.layer === 'source') ?? workspace.tables[0];
  const base = source.name.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const key = source.primaryKey ?? source.columns[0]?.name ?? 'id';
  const stagingName = workspace.caseStudyId === 'erp-incremental' ? 'stg_customer_changes' : `stg_${base}`;
  const stagingOutput = workspace.caseStudyId === 'erp-incremental' ? 'staging.customer_changes' : `staging.${stagingName}`;
  const sourceName = 'case_source';
  const sourceExpression = `{{ source('${sourceName}','${source.name}') }}`;
  return {
    name: `dbt_${workspace.caseStudyId.replaceAll('-', '_')}`,
    sources: [{ id: 'source_case', name: sourceName, schema: source.schema, table: source.name, description: `Case-study source ${source.schema}.${source.name}` }],
    models: [
      {
        id: 'stg_source',
        name: stagingName,
        output: stagingOutput,
        materialization: workspace.caseStudyId === 'erp-incremental' ? 'incremental' : 'view',
        uniqueKey: workspace.caseStudyId === 'erp-incremental' ? key : undefined,
        sql: workspace.caseStudyId === 'erp-incremental'
          ? `SELECT * FROM ${sourceExpression} WHERE modified_at >= '2026-09-16'`
          : `SELECT * FROM ${sourceExpression}`,
        tests: [{ type: 'not_null', column: key }],
      },
      {
        id: 'gold_curated',
        name: `gold_${base}_curated`,
        output: `gold.${base}_curated`,
        materialization: 'table',
        sql: `SELECT * FROM {{ ref('${stagingName}') }}`,
        tests: [{ type: 'not_null', column: key }, { type: 'unique', column: key }],
      },
    ],
  };
}

export function dbtDependencies(project: DbtProjectDefinition): { from: string; to: string }[] {
  const edges: { from: string; to: string }[] = [];
  for (const model of project.models) {
    for (const match of model.sql.matchAll(/\{\{\s*ref\(['"]([^'"]+)['"]\)\s*\}\}/g)) {
      const parent = project.models.find((candidate) => candidate.name === match[1]);
      if (parent) edges.push({ from: parent.id, to: model.id });
    }
  }
  return edges;
}

export function compileDbtModel(project: DbtProjectDefinition, model: DbtModelDefinition): string {
  const refsCompiled = model.sql.replace(/\{\{\s*ref\(['"]([^'"]+)['"]\)\s*\}\}/g, (_, name: string) => {
    const dependency = project.models.find((candidate) => candidate.name === name);
    if (!dependency) throw new Error(`dbt ref('${name}') was not found in the project.`);
    return dependency.output;
  });
  return refsCompiled.replace(/\{\{\s*source\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)\s*\}\}/g, (_, sourceName: string, tableName: string) => {
    const source = project.sources.find((candidate) => candidate.name === sourceName && candidate.table === tableName);
    if (!source) throw new Error(`dbt source('${sourceName}','${tableName}') was not found in the project.`);
    return `${source.schema}.${source.table}`;
  });
}

export function dbtSourceStatuses(workspace: DataWorkspace, project: DbtProjectDefinition): { source: DbtSourceDefinition; exists: boolean; rowCount: number; status: 'Ready' | 'Missing' }[] {
  return project.sources.map((source) => {
    const table = findWorkspaceTable(workspace, `${source.schema}.${source.table}`);
    return { source, exists: Boolean(table), rowCount: table?.rows.length ?? 0, status: table ? 'Ready' as const : 'Missing' as const };
  });
}

function dbtOrder(project: DbtProjectDefinition): DbtModelDefinition[] {
  const edges = dbtDependencies(project);
  const pending = new Set(project.models.map((model) => model.id));
  const ordered: DbtModelDefinition[] = [];
  while (pending.size) {
    const ready = project.models.filter((model) => pending.has(model.id) && edges.filter((edge) => edge.to === model.id).every((edge) => !pending.has(edge.from)));
    if (!ready.length) throw new Error('dbt model graph contains a cycle.');
    for (const model of ready) { ordered.push(model); pending.delete(model.id); }
  }
  return ordered;
}

function runDbtTests(workspace: DataWorkspace, model: DbtModelDefinition): { passed: number; failed: number; messages: string[] } {
  const table = findWorkspaceTable(workspace, model.output);
  if (!table) return { passed: 0, failed: model.tests.length, messages: [`ERROR ${model.name}: output ${model.output} was not created.`] };
  let passed = 0; let failed = 0; const messages: string[] = [];
  for (const test of model.tests) {
    const values = table.rows.map((row) => row[test.column]);
    const ok = test.type === 'not_null'
      ? values.every((value) => value !== null && value !== undefined && value !== '')
      : new Set(values.map((value) => JSON.stringify(value))).size === values.length;
    if (ok) { passed += 1; messages.push(`PASS test ${test.type}_${model.name}_${test.column}`); }
    else { failed += 1; messages.push(`FAIL test ${test.type}_${model.name}_${test.column}`); }
  }
  return { passed, failed, messages };
}

function materializeDbtModel(workspace: DataWorkspace, project: DbtProjectDefinition, model: DbtModelDefinition, fullRefresh = false): { workspace: DataWorkspace; rows: Row[]; message: string } {
  const compiled = compileDbtModel(project, model);
  const selected = parseSelect(compiled, workspace);
  const sources = extractSqlSourceNames(compiled);
  const existing = findWorkspaceTable(workspace, model.output);
  let rows = selected.rows;
  let modeMessage: string = model.materialization;
  if (model.materialization === 'incremental' && existing && !fullRefresh) {
    if (model.uniqueKey) {
      const incoming = new Map(rows.map((row) => [JSON.stringify(row[model.uniqueKey!]), row]));
      const merged = (existing.rows as Row[]).filter((row) => !incoming.has(JSON.stringify(row[model.uniqueKey!])))
        .concat(rows);
      rows = merged;
      modeMessage = `incremental merge on ${model.uniqueKey}`;
    } else {
      rows = [...existing.rows as Row[], ...rows];
      modeMessage = 'incremental append';
    }
  } else if (model.materialization === 'incremental' && fullRefresh) modeMessage = 'incremental full-refresh';
  const next = upsertWorkspaceTable(workspace, model.output, rows, {
    mode: 'overwrite',
    source: `dbt ${model.materialization}: ${model.name}`,
    sources,
    actor: `dbt model · ${model.name}`,
    operation: modeMessage,
  });
  return { workspace: next, rows, message: modeMessage };
}

export function runDbtBuild(workspace: DataWorkspace, project: DbtProjectDefinition, options: { runTests?: boolean } = {}): DbtBuildResult {
  let next = workspace; const log: string[] = []; let passed = 0; let failed = 0;
  const runTests = options.runTests ?? true;
  const ordered = dbtOrder(project);
  ordered.forEach((model, index) => {
    log.push(`${index + 1} of ${ordered.length} START model ${model.name}`);
    try {
      const result = materializeDbtModel(next, project, model);
      next = result.workspace;
      log.push(`${index + 1} of ${ordered.length} OK ${result.message} ${model.output} (${result.rows.length} rows)`);
      passed += 1;
      if (runTests) {
        const tests = runDbtTests(next, model); passed += tests.passed; failed += tests.failed; log.push(...tests.messages);
      }
    } catch (error) {
      failed += 1; log.push(`${index + 1} of ${ordered.length} ERROR ${error instanceof Error ? error.message : 'dbt model failed'}`);
    }
  });
  log.push(`Done. PASS=${passed} ERROR=${failed}`);
  return { workspace: next, log, passed, failed };
}


export type DbtCommand = 'dbt build' | 'dbt run' | 'dbt compile' | 'dbt test';

export interface DbtCommandOptions {
  command?: DbtCommand;
  select?: string;
  exclude?: string;
  fullRefresh?: boolean;
  failFast?: boolean;
  threads?: number;
}

function dbtPatternMatches(name: string, pattern: string): boolean {
  const normalized = pattern.trim();
  if (!normalized || normalized === '*') return true;
  const escaped = normalized.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(name);
}

export function selectDbtModels(project: DbtProjectDefinition, select = '', exclude = ''): DbtModelDefinition[] {
  const selectors = select.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean);
  const exclusions = exclude.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean);
  return project.models.filter((model) => {
    const included = selectors.length === 0 || selectors.some((pattern) => dbtPatternMatches(model.name, pattern) || dbtPatternMatches(model.output, pattern));
    const excluded = exclusions.some((pattern) => dbtPatternMatches(model.name, pattern) || dbtPatternMatches(model.output, pattern));
    return included && !excluded;
  });
}

export function runDbtCommand(workspace: DataWorkspace, project: DbtProjectDefinition, options: DbtCommandOptions = {}): DbtBuildResult {
  const command = options.command ?? 'dbt build';
  const selected = selectDbtModels(project, options.select ?? '', options.exclude ?? '');
  const selectedIds = new Set(selected.map((model) => model.id));
  const threads = Math.min(Math.max(Number(options.threads ?? 4), 1), 64);
  const prefix = [`Invocation: ${command} · models=${selected.length} · threads=${threads}${options.fullRefresh ? ' · full-refresh' : ''}${options.failFast ? ' · fail-fast' : ''}`];
  if (selected.length === 0) return { workspace, log: [...prefix, 'ERROR No models matched the selection.'], passed: 0, failed: 1 };

  if (command === 'dbt compile') {
    const log = [...prefix];
    let passed = 0; let failed = 0;
    for (const model of selected) {
      try { log.push(`COMPILED ${model.name}
${compileDbtModel(project, model)}`); passed += 1; }
      catch (error) { log.push(`ERROR ${model.name}: ${error instanceof Error ? error.message : 'compile failed'}`); failed += 1; if (options.failFast) break; }
    }
    log.push(`Done. PASS=${passed} ERROR=${failed}`);
    return { workspace, log, passed, failed };
  }

  if (command === 'dbt test') {
    const log = [...prefix]; let passed = 0; let failed = 0;
    for (const model of selected) {
      const tests = runDbtTests(workspace, model); passed += tests.passed; failed += tests.failed; log.push(...tests.messages);
      if (options.failFast && tests.failed > 0) break;
    }
    log.push(`Done. PASS=${passed} ERROR=${failed}`);
    return { workspace, log, passed, failed };
  }

  // Resolve dependencies from the full project, then execute only selected models whose upstream refs are already materialized
  // or included in the selection. This keeps the training behavior understandable without implementing the complete dbt selector grammar.
  let next = workspace; const log = [...prefix]; let passed = 0; let failed = 0;
  const ordered = dbtOrder(project).filter((model) => selectedIds.has(model.id));
  for (let index = 0; index < ordered.length; index += 1) {
    const model = ordered[index];
    log.push(`${index + 1} of ${ordered.length} START model ${model.name}`);
    try {
      const result = materializeDbtModel(next, project, model, Boolean(options.fullRefresh));
      next = result.workspace;
      log.push(`${index + 1} of ${ordered.length} OK ${result.message} ${model.output} (${result.rows.length} rows)`);
      passed += 1;
      if (command === 'dbt build') {
        const tests = runDbtTests(next, model); passed += tests.passed; failed += tests.failed; log.push(...tests.messages);
        if (options.failFast && tests.failed > 0) break;
      }
    } catch (error) {
      failed += 1; log.push(`${index + 1} of ${ordered.length} ERROR ${error instanceof Error ? error.message : 'dbt model failed'}`);
      if (options.failFast) break;
    }
  }
  log.push(`Done. PASS=${passed} ERROR=${failed}`);
  return { workspace: next, log, passed, failed };
}
