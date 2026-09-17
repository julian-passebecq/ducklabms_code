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

// Project JSON is user-controlled. Editor state must be type-safe after restore.
const snapshot = {
  format: 'mosaic-v2-notebook-project',
  version: '2.1.7',
  currentViewId: 'notebook',
  blocks: [
    {
      id: 'sql-a', type: 'sql', title: 'SQL A',
      notebook: { source: 'ipynb', cellId: 'bad', cellType: 'code', originalIndex: 'not-a-number' }
    },
    {
      id: 'out-a', type: 'notebook-output', title: 'Saved output',
      notebook: { source: 'ipynb', cellId: 'cell-a', cellType: 'output', originalIndex: 0, parentCellId: 'cell-a' }
    }
  ],
  views: [{
    id: 'notebook', label: 'Notebook', description: '', blockIds: ['sql-a', 'out-a'],
    layout: [{ i: 'sql-a', x: 0, y: 0, w: 12, h: 8 }, { i: 'out-a', x: 0, y: 8, w: 12, h: 7 }]
  }],
  datasets: [],
  notebookInfo: { fileName: 'x.ipynb', title: { invalid: true }, language: 'python' },
  result: {
    columns: ['a'], rows: [{ a: 1 }], totalRows: 5, truncated: false,
    transport: 'arrow-ipc', arrowIpc: [1, 2, 3],
    schema: [{ name: 'a', type: 'BIGINT' }, { name: 12, type: null }],
    origin: { blockId: 'x', label: 'bad', kind: 'malicious', runtime: 'browser', createdAt: 'now' }
  },
  blockState: {
    'mosaic:v2:code:sql-a': { should: 'not become editor text' },
    'mosaic:v2:markdown:sql-a': '# valid text',
    'mosaic:v2:jupyter-output:out-a': [null, { outputType: 'stream', text: 'ok' }, 42],
    'mosaic:v2:code:ghost': 'stale'
  }
}

const restored = projectExport.parseProjectSnapshot(JSON.stringify(snapshot))
if (restored.datasets.length !== 0) throw new Error('an intentionally empty dataset catalog was not preserved')
if (restored.notebookInfo !== null) throw new Error('malformed notebookInfo was trusted instead of being dropped')
if (restored.blocks[0].notebook !== undefined) throw new Error('malformed optional notebook metadata survived restore')
if (restored.result.transport !== 'rows' || 'arrowIpc' in restored.result) throw new Error('persisted result falsely restored as Arrow-backed')
if (restored.result.origin !== undefined) throw new Error('invalid result origin enum survived restore')
if (restored.result.schema?.length !== 1 || restored.result.schema[0].name !== 'a') throw new Error('malformed result schema fields were not filtered')
if (restored.blockState['mosaic:v2:code:sql-a'] !== undefined) throw new Error('non-string editor state survived restore')
if (restored.blockState['mosaic:v2:markdown:sql-a'] !== '# valid text') throw new Error('valid markdown state was lost')
const outputs = restored.blockState['mosaic:v2:jupyter-output:out-a']
if (!Array.isArray(outputs) || outputs.length !== 1 || outputs[0].text !== 'ok') throw new Error('saved output state was not sanitized')
if ('mosaic:v2:code:ghost' in restored.blockState) throw new Error('stale block state leaked into restored project')



// A duplicated saved-output block is a valid Mosaic presentation block even
// though it intentionally has no Jupyter parent metadata.
const presentationOutput = {
  ...snapshot,
  blocks: [{ id: 'output-copy', type: 'notebook-output', title: 'Output copy' }],
  views: [{ id: 'notebook', label: 'Notebook', description: '', blockIds: ['output-copy'], layout: [{ i: 'output-copy', x: 0, y: 0, w: 12, h: 7 }] }],
  blockState: { 'mosaic:v2:jupyter-output:output-copy': [{ outputType: 'stream', text: 'copy' }] }
}
const restoredPresentationOutput = projectExport.parseProjectSnapshot(JSON.stringify(presentationOutput))
if (restoredPresentationOutput.blocks[0].type !== 'notebook-output') throw new Error('standalone duplicated notebook output was rejected')

// Older row snapshots that claimed arrow-ipc must be normalized on startup too.
const oldResult = projectExport.restoreResultSnapshot({ columns: ['x'], rows: [{ x: 1 }], transport: 'arrow-ipc', arrowIpc: [9] })
if (!oldResult || oldResult.transport !== 'rows' || 'arrowIpc' in oldResult) throw new Error('restoreResultSnapshot did not normalize legacy Arrow metadata')

// nbformat 4.5 requires unique cell ids. Mosaic should repair malformed notebooks
// without losing which raw id it had to normalize.
const duplicateNotebook = {
  nbformat: 4, nbformat_minor: 5,
  metadata: { language_info: { name: 'python' } },
  cells: [
    { id: 'dup', cell_type: 'code', source: ['x = 1'], execution_count: 1, outputs: [] },
    { id: 'dup', cell_type: 'code', source: ['x = 2'], execution_count: 2, outputs: [{ output_type: 'stream', name: 'stdout', text: ['two'] }] },
    { id: 'bad id with spaces', cell_type: 'markdown', source: ['# Note'] }
  ]
}
const imported = ipynb.parseIpynb(JSON.stringify(duplicateNotebook), 'duplicates.ipynb')
const codeBlocks = imported.blocks.filter((block) => block.notebook?.cellType === 'code')
if (codeBlocks.length !== 2) throw new Error('duplicate-id notebook did not import both code cells')
if (codeBlocks[0].notebook.cellId !== 'dup' || codeBlocks[1].notebook.cellId !== 'dup-2') throw new Error(`duplicate Jupyter cell IDs were not repaired: ${codeBlocks.map((b) => b.notebook?.cellId)}`)
if (codeBlocks[1].notebook.originalCellId !== 'dup') throw new Error('normalized duplicate cell did not retain its raw original id for inspection')
const secondOutput = imported.blocks.find((block) => block.notebook?.cellType === 'output' && block.notebook.parentCellId === 'dup-2')
if (!secondOutput) throw new Error('saved output was not rebound to the repaired parent cell id')
const markdown = imported.blocks.find((block) => block.notebook?.cellType === 'markdown')
if (!markdown || markdown.notebook.cellId.includes(' ')) throw new Error('invalid Jupyter cell id characters were not normalized')

// Replacing a project can reuse the same React keys. The workspace must remount
// so editor hooks reread the freshly restored localStorage state.
const app = fs.readFileSync('src/App.tsx', 'utf8')
if (!app.includes('workspaceRevision') || !app.includes('key={`workspace-${workspaceRevision}`}')) throw new Error('project replacement does not force the notebook workspace to rehydrate')
const revisionBumps = (app.match(/setWorkspaceRevision\(\(value\) => value \+ 1\)/g) ?? []).length
if (revisionBumps < 3) throw new Error(`workspace rehydrate is not wired to New/ipynb/project replacement (${revisionBumps}/3)`) 
if (!app.includes('let nextDatasets = snapshot.datasets')) throw new Error('empty project dataset catalogs still fall back to demo data')
if (!app.includes('restoreResultSnapshot(JSON.parse(raw))')) throw new Error('startup result restore is not sanitized')

console.log('V2.1.7 hardening behavior PASS (project state sanitation + workspace rehydrate + duplicate Jupyter ids)')
