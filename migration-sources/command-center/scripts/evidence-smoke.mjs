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

async function loadTsModule(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  if (output.diagnostics?.length) {
    throw new Error(ts.formatDiagnostics(output.diagnostics, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    }))
  }
  return import(`data:text/javascript;base64,${Buffer.from(output.outputText).toString('base64')}`)
}

const [{ projects }, evidence] = await Promise.all([
  loadTsModule('../src/data/projects.ts'),
  loadTsModule('../src/lib/projectEvidence.ts'),
])

const errors = []
const assert = (condition, message) => { if (!condition) errors.push(message) }
const byId = Object.fromEntries(projects.map((project) => [project.id, project]))

assert(evidence.publicSurfaceLabel(byId['pbi-bench']) === 'Related preview', 'PBI Bench must preserve its Related preview label')
assert(evidence.publicSurfaceLabel(byId['datapass-framework']) === 'Framework site', 'Datapass framework must preserve Framework site label')
assert(evidence.hasPublicSurface(byId['powertoy-ui']) === false, 'Windows desktop utility must not count as a public web surface')
assert(evidence.publicSurfaceLabel(byId['powertoy-ui']) === 'Windows desktop', 'Non-web availability label should still be visible')

for (const project of projects) {
  if (project.repoVisibility === 'Private') {
    assert(evidence.canOpenRepository(project) === false, `${project.id}: private repository must not render an external repository CTA`)
  }
  if (project.repoVisibility === 'Public' && project.github) {
    assert(evidence.canOpenRepository(project) === true, `${project.id}: public repository URL should be actionable`)
  }
  if (project.live) {
    assert(evidence.hasPublicSurface(project) === true, `${project.id}: live URL should count as a public surface`)
    assert(Boolean(evidence.publicSurfaceLabel(project).trim()), `${project.id}: public surface requires a non-empty label`)
  }
}

const uiFiles = [
  '../src/App.tsx',
  '../src/components/Hero.tsx',
  '../src/components/ProjectCard.tsx',
  '../src/components/ProjectDrawer.tsx',
  '../src/components/RightRail.tsx',
  '../src/components/RoadmapView.tsx',
  '../src/components/TechStackView.tsx',
]
for (const file of uiFiles) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  assert(!/Public demo|public demo|Source linked|source linked|live demo/.test(source), `${file}: legacy evidence wording remains in active UI`)
}

const filterSource = fs.readFileSync(new URL('../src/lib/catalogFilters.ts', import.meta.url), 'utf8')
assert(filterSource.includes("'Public demo': 'Public surface'"), 'Legacy Public demo URL filter should migrate to Public surface')
assert(filterSource.includes("'Source linked': 'Repository recorded'"), 'Legacy Source linked URL filter should migrate to Repository recorded')

if (errors.length) {
  console.error(`Evidence smoke test: FAIL (${errors.length})`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

const surfaces = projects.filter(evidence.hasPublicSurface).length
const repositoryRecords = projects.filter(evidence.hasRepositoryRecord).length
const actionableRepositories = projects.filter(evidence.canOpenRepository).length
console.log(`Evidence semantics: ${surfaces} public surfaces | ${repositoryRecords} repository records | ${actionableRepositories} actionable repository links`)
console.log('Evidence smoke test: PASS')
