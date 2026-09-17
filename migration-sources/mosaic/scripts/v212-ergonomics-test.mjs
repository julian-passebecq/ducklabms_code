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
const analytics = await loadTs('src/utils/analytics.ts')
const workspace = fs.readFileSync('src/v2/V2Workspace.tsx', 'utf8')
const inspector = fs.readFileSync('src/v2/Inspector.tsx', 'utf8')
const nodeConfig = JSON.parse(fs.readFileSync('tsconfig.node.json', 'utf8'))

const view = {
  id: 'notebook', label: 'Notebook', description: '', blockIds: ['cell'],
  layout: [{ i: 'cell', x: 0, y: 0, w: 12, h: 11, minW: 4, minH: 5 }],
  defaultLayout: [{ i: 'cell', x: 0, y: 0, w: 12, h: 9, minW: 4, minH: 5 }]
}
const collapsed = model.toggleCollapsedBlock(view, 'cell')
if (!collapsed.collapsedIds?.includes('cell')) throw new Error('collapse did not persist state')
const collapsedItem = collapsed.layout.find((item) => item.i === 'cell')
if (!collapsedItem || collapsedItem.h !== 2 || collapsedItem.isResizable !== false) throw new Error('collapsed geometry is incorrect')
const expanded = model.toggleCollapsedBlock(collapsed, 'cell')
const expandedItem = expanded.layout.find((item) => item.i === 'cell')
if (expanded.collapsedIds?.includes('cell')) throw new Error('expand did not clear collapse state')
if (!expandedItem || expandedItem.h !== 11 || expandedItem.minH !== 5) throw new Error('expand did not restore manual height')

const profile = analytics.profileColumns({
  columns: ['id', 'country', 'amount'],
  rows: [
    { id: 1, country: 'NO', amount: 10 },
    { id: 2, country: 'NO', amount: null },
    { id: 3, country: 'CH', amount: 30 }
  ],
  schema: [{ name: 'id', type: 'BIGINT' }]
})
const id = profile.find((item) => item.column === 'id')
const country = profile.find((item) => item.column === 'country')
const amount = profile.find((item) => item.column === 'amount')
if (id?.type !== 'BIGINT' || id.distinct !== 3) throw new Error('schema-backed profile failed')
if (country?.type !== 'string' || country.distinct !== 2) throw new Error('string profile failed')
if (amount?.type !== 'number' || amount.nulls !== 1 || amount.distinct !== 2) throw new Error('numeric/null profile failed')

const required = [
  ['workspace renders collapsed state', workspace.includes("view.collapsedIds?.includes(panel.id)")],
  ['jupyter output can be dashboard output', inspector.includes("block.type === 'notebook-output'")],
  ['node TypeScript config is build-safe', nodeConfig.compilerOptions?.allowImportingTsExtensions === true && nodeConfig.compilerOptions?.noEmit === true]
]
const failed = required.filter(([, ok]) => !ok)
for (const [name, ok] of required) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
if (failed.length) process.exit(1)
console.log('V2.1.7 ergonomics behavior PASS (collapse + profile + config)')
