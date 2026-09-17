import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const app = readFileSync(resolve(here, '../src/App.tsx'), 'utf8')
const failures: string[] = []
let checks = 0

function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

assert(app.includes("onClick={(event) => { event.stopPropagation(); void copy() }}"), 'copy action stops propagation so it cannot select/deep-link its parent snippet card')
assert(app.includes("onClick={(event) => { event.stopPropagation(); openConcept(id) }}"), 'snippet concept links stop propagation before navigating away')
assert(app.includes("if (window.location.hash !== canonicalHash) window.history.replaceState(null, '', canonicalHash)"), 'stale/invalid hashes are replaced with a canonical route instead of remaining URL-state drift')
assert(app.includes('syncRouteFromLocation()'), 'initial route is canonicalized on mount before normal navigation history is accumulated')
assert(app.includes("visibleConcepts.find(c => c.id === selected) || visibleConcepts[0]"), 'concept detail resolves from the active certification lens immediately')
assert(app.includes("decisionGuides.find(item => item.id === selectedGuideId) || decisionGuides[0]"), 'decision detail remains authoritative to the routed selection while filtering')
assert(app.includes("exams.find(e => e.code === selectedCode) || exams[0]"), 'certification detail remains authoritative to the routed selection while filtering')
assert(app.includes("selectedSnippet && !baseFiltered.some(s => s.id === selectedSnippet.id) ? [selectedSnippet, ...baseFiltered]"), 'deep-linked code snippet remains visible under filters')
assert(app.includes('aria-controls="global-search-results"'), 'search box controls the result listbox')
assert(app.includes("event.key === 'ArrowDown'"), 'search box handles Arrow Down')
assert(app.includes("event.key === 'ArrowUp'"), 'search box handles Arrow Up')
assert(app.includes("event.key === 'Enter'"), 'search box handles Enter activation')
assert(app.includes('aria-selected={index === activeIndex}'), 'search options expose keyboard selection to assistive technology')
assert(app.includes('searchMatch('), 'page-local filters share the token-aware search semantics')
assert(!/if \(!selectedSnippetId\) return\s+setLanguage\('All'\)/.test(app), 'selecting a code snippet does not reset the user language filter')
assert(app.includes('No certification matches this search.'), 'certification picker exposes an empty-search state')

if (failures.length) {
  console.error(`${failures.length} UI/state/search contract check(s) failed:`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`UI/state/search contracts: ${checks} checks passed.`)
