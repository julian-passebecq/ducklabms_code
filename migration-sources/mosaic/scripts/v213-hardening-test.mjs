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

const blocks = [
  { id: 'intro', type: 'markdown', title: 'Intro', notebook: { source: 'ipynb', cellId: 'intro', cellType: 'markdown', originalIndex: 0 } },
  { id: 'code-a', type: 'python', title: 'A', notebook: { source: 'ipynb', cellId: 'a', cellType: 'code', originalIndex: 1, language: 'python' } },
  { id: 'out-a', type: 'notebook-output', title: 'A output', notebook: { source: 'ipynb', cellId: 'a', cellType: 'output', originalIndex: 1, parentCellId: 'a' } },
  { id: 'code-b', type: 'sql', title: 'B', notebook: { source: 'ipynb', cellId: 'b', cellType: 'code', originalIndex: 2, language: 'sql' } }
]
const view = {
  id: 'notebook', label: 'Notebook', description: '',
  blockIds: ['intro', 'code-a', 'out-a', 'code-b'],
  layout: [
    { i: 'intro', x: 1, y: 0, w: 10, h: 5 },
    { i: 'code-a', x: 1, y: 5, w: 10, h: 10 },
    { i: 'out-a', x: 1, y: 15, w: 10, h: 7 },
    { i: 'code-b', x: 1, y: 22, w: 10, h: 10 }
  ]
}

const moved = model.moveNotebookGroup(view, blocks, 'code-a', 1)
if (moved.blockIds.join(',') !== 'intro,code-b,code-a,out-a') throw new Error('notebook group move did not keep code/output together')
const movedY = Object.fromEntries(moved.layout.map((item) => [item.i, item.y]))
if (!(movedY['code-b'] < movedY['code-a'] && movedY['code-a'] < movedY['out-a'])) throw new Error('notebook visual order was not reflowed after move')
if (!model.canMoveNotebookGroup(view, blocks, 'out-a', -1)) throw new Error('saved output should move with its parent group')
if (model.canMoveNotebookGroup(view, blocks, 'intro', -1)) throw new Error('first group should not move earlier')

const resetMoved = model.resetViewLayoutGeometry(moved, view.layout)
const resetY = Object.fromEntries(resetMoved.layout.map((item) => [item.i, item.y]))
if (!(resetY['code-b'] < resetY['code-a'] && resetY['code-a'] < resetY['out-a'])) throw new Error('reset layout visually reverted semantic notebook order')
if (resetMoved.collapsedIds?.length || Object.keys(resetMoved.expandedHeights ?? {}).length) throw new Error('reset layout did not clear collapse state')

const tile1 = model.placeDashboardTile([], 'one')
if (tile1.x !== 0 || tile1.y !== 0 || tile1.w !== 6) throw new Error('first dashboard tile placement is wrong')
const tile2 = model.placeDashboardTile([tile1], 'two')
if (tile2.x !== 6 || tile2.y !== 0) throw new Error('second dashboard tile should fill the first row')
const tile3 = model.placeDashboardTile([tile1, tile2], 'three')
if (tile3.x !== 0 || tile3.y !== 9) throw new Error('third dashboard tile should start a new row')
const dashboardReset = model.resetViewLayoutGeometry({ id: 'dashboard', label: 'Dashboard', description: '', blockIds: ['one', 'two'], layout: [tile1, tile2] }, [tile1])
const dashboardNew = dashboardReset.layout.find((item) => item.i === 'two')
if (!dashboardNew || dashboardNew.w !== 6 || dashboardNew.x !== 6) throw new Error('dashboard reset did not preserve half-width placement for newly pinned blocks')

const state = new Map([
  ['mosaic:v2:code:code-a', JSON.stringify('print(1)')],
  ['mosaic:v2:jupyter-output:out-a', JSON.stringify([{ outputType: 'stream', text: '1' }])],
  ['mosaic:v2:code:deleted-old-cell', JSON.stringify('stale')],
  ['mosaic:v2:dark', JSON.stringify(true)],
  ['mosaic:v2:views', JSON.stringify([{ id: 'old' }])]
])
const exported = projectExport.collectProjectBlockState(blocks, { getItem: (key) => state.get(key) ?? null })
if (exported['mosaic:v2:code:code-a'] !== 'print(1)') throw new Error('active code state was not exported')
if (!Array.isArray(exported['mosaic:v2:jupyter-output:out-a'])) throw new Error('active notebook output state was not exported')
if ('mosaic:v2:code:deleted-old-cell' in exported) throw new Error('stale deleted block state leaked into project export')
if ('mosaic:v2:dark' in exported || 'mosaic:v2:views' in exported) throw new Error('global UI state leaked into project export')

const inspector = fs.readFileSync('src/v2/Inspector.tsx', 'utf8')
const app = fs.readFileSync('src/App.tsx', 'utf8')
const persistenceHook = fs.readFileSync('src/hooks/usePersistentState.ts', 'utf8')
const markdownPanel = fs.readFileSync('src/components/MarkdownPanel.tsx', 'utf8')
const required = [
  ['notebook order controls', inspector.includes('Move earlier') && inspector.includes('Move later')],
  ['dashboard uses free tile placement', app.includes('placeDashboardTile(view.layout, selectedBlock.id)')],
  ['project export is scoped', app.includes('collectProjectBlockState(blocks, localStorage)')],
  ['block persistence writes synchronously', persistenceHook.includes('valueRef.current = resolved') && persistenceHook.includes('localStorage.setItem(key, JSON.stringify(resolved))')],
  ['imported Markdown can restore original source', markdownPanel.includes("importedSource.current") && markdownPanel.includes('Restore')]
]
for (const [name, ok] of required) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
if (required.some(([, ok]) => !ok)) process.exit(1)
console.log('V2.1.3 hardening behavior PASS (order + dashboard + export scope)')
