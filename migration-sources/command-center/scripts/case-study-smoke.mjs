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

const [{ projects }, { projectCaseStudies }] = await Promise.all([
  loadTsModule('../src/data/projects.ts'),
  loadTsModule('../src/data/caseStudies.ts'),
])

const projectIds = new Set(projects.map((project) => project.id))
const errors = []
const assert = (condition, message) => { if (!condition) errors.push(message) }

for (const [id, study] of Object.entries(projectCaseStudies)) {
  assert(projectIds.has(id), `Case study references unknown project id: ${id}`)
  assert(Boolean(study.challenge?.trim()), `${id}: missing challenge`)
  assert(Boolean(study.solution?.trim()), `${id}: missing solution`)
  assert(Array.isArray(study.flow) && study.flow.length >= 3, `${id}: flow must contain at least 3 steps`)
  assert(Array.isArray(study.engineering) && study.engineering.length >= 3, `${id}: engineering must contain at least 3 decisions`)
  assert(Boolean(study.deliverable?.trim()), `${id}: missing deliverable`)
  if (study.proofPoints) assert(study.proofPoints.length >= 2, `${id}: proofPoints must contain at least 2 items when present`)
  if (study.tradeoffs) assert(study.tradeoffs.length >= 2, `${id}: tradeoffs must contain at least 2 items when present`)
}

const featured = projects.filter((project) => project.featured)
const featuredCovered = featured.filter((project) => projectCaseStudies[project.id])
assert(featuredCovered.length >= Math.ceil(featured.length * 0.8), `Featured case-study coverage below 80%: ${featuredCovered.length}/${featured.length}`)

const microsoft = projects.filter((project) => project.categories.includes('Microsoft Cloud'))
const microsoftCovered = microsoft.filter((project) => projectCaseStudies[project.id])
assert(microsoftCovered.length >= 8, `Expected at least 8 Microsoft Cloud case studies, found ${microsoftCovered.length}`)

if (errors.length) {
  console.error(`Case-study smoke test: FAIL (${errors.length})`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`Case studies: ${Object.keys(projectCaseStudies).length} documented | ${featuredCovered.length}/${featured.length} featured covered | ${microsoftCovered.length}/${microsoft.length} Microsoft Cloud covered`)
console.log('Case-study smoke test: PASS')
