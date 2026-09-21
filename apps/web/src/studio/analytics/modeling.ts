import type {Check, ModelDesign, ModelTable, Relationship} from './types.ts';
import {freshId, identifier, quoteIdentifier} from './validation.ts';
export function newTable(name: string, role: ModelTable['role'] = 'dimension'): ModelTable {
  identifier(name, 'Table name');
  return {id: freshId('table'), name, role, grain: '', x: 30, y: 40, columns: [{id: freshId('column'), name: `${name.replace(/^(dim_|fct_)/, '')}_key`, type: 'INTEGER', primary: true, nullable: false}]};
}
export function modelChecks(model: ModelDesign): Check[] {
  const checks: Check[] = [];
  if (!model.tables.length) return [{id: 'empty', severity: 'info', message: 'Add a fact and its dimensions to begin.'}];
  const duplicateNames = model.tables.map(t => t.name).filter((n, i, all) => all.indexOf(n) !== i);
  if (duplicateNames.length) checks.push({id: 'names', severity: 'error', message: `Table names must be unique: ${duplicateNames.join(', ')}.`});
  for (const table of model.tables) {
    if (!table.grain.trim()) checks.push({id: `grain-${table.id}`, severity: 'warning', message: `${table.name}: describe what one row represents.`});
    const pk = table.columns.filter(c => c.primary);
    if (!pk.length) checks.push({id: `pk-${table.id}`, severity: 'warning', message: `${table.name}: no primary key is marked.`});
    if (pk.some(c => c.nullable)) checks.push({id: `nullpk-${table.id}`, severity: 'error', message: `${table.name}: a primary key cannot be nullable.`});
    if (new Set(table.columns.map(c => c.name)).size !== table.columns.length) checks.push({id: `colnames-${table.id}`, severity: 'error', message: `${table.name}: duplicate column names.`});
    if (table.role === 'dimension' && pk.length > 1) checks.push({id: `composite-${table.id}`, severity: 'info', message: `${table.name}: composite key; single-column relationships cannot establish uniqueness alone.`});
  }
  for (const r of model.relationships) {
    const from = model.tables.find(t => t.id === r.fromTable), to = model.tables.find(t => t.id === r.toTable);
    const fc = from?.columns.find(c => c.id === r.fromColumn), tc = to?.columns.find(c => c.id === r.toColumn);
    if (!from || !to || !fc || !tc) {checks.push({id: r.id, severity: 'error', message: 'Relationship has a missing table or column.'}); continue;}
    if (r.fromTable === r.toTable) checks.push({id: r.id + '-self', severity: 'warning', message: `${from.name}: self relationship; check the intended hierarchy.`});
    if (fc.type !== tc.type) checks.push({id: r.id + '-type', severity: 'error', message: `${from.name}.${fc.name} and ${to.name}.${tc.name} have different types.`});
    if (r.cardinality !== 'many-to-many' && (!tc.primary || to.columns.filter(c => c.primary).length !== 1)) checks.push({id: r.id + '-target', severity: 'warning', message: `${to.name}.${tc.name}: the 'one' side is not a single-column declared primary key.`});
    if (r.cardinality === 'many-to-many') checks.push({id: r.id + '-bridge', severity: 'warning', message: `${from.name} to ${to.name}: consider a bridge table and define its grain.`});
    if (r.cardinality === 'one-to-one' && (!fc.primary || from.columns.filter(c => c.primary).length !== 1)) checks.push({id: r.id + '-one', severity: 'warning', message: `${from.name}.${fc.name}: the first 'one' side has no single-column declared uniqueness.`});
  }
  return checks;
}
export function addRelationship(model: ModelDesign, relationship: Omit<Relationship, 'id'>): ModelDesign {
  const from = model.tables.find(t => t.id === relationship.fromTable), to = model.tables.find(t => t.id === relationship.toTable);
  if (!from?.columns.some(c => c.id === relationship.fromColumn) || !to?.columns.some(c => c.id === relationship.toColumn)) throw new Error('Choose existing columns on both sides.');
  if (model.relationships.some(r => r.fromTable === relationship.fromTable && r.fromColumn === relationship.fromColumn && r.toTable === relationship.toTable && r.toColumn === relationship.toColumn)) throw new Error('This relationship already exists.');
  return {...model, relationships: [...model.relationships, {id: freshId('relation'), ...relationship}]};
}
export function removeTable(model: ModelDesign, id: string): ModelDesign {
  return {...model, tables: model.tables.filter(t => t.id !== id), relationships: model.relationships.filter(r => r.fromTable !== id && r.toTable !== id), mappings: model.mappings.filter(r => r.fromTable !== id && r.toTable !== id)};
}
export function ddlPreview(model: ModelDesign): string {
  const header = '-- Authored schema design. Not introspected; no tables have been created.\n-- Relationship cardinalities are declarations, not data-validated facts.\n';
  const statements = model.tables.map(t => {
    identifier(t.name);
    const columns = t.columns.map(c => {
      if (!/^(INTEGER|BIGINT|DOUBLE|DECIMAL\(18,2\)|VARCHAR|DATE|TIMESTAMP|BOOLEAN)$/.test(c.type)) throw new Error('Unsupported DDL type.');
      return `  ${quoteIdentifier(c.name)} ${c.type}${c.nullable ? '' : ' NOT NULL'}`;
    });
    const keys = t.columns.filter(c => c.primary).map(c => quoteIdentifier(c.name));
    if (keys.length) columns.push(`  PRIMARY KEY (${keys.join(', ')})`);
    return `-- Grain: ${t.grain.replace(/[\r\n]/g, ' ')}\nCREATE TABLE ${quoteIdentifier(t.name)} (\n${columns.join(',\n')}\n);`;
  });
  const relationships = model.relationships.map(r => {
    const a = model.tables.find(t => t.id === r.fromTable), b = model.tables.find(t => t.id === r.toTable);
    const ac = a?.columns.find(c => c.id === r.fromColumn), bc = b?.columns.find(c => c.id === r.toColumn);
    return a && b && ac && bc ? `-- Relationship: ${quoteIdentifier(a.name)}.${quoteIdentifier(ac.name)} -> ${quoteIdentifier(b.name)}.${quoteIdentifier(bc.name)} (${r.cardinality}); validate keys before enforcing.` : '-- Unresolved relationship';
  });
  return header + statements.join('\n\n') + '\n\n' + relationships.join('\n') + '\n';
}
export interface ChangeEvent {customerId: number; name: string; city: string; at: string}
export const CHANGE_EVENTS: readonly ChangeEvent[] = [
  {customerId: 101, name: 'Aster', city: 'Geneva', at: '2026-01-01'},
  {customerId: 102, name: 'Birch', city: 'Bergen', at: '2026-01-01'},
  {customerId: 101, name: 'Aster', city: 'Oslo', at: '2026-02-10'},
  {customerId: 102, name: 'Birch', city: 'Bergen', at: '2026-02-11'},
  {customerId: 101, name: 'Aster', city: 'Trondheim', at: '2026-03-05'},
];
export interface DimensionRow {customer_key: number; customer_id: number; name: string; city: string; previous_city: string | null; valid_from: string; valid_to: string | null; is_current: boolean}
export function replayScd(events: readonly ChangeEvent[], type: 1 | 2 | 3, count = events.length): DimensionRow[] {
  if (![1, 2, 3].includes(type) || !Number.isInteger(count) || count < 0 || count > events.length) throw new Error('Invalid SCD replay selection.');
  const rows: DimensionRow[] = []; let nextKey = 1; const last = new Map<number, string>();
  for (const e of events.slice(0, count)) {
    if (!Number.isInteger(e.customerId) || !e.name || !e.city || !/^\d{4}-\d{2}-\d{2}$/.test(e.at) || !Number.isFinite(Date.parse(e.at)) || new Date(e.at).toISOString().slice(0, 10) !== e.at) throw new Error('Invalid change event.');
    if (last.has(e.customerId) && last.get(e.customerId)! >= e.at) throw new Error('Changes per customer must have strictly increasing dates.');
    last.set(e.customerId, e.at);
    const current = rows.find(r => r.customer_id === e.customerId && r.is_current);
    if (!current) rows.push({customer_key: nextKey++, customer_id: e.customerId, name: e.name, city: e.city, previous_city: null, valid_from: e.at, valid_to: null, is_current: true});
    else if (current.city !== e.city || current.name !== e.name) {
      if (type === 2) {
        current.valid_to = e.at; current.is_current = false;
        rows.push({customer_key: nextKey++, customer_id: e.customerId, name: e.name, city: e.city, previous_city: null, valid_from: e.at, valid_to: null, is_current: true});
      } else {if (type === 3 && current.city !== e.city) current.previous_city = current.city; current.city = e.city; current.name = e.name;}
    }
  }
  return rows;
}
export function lookupAt(rows: DimensionRow[], customer: number, at: string): DimensionRow | undefined {
  return rows.find(r => r.customer_id === customer && r.valid_from <= at && (!r.valid_to || at < r.valid_to));
}
export function scdExerciseAnswer(type: 1 | 2 | 3, step: number): {expected: string; explanation: string} {
  const rows = replayScd(CHANGE_EVENTS, type, step);
  return {expected: String(rows.length), explanation: type === 2 ? 'Type 2 adds a new version only when tracked attributes change. An unchanged city creates no version.' : `Type ${type} keeps one row per business key. ${type === 3 ? 'The previous_city column retains only the immediately previous city.' : 'Earlier city values are overwritten.'}`};
}
export const DATA_TYPES = ['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL(18,2)', 'VARCHAR', 'DATE', 'TIMESTAMP', 'BOOLEAN'] as const;
