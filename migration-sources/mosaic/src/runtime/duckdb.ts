import * as duckdb from '@duckdb/duckdb-wasm'
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdbWasmEh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import { tableToIPC } from 'apache-arrow'
import type { DatasetInfo, ResultTable } from '../types'

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null
let seedPromise: Promise<void> | null = null
const knownTableNames = new Set(['orders', 'customers'])
const generatedTableNames = new Set<string>()

const bundles: duckdb.DuckDBBundles = {
  mvp: { mainModule: duckdbWasm, mainWorker: mvpWorker },
  eh: { mainModule: duckdbWasmEh, mainWorker: ehWorker }
}

async function createDuckDB(): Promise<duckdb.AsyncDuckDB> {
  const bundle = await duckdb.selectBundle(bundles)
  if (!bundle.mainWorker) throw new Error('No compatible DuckDB-Wasm worker bundle found.')
  const worker = new Worker(bundle.mainWorker)
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  return db
}

export async function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = createDuckDB().catch((error) => {
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

async function seedDemoData() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const db = await getDuckDB()
      const conn = await db.connect()
      try {
        await conn.query(`
          CREATE OR REPLACE TABLE orders AS
          SELECT
            i AS order_id,
            1000 + (i % 1400) AS customer_id,
            CASE i % 5
              WHEN 0 THEN 'Norway'
              WHEN 1 THEN 'Switzerland'
              WHEN 2 THEN 'France'
              WHEN 3 THEN 'Germany'
              ELSE 'Sweden'
            END AS market,
            CASE i % 4
              WHEN 0 THEN 'Completed'
              WHEN 1 THEN 'Processing'
              WHEN 2 THEN 'Completed'
              ELSE 'Returned'
            END AS status,
            ROUND(50 + ((i * 37) % 240) + ((i % 17) * 0.61), 2) AS amount,
            DATE '2026-01-01' + ((i * 11) % 250)::INTEGER AS order_date
          FROM range(1, 8027) t(i);

          CREATE OR REPLACE TABLE customers AS
          SELECT
            i AS customer_id,
            'Customer ' || i::VARCHAR AS customer_name,
            CASE i % 4 WHEN 0 THEN 'SMB' WHEN 1 THEN 'Enterprise' WHEN 2 THEN 'Consumer' ELSE 'Mid-market' END AS segment
          FROM range(1000, 2400) t(i);


        `)
      } finally {
        await conn.close()
      }
    })().catch((error) => {
      seedPromise = null
      throw error
    })
  }
  return seedPromise
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString()
  }
  return value
}

export async function runSql(sql: string): Promise<ResultTable> {
  await seedDemoData()
  const db = await getDuckDB()
  const conn = await db.connect()
  const started = performance.now()
  try {
    const result = await conn.query(sql)
    const reportedTotalRows = Number(result.numRows)
    const hasReportedTotal = Number.isFinite(reportedTotalRows) && reportedTotalRows >= 0
    const previewLimit = 10000
    const previewTable = hasReportedTotal && reportedTotalRows > previewLimit && typeof result.slice === 'function'
      ? result.slice(0, previewLimit)
      : result
    const rows = previewTable.toArray().map((row) => {
      const json = row.toJSON() as Record<string, unknown>
      return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, normalizeValue(value)]))
    })
    const totalRows = hasReportedTotal ? reportedTotalRows : rows.length
    const columns = result.schema.fields.map((field) => field.name)
    const schema = result.schema.fields.map((field) => ({ name: field.name, type: String(field.type) }))
    let arrowIpc: Uint8Array | undefined
    try {
      arrowIpc = tableToIPC(previewTable as never, 'stream')
    } catch {
      // Row rendering remains available if Arrow serialization is unsupported by a browser/bundle combination.
    }
    return {
      columns,
      rows,
      schema,
      arrowIpc,
      transport: arrowIpc ? 'arrow-ipc' : 'rows',
      elapsedMs: Math.round(performance.now() - started),
      totalRows,
      truncated: totalRows > rows.length
    }
  } finally {
    await conn.close()
  }
}

function sanitizeTableName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^\d/, '_$&').toLowerCase()
  return base || `dataset_${Date.now()}`
}

function allocateTableName(fileName: string) {
  const base = sanitizeTableName(fileName)
  let candidate = base
  let suffix = 2
  while (knownTableNames.has(candidate)) candidate = `${base}_${suffix++}`
  knownTableNames.add(candidate)
  return candidate
}

export async function registerLocalFile(file: File): Promise<DatasetInfo> {
  await seedDemoData()
  const db = await getDuckDB()
  const buffer = new Uint8Array(await file.arrayBuffer())
  const virtualName = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  await db.registerFileBuffer(virtualName, buffer)

  const tableName = allocateTableName(file.name)
  const lower = file.name.toLowerCase()
  const conn = await db.connect()
  try {
    if (lower.endsWith('.parquet')) {
      await conn.query(`CREATE VIEW "${tableName}" AS SELECT * FROM read_parquet('${virtualName}')`)
      return { id: virtualName, name: file.name, tableName, kind: 'parquet', detail: `${formatBytes(file.size)} · view ${tableName}`, runtime: 'browser' }
    }
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
      const options = lower.endsWith('.tsv') ? ", delim='\\t'" : ''
      await conn.query(`CREATE VIEW "${tableName}" AS SELECT * FROM read_csv_auto('${virtualName}'${options})`)
      return { id: virtualName, name: file.name, tableName, kind: 'csv', detail: `${formatBytes(file.size)} · view ${tableName}`, runtime: 'browser' }
    }
    await db.dropFile(virtualName).catch(() => undefined)
    knownTableNames.delete(tableName)
    throw new Error('V1 file import supports CSV, TSV and Parquet.')
  } catch (error) {
    knownTableNames.delete(tableName)
    await db.dropFile(virtualName).catch(() => undefined)
    throw error
  } finally {
    await conn.close()
  }
}

export async function restoreStoredFile(dataset: DatasetInfo, originalName: string, storageName: string, bytes: Uint8Array): Promise<DatasetInfo> {
  await seedDemoData()
  if (!dataset.tableName) throw new Error('Stored dataset is missing a table name.')
  const db = await getDuckDB()
  const virtualName = `restored/${storageName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  await db.registerFileBuffer(virtualName, bytes)
  const lower = originalName.toLowerCase()
  const conn = await db.connect()
  try {
    if (lower.endsWith('.parquet') || dataset.kind === 'parquet') {
      await conn.query(`CREATE OR REPLACE VIEW "${dataset.tableName}" AS SELECT * FROM read_parquet('${virtualName}')`)
    } else if (lower.endsWith('.csv') || lower.endsWith('.tsv') || dataset.kind === 'csv') {
      const options = lower.endsWith('.tsv') ? ", delim='\\t'" : ''
      await conn.query(`CREATE OR REPLACE VIEW "${dataset.tableName}" AS SELECT * FROM read_csv_auto('${virtualName}'${options})`)
    } else {
      await db.dropFile(virtualName).catch(() => undefined)
      throw new Error(`Unsupported stored import: ${originalName}`)
    }
    knownTableNames.add(dataset.tableName)
    return dataset
  } catch (error) {
    await db.dropFile(virtualName).catch(() => undefined)
    throw error
  } finally {
    await conn.close()
  }
}


export async function materializeQueryAsTable(tableName: string, sql: string): Promise<ResultTable> {
  await seedDemoData()
  const normalized = sanitizeTableName(tableName)
  knownTableNames.add(normalized)
  const db = await getDuckDB()
  const conn = await db.connect()
  try {
    const statement = sql.trim().replace(/;+$/, '')
    await conn.query(`CREATE OR REPLACE TABLE "${normalized}" AS ${statement}`)
  } finally {
    await conn.close()
  }
  return runSql(`SELECT * FROM "${normalized}" LIMIT 1000`)
}

export async function materializeSyntheticOrders(rows: number, requestedName: string): Promise<{ dataset: DatasetInfo; result: ResultTable }> {
  await seedDemoData()
  const db = await getDuckDB()
  const normalized = sanitizeTableName(requestedName || 'orders_synthetic')
  const preferred = normalized === 'orders' || normalized === 'customers' ? `${normalized}_synthetic` : normalized
  const tableName = generatedTableNames.has(preferred) ? preferred : (knownTableNames.has(preferred) ? allocateTableName(preferred) : preferred)
  knownTableNames.add(tableName)
  generatedTableNames.add(tableName)
  const safeRows = Math.max(1_000, Math.min(1_000_000, Math.round(rows)))
  const conn = await db.connect()
  try {
    await conn.query(`
      CREATE OR REPLACE TABLE "${tableName}" AS
      SELECT
        i AS order_id,
        10000 + (i % 5000) AS customer_id,
        DATE '2024-01-01' + ((i * 17) % 1000)::INTEGER AS order_date,
        CASE i % 5 WHEN 0 THEN 'Norway' WHEN 1 THEN 'Switzerland' WHEN 2 THEN 'France' WHEN 3 THEN 'Germany' ELSE 'Sweden' END AS market,
        ROUND(20 + ((i * 29) % 480) + ((i % 19) * 0.37), 2) AS amount,
        CASE i % 6 WHEN 0 THEN 'Returned' WHEN 1 THEN 'Processing' ELSE 'Completed' END AS status
      FROM range(1, ${safeRows + 1}) t(i)
    `)
  } finally {
    await conn.close()
  }
  const result = await runSql(`
    SELECT market, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue, ROUND(AVG(amount), 2) AS avg_order
    FROM "${tableName}"
    GROUP BY market
    ORDER BY revenue DESC
  `)
  return {
    dataset: { id: `generated:${tableName}`, name: tableName, tableName, kind: 'table', detail: `${safeRows.toLocaleString()} rows · generated`, runtime: 'browser' },
    result
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
