import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const extractor = readFileSync(resolve(here, './extract_labs.py'), 'utf8')
const failures: string[] = []
let checks = 0

function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

assert(!extractor.includes('/mnt/data/'), 'extractor contains no ChatGPT/container-specific absolute paths')
assert(extractor.includes("DEFAULT_SOURCES_ROOT = APP_ROOT / 'sources'"), 'default source root is project-relative')
assert(extractor.includes("DEFAULT_OUTPUT = APP_ROOT / 'src' / 'data' / 'labs.generated.json'"), 'default output path is project-relative')
assert(extractor.includes("'--sources-root'"), 'extractor accepts an explicit source-root CLI argument')
assert(extractor.includes("'--output'"), 'extractor accepts an explicit output CLI argument')
assert(extractor.includes("'--strict'"), 'extractor supports strict missing-repository validation')
assert(extractor.includes("MDG_SOURCES_ROOT"), 'extractor supports an environment-configured source root')
assert(extractor.includes('resolve_repo('), 'extractor resolves normal and double-nested GitHub archive layouts')

if (failures.length) {
  console.error(`${failures.length} extractor portability check(s) failed:`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Extractor portability contracts: ${checks} checks passed.`)
