import { useMemo, useRef, useState } from 'react'
import { Badge, Button, Caption1, Dropdown, Option, Spinner, Text } from '@fluentui/react-components'
import { ArrowUploadRegular } from '@fluentui/react-icons'
import type { DatasetInfo, ResultTable } from '../types'
import { registerLocalFile } from '../runtime/duckdb'
import { persistImportedFile } from '../runtime/projectStore'

export function CatalogPanel({ datasets, onDataset, onOpenDataset, result, marketFilter, onMarketFilter }: {
  datasets: DatasetInfo[]
  onDataset: (dataset: DatasetInfo) => void
  onOpenDataset: (dataset: DatasetInfo) => void
  result: ResultTable
  marketFilter: string
  onMarketFilter: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('Drop CSV, TSV or Parquet here. OPFS-capable browsers keep imported bytes across reloads.')
  const markets = useMemo(() => Array.from(new Set(result.rows.map((row) => row.market).filter((value) => value != null).map(String))).sort(), [result])
  const visibleDatasets = useMemo(() => datasets, [datasets])

  const importFile = async (file?: File) => {
    if (!file || loading) return
    setLoading(true)
    setMessage(`Registering ${file.name}…`)
    try {
      const registered = await registerLocalFile(file)
      const dataset: DatasetInfo = { ...registered, layer: 'source', producedBy: 'Import' }
      const persisted = await persistImportedFile(file, dataset)
      const durableDataset: DatasetInfo = { ...dataset, assetFingerprint: persisted.fingerprint !== 'unavailable' ? persisted.fingerprint : undefined }
      onDataset(durableDataset)
      setMessage(persisted.backend === 'opfs'
        ? `Ready and persisted locally: SELECT * FROM "${dataset.tableName}" LIMIT 100`
        : `Ready for this session: SELECT * FROM "${dataset.tableName}" LIMIT 100`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
      setDragging(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      className={`catalog-panel ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void importFile(event.dataTransfer.files?.[0]) }}
    >
      <div className="catalog-controls">
        <div>
          <Caption1>View filter</Caption1>
          <Dropdown
            size="small"
            value={marketFilter === 'all' ? 'All markets' : marketFilter}
            selectedOptions={[marketFilter]}
            onOptionSelect={(_, data) => onMarketFilter(String(data.optionValue ?? 'all'))}
          >
            <Option value="all">All markets</Option>
            {markets.map((market) => <Option value={market} key={market}>{market}</Option>)}
          </Dropdown>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.parquet"
          hidden
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
        <Button appearance="secondary" size="small" icon={loading ? <Spinner size="tiny" /> : <ArrowUploadRegular />} onClick={() => inputRef.current?.click()} disabled={loading}>
          Import file
        </Button>
        <div className="drop-zone"><ArrowUploadRegular /><Caption1>{dragging ? 'Drop to register in DuckDB' : 'Drag CSV / TSV / Parquet'}</Caption1></div>
        <Caption1 className="catalog-message">{message}</Caption1>
      </div>

      <Caption1 className="section-caption">DATASETS</Caption1>
      <div className="catalog-list">
        {visibleDatasets.map((item) => (
          <div className="catalog-item" key={item.id}>
            <span className={`dataset-glyph ${item.runtime}`}>{item.kind === 'table' ? 'T' : item.kind === 'view' ? 'V' : item.kind === 'parquet' ? 'P' : item.kind === 'csv' ? 'C' : item.runtime === 'cloud' ? '☁' : 'L'}</span>
            <div className="catalog-item-copy">
              <Text size={200} weight="semibold">{item.tableName ?? item.name}</Text>
              <Caption1>{item.detail}</Caption1>
            </div>
            <div className="catalog-item-actions">
              {item.quality && item.quality !== 'unchecked' && (
                <Badge appearance="tint" color={item.quality === 'passed' ? 'success' : 'danger'} size="small">
                  {item.quality === 'passed' ? 'quality pass' : 'quality fail'}
                </Badge>
              )}
              {item.runtime === 'browser' && item.tableName
                ? <Button appearance="subtle" size="small" onClick={() => onOpenDataset(item)}>Query</Button>
                : <Badge appearance="outline" size="small">{item.runtime}</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
