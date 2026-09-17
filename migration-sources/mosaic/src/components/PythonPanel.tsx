import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Caption1, Spinner } from '@fluentui/react-components'
import { ArrowResetRegular, PlayRegular } from '@fluentui/react-icons'
import { CodeEditor } from './CodeEditor'
import { samplePython } from '../data/sample'
import { runPython } from '../runtime/python'
import { latestResult } from '../runtime/resultBus'
import { usePersistentState } from '../hooks/usePersistentState'
import type { ResultTable, RuntimeState } from '../types'

export function PythonPanel({ panelId, panelTitle, inputResult, onResult, imported = false }: {
  panelId: string
  panelTitle: string
  inputResult: ResultTable
  onResult: (result: ResultTable) => void
  imported?: boolean
}) {
  const [code, setCode] = usePersistentState(`mosaic:v2:code:${panelId}`, samplePython)
  const importedSource = useRef(code)
  const [state, setState] = useState<RuntimeState>('idle')
  const [output, setOutput] = useState('Python 3.14 loads only when this block runs. The current shared table is available as input_df.')

  const execute = useCallback(async () => {
    if (state === 'loading') return false
    setState('loading')
    setOutput('Loading Pyodide + pandas on first run…')
    try {
      const started = performance.now()
      const upstream = latestResult() ?? inputResult
      const result = await runPython(code, upstream)
      setOutput([result.stdout, result.result].filter(Boolean).join('\n') || 'Completed with no display output.')
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
            kind: 'python',
            runtime: 'browser',
            createdAt: new Date().toISOString(),
            parentResultId: upstream.id
          }
        })
      }
      setState('ready')
      return true
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error))
      setState('error')
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
        <Badge appearance="tint" color={state === 'error' ? 'danger' : state === 'ready' ? 'success' : 'informative'} size="small">
          Python · Web Worker
        </Badge>
        <Caption1 className="shortcut-hint">input_df · {inputResult.truncated ? `${inputResult.rows.length}/${inputResult.totalRows ?? '?'} preview` : `${inputResult.totalRows ?? inputResult.rows.length} rows`}</Caption1>
        <div className="toolbar-spacer" />
        <Button appearance="subtle" size="small" icon={<ArrowResetRegular />} onClick={() => setCode(imported ? importedSource.current : samplePython)}>{imported ? 'Restore' : 'Reset'}</Button>
        <Button appearance="primary" size="small" icon={state === 'loading' ? <Spinner size="tiny" /> : <PlayRegular />} onClick={() => void execute()} disabled={state === 'loading'}>
          {state === 'loading' ? 'Running' : 'Run'}
        </Button>
      </div>
      <div className="editor-wrap"><CodeEditor language="python" value={code} onChange={setCode} onRun={() => void execute()} /></div>
      <pre className={`python-output ${state === 'error' ? 'error-text' : ''}`}>{output}</pre>
    </div>
  )
}
