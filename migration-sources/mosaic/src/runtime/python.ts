import type { ResultTable } from '../types'

let worker: Worker | null = null
let requestId = 0
const pending = new Map<number, { resolve: (value: PythonResult) => void; reject: (reason: Error) => void }>()

export interface PythonResult {
  stdout: string
  result: string
  table?: {
    columns: string[]
    rows: Array<Record<string, unknown>>
    schema?: Array<{ name: string; type: string }>
    totalRows?: number
    truncated?: boolean
  }
}

type PythonEngine = 'python' | 'polars'

function getWorker() {
  if (worker) return worker
  worker = new Worker('/pyodide.worker.js')
  worker.addEventListener('message', (event: MessageEvent) => {
    const id = Number(event.data?.id)
    const request = pending.get(id)
    if (!request) return
    pending.delete(id)
    if (event.data.ok) request.resolve(event.data.payload as PythonResult)
    else request.reject(new Error(event.data.error ?? 'Python execution failed'))
  })
  worker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'Python worker failed')
    for (const request of pending.values()) request.reject(error)
    pending.clear()
    worker?.terminate()
    worker = null
  })
  return worker
}

function runPythonEngine(code: string, input: ResultTable | undefined, engine: PythonEngine): Promise<PythonResult> {
  requestId += 1
  const id = requestId
  const inputRows = input?.rows.slice(0, 10000) ?? []
  const inputColumns = input?.columns ?? []
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, code, inputRows, inputColumns, engine })
  })
}

export function runPython(code: string, input?: ResultTable): Promise<PythonResult> {
  return runPythonEngine(code, input, 'python')
}

export function runPolars(code: string, input?: ResultTable): Promise<PythonResult> {
  return runPythonEngine(code, input, 'polars')
}
