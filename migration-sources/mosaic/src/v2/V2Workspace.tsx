import { useMemo } from 'react'
import { Caption1, Text } from '@fluentui/react-components'
import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { DatasetInfo, ResultTable, WorkbenchPanel } from '../types'
import type { NotebookView } from './model'
import { PanelShell } from '../components/PanelShell'
import { SqlPanel } from '../components/SqlPanel'
import { PythonPanel } from '../components/PythonPanel'
import { PolarsBlock } from './PolarsBlock'
import { MarkdownPanel } from '../components/MarkdownPanel'
import { TablePanel } from '../components/TablePanel'
import { ChartPanel } from '../components/ChartPanel'
import { CatalogPanel } from '../components/CatalogPanel'
import { JupyterOutputPanel } from './JupyterOutputPanel'

function CorePanelContent({ panel, result, onResult, datasets, onDataset, onOpenDataset }: {
  panel: WorkbenchPanel
  result: ResultTable
  onResult: (result: ResultTable) => void
  datasets: DatasetInfo[]
  onDataset: (dataset: DatasetInfo) => void
  onOpenDataset: (dataset: DatasetInfo) => void
}) {
  switch (panel.type) {
    case 'sql': return <SqlPanel panelId={panel.id} panelTitle={panel.title} onResult={onResult} imported={panel.notebook?.source === 'ipynb'} />
    case 'python': return <PythonPanel panelId={panel.id} panelTitle={panel.title} inputResult={result} onResult={onResult} imported={panel.notebook?.source === 'ipynb'} />
    case 'polars': return <PolarsBlock panelId={panel.id} panelTitle={panel.title} inputResult={result} onResult={onResult} />
    case 'markdown': return <MarkdownPanel panelId={panel.id} imported={panel.notebook?.source === 'ipynb'} readOnly={panel.notebook?.cellType === 'code'} />
    case 'table': return <TablePanel result={result} />
    case 'chart': return <ChartPanel result={result} />
    case 'catalog': return <CatalogPanel datasets={datasets} onDataset={onDataset} onOpenDataset={onOpenDataset} result={result} marketFilter="all" onMarketFilter={() => undefined} />
    case 'notebook-output': return <JupyterOutputPanel panelId={panel.id} />
    default: return <div className="empty-panel">This block is not part of the Mosaic V2 core.</div>
  }
}

export function V2Workspace({
  view,
  blocks,
  result,
  datasets,
  selectedBlockId,
  onSelectBlock,
  onResult,
  onDataset,
  onOpenDataset,
  onLayoutChange,
  onRemoveFromView,
  onToggleCollapsed
}: {
  view: NotebookView
  blocks: WorkbenchPanel[]
  result: ResultTable
  datasets: DatasetInfo[]
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
  onResult: (result: ResultTable) => void
  onDataset: (dataset: DatasetInfo) => void
  onOpenDataset: (dataset: DatasetInfo) => void
  onLayoutChange: (layout: Layout) => void
  onRemoveFromView: (id: string) => void
  onToggleCollapsed: (id: string) => void
}) {
  const { width, containerRef, mounted } = useContainerWidth()
  const visibleBlocks = useMemo(() => {
    const byId = new Map(blocks.map((block) => [block.id, block]))
    return view.blockIds.map((id) => byId.get(id)).filter(Boolean) as WorkbenchPanel[]
  }, [blocks, view.blockIds])

  return (
    <div className="v2-workspace-scroll" ref={containerRef}>
      {!visibleBlocks.length && (
        <div className="v2-empty-workspace">
          <Text weight="semibold" size={300}>This view is empty</Text>
          <Caption1>Add a block from the Project panel or make an existing block visible here from the Inspector.</Caption1>
        </div>
      )}
      {mounted && (
        <ReactGridLayout
          width={width}
          layout={view.layout}
          onLayoutChange={onLayoutChange}
          gridConfig={{ cols: 12, rowHeight: 34, margin: [12, 12], containerPadding: [14, 14] }}
          dragConfig={{ enabled: true, handle: '.drag-handle' }}
          resizeConfig={{ enabled: true, handles: ['se', 'e', 's'] }}
          compactor={verticalCompactor}
        >
          {visibleBlocks.map((panel) => (
            <div key={panel.id} className={selectedBlockId === panel.id ? 'v2-grid-item-selected' : ''} onMouseDown={() => onSelectBlock(panel.id)}>
              <PanelShell
                title={panel.title}
                subtitle={panel.subtitle}
                removable
                collapsed={view.collapsedIds?.includes(panel.id) ?? false}
                onToggleCollapsed={() => onToggleCollapsed(panel.id)}
                onRemove={() => onRemoveFromView(panel.id)}
              >
                <CorePanelContent
                  panel={panel}
                  result={result}
                  onResult={onResult}
                  datasets={datasets}
                  onDataset={onDataset}
                  onOpenDataset={onOpenDataset}
                />
              </PanelShell>
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  )
}
