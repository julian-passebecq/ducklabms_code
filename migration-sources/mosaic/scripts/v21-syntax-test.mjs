import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const files = []

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name)
    const stat = fs.statSync(file)
    if (stat.isDirectory()) walk(file)
    else if (/\.tsx?$/.test(name)) files.push(file)
  }
}

walk('src')
let failed = 0
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const output = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX
    }
  })
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error)
  if (!errors.length) continue
  failed += 1
  console.error(`FAIL ${file}`)
  for (const error of errors) console.error(`  ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`)
}

if (failed) process.exit(1)
console.log(`V2.1.7 syntax PASS (${files.length}/${files.length} TS/TSX files)`)
