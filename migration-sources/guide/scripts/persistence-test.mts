import { parseStoredBoolean, parseStoredStringSet } from '../src/lib/persistence.ts'

const failures: string[] = []
let checks = 0
function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

const allowed = new Set(['lakehouse', 'warehouse', 'adf'])
assert(parseStoredStringSet(null, allowed).size === 0, 'missing set is empty')
assert(parseStoredStringSet('not-json', allowed).size === 0, 'malformed JSON set is empty')
assert(parseStoredStringSet('"lakehouse"', allowed).size === 0, 'scalar JSON does not become character set')
assert(parseStoredStringSet('{"lakehouse":true}', allowed).size === 0, 'object JSON set is rejected')
assert([...parseStoredStringSet('["lakehouse","warehouse"]', allowed)].join(',') === 'lakehouse,warehouse', 'valid string array restores')
assert([...parseStoredStringSet('["lakehouse",42,null,"adf"]', allowed)].join(',') === 'lakehouse,adf', 'non-string values are ignored')
assert([...parseStoredStringSet('["lakehouse","removed-id","lakehouse"]', allowed)].join(',') === 'lakehouse', 'stale and duplicate IDs are removed')
assert(parseStoredBoolean(null, true) === true, 'missing boolean uses true fallback')
assert(parseStoredBoolean(null, false) === false, 'missing boolean uses false fallback')
assert(parseStoredBoolean('true', false) === true, 'true restores')
assert(parseStoredBoolean('false', true) === false, 'false restores')
assert(parseStoredBoolean('corrupt', true) === true, 'invalid boolean uses fallback')

if (failures.length) {
  console.error(`${failures.length} persistence check(s) failed:`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Persistence contracts: ${checks} checks passed.`)
