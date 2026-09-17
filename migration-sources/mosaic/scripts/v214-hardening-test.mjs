import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

async function loadTs(file) {
  let source = fs.readFileSync(file, 'utf8')
  source = source.replace(/^import type .*$/gm, '')
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}

const model = await loadTs('src/v2/model.ts')
const projectExport = await loadTs('src/v2/projectExport.ts')
const ipynb = await loadTs('src/v2/ipynb.ts')

const blocks = [
  { id: 'code-a', type: 'python', title: 'A', notebook: { source: 'ipynb', cellId: 'a', cellType: 'code', originalIndex: 0, language: 'python' } },
  { id: 'out-a', type: 'notebook-output', title: 'A output', notebook: { source: 'ipynb', cellId: 'a', cellType: 'output', originalIndex: 0, parentCellId: 'a' } },
  { id: 'notes', type: 'markdown', title: 'Notes' }
]
const view = {
  id: 'notebook', label: 'Notebook', description: '',
  blockIds: ['code-a', 'out-a', 'notes'],
  layout: [
    { i: 'code-a', x: 0, y: 0, w: 12, h: 10 },
    { i: 'out-a', x: 0, y: 10, w: 12, h: 7 },
    { i: 'notes', x: 0, y: 17, w: 12, h: 6 }
  ]
}
const projectRemoval = model.projectRemovalIds(blocks, 'code-a')
if (projectRemoval.join(',') !== 'code-a,out-a') throw new Error('deleting an imported code cell must include its saved output')
if (model.projectRemovalIds(blocks, 'out-a').join(',') !== 'out-a') throw new Error('deleting an output directly should not delete its parent code cell')
if (model.viewRemovalIds(blocks, view, 'code-a').join(',') !== 'code-a,out-a') throw new Error('view removal did not preserve imported code/output grouping')

const dash = {
  id: 'dashboard', label: 'Dashboard', description: '', blockIds: ['a', 'b'],
  layout: [
    { i: 'a', x: 0, y: 0, w: 6, h: 9 },
    { i: 'b', x: 6, y: 0, w: 6, h: 9 }
  ]
}
const wide = model.setDashboardTileWidth(dash, 'a', 'wide')
const wideA = wide.layout.find((item) => item.i === 'a')
const wideB = wide.layout.find((item) => item.i === 'b')
if (!wideA || wideA.w !== 12 || wideA.x !== 0 || !wideB || wideA.y < wideB.y + wideB.h) throw new Error('wide dashboard tile overlaps existing content')
const compact = model.setDashboardTileWidth(wide, 'a', 'half')
const compactA = compact.layout.find((item) => item.i === 'a')
if (!compactA || compactA.w !== 6) throw new Error('dashboard tile did not return to half width')

const snapshot = {
  format: 'mosaic-v2-notebook-project', version: '2.1.4', currentViewId: 'notebook',
  blocks,
  views: [{ ...view, blockIds: [...view.blockIds, 'ghost'], layout: [...view.layout, { i: 'ghost', x: 0, y: 50, w: 12, h: 4 }] }],
  datasets: [], notebookInfo: null,
  result: { columns: ['x'], rows: [{ x: 1 }], transport: 'arrow-ipc', arrowIpc: [1, 2, 3] },
  blockState: {
    'mosaic:v2:code:code-a': 'print(1)',
    'mosaic:v2:code:ghost': 'stale',
    'mosaic:v2:dark': true
  }
}
const restored = projectExport.parseProjectSnapshot(JSON.stringify(snapshot))
if (restored.views[0].blockIds.includes('ghost') || restored.views[0].layout.some((item) => item.i === 'ghost')) throw new Error('project import did not filter stale layout references')
if ('mosaic:v2:code:ghost' in restored.blockState || 'mosaic:v2:dark' in restored.blockState) throw new Error('project import accepted stale/global block state')
if (restored.result.transport !== 'rows' || restored.result.arrowIpc) throw new Error('project import must restore serialized result as row transport')
let rejected = false
try { projectExport.parseProjectSnapshot(JSON.stringify({ format: 'wrong', blocks: [], views: [] })) } catch { rejected = true }
if (!rejected) throw new Error('invalid project format was not rejected')

const richNotebook = {
  nbformat: 4, nbformat_minor: 5,
  metadata: { language_info: { name: 'python' } },
  cells: [{
    id: 'table-cell', cell_type: 'code', execution_count: 1, metadata: {}, source: ['display(df)'],
    outputs: [{ output_type: 'display_data', metadata: {}, data: {
      'application/vnd.dataresource+json': {
        schema: { fields: [{ name: 'country', type: 'string' }, { name: 'revenue', type: 'number' }] },
        data: [{ country: 'NO', revenue: 10 }, { country: 'CH', revenue: 20 }]
      },
      'text/plain': ['  country  revenue']
    }}]
  }]
}
const imported = ipynb.parseIpynb(JSON.stringify(richNotebook), 'rich.ipynb')
const outputBlock = imported.blocks.find((block) => block.type === 'notebook-output')
const outputState = outputBlock ? imported.blockState[`mosaic:v2:jupyter-output:${outputBlock.id}`] : null
if (!Array.isArray(outputState) || outputState[0]?.table?.columns?.join(',') !== 'country,revenue' || outputState[0]?.table?.rows?.length !== 2) throw new Error('Jupyter dataresource table was not normalized')

const app = fs.readFileSync('src/App.tsx', 'utf8')
const inspector = fs.readFileSync('src/v2/Inspector.tsx', 'utf8')
const outputPanel = fs.readFileSync('src/v2/JupyterOutputPanel.tsx', 'utf8')
const checks = [
  ['project restore control', app.includes('Open project') && app.includes('parseProjectSnapshot')],
  ['project restore reattaches local assets', app.includes('selectStoredImportsForProject(projectState, storedPayloads)')],
  ['group-aware delete', app.includes('projectRemovalIds(blocks, selectedBlock.id)')],
  ['dashboard size controls', inspector.includes('Half width') && inspector.includes('Full width')],
  ['structured notebook tables render as tables', outputPanel.includes('jupyter-output-table') && outputPanel.includes('output.table.rows.slice(0, 100)')]
]
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
console.log('V2.1.4 hardening behavior PASS (project round-trip + output grouping + dashboard authoring)')

const appSource = fs.readFileSync('src/App.tsx', 'utf8')
if (!appSource.includes('snapshot.blocks.forEach((block) => clearBlockState(block.id))')) throw new Error('project import does not clear stale state for incoming block IDs')
