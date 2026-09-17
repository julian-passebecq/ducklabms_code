import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync('src/v2/model.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const ids = new Set(mod.initialBlocks.map((block) => block.id))
for (const view of mod.initialViews) {
  const blockIds = new Set(view.blockIds)
  if (blockIds.size !== view.blockIds.length) throw new Error(`${view.id}: duplicate block id`)
  if (view.layout.length !== view.blockIds.length) throw new Error(`${view.id}: layout/block count mismatch`)
  for (const id of view.blockIds) if (!ids.has(id)) throw new Error(`${view.id}: unknown block ${id}`)
  for (const item of view.layout) if (!blockIds.has(item.i)) throw new Error(`${view.id}: layout item ${item.i} is not visible`)
}
const sharedSqlViews = mod.initialViews.filter((view) => view.blockIds.includes('sql-main')).length
if (sharedSqlViews < 4) throw new Error('sql-main should be reused across multiple layouts')
const sharedTableViews = mod.initialViews.filter((view) => view.blockIds.includes('result-table')).length
if (sharedTableViews < 3) throw new Error('result-table should be reused across multiple layouts')
const placed = mod.placeAtBottom([{ i: 'a', x: 0, y: 0, w: 12, h: 8 }], 'b')
if (placed.y < 8 || placed.i !== 'b') throw new Error('placeAtBottom failed')

const splitLayout = [
  { i: 'left-a', x: 0, y: 0, w: 6, h: 8 },
  { i: 'right-a', x: 6, y: 0, w: 6, h: 8 },
  { i: 'left-b', x: 0, y: 8, w: 6, h: 8 },
  { i: 'right-b', x: 6, y: 8, w: 6, h: 8 }
]
const inserted = mod.placeAfter(splitLayout, 'left-a', 'left-new')
const insertedItem = inserted.layout.find((item) => item.i === 'left-new')
const shiftedLeft = inserted.layout.find((item) => item.i === 'left-b')
const untouchedRight = inserted.layout.find((item) => item.i === 'right-b')
if (!insertedItem || insertedItem.x !== 0 || insertedItem.y !== 8) throw new Error('placeAfter did not place below selected block')
if (!shiftedLeft || shiftedLeft.y <= 8) throw new Error('placeAfter did not shift overlapping column')
if (!untouchedRight || untouchedRight.y !== 8) throw new Error('placeAfter incorrectly shifted the other column')

const insertedIds = mod.insertIdAfter(['a', 'b', 'c'], 'b', 'x')
if (insertedIds.join(',') !== 'a,b,x,c') throw new Error('insertIdAfter failed')

const runnable = mod.runnableBlockIds(
  { id: 'order', label: 'Order', description: '', blockIds: ['py', 'text', 'sql', 'polars'], layout: [] },
  [
    { id: 'sql', type: 'sql', title: 'SQL' },
    { id: 'py', type: 'python', title: 'Python' },
    { id: 'polars', type: 'polars', title: 'Polars' },
    { id: 'text', type: 'markdown', title: 'Text' }
  ]
)
if (runnable.join(',') !== 'py,sql,polars') throw new Error('runnableBlockIds changed notebook order')

const targetBlocks = [
  { id: 'sql-a', type: 'sql', title: 'A' },
  { id: 'sql-b', type: 'sql', title: 'B' },
  { id: 'py-a', type: 'python', title: 'P' }
]
const targetViews = [
  { id: 'notebook', label: 'Notebook', description: '', blockIds: ['sql-a', 'py-a'], layout: [] },
  { id: 'split', label: 'Split', description: '', blockIds: ['sql-b', 'py-a'], layout: [] },
  { id: 'dashboard', label: 'Dashboard', description: '', blockIds: [], layout: [] }
]
const selectedTarget = mod.resolveSqlTarget(targetBlocks, targetViews, 'split', 'sql-b')
if (selectedTarget.blockId !== 'sql-b' || selectedTarget.viewId !== 'split') throw new Error('resolveSqlTarget ignored visible selected SQL')
const staleSelectionTarget = mod.resolveSqlTarget(targetBlocks, targetViews, 'dashboard', 'sql-b')
if (staleSelectionTarget.blockId !== 'sql-a' || staleSelectionTarget.viewId !== 'notebook') throw new Error('resolveSqlTarget used a selected SQL block hidden from the current view')
console.log(`V2 model behavior PASS (${mod.initialBlocks.length} blocks, ${mod.initialViews.length} views)`)
