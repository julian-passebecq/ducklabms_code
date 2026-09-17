import fs from 'node:fs'
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

const source = fs.readFileSync(new URL('../src/data/projects.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
})

if (output.diagnostics?.length) {
  const formatted = ts.formatDiagnosticsWithColorAndContext(output.diagnostics, {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  })
  console.error(formatted)
  process.exit(1)
}

const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.outputText).toString('base64')}`
const { categories, projects } = await import(moduleUrl)

const errors = []
const warnings = []
const categorySet = new Set(categories)
const ids = new Set()
const names = new Set()
const statuses = new Set(['Live', 'In progress', 'Prototype', 'Planned', 'Concept', 'Legacy'])

function assert(condition, message) {
  if (!condition) errors.push(message)
}

function validHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

assert(Array.isArray(categories) && categories.length === 8, `Expected 8 categories, found ${categories?.length ?? 'none'}`)
assert(Array.isArray(projects) && projects.length >= 20, `Expected at least 20 projects, found ${projects?.length ?? 'none'}`)

for (const project of projects) {
  assert(project.id && typeof project.id === 'string', 'Project missing id')
  assert(!ids.has(project.id), `Duplicate project id: ${project.id}`)
  ids.add(project.id)

  assert(project.name && typeof project.name === 'string', `Project ${project.id} missing name`)
  if (names.has(project.name)) warnings.push(`Duplicate project name: ${project.name}`)
  names.add(project.name)

  assert(statuses.has(project.status), `Project ${project.id} has invalid status: ${project.status}`)
  assert(categorySet.has(project.primaryCategory), `Project ${project.id} has invalid primary category: ${project.primaryCategory}`)
  assert(Array.isArray(project.categories) && project.categories.length > 0, `Project ${project.id} has no categories`)
  assert(project.categories.includes(project.primaryCategory), `Project ${project.id} primary category is missing from categories[]`)
  for (const category of project.categories) {
    assert(categorySet.has(category), `Project ${project.id} has unknown category: ${category}`)
  }

  assert(Array.isArray(project.stack) && project.stack.length > 0, `Project ${project.id} has empty stack`)
  assert(Array.isArray(project.features) && project.features.length > 0, `Project ${project.id} has no features`)
  assert(Boolean(project.summary?.trim()), `Project ${project.id} missing summary`)
  assert(Boolean(project.description?.trim()), `Project ${project.id} missing description`)
  assert(Boolean(project.nextMilestone?.trim()), `Project ${project.id} missing next milestone`)
  assert(Boolean(project.eta?.trim()), `Project ${project.id} missing eta/stage label`)

  if (project.github) assert(validHttpUrl(project.github), `Project ${project.id} has invalid GitHub URL: ${project.github}`)
  if (project.live) assert(validHttpUrl(project.live), `Project ${project.id} has invalid live URL: ${project.live}`)
  if (project.status === 'Live' && !project.live) warnings.push(`Live project without public demo URL: ${project.id}`)
  if (project.repoVisibility === 'Public' && !project.github) warnings.push(`Public repository state without GitHub URL: ${project.id}`)
}

const featured = projects.filter((p) => p.featured).length
const repos = projects.filter((p) => p.github).length
const surfaces = projects.filter((p) => p.live).length
const microsoft = projects.filter((p) => p.categories.includes('Microsoft Cloud')).length

console.log(`Catalog: ${projects.length} projects | ${repos} repo links | ${surfaces} public surfaces | ${featured} featured | ${microsoft} Microsoft Cloud`)
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`)
  for (const warning of warnings) console.log(`- ${warning}`)
}
if (errors.length) {
  console.error(`Errors (${errors.length}):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log('Catalog smoke test: PASS')
