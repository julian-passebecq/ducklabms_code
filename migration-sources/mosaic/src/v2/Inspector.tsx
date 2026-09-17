import { Badge, Button, Caption1, Checkbox, Divider, Text } from '@fluentui/react-components'
import { AddRegular, DismissRegular } from '@fluentui/react-icons'
import type { ResultTable, WorkbenchPanel } from '../types'
import type { NotebookView } from './model'
import { runtimeLabel } from './model'

export function Inspector({ block, views, currentViewId, result, onToggleView, onPinToDashboard, onDashboardWidth, onDuplicateBlock, onMoveEarlier, onMoveLater, canMoveEarlier, canMoveLater, onRemoveProjectBlock }: {
  block: WorkbenchPanel | null
  views: NotebookView[]
  currentViewId: string
  result: ResultTable
  onToggleView: (viewId: string, visible: boolean) => void
  onPinToDashboard: () => void
  onDashboardWidth: (mode: 'half' | 'wide') => void
  onDuplicateBlock: () => void
  onMoveEarlier: () => void
  onMoveLater: () => void
  canMoveEarlier: boolean
  canMoveLater: boolean
  onRemoveProjectBlock: () => void
}) {
  if (!block) {
    return (
      <aside className="v2-inspector">
        <div className="v2-inspector-empty">
          <Text weight="semibold">Inspector</Text>
          <Caption1>Select a block to inspect its runtime, visibility and presentation.</Caption1>
        </div>
      </aside>
    )
  }

  const isOutput = block.type === 'table' || block.type === 'chart' || block.type === 'notebook-output'
  const isDashboardVisible = views.find((view) => view.id === 'dashboard')?.blockIds.includes(block.id) ?? false

  return (
    <aside className="v2-inspector">
      <div className="v2-inspector-head">
        <div>
          <Caption1>SELECTED BLOCK</Caption1>
          <Text weight="semibold" size={300}>{block.title}</Text>
        </div>
        <Badge appearance="outline" size="small">{block.type}</Badge>
      </div>

      <div className="v2-inspector-section">
        <Caption1>IDENTITY</Caption1>
        <div className="v2-kv"><span>ID</span><code>{block.id}</code></div>
        <div className="v2-kv"><span>Runtime</span><span>{runtimeLabel(block.type)}</span></div>
        <div className="v2-kv"><span>Current view</span><span>{views.find((view) => view.id === currentViewId)?.label ?? currentViewId}</span></div>
      </div>

      {block.notebook && (
        <>
          <Divider />
          <div className="v2-inspector-section">
            <Caption1>JUPYTER SOURCE</Caption1>
            <div className="v2-kv"><span>Cell ID</span><code>{block.notebook.cellId}</code></div>
            {block.notebook.originalCellId && block.notebook.originalCellId !== block.notebook.cellId && <div className="v2-kv"><span>Original ID</span><code>{block.notebook.originalCellId}</code></div>}
            <div className="v2-kv"><span>Cell</span><span>{block.notebook.originalIndex + 1}</span></div>
            <div className="v2-kv"><span>Kind</span><span>{block.notebook.cellType}</span></div>
            {block.notebook.language && <div className="v2-kv"><span>Language</span><span>{block.notebook.language}</span></div>}
            {block.notebook.executionCount != null && <div className="v2-kv"><span>Execution</span><span>[{block.notebook.executionCount}]</span></div>}
          </div>
        </>
      )}

      <Divider />

      <div className="v2-inspector-section">
        <Caption1>VISIBLE IN</Caption1>
        {views.map((view) => {
          const checked = view.blockIds.includes(block.id)
          return (
            <Checkbox
              key={view.id}
              checked={checked}
              label={view.label}
              onChange={(_, data) => onToggleView(view.id, Boolean(data.checked))}
            />
          )
        })}
      </div>

      {currentViewId === 'notebook' && (
        <>
          <Divider />
          <div className="v2-inspector-section">
            <Caption1>NOTEBOOK ORDER</Caption1>
            <Caption1>Reorder execution/document order without changing the other layout views. Imported code + saved output move together.</Caption1>
            <div className="v2-order-actions">
              <Button appearance="secondary" size="small" disabled={!canMoveEarlier} onClick={onMoveEarlier}>Move earlier</Button>
              <Button appearance="secondary" size="small" disabled={!canMoveLater} onClick={onMoveLater}>Move later</Button>
            </div>
          </div>
        </>
      )}

      <Divider />

      <div className="v2-inspector-section">
        <Caption1>SHARED RESULT</Caption1>
        <div className="v2-kv"><span>Rows</span><span>{result.truncated ? `${result.rows.length}/${result.totalRows ?? '?'} preview` : result.totalRows ?? result.rows.length}</span></div>
        <div className="v2-kv"><span>Columns</span><span>{result.columns.length}</span></div>
        <div className="v2-kv"><span>Produced by</span><span>{result.origin?.label ?? 'Demo data'}</span></div>
      </div>

      <div className="v2-inspector-actions">
        {isOutput && (
          <Button
            appearance="secondary"
            icon={isDashboardVisible ? <DismissRegular /> : <AddRegular />}
            onClick={() => isDashboardVisible ? onToggleView('dashboard', false) : onPinToDashboard()}
          >
            {isDashboardVisible ? 'Remove from dashboard' : 'Pin to dashboard'}
          </Button>
        )}
        {isOutput && isDashboardVisible && (
          <div className="v2-dashboard-size-actions">
            <Button appearance="secondary" size="small" onClick={() => onDashboardWidth('half')}>Half width</Button>
            <Button appearance="secondary" size="small" onClick={() => onDashboardWidth('wide')}>Full width</Button>
          </div>
        )}
        <Button appearance="secondary" onClick={onDuplicateBlock}>Duplicate block</Button>
        <Button appearance="subtle" icon={<DismissRegular />} onClick={onRemoveProjectBlock}>Delete project block</Button>
      </div>
    </aside>
  )
}
