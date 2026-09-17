import { Card, Caption1, Text } from '@fluentui/react-components'
import type { ResultTable } from '../types'
import { formatMetric, numericTotal, profileResult } from '../utils/analytics'

export function ChartPanel({ result }: { result: ResultTable }) {
  const profile = profileResult(result)
  const rows = profile.rows.slice(0, 8)
  const values = rows.map((row) => Number(profile.measure ? row[profile.measure] : 0) || 0)
  const max = Math.max(...values, 1)
  const primaryTotal = numericTotal(result, profile.measure)
  const secondaryTotal = numericTotal(result, profile.secondaryMeasure)
  const average = result.rows.length ? primaryTotal / result.rows.length : 0

  const kpis = [
    [profile.measure ? `Σ ${profile.measure}` : 'Rows', profile.measure ? formatMetric(profile.measure, primaryTotal) : result.rows.length.toLocaleString()],
    [profile.secondaryMeasure ? `Σ ${profile.secondaryMeasure}` : 'Columns', profile.secondaryMeasure ? formatMetric(profile.secondaryMeasure, secondaryTotal) : result.columns.length.toLocaleString()],
    [profile.measure ? `Avg ${profile.measure}` : 'Runtime', profile.measure ? formatMetric(profile.measure, average) : `${result.elapsedMs ?? 0} ms`]
  ]

  if (!result.columns.length || !result.rows.length) {
    return <div className="empty-panel">Run a query that returns rows to populate this analytical component.</div>
  }

  return (
    <div className="chart-panel">
      <div className="kpi-row">
        {kpis.map(([label, value]) => (
          <Card size="small" className="kpi" key={label}>
            <Caption1>{label}</Caption1>
            <Text weight="semibold" size={500}>{value}</Text>
          </Card>
        ))}
      </div>
      <div className="chart-caption"><Caption1>{profile.dimension ?? 'row'} → {profile.measure ?? 'value'} · inferred from the current result schema</Caption1></div>
      <div className="bar-chart">
        {rows.map((row, index) => {
          const value = Number(profile.measure ? row[profile.measure] : 0) || 0
          const label = profile.dimension ? String(row[profile.dimension] ?? `row ${index + 1}`) : `row ${index + 1}`
          return (
            <div className="bar-row" key={`${label}-${index}`}>
              <Caption1 title={label}>{label}</Caption1>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div>
              <Text size={200} weight="semibold">{formatMetric(profile.measure, value)}</Text>
            </div>
          )
        })}
      </div>
    </div>
  )
}
