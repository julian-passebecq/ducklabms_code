import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../src/styles.css'), 'utf8')
const failures: string[] = []
let checks = 0
function assert(condition: unknown, message: string) {
  checks += 1
  if (!condition) failures.push(message)
}

const mobile = css.match(/@media \(max-width: 900px\) \{[\s\S]*?\n\}/g)?.join('\n') ?? ''
assert(css.includes('.railItems { width:100%; display:grid; grid-auto-flow:column; grid-auto-columns:minmax(56px,1fr); overflow-x:auto;'), 'mobile rail remains horizontally adaptive')
assert(mobile.includes('.railItem.fui-Button { min-height:54px; font-size:9px; }'), 'mobile Fluent rail font-size override matches desktop specificity')
assert(mobile.includes('.railItem.fui-Button.active { box-shadow:inset 0 3px 0 var(--brand); }'), 'mobile active indicator overrides desktop left indicator')
assert(css.includes('.searchScrim { position:fixed;'), 'search overlay retains scrim contract')
assert(css.includes('@media (max-width:900px) { .searchScrim { left:0; bottom:64px; } }'), 'mobile search scrim leaves bottom rail accessible')

if (failures.length) {
  console.error(`${failures.length} CSS contract check(s) failed:`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`CSS responsive contracts: ${checks} checks passed.`)
