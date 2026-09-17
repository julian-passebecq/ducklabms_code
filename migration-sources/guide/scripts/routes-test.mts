import { buildGuideHash, guidePages, parseGuideHash, resolveGuideHash } from '../src/lib/routes.ts'

const failures: string[] = []
let checks = 0
function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

assert(parseGuideHash('').page === 'home', 'empty hash falls back to home')
assert(parseGuideHash('#unknown').page === 'home', 'unknown page falls back to home')
assert(parseGuideHash('#concepts/lakehouse').target === 'lakehouse', 'concept target parses')
assert(parseGuideHash('#labs/fabric%3A01-lakehouse').target === 'fabric:01-lakehouse', 'encoded lab target decodes')
assert(parseGuideHash('#code/sql-delta-merge').page === 'code', 'code route parses')
assert(parseGuideHash('#decisions/fabric-store').target === 'fabric-store', 'decision route parses')
assert(parseGuideHash('#concepts/%E0%A4%A').target === '%E0%A4%A', 'malformed URI target degrades safely')

const policies = {
  concepts: { validTargets: new Set(['lakehouse', 'warehouse']), fallbackTarget: 'lakehouse' },
  decisions: { validTargets: new Set(['fabric-store']), fallbackTarget: 'fabric-store' },
  certifications: { validTargets: new Set(['DP-600']), fallbackTarget: 'DP-600' },
  labs: { validTargets: new Set(['fabric:01-lakehouse']) },
  code: { validTargets: new Set(['sql-delta-merge']) },
}

assert(resolveGuideHash('#concepts/warehouse', policies).target === 'warehouse', 'valid routed target is preserved')
assert(resolveGuideHash('#concepts/removed-concept', policies).target === 'lakehouse', 'stale concept target falls back to canonical concept')
assert(resolveGuideHash('#labs/removed-lab', policies).page === 'labs' && resolveGuideHash('#labs/removed-lab', policies).target === undefined, 'stale lab target resolves to lab library')
assert(resolveGuideHash('#code/removed-snippet', policies).page === 'code' && resolveGuideHash('#code/removed-snippet', policies).target === undefined, 'stale code target resolves to code library')
assert(resolveGuideHash('#home/old-target', policies).page === 'home' && resolveGuideHash('#home/old-target', policies).target === undefined, 'page-only routes strip stale targets')
assert(buildGuideHash(resolveGuideHash('#concepts/removed-concept', policies).page, resolveGuideHash('#concepts/removed-concept', policies).target) === '#concepts/lakehouse', 'stale concept route has deterministic canonical hash')

for (const page of guidePages) {
  const plain = buildGuideHash(page)
  assert(parseGuideHash(plain).page === page, `${page} route round-trips without target`)
  const target = 'target:with/slash and space'
  const encoded = buildGuideHash(page, target)
  const parsed = parseGuideHash(encoded)
  assert(parsed.page === page && parsed.target === target, `${page} route round-trips encoded target`)
}

if (failures.length) {
  console.error(`${failures.length} route check(s) failed:`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Routing contracts: ${checks} checks passed.`)
