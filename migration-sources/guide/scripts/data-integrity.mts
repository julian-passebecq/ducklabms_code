import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { concepts, decisionGuides, exams, learningPaths, snippets, sourceRegistry } from '../src/data/content.ts'

const here = dirname(fileURLToPath(import.meta.url))
const labs = JSON.parse(readFileSync(resolve(here, '../src/data/labs.generated.json'), 'utf8'))
const failures: string[] = []
const checks: string[] = []

function assert(condition: unknown, message: string) {
  if (!condition) failures.push(message)
  else checks.push(message)
}

function unique(values: string[], label: string) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index)
  assert(duplicates.length === 0, `${label} identifiers are unique${duplicates.length ? ` (duplicates: ${[...new Set(duplicates)].join(', ')})` : ''}`)
}

unique(concepts.map(c => c.id), 'Concept')
unique(decisionGuides.map(g => g.id), 'Decision guide')
unique(snippets.map(s => s.id), 'Snippet')
unique(exams.map(e => e.code), 'Exam')
unique(labs.map((l: any) => l.id), 'Lab')
unique(sourceRegistry.map(s => s.name), 'Source')

const conceptIds = new Set(concepts.map(c => c.id))
const snippetIds = new Set(snippets.map(s => s.id))
const examCodes = new Set(exams.map(e => e.code))

for (const snippet of snippets) {
  for (const conceptId of snippet.conceptIds) assert(conceptIds.has(conceptId), `Snippet ${snippet.id} references existing concept ${conceptId}`)
}
for (const guide of decisionGuides) {
  assert(guide.options.length >= 2, `Decision guide ${guide.id} compares at least two options`)
  unique(guide.options.map(option => option.conceptId), `Decision guide ${guide.id} option`)
  for (const option of guide.options) assert(conceptIds.has(option.conceptId), `Decision guide ${guide.id} references existing concept ${option.conceptId}`)
  for (const code of guide.examRefs) assert(examCodes.has(code), `Decision guide ${guide.id} references known exam ${code}`)
  assert(Boolean(guide.ruleOfThumb.trim()), `Decision guide ${guide.id} has a rule of thumb`)
}

for (const concept of concepts) {
  for (const snippetId of concept.code ?? []) assert(snippetIds.has(snippetId), `Concept ${concept.id} references existing snippet ${snippetId}`)
}
for (const path of learningPaths) {
  assert(path.url.startsWith('https://learn.microsoft.com/'), `Learning path uses Microsoft Learn URL: ${path.title}`)
  for (const code of path.certification) assert(examCodes.has(code), `Learning path ${path.title} references known exam ${code}`)
}

const requiredCurrent = ['DP-600', 'DP-700', 'DP-750', 'PL-300']
for (const code of requiredCurrent) assert(exams.find(e => e.code === code)?.status === 'current', `${code} is present and current`)
for (const code of ['DP-203', 'DP-500']) assert(exams.find(e => e.code === code)?.status === 'legacy', `${code} is isolated as legacy`)

for (const exam of exams.filter(e => e.status === 'current')) {
  assert(exam.sourceUrl.startsWith('https://learn.microsoft.com/'), `${exam.code} has an official Microsoft source URL`)
  assert(Boolean(exam.verified), `${exam.code} has a verification date`)
  const mappedConceptCount = concepts.filter(c => c.examRefs.some(ref => ref.startsWith(exam.code))).length
  const mappedLabCount = labs.filter((lab: any) => lab.status === 'current' && (lab.courses.includes(exam.code) || lab.source.includes(exam.code))).length
  const mappedPathCount = learningPaths.filter(path => path.certification.includes(exam.code)).length
  assert(mappedConceptCount > 0, `${exam.code} has guide concept coverage`)
  assert(mappedLabCount > 0, `${exam.code} has current lab coverage`)
  assert(mappedPathCount > 0, `${exam.code} has current self-paced learning paths`)
  for (const skill of exam.skills) {
    const values = skill.weight.match(/\d+/g)?.map(Number) ?? []
    assert(values.length >= 1 && values.every(v => v > 0 && v <= 100), `${exam.code} skill weight is parseable: ${skill.name}`)
  }
}

const allowedStatus = new Set(['current', 'reference', 'legacy'])
for (const lab of labs) {
  assert(Boolean(lab.id && lab.title && lab.source && lab.platform), `Lab ${lab.id || '<missing>'} has required identity fields`)
  assert(allowedStatus.has(lab.status), `Lab ${lab.id} has valid freshness status`)
  assert(Array.isArray(lab.sections), `Lab ${lab.id} has structured sections array`)
  assert(Array.isArray(lab.courses), `Lab ${lab.id} has courses array`)
}


for (const concept of concepts.filter(c => c.labKeywords?.length)) {
  const currentMatches = labs.filter((lab: any) => {
    if (lab.status !== 'current') return false
    const haystack = `${lab.title} ${lab.description} ${lab.module} ${(lab.categories ?? []).join(' ')}`.toLowerCase()
    return concept.labKeywords!.some(keyword => haystack.includes(keyword.toLowerCase()))
  })
  assert(currentMatches.length > 0, `Concept ${concept.id} with lab keywords maps to at least one current lab`)
}

const statusCounts = labs.reduce((acc: Record<string, number>, lab: any) => {
  acc[lab.status] = (acc[lab.status] ?? 0) + 1
  return acc
}, {})
const sectionCount = labs.reduce((sum: number, lab: any) => sum + lab.sections.length, 0)
assert(labs.length === 155, `Lab catalog count remains 155 (actual ${labs.length})`)
assert(sectionCount === 1007, `Structured section count remains 1007 (actual ${sectionCount})`)
assert(statusCounts.current === 108, `Current lab count remains 108 (actual ${statusCounts.current ?? 0})`)
assert(statusCounts.reference === 30, `Reference lab count remains 30 (actual ${statusCounts.reference ?? 0})`)
assert(statusCounts.legacy === 17, `Legacy lab count remains 17 (actual ${statusCounts.legacy ?? 0})`)

console.log(`Data integrity: ${checks.length} checks passed.`)
console.log(`Catalog: ${labs.length} labs, ${sectionCount} structured sections.`)
console.log(`Freshness: ${statusCounts.current} current / ${statusCounts.reference} reference / ${statusCounts.legacy} legacy.`)
if (failures.length) {
  console.error(`\n${failures.length} integrity check(s) failed:`)
  failures.slice(0, 50).forEach(f => console.error(`- ${f}`))
  process.exit(1)
}
