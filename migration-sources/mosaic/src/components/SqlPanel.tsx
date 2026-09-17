import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Caption1, Spinner } from '@fluentui/react-components'
import { ArrowResetRegular, PlayRegular } from '@fluentui/react-icons'
import { CodeEditor } from './CodeEditor'
import { runSql } from '../runtime/duckdb'
import { sampleSql } from '../data/sample'
import { usePersistentState } from '../hooks/usePersistentState'
import type { ResultTable, RuntimeState } from '../types'

export function SqlPanel({ panelId, panelTitle, onResult, imported = false }: {
  panelId: string
  panelTitle: string
  onResult: (result: ResultTable) => void
  imported?: boolean
}) {
  const [sql, setSql] = usePersistentState(`mosaic:v2:code:${panelId}`, sampleSql)
  const importedSource = useRef(sql)
  const [state, setState] = useState<RuntimeState>('idle')
  const [message, setMessage] = useState('Ready · demo tables: orders, customers · Ctrl/Cmd+Enter to run')

  const execute = useCallback(async () => {
    if (state === 'loading') return false
    setState('loading')
    setMessage('Starting DuckDB-Wasm…')
    try {
      const result = await runSql(sql)
      onResult({
        ...result,
        origin: {
          blockId: panelId,
          label: panelTitle,
          kind: 'sql',
          runtime: 'browser',
          createdAt: new Date().toISOString()
        }
      })
      setState('ready')
      setMessage(`${result.rows.length} rows · ${result.elapsedMs ?? 0} ms · published to shared result`)
      return true
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : String(error))
      return false
    }
  }, [onResult, panelId, panelTitle, sql, state])

  useEffect(() => {
    const runBlock = async (event: Event) => {
      const detail = (event as CustomEvent<{ blockId?: string }>).detail
      if (detail?.blockId !== panelId) return
      const ok = await execute()
      window.dispatchEvent(new CustomEvent(`mosaic:block-complete:${panelId}`, { detail: { ok } }))
    }
    window.addEventListener('mosaic:run-block', runBlock)
    return () => window.removeEventListener('mosaic:run-block', runBlock)
  }, [execute, panelId])

  useEffect(() => {
    const replaceSql = (event: Event) => {
      const detail = (event as CustomEvent<{ sql?: string; blockId?: string }>).detail
      if (detail?.blockId && detail.blockId !== panelId) return
      if (typeof detail?.sql === 'string') setSql(detail.sql)
    }
    window.addEventListener('mosaic:replace-sql', replaceSql)
    return () => window.removeEventListener('mosaic:replace-sql', replaceSql)
  }, [panelId, setSql])

  return (
    <div className="code-panel">
      <div className="cell-toolbar">
        <Badge appearance="tint" color={state === 'error' ? 'danger' : state === 'ready' ? 'success' : 'informative'} size="small">
          DuckDB · Wasm
        </Badge>
        <Caption1 className="shortcut-hint">Ctrl/Cmd+Enter</Caption1>
        <div className="toolbar-spacer" />
        <Button appearance="subtle" size="small" icon={<ArrowResetRegular />} onClick={() => setSql(imported ? importedSource.current : sampleSql)}>{imported ? 'Restore' : 'Reset'}</Button>
        <Button appearance="primary" size="small" icon={state === 'loading' ? <Spinner size="tiny" /> : <PlayRegular />} onClick={() => void execute()} disabled={state === 'loading'}>
          {state === 'loading' ? 'Running' : 'Run'}
        </Button>
      </div>
      <div className="editor-wrap"><CodeEditor language="sql" value={sql} onChange={setSql} onRun={() => void execute()} /></div>
      <div className={`cell-status ${state === 'error' ? 'error-text' : ''}`}><Caption1>{message}</Caption1></div>
    </div>
  )
}
