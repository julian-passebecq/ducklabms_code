import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const extractor = readFileSync(join(root, 'scripts/extract_labs.py'), 'utf8')
const failures: string[] = []
let checks = 0
function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    const rel = relative(root, path)
    if (rel.startsWith('node_modules') || rel.startsWith('dist') || name === '__pycache__') return []
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const executable = walk(root).filter(path => /\.(ts|tsx|mts|py|json)$/.test(path))
const runtimeFiles = executable.filter(path => {
  const rel = relative(root, path).replace(/\\/g, '/')
  return rel.startsWith('src/') || rel === 'scripts/extract_labs.py' || rel === 'vite.config.ts' || rel === 'package.json'
})
const machineCoupled = runtimeFiles.filter(path => readFileSync(path, 'utf8').includes('/mnt/data/'))

assert(pkg.version === '0.4.4', 'package version is V4.4')
assert(Boolean(pkg.scripts?.['test:search']), 'package exposes the search regression gate')
assert(Boolean(pkg.scripts?.['test:release']), 'package exposes the release regression gate')
assert(pkg.scripts?.test?.includes('test:search') && pkg.scripts?.test?.includes('test:release'), 'main npm test runs search and release gates')
assert(machineCoupled.length === 0, `runtime sources contain no /mnt/data coupling (${machineCoupled.join(', ')})`)
assert(extractor.includes("'--sources-root'"), 'extractor exposes --sources-root')
assert(extractor.includes("'--output'"), 'extractor exposes --output')
assert(extractor.includes("'--strict'"), 'extractor exposes --strict')
assert(extractor.includes('MDG_SOURCES_ROOT'), 'extractor supports MDG_SOURCES_ROOT')
assert(existsSync(join(root, 'src/lib/search.ts')), 'shared search layer is packaged')
assert(existsSync(join(root, 'DEBUG_TEST_PASS_V4_4.md')), 'V4.4 debug report is packaged')
assert(existsSync(join(root, 'VALIDATION.md')), 'validation record is packaged')

if (failures.length) {
  console.error(`${failures.length} release contract check(s) failed:`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Release contracts: ${checks} checks passed.`)
