import { Badge, Caption1, Tab, TabList, Text } from '@fluentui/react-components'
import { useMemo, useState } from 'react'
import type { ResultTable } from '../types'
import { profileColumns } from '../utils/analytics'

function originTime(result: ResultTable) {
  if (!result.origin?.createdAt) return null
  const date = new Date(result.origin.createdAt)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  return String(value)
}

export function TablePanel({ result }: { result: ResultTable }) {
  const [mode, setMode] = useState<'table' | 'profile'>('table')
  const time = originTime(result)
  const profile = useMemo(() => profileColumns(result), [result])

  if (!result.columns.length) return <div className="empty-panel">Run a query to populate the shared table.</div>
  const displayed = Math.min(100, result.rows.length)
  const total = result.totalRows ?? result.rows.length

  return (
    <div className="table-panel">
      <div className="table-meta">
        <TabList size="small" selectedValue={mode} onTabSelect={(_, data) => setMode(String(data.value) as 'table' | 'profile')}>
          <Tab value="table">Table</Tab>
          <Tab value="profile">Profile</Tab>
        </TabList>
        <Badge appearance="outline" size="small">{result.truncated ? `${result.rows.length}/${total} preview` : `${total} rows`}</Badge>
        <Badge appearance="outline" size="small">{result.columns.length} columns</Badge>
        {result.origin && <Badge appearance="tint" color="informative" size="small">{result.origin.label}</Badge>}
        <Caption1>{result.elapsedMs ?? 0} ms{time ? ` · ${time}` : ''}</Caption1>
      </div>

      {mode === 'table' ? (
        <>
          <div className="table-submeta"><Caption1>Showing {displayed} of {total} row{total === 1 ? '' : 's'}{result.truncated ? ' · bounded preview' : ''}</Caption1></div>
          <div className="table-scroll">
            <table>
              <thead><tr>{result.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {result.rows.slice(0, 100).map((row, index) => (
                  <tr key={index}>{result.columns.map((column) => <td key={column}>{displayValue(row[column])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="table-scroll profile-scroll">
          <div className="profile-note"><Caption1>Profile statistics use the {result.rows.length} row{result.rows.length === 1 ? '' : 's'} currently available in the Mosaic result preview{result.truncated ? `, not all ${total} source rows` : ''}.</Caption1></div>
          <table>
            <thead><tr><th>Column</th><th>Type</th><th>Null / empty</th><th>Distinct</th><th>Example</th></tr></thead>
            <tbody>
              {profile.map((item) => (
                <tr key={item.column}>
                  <td><Text size={200} weight="semibold">{item.column}</Text></td>
                  <td>{item.type}</td>
                  <td>{item.nulls}</td>
                  <td>{item.distinct}</td>
                  <td className="profile-example">{item.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
