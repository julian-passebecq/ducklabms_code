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

const projectExport = await loadTs('src/v2/projectExport.ts')

const ipynb = await loadTs('src/v2/ipynb.ts')
const oddBlocks = [
  { id: 'code-a', type: 'python', title: 'A', notebook: { source: 'ipynb', cellId: 'a', cellType: 'code', originalIndex: 0, language: 'python' } },
  { id: 'note-b', type: 'markdown', title: 'B', notebook: { source: 'ipynb', cellId: 'b', cellType: 'markdown', originalIndex: 1 } },
  { id: 'out-a', type: 'notebook-output', title: 'A output', notebook: { source: 'ipynb', cellId: 'a', parentCellId: 'a', cellType: 'output', originalIndex: 0 } },
  { id: 'note-c', type: 'markdown', title: 'C', notebook: { source: 'ipynb', cellId: 'c', cellType: 'markdown', originalIndex: 2 } }
]
const oddViews = ipynb.createImportedViews(oddBlocks, new Map())
const oddSplit = oddViews.find((view) => view.id === 'split')
const codePos = oddSplit?.layout.find((item) => item.i === 'code-a')
const outPos = oddSplit?.layout.find((item) => item.i === 'out-a')
if (!codePos || !outPos || codePos.x !== outPos.x) throw new Error('saved output was not grouped with its declared parent cell')

const base = {
  format: 'mosaic-v2-notebook-project',
  version: '2.1.5',
  currentViewId: 'notebook',
  blocks: [
    { id: 'a', type: 'sql', title: 'A' },
    { id: 'b', type: 'markdown', title: 'B' }
  ],
  views: [{
    id: 'notebook', label: 'Notebook', description: '',
    blockIds: ['a', 'a', 'b', 'ghost'],
    layout: [
      { i: 'a', x: -9, y: -2, w: 99, h: 0 },
      { i: 'a', x: 6, y: 4, w: 6, h: 8 },
      { i: 'ghost', x: 0, y: 10, w: 12, h: 4 }
    ]
  }],
  datasets: [], notebookInfo: null,
  result: { columns: [], rows: [] }, blockState: {}
}

const restored = projectExport.parseProjectSnapshot(JSON.stringify(base))
const view = restored.views[0]
if (view.blockIds.join(',') !== 'a,b') throw new Error(`block IDs were not deduplicated/sanitized: ${view.blockIds}`)
if (view.layout.filter((item) => item.i === 'a').length !== 1) throw new Error('duplicate layout item survived project restore')
const a = view.layout.find((item) => item.i === 'a')
const b = view.layout.find((item) => item.i === 'b')
if (!a || a.x !== 0 || a.y !== 0 || a.w !== 12 || a.h !== 1) throw new Error(`unsafe geometry was not clamped: ${JSON.stringify(a)}`)
if (!b || b.y < a.y + a.h) throw new Error('visible block missing geometry was not recovered at the bottom')
if (!view.defaultLayout || view.defaultLayout.length !== view.layout.length) throw new Error('missing defaultLayout was not reconstructed')

let duplicateViewsRejected = false
try {
  projectExport.parseProjectSnapshot(JSON.stringify({ ...base, views: [base.views[0], { ...base.views[0] }] }))
} catch { duplicateViewsRejected = true }
if (!duplicateViewsRejected) throw new Error('duplicate view IDs were not rejected')

let unknownPanelRejected = false
try {
  projectExport.parseProjectSnapshot(JSON.stringify({ ...base, blocks: [{ id: 'x', type: 'airflow', title: 'X' }] }))
} catch { unknownPanelRejected = true }
if (!unknownPanelRejected) throw new Error('unknown panel types were not rejected')

const app = fs.readFileSync('src/App.tsx', 'utf8')
const titleOccurrences = (app.match(/\{notebookInfo\.title\}/g) ?? []).length
if (titleOccurrences !== 1) throw new Error(`Explorer renders notebook title ${titleOccurrences} times`)

console.log('V2.1.5 hardening behavior PASS (project geometry + identity + Explorer cleanup)')
