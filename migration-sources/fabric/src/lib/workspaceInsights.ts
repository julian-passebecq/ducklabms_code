import type { CaseStudy, DataWorkspace, WorkspaceCheckpoint, WorkspaceTable } from '../types/app';

type Row = Record<string, unknown>;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const qualified = (table: Pick<WorkspaceTable, 'schema' | 'name'>) => `${table.schema}.${table.name}`;

export interface ColumnProfile {
  name: string;
  type: string;
  nullCount: number;
  nullPercent: number;
  distinctCount: number;
  min?: string | number;
  max?: string | number;
}

export interface TableProfile {
  qualifiedName: string;
  rowCount: number;
  columnCount: number;
  duplicatePrimaryKeyRows: number;
  qualityScore: number;
  columns: ColumnProfile[];
}

export interface WorkspaceTableChange {
  table: string;
  kind: 'created' | 'updated' | 'unchanged' | 'missing';
  rowDelta: number;
  version: number;
}

function scalarRange(values: unknown[]): { min?: string | number; max?: string | number } {
  const clean = values.filter((value) => value !== null && value !== undefined && value !== '');
  if (!clean.length) return {};
  if (clean.every((value) => typeof value === 'number')) {
    const nums = clean as number[];
    return { min: Math.min(...nums), max: Math.max(...nums) };
  }
  const comparable = clean.map((value) => String(value)).sort();
  return { min: comparable[0], max: comparable.at(-1) };
}


export interface WorkspaceObjectFreshness {
  object: string;
  status: 'fresh' | 'stale' | 'missing';
  writeSnapshot: number;
  staleBecause: string[];
}

export function workspaceObjectCanonicalName(workspace: DataWorkspace, object: string): string {
  const normalized = object.trim().replace(/[\[\]`]/g, '').toLowerCase();
  const parts = normalized.split('.').filter(Boolean);
  const lastTwo = parts.length >= 2 ? parts.slice(-2).join('.') : normalized;
  const table = workspace.tables.find((item) => {
    const key = `${item.schema}.${item.name}`.toLowerCase();
    return key === normalized || key === lastTwo || item.name.toLowerCase() === parts.at(-1);
  });
  return table ? `${table.schema}.${table.name}` : (parts.length >= 3 ? parts.slice(-2).join('.') : normalized);
}

export function workspaceObjectWriteSnapshot(workspace: DataWorkspace, object: string): number {
  const canonical = workspaceObjectCanonicalName(workspace, object).toLowerCase();
  const event = workspace.history.find((item) => workspaceObjectCanonicalName(workspace, item.object).toLowerCase() === canonical && (item.action === 'create' || item.action === 'update'));
  if (event) return event.snapshot;
  const table = workspace.tables.find((item) => `${item.schema}.${item.name}`.toLowerCase() === canonical);
  return table ? 1 : 0;
}

export function workspaceObjectFreshness(workspace: DataWorkspace, object: string, visited = new Set<string>()): WorkspaceObjectFreshness {
  const canonical = workspaceObjectCanonicalName(workspace, object);
  const normalized = canonical.toLowerCase();
  const table = workspace.tables.find((item) => `${item.schema}.${item.name}`.toLowerCase() === normalized);
  if (!table) return { object, status: 'missing', writeSnapshot: 0, staleBecause: [] };
  if (visited.has(normalized)) return { object, status: 'fresh', writeSnapshot: workspaceObjectWriteSnapshot(workspace, object), staleBecause: [] };
  const nextVisited = new Set(visited);
  nextVisited.add(normalized);
  const writeSnapshot = workspaceObjectWriteSnapshot(workspace, `${table.schema}.${table.name}`);
  const incoming = workspace.lineage.filter((edge) => workspaceObjectCanonicalName(workspace, edge.to).toLowerCase() === `${table.schema}.${table.name}`.toLowerCase() && edge.snapshot === writeSnapshot);
  const staleBecause: string[] = [];
  for (const edge of incoming) {
    const sourceSnapshot = workspaceObjectWriteSnapshot(workspace, edge.from);
    if (sourceSnapshot > writeSnapshot) staleBecause.push(`${edge.from} changed at snapshot ${sourceSnapshot} after this object was written at snapshot ${writeSnapshot}`);
    const sourceFreshness = workspaceObjectFreshness(workspace, edge.from, nextVisited);
    if (sourceFreshness.status === 'stale') staleBecause.push(`${edge.from} is itself stale`);
  }
  return { object: `${table.schema}.${table.name}`, status: staleBecause.length ? 'stale' : 'fresh', writeSnapshot, staleBecause: Array.from(new Set(staleBecause)) };
}

export function profileWorkspaceTable(table: WorkspaceTable): TableProfile {
  const rows = table.rows as Row[];
  const columns = table.columns.map((column) => {
    const values = rows.map((row) => row[column.name]);
    const nullCount = values.filter((value) => value === null || value === undefined || value === '').length;
    const distinctCount = new Set(values.map((value) => JSON.stringify(value))).size;
    return {
      name: column.name,
      type: column.type,
      nullCount,
      nullPercent: rows.length ? Math.round((nullCount / rows.length) * 1000) / 10 : 0,
      distinctCount,
      ...scalarRange(values),
    };
  });
  let duplicatePrimaryKeyRows = 0;
  if (table.primaryKey) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = JSON.stringify(row[table.primaryKey]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    duplicatePrimaryKeyRows = Array.from(counts.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  }
  const nullCells = columns.reduce((sum, column) => sum + column.nullCount, 0);
  const totalCells = Math.max(1, rows.length * Math.max(1, columns.length));
  const nullPenalty = (nullCells / totalCells) * 55;
  const duplicatePenalty = rows.length ? (duplicatePrimaryKeyRows / rows.length) * 45 : 0;
  const qualityScore = Math.max(0, Math.round(100 - nullPenalty - duplicatePenalty));
  return { qualifiedName: qualified(table), rowCount: rows.length, columnCount: columns.length, duplicatePrimaryKeyRows, qualityScore, columns };
}

export function profileWorkspace(workspace: DataWorkspace): TableProfile[] {
  return workspace.tables.map(profileWorkspaceTable);
}

export function compareWorkspaceToSeed(workspace: DataWorkspace, caseStudy: CaseStudy): WorkspaceTableChange[] {
  const seed = new Map(caseStudy.tables.map((table) => [`${table.schema}.${table.name}`.toLowerCase(), table]));
  const current = new Map(workspace.tables.map((table) => [qualified(table).toLowerCase(), table]));
  const names = new Set([...seed.keys(), ...current.keys()]);
  return Array.from(names).sort().map((name) => {
    const before = seed.get(name);
    const after = current.get(name);
    if (!after) return { table: name, kind: 'missing' as const, rowDelta: -(before?.rows.length ?? 0), version: 0 };
    if (!before) return { table: qualified(after), kind: 'created' as const, rowDelta: after.rows.length, version: after.version };
    const rowDelta = after.rows.length - before.rows.length;
    const changed = after.version > 1 || JSON.stringify(after.rows) !== JSON.stringify(before.rows);
    return { table: qualified(after), kind: changed ? 'updated' as const : 'unchanged' as const, rowDelta, version: after.version };
  });
}

export function createWorkspaceCheckpoint(workspace: DataWorkspace, label: string): DataWorkspace {
  const timestamp = new Date().toISOString();
  const checkpoint: WorkspaceCheckpoint = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: label.trim() || `Checkpoint ${workspace.snapshot}`,
    createdAt: timestamp,
    snapshot: workspace.snapshot,
    tables: clone(workspace.tables),
  };
  return {
    ...workspace,
    checkpoints: [checkpoint, ...(workspace.checkpoints ?? [])].slice(0, 12),
    history: [{ id: `evt-${Date.now()}-checkpoint`, timestamp, action: 'checkpoint', object: 'workspace', details: `Created checkpoint “${checkpoint.label}” at snapshot ${workspace.snapshot}.`, snapshot: workspace.snapshot }, ...workspace.history],
  };
}

export function restoreWorkspaceCheckpoint(workspace: DataWorkspace, checkpointId: string): DataWorkspace {
  const checkpoint = (workspace.checkpoints ?? []).find((item) => item.id === checkpointId);
  if (!checkpoint) return workspace;
  const snapshot = workspace.snapshot + 1;
  const timestamp = new Date().toISOString();
  return {
    ...workspace,
    snapshot,
    tables: clone(checkpoint.tables).map((table) => ({ ...table, updatedAt: timestamp })),
    history: [{ id: `evt-${Date.now()}-restore`, timestamp, action: 'restore', object: 'workspace', details: `Restored checkpoint “${checkpoint.label}” from snapshot ${checkpoint.snapshot}.`, snapshot }, ...workspace.history],
  };
}
