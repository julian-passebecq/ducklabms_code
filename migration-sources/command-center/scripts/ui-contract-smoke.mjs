import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const srcRoot = path.join(root, 'src')
const errors = []
const assert = (condition, message) => { if (!condition) errors.push(message) }

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const app = read('src/App.tsx')
const css = read('src/styles.css')
const card = read('src/components/ProjectCard.tsx')
const drawer = read('src/components/ProjectDrawer.tsx')
const rightRail = read('src/components/RightRail.tsx')
const sidebar = read('src/components/Sidebar.tsx')
const techStack = read('src/components/TechStackView.tsx')

assert((app.match(/<main\b/g) ?? []).length === 1, 'App should expose exactly one main landmark')
assert((app.match(/<\/main>/g) ?? []).length === 1, 'App should close exactly one main landmark')
assert(app.includes('href="#main-content"'), 'Skip link target is missing')
assert(app.includes('id="main-content"'), 'Main landmark target is missing')
assert(!app.includes('<main className="dashboard-center">'), 'Nested dashboard main landmark must not return')
assert(app.includes('caseStudy?.proofPoints'), 'Search should include case-study proof points')
assert(app.includes('caseStudy?.tradeoffs'), 'Search should include case-study trade-offs')
assert(app.includes("!projects.some((project) => project.id === projectParam)"), 'Unknown project URL ids should be canonicalized away')
assert(app.includes('Boolean(query)'), 'Whitespace-only search should not count as an active filter')

assert(css.includes('.skip-link'), 'Skip-link styling is missing')
assert(css.includes('.project-toolbar__right {\n    display: flex;') || css.includes('.project-toolbar__right {\r\n    display: flex;'), 'Mobile evidence/sort controls must remain visible')
assert(!css.includes('.project-toolbar__right{display:none}'), 'Legacy mobile rule still hides evidence/sort controls')

assert(card.includes('canOpenRepository(project) && ('), 'Project cards must suppress inaccessible private-repository actions')
assert(drawer.includes('canOpenRepository(project) && ('), 'Project drawer must suppress inaccessible private-repository actions')
assert(rightRail.includes('.filter((p) => p.featured)'), 'Featured rail must use the explicit featured flag')
assert(!rightRail.includes('p.featured || p.live'), 'Featured rail must not silently promote every live project')
assert(sidebar.includes('aria-current='), 'Sidebar selection should expose aria-current')
assert(techStack.includes('aria-pressed={selected === tech}'), 'Tech-stack selection should expose aria-pressed')

for (const file of walk(srcRoot).filter((item) => item.endsWith('.tsx'))) {
  const source = fs.readFileSync(file, 'utf8')
  const nativeButtons = [...source.matchAll(/<button\b([^>]*)>/g)]
  for (const match of nativeButtons) {
    assert(/\btype=["']button["']/.test(match[1]), `${path.relative(root, file)}: native button missing type="button"`)
  }
}

for (const file of walk(srcRoot).filter((item) => /\.(ts|tsx)$/.test(item))) {
  const source = fs.readFileSync(file, 'utf8')
  assert(!/console\.(log|debug|warn|error)\s*\(/.test(source), `${path.relative(root, file)}: debug console call found in application source`)
}

if (errors.length) {
  console.error(`UI contract smoke test: FAIL (${errors.length})`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log('UI contract smoke test: PASS (landmarks, mobile controls, evidence CTAs, native buttons, debug hygiene)')
