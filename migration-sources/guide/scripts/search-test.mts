import { moveSearchIndex, rankSearchCandidates, searchMatch, tokenizeSearchQuery } from '../src/lib/search.ts'

const failures: string[] = []
let checks = 0
function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

assert(tokenizeSearchQuery('  Direct   Lake  ').join('|') === 'direct|lake', 'query tokenization normalizes whitespace and case')
assert(searchMatch('Direct Lake semantic model', 'lake direct'), 'multi-word matching is order independent')
assert(!searchMatch('Direct Lake semantic model', 'lake spark'), 'multi-word matching requires every query token')

const ranked = rankSearchCandidates([
  { id: 'include', title: 'Working with Direct Lake', searchText: 'Working with Direct Lake semantic models' },
  { id: 'exact', title: 'Direct Lake', searchText: 'Direct Lake' },
  { id: 'start', title: 'Direct Lake models', searchText: 'Direct Lake models in Fabric' },
], 'direct lake')
assert(ranked.map(item => item.id).join(',') === 'exact,start,include', 'exact/start/title-contains ranking order is deterministic')

const laterExact = rankSearchCandidates([
  ...Array.from({ length: 20 }, (_, i) => ({ id: `generic-${i}`, title: `Lab ${String(i).padStart(2, '0')}`, searchText: `warehouse generic lab ${i}` })),
  { id: 'exact', title: 'Warehouse', searchText: 'warehouse' },
], 'warehouse', 12)
assert(laterExact[0]?.id === 'exact', 'ranking happens before truncation so a later exact match is retained')
assert(laterExact.length === 12, 'result limit is applied after ranking')

const alpha = rankSearchCandidates([
  { id: 'z', title: 'Zeta pipeline', searchText: 'pipeline' },
  { id: 'a', title: 'Alpha pipeline', searchText: 'pipeline' },
], 'pipeline')
assert(alpha.map(item => item.id).join(',') === 'a,z', 'ties are sorted by title for deterministic output')
assert(rankSearchCandidates([{ id: 'x', title: 'X', searchText: 'x' }], 'x').length === 0, 'one-character command queries do not emit noisy results')
assert(moveSearchIndex(-1, -1, 5) === 4, 'Arrow Up from no selection starts at the last result')
assert(moveSearchIndex(-1, 1, 5) === 0, 'Arrow Down from no selection starts at the first result')
assert(moveSearchIndex(4, 1, 5) === 0 && moveSearchIndex(0, -1, 5) === 4, 'keyboard selection wraps in both directions')
assert(moveSearchIndex(0, 1, 0) === -1, 'keyboard selection remains unset for an empty result list')

if (failures.length) {
  console.error(`${failures.length} search check(s) failed:`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Search contracts: ${checks} checks passed.`)
