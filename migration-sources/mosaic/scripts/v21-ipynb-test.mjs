import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

let source = fs.readFileSync('src/v2/ipynb.ts', 'utf8')
source = source.replace(/^import type .*$/gm, '')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const sample = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
    language_info: { name: 'python' }
  },
  cells: [
    { id: 'intro', cell_type: 'markdown', metadata: {}, source: ['# Demo\n', 'Explanation on the right.'] },
    { id: 'py-one', cell_type: 'code', metadata: {}, execution_count: 1, source: ['x = 2\n', 'x * 3'], outputs: [{ output_type: 'execute_result', execution_count: 1, data: { 'text/plain': ['6'] }, metadata: {} }] },
    { id: 'sql-one', cell_type: 'code', metadata: {}, execution_count: 2, source: ['%%sql\n', 'select 42 as answer'], outputs: [{ output_type: 'stream', name: 'stdout', text: ['ok\n'] }] }
  ]
}

const project = mod.parseIpynb(JSON.stringify(sample), 'demo.ipynb')
if (project.info.cellCount !== 3) throw new Error('cell count mismatch')
if (project.info.codeCellCount !== 2) throw new Error('code count mismatch')
if (project.info.outputBlockCount !== 2) throw new Error('output block count mismatch')
if (!project.blocks.some((block) => block.type === 'python')) throw new Error('python cell not imported')
if (!project.blocks.some((block) => block.type === 'sql')) throw new Error('SQL magic cell not imported')
if (project.blocks.filter((block) => block.type === 'notebook-output').length !== 2) throw new Error('saved outputs not imported')
const ids = new Set(project.blocks.map((block) => block.id))
for (const view of project.views) {
  if (view.layout.some((item) => !ids.has(item.i))) throw new Error(`${view.id}: unknown layout item`)
  if (view.blockIds.some((id) => !ids.has(id))) throw new Error(`${view.id}: unknown visible block`)
  if (!view.defaultLayout || view.defaultLayout.length !== view.layout.length) throw new Error(`${view.id}: missing reset baseline`)
}
const split = project.views.find((view) => view.id === 'split')
if (!split || !split.layout.some((item) => item.x === 0) || !split.layout.some((item) => item.x === 6)) throw new Error('two-page layout did not use two columns')
const py = project.blocks.find((block) => block.notebook?.cellId === 'py-one' && block.type === 'python')
const pyOutput = project.blocks.find((block) => block.notebook?.parentCellId === 'py-one')
if (!py || !pyOutput) throw new Error('python code/output group missing')
if (split.layout.find((item) => item.i === py.id)?.x !== split.layout.find((item) => item.i === pyOutput.id)?.x) throw new Error('code cell and its output were split across pages')
const explain = project.views.find((view) => view.id === 'explain')
const markdown = project.blocks.find((block) => block.notebook?.cellId === 'intro')
if (!explain || !markdown || !explain.layout.some((item) => item.i === markdown.id && item.x === 8)) throw new Error('markdown explanation was not placed on the right')
const sql = project.blocks.find((block) => block.type === 'sql')
if (!sql) throw new Error('missing SQL block')
const sqlCode = project.blockState[`mosaic:v2:code:${sql.id}`]
if (sqlCode !== 'select 42 as answer') throw new Error('SQL magic was not normalized')

const uneven = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { language_info: { name: 'python' } },
  cells: [
    { id: 'big', cell_type: 'code', metadata: {}, execution_count: 1, source: ['x = 1'], outputs: [{ output_type: 'stream', name: 'stdout', text: ['x\n'] }] },
    { id: 'm1', cell_type: 'markdown', metadata: {}, source: ['one'] },
    { id: 'm2', cell_type: 'markdown', metadata: {}, source: ['two'] },
    { id: 'm3', cell_type: 'markdown', metadata: {}, source: ['three'] },
    { id: 'm4', cell_type: 'markdown', metadata: {}, source: ['four'] }
  ]
}
const unevenProject = mod.parseIpynb(JSON.stringify(uneven), 'uneven.ipynb')
const unevenSplit = unevenProject.views.find((view) => view.id === 'split')
const secondGroup = unevenProject.blocks.find((block) => block.notebook?.cellId === 'm1')
if (!unevenSplit || !secondGroup) throw new Error('uneven split fixture failed')
if (unevenSplit.layout.find((item) => item.i === secondGroup.id)?.x !== 6) throw new Error('two-page layout is still splitting by raw cell count instead of estimated height')

const scala = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { language: 'scala', display_name: 'Scala' }, language_info: { name: 'scala' } },
  cells: [{ id: 'scala-code', cell_type: 'code', metadata: {}, execution_count: null, source: ['val x = 1'], outputs: [] }]
}
const scalaProject = mod.parseIpynb(JSON.stringify(scala), 'scala.ipynb')
const scalaBlock = scalaProject.blocks[0]
if (scalaBlock.type !== 'markdown') throw new Error('unsupported notebook language should import as read-only markdown')
const scalaText = scalaProject.blockState[`mosaic:v2:markdown:${scalaBlock.id}`]
if (typeof scalaText !== 'string' || !scalaText.includes('Imported scala code cell')) throw new Error('unsupported language explanation missing')

const magics = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { language_info: { name: 'python' } },
  cells: [
    { id: 'bash', cell_type: 'code', metadata: {}, execution_count: null, source: ['%%bash\n', 'echo hello'], outputs: [] },
    { id: 'shell', cell_type: 'code', metadata: {}, execution_count: null, source: ['!pip install demo'], outputs: [] }
  ]
}
const magicProject = mod.parseIpynb(JSON.stringify(magics), 'magics.ipynb')
if (magicProject.blocks.some((block) => block.type === 'python')) throw new Error('IPython/shell magic was incorrectly advertised as executable Python')
if (!magicProject.blocks.every((block) => block.type === 'markdown')) throw new Error('unsupported magic cells should import as read-only blocks')
console.log(`V2.1.7 ipynb behavior PASS (${project.blocks.length} blocks, ${project.views.length} layouts)`)
