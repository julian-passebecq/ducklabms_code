import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Caption1,
  Divider,
  FluentProvider,
  Tab,
  TabList,
  Text,
  Tooltip,
  webDarkTheme,
  webLightTheme
} from '@fluentui/react-components'
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowResetRegular,
  ChevronRightRegular,
  DatabaseRegular,
  NavigationRegular,
  SparkleRegular,
  PlayRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular
} from '@fluentui/react-icons'
import type { Layout } from 'react-grid-layout'
import { usePersistentState } from './hooks/usePersistentState'
import { initialResult } from './data/sample'
import { latestResult, serializableResult, stampResult } from './runtime/resultBus'
import { runBlocksSequentially } from './runtime/scheduler'
import { loadStoredImports, selectStoredImportsForProject, type ProjectStoreState } from './runtime/projectStore'
import { restoreStoredFile } from './runtime/duckdb'
import type { DatasetInfo, ResultTable, WorkbenchPanel } from './types'
import { V2Workspace } from './v2/V2Workspace'
import { Inspector } from './v2/Inspector'
import { canMoveNotebookGroup, coreBlockPalette, initialBlocks, initialViews, insertIdAfter, moveNotebookGroup, placeAfter, placeAtBottom, placeDashboardTile, projectRemovalIds, resetViewLayoutGeometry, resolveSqlTarget, runnableBlockIds, runtimeLabel, setDashboardTileWidth, toggleCollapsedBlock, viewRemovalIds, type CorePanelType, type NotebookView } from './v2/model'
import { parseIpynb, type ImportedNotebookInfo } from './v2/ipynb'
import { buildIpynbDocument } from './v2/ipynbExport'
import { collectProjectBlockState, parseProjectSnapshot, restoreResultSnapshot } from './v2/projectExport'
import './styles.css'

const baseDatasets: DatasetInfo[] = [
  { id: 'orders', name: 'orders', tableName: 'orders', kind: 'table', detail: '8,026 rows · demo order facts', runtime: 'browser', layer: 'source' },
  { id: 'customers', name: 'customers', tableName: 'customers', kind: 'table', detail: '1,400 rows · demo customer dimension', runtime: 'browser', layer: 'source' }
]

function readResult(): ResultTable {
  try {
    const raw = localStorage.getItem('mosaic:v2:last-result')
    if (!raw) return initialResult
    return restoreResultSnapshot(JSON.parse(raw)) ?? initialResult
  } catch {
    return initialResult
  }
}

function persistResult(result: ResultTable) {
  try { localStorage.setItem('mosaic:v2:last-result', JSON.stringify(serializableResult(result, 250))) } catch { /* best effort */ }
}

function cloneViews() {
  return initialViews.map((view) => {
    const layout = view.layout.map((item) => ({ ...item }))
    return { ...view, blockIds: [...view.blockIds], layout, defaultLayout: layout.map((item) => ({ ...item })) }
  })
}

function createBlock(type: CorePanelType, count: number): WorkbenchPanel {
  const palette = coreBlockPalette.find((item) => item.type === type)
  return {
    id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: count > 1 ? `${palette?.label ?? type} ${count}` : palette?.label ?? type,
    subtitle: runtimeLabel(type)
  }
}

function clearBlockState(blockId: string) {
  try {
    const prefixes = [`mosaic:v2:code:${blockId}`, `mosaic:v2:markdown:${blockId}`, `mosaic:v2:jupyter-output:${blockId}`]
    const remove: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) remove.push(key)
    }
    remove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage is best-effort; a private-mode quota failure must not block UI actions.
  }
}

function copyBlockState(sourceId: string, targetId: string) {
  try {
    const namespaces = ['code', 'markdown', 'jupyter-output']
    for (const namespace of namespaces) {
      const sourceKey = `mosaic:v2:${namespace}:${sourceId}`
      const value = localStorage.getItem(sourceKey)
      if (value !== null) localStorage.setItem(`mosaic:v2:${namespace}:${targetId}`, value)
    }
  } catch {
    // Duplicate still works even when browser persistence is unavailable.
  }
}

function exportProject(blocks: WorkbenchPanel[], views: NotebookView[], viewId: string, datasets: DatasetInfo[], result: ResultTable, notebookInfo: ImportedNotebookInfo | null) {
  const blockState = collectProjectBlockState(blocks, localStorage)
  const snapshot = {
    format: 'mosaic-v2-notebook-project',
    version: '2.1.7',
    exportedAt: new Date().toISOString(),
    currentViewId: viewId,
    blocks,
    views,
    datasets,
    notebookInfo,
    result: serializableResult(result, 1000),
    blockState
  }
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `mosaic-v2-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}


function exportIpynb(blocks: WorkbenchPanel[], views: NotebookView[], notebookInfo: ImportedNotebookInfo | null) {
  const notebook = buildIpynbDocument({ blocks, views, notebookInfo, storage: localStorage })
  const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/x-ipynb+json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const base = (notebookInfo?.title || 'mosaic-notebook').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'mosaic-notebook'
  anchor.download = `${base}-mosaic.ipynb`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [blocks, setBlocks] = usePersistentState<WorkbenchPanel[]>('mosaic:v2:blocks', initialBlocks)
  const [views, setViews] = usePersistentState<NotebookView[]>('mosaic:v2:views', cloneViews())
  const [viewId, setViewId] = usePersistentState('mosaic:v2:current-view', 'notebook')
  const [datasets, setDatasets] = usePersistentState<DatasetInfo[]>('mosaic:v2:datasets', baseDatasets)
  const [dark, setDark] = usePersistentState('mosaic:v2:dark', false)
  const [explorerOpen, setExplorerOpen] = usePersistentState('mosaic:v2:explorer-open', true)
  const [inspectorOpen, setInspectorOpen] = usePersistentState('mosaic:v2:inspector-open', true)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('sql-main')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notebookInfo, setNotebookInfo] = usePersistentState<ImportedNotebookInfo | null>('mosaic:v2:notebook-info', null)
  const [importNotice, setImportNotice] = useState('')
  const ipynbInputRef = useRef<HTMLInputElement | null>(null)
  const projectInputRef = useRef<HTMLInputElement | null>(null)
  const [result, setResult] = useState<ResultTable>(() => stampResult(readResult()))
  const [workspaceRevision, setWorkspaceRevision] = useState(0)

  const currentView = useMemo(() => views.find((view) => view.id === viewId) ?? views[0] ?? cloneViews()[0], [viewId, views])
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedBlockId) ?? null, [blocks, selectedBlockId])
  const blockMap = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks])

  const publishResult = useCallback((next: ResultTable) => {
    const stamped = stampResult(next)
    setResult(stamped)
    persistResult(stamped)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const payloads = await loadStoredImports()
      const state: ProjectStoreState = { version: '2.1.7', activeView: viewId, datasets, result: serializableResult(result, 250), savedAt: new Date().toISOString() }
      const selected = selectStoredImportsForProject(state, payloads)
      const restored: DatasetInfo[] = []
      for (const payload of selected) {
        try { restored.push(await restoreStoredFile(payload.entry.dataset, payload.entry.originalName, payload.entry.storageName, payload.bytes)) } catch { /* ignore missing asset */ }
      }
      if (cancelled || !restored.length) return
      setDatasets((current) => {
        const next = [...current]
        restored.forEach((dataset) => {
          const index = next.findIndex((item) => item.tableName === dataset.tableName || item.id === dataset.id)
          if (index >= 0) next[index] = { ...dataset, assetFingerprint: current[index]?.assetFingerprint }
          else next.push(dataset)
        })
        return next
      })
    })()
    return () => { cancelled = true }
    // Restore browser-local file assets once on startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateView = useCallback((id: string, updater: (view: NotebookView) => NotebookView) => {
    setViews((current) => current.map((view) => view.id === id ? updater(view) : view))
  }, [setViews])

  const updateCurrentLayout = useCallback((layout: Layout) => {
    updateView(currentView.id, (view) => ({ ...view, layout }))
  }, [currentView.id, updateView])

  const addBlock = (type: CorePanelType) => {
    const count = blocks.filter((block) => block.type === type).length + 1
    const block = createBlock(type, count)
    setBlocks((current) => {
      const index = selectedBlockId ? current.findIndex((item) => item.id === selectedBlockId) : -1
      if (index < 0) return [...current, block]
      return [...current.slice(0, index + 1), block, ...current.slice(index + 1)]
    })
    updateView(currentView.id, (view) => {
      const selected = selectedBlockId && view.blockIds.includes(selectedBlockId) ? selectedBlockId : null
      const placed = placeAfter(view.layout, selected, block.id)
      return { ...view, blockIds: insertIdAfter(view.blockIds, selected, block.id), layout: placed.layout }
    })
    setSelectedBlockId(block.id)
    setPaletteOpen(false)
  }

  const duplicateSelectedBlock = () => {
    if (!selectedBlock) return
    const copy: WorkbenchPanel = {
      ...selectedBlock,
      id: `${selectedBlock.type}-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${selectedBlock.title} copy`,
      subtitle: selectedBlock.subtitle,
      // A duplicate is a Mosaic block, not a second representation of the same
      // source Jupyter cell. Keeping the original cell id would break identity.
      notebook: undefined
    }
    copyBlockState(selectedBlock.id, copy.id)
    setBlocks((current) => {
      const index = current.findIndex((item) => item.id === selectedBlock.id)
      if (index < 0) return [...current, copy]
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]
    })
    updateView(currentView.id, (view) => {
      const selected = view.blockIds.includes(selectedBlock.id) ? selectedBlock.id : null
      const placed = placeAfter(view.layout, selected, copy.id)
      return { ...view, blockIds: insertIdAfter(view.blockIds, selected, copy.id), layout: placed.layout }
    })
    setSelectedBlockId(copy.id)
  }

  const newBlankNotebook = () => {
    blocks.forEach((block) => clearBlockState(block.id))
    initialBlocks.forEach((block) => clearBlockState(block.id))
    setBlocks(initialBlocks.map((block) => ({ ...block })))
    setViews(cloneViews())
    setNotebookInfo(null)
    setViewId('notebook')
    setSelectedBlockId('sql-main')
    setPaletteOpen(false)
    publishResult(initialResult)
    setWorkspaceRevision((value) => value + 1)
    setImportNotice('New blank notebook created. Existing datasets remain available in the project catalog.')
  }

  const toggleBlockInView = (targetViewId: string, visible: boolean) => {
    if (!selectedBlock) return
    updateView(targetViewId, (view) => {
      const already = view.blockIds.includes(selectedBlock.id)
      if (visible && !already) {
        const item = view.id === 'dashboard' ? placeDashboardTile(view.layout, selectedBlock.id) : placeAtBottom(view.layout, selectedBlock.id)
        return { ...view, blockIds: [...view.blockIds, selectedBlock.id], layout: [...view.layout, item] }
      }
      if (!visible && already) {
        const expandedHeights = { ...(view.expandedHeights ?? {}) }
        delete expandedHeights[selectedBlock.id]
        return {
          ...view,
          blockIds: view.blockIds.filter((id) => id !== selectedBlock.id),
          layout: view.layout.filter((item) => item.i !== selectedBlock.id),
          collapsedIds: (view.collapsedIds ?? []).filter((id) => id !== selectedBlock.id),
          expandedHeights
        }
      }
      return view
    })
  }

  const removeFromCurrentView = (blockId: string) => {
    updateView(currentView.id, (view) => {
      const removalIds = new Set(viewRemovalIds(blocks, view, blockId))
      const expandedHeights = { ...(view.expandedHeights ?? {}) }
      removalIds.forEach((id) => delete expandedHeights[id])
      return {
        ...view,
        blockIds: view.blockIds.filter((id) => !removalIds.has(id)),
        layout: view.layout.filter((item) => !removalIds.has(item.i)),
        collapsedIds: (view.collapsedIds ?? []).filter((id) => !removalIds.has(id)),
        expandedHeights
      }
    })
    if (selectedBlockId === blockId) setSelectedBlockId(null)
  }

  const deleteProjectBlock = () => {
    if (!selectedBlock) return
    const removalIds = new Set(projectRemovalIds(blocks, selectedBlock.id))
    removalIds.forEach(clearBlockState)
    setBlocks((current) => current.filter((block) => !removalIds.has(block.id)))
    setViews((current) => current.map((view) => {
      const expandedHeights = { ...(view.expandedHeights ?? {}) }
      removalIds.forEach((id) => delete expandedHeights[id])
      return {
        ...view,
        blockIds: view.blockIds.filter((blockId) => !removalIds.has(blockId)),
        layout: view.layout.filter((item) => !removalIds.has(item.i)),
        collapsedIds: (view.collapsedIds ?? []).filter((blockId) => !removalIds.has(blockId)),
        expandedHeights
      }
    }))
    setSelectedBlockId(null)
  }

  const resetViewLayout = () => {
    const initial = initialViews.find((view) => view.id === currentView.id)
    const baseline = currentView.defaultLayout ?? initial?.layout
    if (!baseline) return
    updateView(currentView.id, (view) => resetViewLayoutGeometry(view, baseline))
  }

  const toggleCollapsed = (blockId: string) => {
    updateView(currentView.id, (view) => toggleCollapsedBlock(view, blockId))
  }

  const importIpynb = async (file: File) => {
    try {
      setImportNotice(`Reading ${file.name}…`)
      const imported = parseIpynb(await file.text(), file.name)
      blocks.forEach((block) => clearBlockState(block.id))
      for (const [key, value] of Object.entries(imported.blockState)) {
        try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage is best effort */ }
      }
      setBlocks(imported.blocks)
      setViews(imported.views)
      setWorkspaceRevision((value) => value + 1)
      setNotebookInfo(imported.info)
      publishResult({
        columns: [],
        rows: [],
        totalRows: 0,
        transport: 'rows',
        origin: {
          blockId: 'ipynb-import',
          label: `${imported.info.title} · no live result yet`,
          kind: 'import',
          runtime: 'browser',
          createdAt: new Date().toISOString()
        }
      })
      setViewId('notebook')
      setSelectedBlockId(imported.blocks.find((block) => block.type === 'python' || block.type === 'sql')?.id ?? imported.blocks[0]?.id ?? null)
      setExplorerOpen(true)
      setInspectorOpen(true)
      setPaletteOpen(false)
      setImportNotice(`${imported.info.title}: ${imported.info.cellCount} cells imported. Switch to Two-page or Code + explanation to reorganize the same notebook.`)
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : String(error))
    }
  }

  const importProject = async (file: File) => {
    try {
      setImportNotice(`Reading ${file.name}…`)
      const snapshot = parseProjectSnapshot(await file.text())
      blocks.forEach((block) => clearBlockState(block.id))
      snapshot.blocks.forEach((block) => clearBlockState(block.id))
      for (const [key, value] of Object.entries(snapshot.blockState)) {
        try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* best effort */ }
      }
      setBlocks(snapshot.blocks)
      setViews(snapshot.views)
      setWorkspaceRevision((value) => value + 1)
      let nextDatasets = snapshot.datasets
      const storedPayloads = await loadStoredImports()
      const projectState: ProjectStoreState = {
        version: '2.1.7',
        activeView: snapshot.currentViewId,
        datasets: nextDatasets,
        result: snapshot.result,
        savedAt: new Date().toISOString()
      }
      const matchingPayloads = selectStoredImportsForProject(projectState, storedPayloads)
      const restoredDatasets: DatasetInfo[] = []
      for (const payload of matchingPayloads) {
        try { restoredDatasets.push(await restoreStoredFile(payload.entry.dataset, payload.entry.originalName, payload.entry.storageName, payload.bytes)) } catch { /* browser-local asset unavailable */ }
      }
      if (restoredDatasets.length) {
        nextDatasets = [...nextDatasets]
        for (const dataset of restoredDatasets) {
          const index = nextDatasets.findIndex((item) => item.id === dataset.id || item.tableName === dataset.tableName)
          if (index >= 0) nextDatasets[index] = { ...dataset, assetFingerprint: nextDatasets[index].assetFingerprint }
          else nextDatasets.push(dataset)
        }
      }
      setDatasets(nextDatasets)
      setNotebookInfo(snapshot.notebookInfo)
      setViewId(snapshot.currentViewId)
      setSelectedBlockId(snapshot.blocks.find((block) => block.type === 'sql' || block.type === 'python' || block.type === 'polars')?.id ?? snapshot.blocks[0]?.id ?? null)
      publishResult(snapshot.result)
      setExplorerOpen(true)
      setInspectorOpen(true)
      setPaletteOpen(false)
      const assetNote = matchingPayloads.length ? ` ${matchingPayloads.length} browser-local dataset asset${matchingPayloads.length === 1 ? '' : 's'} reattached.` : ''
      setImportNotice(`Project restored from ${file.name}. Layouts, notebook blocks and saved outputs were reloaded.${assetNote}`)
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : String(error))
    }
  }

  const openDataset = useCallback((dataset: DatasetInfo) => {
    if (!dataset.tableName) return
    const target = resolveSqlTarget(blocks, views, currentView.id, selectedBlockId)
    let sqlBlock = target.blockId ? blockMap.get(target.blockId) : undefined
    let targetViewId = target.viewId

    if (!sqlBlock) {
      const count = blocks.filter((block) => block.type === 'sql').length + 1
      const created = createBlock('sql', count)
      sqlBlock = created
      targetViewId = views.some((view) => view.id === 'notebook') ? 'notebook' : currentView.id
      setBlocks((current) => [...current, created])
      updateView(targetViewId, (view) => {
        const placed = placeAfter(view.layout, null, created.id)
        return { ...view, blockIds: [...view.blockIds, created.id], layout: placed.layout }
      })
    }

    const sql = `-- ${dataset.name}\nSELECT *\nFROM "${dataset.tableName}"\nLIMIT 100;`
    try { localStorage.setItem(`mosaic:v2:code:${sqlBlock.id}`, JSON.stringify(sql)) } catch { /* best effort */ }
    setViewId(targetViewId)
    setSelectedBlockId(sqlBlock.id)
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('mosaic:replace-sql', { detail: { sql, blockId: sqlBlock.id } })), 0)
  }, [blockMap, blocks, currentView.id, selectedBlockId, setBlocks, setViewId, updateView, views])

  const addDataset = useCallback((dataset: DatasetInfo) => {
    setDatasets((current) => [{ ...dataset, layer: dataset.layer ?? 'source', producedBy: dataset.producedBy ?? 'Import' }, ...current.filter((item) => item.id !== dataset.id && item.tableName !== dataset.tableName)])
  }, [setDatasets])

  const runnableIds = useMemo(() => runnableBlockIds(currentView, blocks), [blocks, currentView])

  const runVisible = async () => {
    // Notebook order is execution order. Re-sorting by runtime breaks imported
    // notebooks where Python/SQL cells intentionally alternate.
    await runBlocksSequentially(runnableIds)
  }

  const moveSelectedNotebookGroup = (direction: -1 | 1) => {
    if (!selectedBlock || currentView.id !== 'notebook') return
    updateView('notebook', (view) => moveNotebookGroup(view, blocks, selectedBlock.id, direction))
  }

  const canMoveSelectedEarlier = Boolean(selectedBlock && currentView.id === 'notebook' && canMoveNotebookGroup(currentView, blocks, selectedBlock.id, -1))
  const canMoveSelectedLater = Boolean(selectedBlock && currentView.id === 'notebook' && canMoveNotebookGroup(currentView, blocks, selectedBlock.id, 1))

  const pinSelectedToDashboard = () => toggleBlockInView('dashboard', true)

  const setSelectedDashboardWidth = (mode: 'half' | 'wide') => {
    if (!selectedBlock) return
    updateView('dashboard', (view) => setDashboardTileWidth(view, selectedBlock.id, mode))
  }

  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} className={dark ? 'mosaic-theme dark' : 'mosaic-theme'}>
      <div className={`v2-shell ${explorerOpen ? '' : 'v2-no-explorer'} ${inspectorOpen ? '' : 'v2-no-inspector'}`}>
        <header className="v2-topbar">
          <div className="v2-brand">
            <div className="brand-mark">M</div>
            <div><Text weight="semibold" size={300}>Mosaic</Text><Caption1>notebook layout engine</Caption1></div>
          </div>

          <div className="v2-view-switcher">
            <TabList selectedValue={currentView.id} onTabSelect={(_, data) => setViewId(String(data.value))} size="small">
              {views.map((view) => <Tab key={view.id} value={view.id}>{view.label}</Tab>)}
            </TabList>
          </div>

          <div className="v2-top-actions">
            <Badge appearance="tint" color="success" size="small">Local-first</Badge>
            <Tooltip content="Reset this view's layout" relationship="label"><Button appearance="subtle" size="small" icon={<ArrowResetRegular />} onClick={resetViewLayout} /></Tooltip>
            <Tooltip content={dark ? 'Light theme' : 'Dark theme'} relationship="label"><Button appearance="subtle" size="small" icon={dark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />} onClick={() => setDark((value) => !value)} /></Tooltip>
            <input ref={ipynbInputRef} className="v2-hidden-input" type="file" accept=".ipynb,application/x-ipynb+json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importIpynb(file); event.currentTarget.value = '' }} />
            <input ref={projectInputRef} className="v2-hidden-input" type="file" accept=".json,application/json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importProject(file); event.currentTarget.value = '' }} />
            <Button appearance="subtle" size="small" onClick={() => ipynbInputRef.current?.click()}>Open .ipynb</Button>
            <Button appearance="subtle" size="small" onClick={() => projectInputRef.current?.click()}>Open project</Button>
            <Tooltip content="Export notebook cells and saved Jupyter outputs. Use Export project for datasets and all Mosaic-only presentation blocks." relationship="label">
              <Button appearance="subtle" size="small" icon={<ArrowDownloadRegular />} onClick={() => exportIpynb(blocks, views, notebookInfo)}>Export .ipynb</Button>
            </Tooltip>
            <Tooltip content="Export the complete Mosaic project, including layouts, datasets and presentation blocks." relationship="label">
              <Button appearance="subtle" size="small" onClick={() => exportProject(blocks, views, currentView.id, datasets, result, notebookInfo)}>Export project</Button>
            </Tooltip>
            <Button appearance="primary" size="small" icon={<PlayRegular />} disabled={!runnableIds.length} onClick={() => void runVisible()}>Run view</Button>
          </div>
        </header>

        <aside className="v2-activity-rail">
          <Tooltip content="Project explorer" relationship="label" positioning="after"><Button appearance="subtle" icon={<NavigationRegular />} onClick={() => setExplorerOpen((value) => !value)} /></Tooltip>
          <Tooltip content="Data" relationship="label" positioning="after"><Button appearance="subtle" icon={<DatabaseRegular />} onClick={() => { setExplorerOpen(true); setViewId('dashboard') }} /></Tooltip>
          <div className="rail-spacer" />
          <Tooltip content="Inspector" relationship="label" positioning="after"><Button appearance="subtle" icon={<SparkleRegular />} onClick={() => setInspectorOpen((value) => !value)} /></Tooltip>
        </aside>

        {explorerOpen && (
          <aside className="v2-explorer">
            <div className="v2-pane-head">
              <div><Caption1>PROJECT</Caption1><Text weight="semibold">{notebookInfo?.title ?? 'Untitled analysis'}</Text></div>
              <Button appearance="subtle" size="small" onClick={newBlankNotebook}>New</Button>
            </div>
            <div className="v2-explorer-actions">
              <Button appearance="secondary" size="small" icon={<AddRegular />} onClick={() => setPaletteOpen((value) => !value)}>Add block</Button>
              <Button appearance="subtle" size="small" onClick={() => ipynbInputRef.current?.click()}>Open .ipynb</Button>
              <Button appearance="subtle" size="small" onClick={() => projectInputRef.current?.click()}>Open project</Button>
            </div>

            {notebookInfo && (
              <div className="v2-notebook-card">
                <Caption1>OPEN NOTEBOOK</Caption1>
                <Text weight="semibold" size={200}>{notebookInfo.title}</Text>
                <div className="v2-notebook-meta">
                  <span>Cells</span><span>{notebookInfo.cellCount} · {notebookInfo.codeCellCount} code · {notebookInfo.markdownCellCount} text</span>
                  <span>Kernel</span><span>{notebookInfo.kernel ?? notebookInfo.language}</span>
                  <span>Outputs</span><span>{notebookInfo.outputBlockCount} saved output blocks</span>
                </div>
              </div>
            )}
            {importNotice && <div className="v2-import-notice">{importNotice}</div>}

            {paletteOpen && (
              <div className="v2-palette">
                <div className="v2-palette-head"><Text weight="semibold">Add to {currentView.label}</Text><Button appearance="subtle" size="small" onClick={() => setPaletteOpen(false)}>×</Button></div>
                {coreBlockPalette.map((item) => (
                  <button key={item.type} className="v2-palette-item" onClick={() => addBlock(item.type)}>
                    <Text weight="semibold" size={200}>{item.label}</Text><Caption1>{item.description}</Caption1>
                  </button>
                ))}
              </div>
            )}

            <Divider />
            <div className="v2-explorer-section">
              <Caption1>VIEWS</Caption1>
              {views.map((view) => (
                <button key={view.id} className={`v2-explorer-row ${view.id === currentView.id ? 'active' : ''}`} onClick={() => setViewId(view.id)}>
                  <ChevronRightRegular /><div><Text size={200} weight="semibold">{view.label}</Text><Caption1>{view.description}</Caption1></div>
                </button>
              ))}
            </div>

            <div className="v2-explorer-section v2-data-section">
              <Caption1>DATA</Caption1>
              {datasets.filter((item) => item.runtime === 'browser').map((dataset) => (
                <button key={dataset.id} className="v2-data-row" disabled={!dataset.tableName} onClick={() => openDataset(dataset)}>
                  <DatabaseRegular /><div><Text size={200}>{dataset.tableName ?? dataset.name}</Text><Caption1>{dataset.detail}</Caption1></div>
                </button>
              ))}
            </div>
          </aside>
        )}

        <main className="v2-main">
          <div className="v2-workspace-head">
            <div><Text weight="semibold" size={300}>{currentView.label}</Text><Caption1>{currentView.description}</Caption1></div>
            <div className="v2-workspace-meta">
              <Badge appearance="outline" size="small">{currentView.blockIds.length} blocks</Badge>
              <Badge appearance="outline" size="small">drag · resize · reuse</Badge>
              {latestResult()?.origin && <Badge appearance="tint" color="informative" size="small">result: {latestResult()?.origin?.label}</Badge>}
            </div>
          </div>
          <V2Workspace
            key={`workspace-${workspaceRevision}`}
            view={currentView}
            blocks={blocks}
            result={result}
            datasets={datasets}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onResult={publishResult}
            onDataset={addDataset}
            onOpenDataset={openDataset}
            onLayoutChange={updateCurrentLayout}
            onRemoveFromView={removeFromCurrentView}
            onToggleCollapsed={toggleCollapsed}
          />
        </main>

        {inspectorOpen && (
          <Inspector
            block={selectedBlock}
            views={views}
            currentViewId={currentView.id}
            result={result}
            onToggleView={toggleBlockInView}
            onPinToDashboard={pinSelectedToDashboard}
            onDashboardWidth={setSelectedDashboardWidth}
            onDuplicateBlock={duplicateSelectedBlock}
            onMoveEarlier={() => moveSelectedNotebookGroup(-1)}
            onMoveLater={() => moveSelectedNotebookGroup(1)}
            canMoveEarlier={canMoveSelectedEarlier}
            canMoveLater={canMoveSelectedLater}
            onRemoveProjectBlock={deleteProjectBlock}
          />
        )}

        <footer className="v2-statusbar">
          <span>V2.1.7 notebook core</span>
          <span>{currentView.label}</span>
          <span>{result.truncated ? `${result.rows.length}/${result.totalRows ?? '?'} preview rows` : `${result.totalRows ?? result.rows.length} rows`}</span>
          <span>{result.columns.length} columns</span>
          <span>{result.origin?.label ?? 'demo result'}</span>
        </footer>
      </div>
    </FluentProvider>
  )
}
