import type { ResultTable } from '../types'

let revision = 0
let latest: ResultTable | null = null

export function stampResult(result: ResultTable): ResultTable {
  revision += 1
  latest = {
    ...result,
    id: result.id ?? `result_${Date.now()}_${revision}`,
    revision,
    transport: result.arrowIpc ? 'arrow-ipc' : 'rows'
  }
  return latest
}

export function latestResult() {
  return latest
}

export function serializableResult(result: ResultTable, rowLimit = 250): ResultTable {
  const { arrowIpc: _arrowIpc, ...rest } = result
  const rows = result.rows.slice(0, rowLimit)
  const totalRows = result.totalRows ?? result.rows.length
  return {
    ...rest,
    rows,
    totalRows,
    truncated: Boolean(result.truncated || totalRows > rows.length),
    transport: 'rows'
  }
}
