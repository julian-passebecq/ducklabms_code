import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)
let ts
try {
  ts = require('typescript')
} catch {
  const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
  ts = require(`${npmRoot}/typescript/lib/typescript.js`)
}
const root = process.cwd()
const srcRoot = path.join(root, 'src')
const failures = []

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const sourceFiles = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file))
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const output = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  })
  const diagnostics = output.diagnostics ?? []
  if (diagnostics.length) {
    failures.push(`${path.relative(root, file)}: ${diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')}`)
  }

  const imports = [...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((match) => match[1])
  for (const specifier of imports) {
    const base = path.resolve(path.dirname(file), specifier)
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      failures.push(`${path.relative(root, file)}: missing relative import ${specifier}`)
    }
  }
}

const cssFile = path.join(srcRoot, 'styles.css')
const css = fs.readFileSync(cssFile, 'utf8')
const openBraces = [...css].filter((char) => char === '{').length
const closeBraces = [...css].filter((char) => char === '}').length
if (openBraces !== closeBraces) failures.push(`src/styles.css: unbalanced braces (${openBraces} open / ${closeBraces} close)`)

const app = fs.readFileSync(path.join(srcRoot, 'App.tsx'), 'utf8')
for (const marker of ['popstate', 'project-command-center-theme', 'EvidenceFilter', 'statusCounts', 'setProjectUrl']) {
  if (!app.includes(marker)) failures.push(`src/App.tsx: expected reliability marker missing: ${marker}`)
}

if (failures.length) {
  console.error(`Source smoke test: FAIL (${failures.length})`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Source smoke test: PASS (${sourceFiles.length} TypeScript/TSX files, CSS balanced)`)
