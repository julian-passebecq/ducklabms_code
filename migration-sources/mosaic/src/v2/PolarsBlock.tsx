import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Caption1, Spinner } from '@fluentui/react-components'
import { ArrowResetRegular, PlayRegular } from '@fluentui/react-icons'
import { CodeEditor } from '../components/CodeEditor'
import { runPolars } from '../runtime/python'
import { latestResult } from '../runtime/resultBus'
import { usePersistentState } from '../hooks/usePersistentState'
import type { ResultTable, RuntimeState } from '../types'

const starter = `# The current shared result is available as input_df\nimport polars as pl\n\ndf = pl.from_pandas(input_df)\n\n# Return a Polars DataFrame/LazyFrame as the last expression.\ndf`

export function PolarsBlock({ panelId, panelTitle, inputResult, onResult }: {
  panelId: string
  panelTitle: string
  inputResult: ResultTable
  onResult: (result: ResultTable) => void
}) {
  const [code, setCode] = usePersistentState(`mosaic:v2:code:${panelId}`, starter)
  const [state, setState] = useState<RuntimeState>('idle')
  const [message, setMessage] = useState('Polars loads on first run. The latest shared table is available as input_df.')

  const execute = useCallback(async () => {
    if (state === 'loading') return false
    setState('loading')
    setMessage('Loading Polars runtime…')
    try {
      const started = performance.now()
      const upstream = latestResult() ?? inputResult
      const result = await runPolars(code, upstream)
      if (result.table) {
        onResult({
          columns: result.table.columns,
          rows: result.table.rows,
          schema: result.table.schema,
          transport: 'rows',
          elapsedMs: Math.round(performance.now() - started),
          totalRows: result.table.totalRows,
          truncated: result.table.truncated,
          origin: {
            blockId: panelId,
            label: panelTitle,
            kind: 'polars',
            runtime: 'browser',
            createdAt: new Date().toISOString(),
            parentResultId: upstream.id
          }
        })
      }
      setState('ready')
      setMessage(result.table ? `${result.table.totalRows ?? result.table.rows.length} rows · published` : result.result || result.stdout || 'Completed')
      return true
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : String(error))
      return false
    }
  }, [code, inputResult, onResult, panelId, panelTitle, state])

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

  return (
    <div className="code-panel">
      <div className="cell-toolbar">
        <Badge appearance="tint" color={state === 'error' ? 'danger' : state === 'ready' ? 'success' : 'informative'} size="small">Polars · browser</Badge>
        <Caption1 className="shortcut-hint">input_df · Ctrl/Cmd+Enter</Caption1>
        <div className="toolbar-spacer" />
        <Button appearance="subtle" size="small" icon={<ArrowResetRegular />} onClick={() => setCode(starter)}>Reset</Button>
        <Button appearance="primary" size="small" icon={state === 'loading' ? <Spinner size="tiny" /> : <PlayRegular />} onClick={() => void execute()} disabled={state === 'loading'}>{state === 'loading' ? 'Running' : 'Run'}</Button>
      </div>
      <div className="editor-wrap"><CodeEditor language="python" value={code} onChange={setCode} onRun={() => void execute()} /></div>
      <div className={`cell-status ${state === 'error' ? 'error-text' : ''}`}><Caption1>{message}</Caption1></div>
    </div>
  )
}
