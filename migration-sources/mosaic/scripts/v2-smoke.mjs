import fs from 'node:fs'

const required = [
  'src/App.tsx',
  'src/v2/model.ts',
  'src/v2/V2Workspace.tsx',
  'src/v2/Inspector.tsx',
  'src/v2/PolarsBlock.tsx',
  'src/v2/ipynb.ts',
  'src/v2/JupyterOutputPanel.tsx',
  'src/runtime/duckdb.ts',
  'src/runtime/python.ts',
  'src/components/SqlPanel.tsx',
  'src/components/PythonPanel.tsx'
]
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`)
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (pkg.version !== '2.1.7') throw new Error('Package version must be 2.1.7')
console.log(`V2.1.7 smoke PASS (${required.length} required files)`)
