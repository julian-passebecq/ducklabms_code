import { Badge, Caption1, Text } from '@fluentui/react-components'
import { usePersistentState } from '../hooks/usePersistentState'
import type { JupyterOutputSnapshot } from './ipynb'

function OutputItem({ output }: { output: JupyterOutputSnapshot }) {
  if (output.outputType === 'error') {
    return (
      <div className="jupyter-output-item error">
        <Text weight="semibold" size={200}>{output.errorName ?? 'Error'}: {output.errorValue}</Text>
        {!!output.traceback?.length && <pre>{output.traceback.join('\n')}</pre>}
      </div>
    )
  }

  if (output.imagePng || output.imageJpeg) {
    const mime = output.imagePng ? 'image/png' : 'image/jpeg'
    const payload = output.imagePng ?? output.imageJpeg
    return <div className="jupyter-output-item image"><img alt="Saved notebook output" src={`data:${mime};base64,${payload}`} /></div>
  }

  if (output.svg) {
    return <div className="jupyter-output-item image"><img alt="Saved SVG notebook output" src={`data:image/svg+xml;utf8,${encodeURIComponent(output.svg)}`} /></div>
  }

  if (output.html) {
    return (
      <div className="jupyter-output-item html">
        <iframe title="Saved notebook HTML output" sandbox="" srcDoc={output.html} />
      </div>
    )
  }

  if (output.table) {
    return (
      <div className="jupyter-output-item jupyter-output-table">
        <div className="jupyter-output-table-meta"><Caption1>{output.table.rows.length} rows · {output.table.columns.length} columns</Caption1></div>
        <div className="table-scroll">
          <table>
            <thead><tr>{output.table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>{output.table.rows.slice(0, 100).map((row, index) => (
              <tr key={index}>{output.table!.columns.map((column) => <td key={column}>{String(row[column] ?? '—')}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    )
  }

  if (output.markdown) {
    return <div className="jupyter-output-item markdown-output"><pre>{output.markdown}</pre></div>
  }

  if (output.json !== undefined) {
    return <div className="jupyter-output-item"><pre>{JSON.stringify(output.json, null, 2)}</pre></div>
  }

  if (output.latex) {
    return <div className="jupyter-output-item"><pre>{output.latex}</pre></div>
  }

  return (
    <div className="jupyter-output-item">
      {output.name && <Caption1>{output.name}</Caption1>}
      <pre>{output.text ?? '(empty output)'}</pre>
    </div>
  )
}

export function JupyterOutputPanel({ panelId }: { panelId: string }) {
  const [outputs] = usePersistentState<JupyterOutputSnapshot[]>(`mosaic:v2:jupyter-output:${panelId}`, [])
  return (
    <div className="jupyter-output-panel">
      <div className="jupyter-output-toolbar">
        <Badge appearance="tint" color="informative" size="small">Saved .ipynb output</Badge>
        <Caption1>{outputs.length} output item{outputs.length === 1 ? '' : 's'} · read-only</Caption1>
      </div>
      <div className="jupyter-output-stack">
        {outputs.length ? outputs.map((output, index) => <OutputItem key={index} output={output} />) : <Caption1>No saved output payload.</Caption1>}
      </div>
    </div>
  )
}
