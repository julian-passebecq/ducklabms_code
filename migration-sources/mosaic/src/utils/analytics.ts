import type { ResultTable } from '../types'

export interface ResultProfile {
  dimension: string | null
  measure: string | null
  secondaryMeasure: string | null
  rows: Array<Record<string, unknown>>
}

const preferredDimensions = ['market', 'country', 'category', 'segment', 'status', 'name', 'date']
const preferredMeasures = ['revenue', 'sales', 'amount', 'value', 'orders', 'count', 'total', 'avg_order']

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function profileResult(result: ResultTable): ResultProfile {
  const sampleRows = result.rows.slice(0, 50)
  const numeric = result.columns.filter((column) => sampleRows.some((row) => isFiniteNumber(row[column])))
  const nonNumeric = result.columns.filter((column) => !numeric.includes(column))

  const dimension = preferredDimensions.find((column) => nonNumeric.includes(column))
    ?? nonNumeric[0]
    ?? result.columns[0]
    ?? null

  const measure = preferredMeasures.find((column) => numeric.includes(column))
    ?? numeric[0]
    ?? null

  const secondaryMeasure = numeric.find((column) => column !== measure) ?? null
  return { dimension, measure, secondaryMeasure, rows: result.rows }
}

export function numericTotal(result: ResultTable, column: string | null): number {
  if (!column) return 0
  return result.rows.reduce((sum, row) => sum + (isFiniteNumber(row[column]) ? row[column] : Number(row[column]) || 0), 0)
}

export function formatMetric(column: string | null, value: number): string {
  if (!Number.isFinite(value)) return '—'
  const name = (column ?? '').toLowerCase()
  const currencyLike = ['revenue', 'sales', 'amount', 'cost', 'profit', 'price'].some((token) => name.includes(token))
  const compact = Math.abs(value) >= 100000
    ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
  return currencyLike ? `€${compact}` : compact
}

export function filterResult(result: ResultTable, market: string): ResultTable {
  if (!market || market === 'all' || !result.columns.includes('market')) return result
  return { ...result, rows: result.rows.filter((row) => String(row.market) === market) }
}

export interface ColumnProfile {
  column: string
  type: string
  nulls: number
  distinct: number
  example: string
}

function inferColumnType(values: unknown[]) {
  const present = values.filter((value) => value !== null && value !== undefined && value !== '')
  if (!present.length) return 'unknown'
  if (present.every((value) => typeof value === 'number' && Number.isFinite(value))) return 'number'
  if (present.every((value) => typeof value === 'boolean')) return 'boolean'
  if (present.every((value) => value instanceof Date || (typeof value === 'string' && !Number.isNaN(Date.parse(value))))) return 'date/time'
  if (present.every((value) => typeof value === 'string')) return 'string'
  return 'mixed'
}

function stableDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  return String(value)
}

export function profileColumns(result: ResultTable): ColumnProfile[] {
  return result.columns.map((column) => {
    const values = result.rows.map((row) => row[column])
    const nonEmpty = values.filter((value) => value !== null && value !== undefined && value !== '')
    const distinct = new Set(nonEmpty.map(stableDisplayValue)).size
    return {
      column,
      type: result.schema?.find((field) => field.name === column)?.type ?? inferColumnType(values),
      nulls: values.length - nonEmpty.length,
      distinct,
      example: nonEmpty.length ? stableDisplayValue(nonEmpty[0]) : '—'
    }
  })
}
