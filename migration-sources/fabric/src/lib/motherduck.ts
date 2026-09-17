export type DataEngineMode = 'Local workspace' | 'MotherDuck';

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  elapsedMs: number;
  engine: DataEngineMode;
}

let connection: unknown = null;

export async function connectMotherDuck(token: string): Promise<void> {
  if (!token.trim()) throw new Error('A MotherDuck token is required.');
  const { MDConnection } = await import('@motherduck/wasm-client');
  const conn = MDConnection.create({ mdToken: token.trim() });
  await conn.isInitialized();
  connection = conn;
}

export async function queryMotherDuck(sql: string): Promise<QueryResult> {
  if (!connection) throw new Error('Connect to MotherDuck first.');
  const started = performance.now();
  const conn = connection as { evaluateQuery: (sql: string) => Promise<{ type: string; data?: { columnNames: () => string[]; toRows: () => Record<string, unknown>[] } }> };
  const result = await conn.evaluateQuery(sql);
  if (result.type !== 'materialized' || !result.data) throw new Error('This learning adapter currently expects a materialized result.');
  return {
    columns: result.data.columnNames(),
    rows: result.data.toRows(),
    elapsedMs: Math.round(performance.now() - started),
    engine: 'MotherDuck',
  };
}

export function disconnectMotherDuck(): void {
  connection = null;
}
