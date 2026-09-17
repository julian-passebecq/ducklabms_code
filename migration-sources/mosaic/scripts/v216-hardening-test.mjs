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

const ipynb = await loadTs('src/v2/ipynb.ts')
const exporter = await loadTs('src/v2/ipynbExport.ts')

const sample = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
    language_info: { name: 'python' },
    custom_notebook_meta: { keep: true }
  },
  cells: [
    {
      id: 'intro', cell_type: 'markdown', metadata: { tags: ['doc'] },
      source: ['# Demo\n', '![tiny](attachment:tiny.png)'],
      attachments: { 'tiny.png': { 'image/png': 'YWJj' } }
    },
    {
      id: 'py-one', cell_type: 'code', metadata: { tags: ['calc'] }, execution_count: 4,
      source: ['x = 2\n', 'x * 3'],
      outputs: [{ output_type: 'execute_result', execution_count: 4, data: { 'text/plain': ['6'] }, metadata: { custom: 'keep-output-meta' } }]
    },
    {
      id: 'sql-one', cell_type: 'code', metadata: { dialect: 'duckdb' }, execution_count: 5,
      source: ['%%sql\n', 'select 42 as answer'],
      outputs: [{ output_type: 'stream', name: 'stdout', text: ['ok\n'] }]
    },
    {
      id: 'bash-one', cell_type: 'code', metadata: { keep: 'bash-meta' }, execution_count: null,
      source: ['%%bash\n', 'echo hello'], outputs: []
    }
  ]
}

const project = ipynb.parseIpynb(JSON.stringify(sample), 'roundtrip.ipynb')
const split = project.views.find((view) => view.id === 'split')
if (!split) throw new Error('split view missing')
const first = split.layout[0]
first.x = 2
first.w = 4
split.collapsedIds = [first.i]
split.expandedHeights = { [first.i]: 11 }

const store = new Map(Object.entries(project.blockState).map(([key, value]) => [key, JSON.stringify(value)]))
const storage = { getItem: (key) => store.get(key) ?? null }
const pyBlock = project.blocks.find((block) => block.notebook?.cellId === 'py-one')
if (!pyBlock) throw new Error('python block missing')
store.set(`mosaic:v2:code:${pyBlock.id}`, JSON.stringify('x = 7\nx * 3'))

const customSql = { id: 'custom-sql', type: 'sql', title: 'Custom SQL' }
const hiddenPython = { id: 'hidden-python', type: 'python', title: 'Hidden project Python' }
project.blocks.push(customSql, hiddenPython)
const notebook = project.views.find((view) => view.id === 'notebook')
if (!notebook) throw new Error('notebook view missing')
notebook.blockIds.push(customSql.id)
notebook.layout.push({ i: customSql.id, x: 1, y: 50, w: 10, h: 8 })
store.set('mosaic:v2:code:custom-sql', JSON.stringify('select count(*) as n from orders'))
store.set('mosaic:v2:code:hidden-python', JSON.stringify('print("should stay project-only")'))

const exported = exporter.buildIpynbDocument({
  blocks: project.blocks,
  views: project.views,
  notebookInfo: project.info,
  storage,
  exportedAt: '2026-09-17T00:00:00.000Z'
})

if (exported.nbformat !== 4 || exported.nbformat_minor !== 5) throw new Error('nbformat export mismatch')
if (exported.metadata.custom_notebook_meta?.keep !== true) throw new Error('notebook metadata was not preserved')
if (!exported.metadata.mosaic || !Array.isArray(exported.metadata.mosaic.views)) throw new Error('Mosaic layout metadata missing')
const ids = exported.cells.map((cell) => cell.id)
for (const expected of ['intro', 'py-one', 'sql-one', 'bash-one']) if (!ids.includes(expected)) throw new Error(`original cell id ${expected} not preserved`)
if (new Set(ids).size !== ids.length) throw new Error('exported notebook contains duplicate cell IDs')

const markdown = exported.cells.find((cell) => cell.id === 'intro')
if (!markdown || markdown.cell_type !== 'markdown') throw new Error('markdown cell missing')
if (markdown.source.join('') !== '# Demo\n![tiny](attachment:tiny.png)') throw new Error('untouched markdown source did not restore attachment syntax')
if (markdown.attachments?.['tiny.png']?.['image/png'] !== 'YWJj') throw new Error('markdown attachment was not preserved')
if (!Array.isArray(markdown.metadata.tags) || markdown.metadata.tags[0] !== 'doc') throw new Error('cell metadata not preserved')

const pyCell = exported.cells.find((cell) => cell.id === 'py-one')
if (!pyCell || pyCell.source.join('') !== 'x = 7\nx * 3') throw new Error('edited Python source was not exported')
if (pyCell.outputs?.[0]?.metadata?.custom !== 'keep-output-meta') throw new Error('raw Jupyter output metadata was not preserved')

const sqlCell = exported.cells.find((cell) => cell.id === 'sql-one')
if (!sqlCell || sqlCell.source.join('') !== '%%sql\nselect 42 as answer') throw new Error('untouched SQL magic source was not preserved')
const bashCell = exported.cells.find((cell) => cell.id === 'bash-one')
if (!bashCell || bashCell.cell_type !== 'code' || bashCell.source.join('') !== '%%bash\necho hello') throw new Error('unsupported read-only code did not export as original code')
const custom = exported.cells.find((cell) => cell.id.startsWith('mosaic-custom-sql'))
if (!custom || custom.source.join('') !== '%%sql\nselect count(*) as n from orders') throw new Error('new Mosaic SQL block did not export as a SQL magic cell')
if (exported.cells.some((cell) => cell.source.join('').includes('should stay project-only'))) throw new Error('project-only code leaked into semantic .ipynb export')

const reopened = ipynb.parseIpynb(JSON.stringify(exported), 'reopened.ipynb')
const reopenedSplit = reopened.views.find((view) => view.id === 'split')
const reopenedIntro = reopened.blocks.find((block) => block.notebook?.cellId === 'intro')
if (!reopenedSplit || !reopenedIntro) throw new Error('Mosaic layout metadata did not round-trip')
const introLayout = reopenedSplit.layout.find((item) => item.i === reopenedIntro.id)
if (!introLayout || introLayout.x !== 2 || introLayout.w !== 4) throw new Error(`custom split geometry was not restored: ${JSON.stringify(introLayout)}`)
if (!reopenedSplit.collapsedIds?.includes(reopenedIntro.id)) throw new Error('collapsed state did not round-trip')
if (reopenedSplit.expandedHeights?.[reopenedIntro.id] !== 11) throw new Error('expanded height did not round-trip')
const reopenedBash = reopened.blocks.find((block) => block.notebook?.cellId === 'bash-one')
if (!reopenedBash || reopenedBash.type !== 'markdown') throw new Error('unsupported Bash cell was not safely restored as read-only')

const workspace = fs.readFileSync('src/v2/V2Workspace.tsx', 'utf8')
if (!workspace.includes("readOnly={panel.notebook?.cellType === 'code'}")) throw new Error('unsupported imported code is still editable')
const app = fs.readFileSync('src/App.tsx', 'utf8')
if (!app.includes('Export .ipynb') || !app.includes('Export project')) throw new Error('export actions are not clearly separated')

console.log('V2.1.6 hardening behavior PASS (.ipynb export + Mosaic layout round-trip + read-only unsupported code)')
