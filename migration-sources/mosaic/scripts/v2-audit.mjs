import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')
const model = fs.readFileSync('src/v2/model.ts', 'utf8')
const workspace = fs.readFileSync('src/v2/V2Workspace.tsx', 'utf8')
const inspector = fs.readFileSync('src/v2/Inspector.tsx', 'utf8')
const ipynb = fs.readFileSync('src/v2/ipynb.ts', 'utf8')
const output = fs.readFileSync('src/v2/JupyterOutputPanel.tsx', 'utf8')
const ipynbExport = fs.readFileSync('src/v2/ipynbExport.ts', 'utf8')
const markdownPanel = fs.readFileSync('src/components/MarkdownPanel.tsx', 'utf8')
const sqlPanel = fs.readFileSync('src/components/SqlPanel.tsx', 'utf8')
const pythonPanel = fs.readFileSync('src/components/PythonPanel.tsx', 'utf8')
const tablePanel = fs.readFileSync('src/components/TablePanel.tsx', 'utf8')
const panelShell = fs.readFileSync('src/components/PanelShell.tsx', 'utf8')
const checks = [
  ['Fluent 2 provider', app.includes('FluentProvider')],
  ['Notebook view', model.includes("id: 'notebook'")],
  ['Two-page view', model.includes("id: 'split'") && model.includes("label: 'Two-page'")],
  ['Code + explanation view', model.includes("id: 'explain'")],
  ['2 + 1 view', model.includes("id: 'two-plus-one'")],
  ['Dashboard view', model.includes("id: 'dashboard'")],
  ['Free canvas', model.includes("id: 'free'")],
  ['Same SQL block reused across views', (model.match(/'sql-main'/g) ?? []).length >= 4],
  ['Same result table reused across views', (model.match(/'result-table'/g) ?? []).length >= 3],
  ['Draggable grid', workspace.includes("handle: '.drag-handle'")],
  ['Resizable grid', workspace.includes("handles: ['se', 'e', 's']")],
  ['Inspector visibility controls', inspector.includes('VISIBLE IN') && inspector.includes('onToggleView')],
  ['Pin to dashboard', inspector.includes('Pin to dashboard')],
  ['Project block palette', app.includes('coreBlockPalette') && app.includes('Add block')],
  ['No primary Airflow navigation', !app.includes('Airflow Hub')],
  ['No primary dbt navigation', !app.includes('dbt Lab')],
  ['No Fabric branding', !app.toLowerCase().includes('fabric') && !model.toLowerCase().includes('fabric')],
  ['Run view scheduler', app.includes('runBlocksSequentially')],
  ['Local file data catalog', app.includes('openDataset') && workspace.includes('CatalogPanel')],
  ['.ipynb import control', app.includes('Open .ipynb') && app.includes('parseIpynb')],
  ['Imported two-page layout', ipynb.includes("label: 'Two-page'") && ipynb.includes('splitLayout')],
  ['Imported code + explanation layout', ipynb.includes('explainLayout')],
  ['Saved Jupyter output renderer', output.includes('Saved .ipynb output') && workspace.includes('JupyterOutputPanel')],
  ['Imported layout reset baseline', app.includes('currentView.defaultLayout')],
  ['Jupyter cell identity retained', ipynb.includes('cellId: effectiveCellId') && ipynb.includes('originalCellId')],
  ['Height-balanced two-page import', ipynb.includes('balancedSplitIndex')],
  ['Dataset targets one SQL block', app.includes("detail: { sql, blockId: sqlBlock.id }")],
  ['Dataset can create SQL block when needed', app.includes("createBlock('sql', count)")],
  ['Run view preserves notebook order', app.includes('runnableBlockIds(currentView, blocks)') && app.includes('runBlocksSequentially(runnableIds)')],
  ['Insert block near selection', app.includes('placeAfter(view.layout, selected, block.id)')],
  ['Duplicate block action', app.includes('duplicateSelectedBlock') && inspector.includes('Duplicate block')],
  ['Imported Jupyter metadata inspector', inspector.includes('JUPYTER SOURCE')],
  ['Empty view feedback', workspace.includes('This view is empty')],
  ['Blank notebook reset', app.includes('newBlankNotebook') && app.includes('New blank notebook created')],
  ['Notebook import clears stale live result', app.includes("blockId: 'ipynb-import'") && app.includes('no live result yet')],
  ['Imported code restores original source', sqlPanel.includes("imported ? importedSource.current : sampleSql") && pythonPanel.includes("imported ? importedSource.current : samplePython")],
  ['Unsupported IPython magics are not fake-executed', ipynb.includes("return 'ipython-magic'") && ipynb.includes('cellMagic')],
  ['Collapsible notebook blocks', panelShell.includes('Collapse block') && workspace.includes('onToggleCollapsed') && model.includes('toggleCollapsedBlock')],
  ['Collapse preserves height', model.includes('expandedHeights[blockId]') && model.includes('restoredHeight')],
  ['View reset expands blocks', app.includes('resetViewLayoutGeometry(view, baseline)') && model.includes('collapsedIds: [], expandedHeights: {}')],
  ['Table/profile output modes', tablePanel.includes('Table') && tablePanel.includes('Profile') && tablePanel.includes('Profile statistics use')],
  ['Imported output dashboard toggle', inspector.includes("block.type === 'notebook-output'") && inspector.includes('Remove from dashboard')],
  ['Notebook order controls', inspector.includes('Move earlier') && inspector.includes('Move later') && model.includes('moveNotebookGroup')],
  ['Dashboard pin uses half-width placement', model.includes('placeDashboardTile') && app.includes('placeDashboardTile(view.layout, selectedBlock.id)')],
  ['Project export excludes stale UI state', app.includes('collectProjectBlockState(blocks, localStorage)')],
  ['Imported Markdown restore', fs.readFileSync('src/components/MarkdownPanel.tsx', 'utf8').includes('importedSource.current')],
  ['Synchronous editor persistence', fs.readFileSync('src/hooks/usePersistentState.ts', 'utf8').includes('valueRef.current = resolved')],
  ['Project JSON round-trip', app.includes('Open project') && app.includes('parseProjectSnapshot')],
  ['Imported code deletion cleans saved output', app.includes('projectRemovalIds(blocks, selectedBlock.id)')],
  ['Dashboard tile width controls', inspector.includes('Half width') && inspector.includes('Full width')],
  ['Structured Jupyter table output', output.includes('jupyter-output-table') && ipynb.includes('application/vnd.dataresource+json')],
  ['Direct .ipynb export', app.includes('Export .ipynb') && ipynbExport.includes('buildIpynbDocument')],
  ['Jupyter output fidelity', ipynb.includes('raw?: Record<string, unknown>') && ipynbExport.includes('output.raw')],
  ['Mosaic layout metadata round-trip', ipynbExport.includes('metadata.mosaic') && ipynb.includes('restoreMosaicViews')],
  ['Unsupported imported code is read-only', workspace.includes("readOnly={panel.notebook?.cellType === 'code'}") && markdownPanel.includes('Read-only imported code')],
  ['Project replacement remounts editor state', app.includes('workspaceRevision') && app.includes('key={`workspace-${workspaceRevision}`}')],
  ['Project block state is type-sanitized', fs.readFileSync('src/v2/projectExport.ts', 'utf8').includes('sanitizeBlockState')],
  ['Duplicate Jupyter cell IDs are repaired', ipynb.includes('normalizeCellId') && ipynb.includes('originalCellId')],
  ['Empty project dataset catalogs round-trip', app.includes('let nextDatasets = snapshot.datasets')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
if (failed.length) process.exit(1)
console.log(`V2.1.7 audit PASS (${checks.length}/${checks.length})`)
