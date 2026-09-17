import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import {
  Badge,
  Button,
  Card,
  Divider,
  Dropdown,
  FluentProvider,
  Option,
  ProgressBar,
  SearchBox,
  Switch,
  Tab,
  TabList,
  Text,
  Title1,
  Title2,
  Subtitle1,
  Subtitle2,
  Tooltip,
  Tree,
  TreeItem,
  TreeItemLayout,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components'
import {
  Apps24Regular,
  BookOpen24Regular,
  ChartMultiple24Regular,
  DocumentBulletList24Regular,
  Home24Regular,
  Shield24Regular,
} from '@fluentui/react-icons'
import labsRaw from './data/labs.generated.json'
import { concepts, decisionGuides, exams, learningPaths, snippets, sourceRegistry, type Concept, type Freshness, type Platform } from './data/content'
import { buildGuideHash, resolveGuideHash, type GuidePage, type GuideRoutePolicies } from './lib/routes'
import { parseStoredBoolean, parseStoredStringSet } from './lib/persistence'
import { moveSearchIndex, rankSearchCandidates, searchMatch } from './lib/search'
import './styles.css'

type Page = GuidePage
type Lab = {
  id: string
  title: string
  description: string
  duration: string
  module: string
  categories: string[]
  courses: string[]
  platform: string
  source: string
  status: Freshness
  relativePath: string
  outline: string[]
  sections: { title: string; summary: string; code: string }[]
}

const labs = labsRaw as Lab[]


type SearchResult = {
  id: string
  kind: 'concept' | 'decision' | 'exam' | 'lab' | 'code'
  title: string
  meta: string
  page: Page
}

type InitialRoute = { page: Page; target?: string }

const routePolicies: GuideRoutePolicies = {
  concepts: { validTargets: new Set(concepts.map(item => item.id)), fallbackTarget: 'lakehouse' },
  decisions: { validTargets: new Set(decisionGuides.map(item => item.id)), fallbackTarget: decisionGuides[0].id },
  certifications: { validTargets: new Set(exams.map(item => item.code)), fallbackTarget: 'DP-600' },
  labs: { validTargets: new Set(labs.map(item => item.id)) },
  code: { validTargets: new Set(snippets.map(item => item.id)) },
}

function readRouteFromHash(): InitialRoute {
  if (typeof window === 'undefined') return { page: 'home' }
  return resolveGuideHash(window.location.hash, routePolicies)
}

function usePersistentSet(key: string, allowed?: ReadonlySet<string>) {
  const [values, setValues] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      return parseStoredStringSet(window.localStorage.getItem(key), allowed)
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify([...values])) } catch { /* storage can be blocked */ }
  }, [key, values])

  const toggle = (value: string) => setValues(current => {
    const next = new Set(current)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  })

  return { values, toggle }
}


function usePersistentBoolean(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initial
    try {
      return parseStoredBoolean(window.localStorage.getItem(key), initial)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try { window.localStorage.setItem(key, String(value)) } catch { /* storage can be blocked */ }
  }, [key, value])

  return [value, setValue] as const
}

const pageItems: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home24Regular /> },
  { id: 'concepts', label: 'Concepts', icon: <BookOpen24Regular /> },
  { id: 'decisions', label: 'Decide', icon: <span className="railGlyph">⇄</span> },
  { id: 'certifications', label: 'Certifications', icon: <ChartMultiple24Regular /> },
  { id: 'labs', label: 'Labs', icon: <Apps24Regular /> },
  { id: 'code', label: 'Code book', icon: <DocumentBulletList24Regular /> },
  { id: 'sources', label: 'Freshness', icon: <Shield24Regular /> },
]

const platformMeta: Record<string, { mark: string; subtitle: string; accent: string }> = {
  Fabric: { mark: 'F', subtitle: 'OneLake · Data Factory · Warehouse · RTI · Power BI · IQ', accent: 'fabric' },
  Azure: { mark: 'A', subtitle: 'ADF · ADLS · SQL · Event Hubs · Entra · Monitor', accent: 'azure' },
  'Azure Databricks': { mark: 'D', subtitle: 'Unity Catalog · Lakeflow · Spark · Delta · Jobs', accent: 'databricks' },
  'Power BI': { mark: 'P', subtitle: 'Power Query · Semantic models · DAX · Security', accent: 'powerbi' },
}

function statusLabel(status: Freshness) {
  if (status === 'current') return 'Current'
  if (status === 'reference') return 'Reference'
  return 'Legacy'
}

function labCertifications(lab: Lab) {
  const mapped = new Set(lab.courses)
  for (const exam of exams) if (lab.source.includes(exam.code)) mapped.add(exam.code)
  return [...mapped]
}

function weightValue(weight: string) {
  const values = weight.match(/\d+/g)?.map(Number) ?? []
  if (!values.length) return 0
  return ((values[0] + (values[1] ?? values[0])) / 2) / 100
}

function StatusBadge({ status }: { status: Freshness }) {
  return (
    <Badge
      appearance="tint"
      color={status === 'current' ? 'success' : status === 'legacy' ? 'danger' : 'informative'}
      size="small"
    >
      {statusLabel(status)}
    </Badge>
  )
}

function ProductMark({ value, accent = 'fabric', compact = false }: { value: string; accent?: string; compact?: boolean }) {
  return <span aria-hidden="true" className={`productMark ${accent} ${compact ? 'compact' : ''}`}>{value}</span>
}

function ExternalLink({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <>{children}</>
  return <a className="externalLink" href={href} target="_blank" rel="noreferrer">{children} ↗</a>
}

function ShellNav({ active, setActive }: { active: Page; setActive: (page: Page) => void }) {
  return (
    <nav className="leftRail" aria-label="Primary navigation">
      <button className="brandButton" onClick={() => setActive('home')} aria-label="Microsoft Data Guide home">
        <span className="msGrid" aria-hidden="true"><i/><i/><i/><i/></span>
      </button>
      <div className="railItems">
        {pageItems.map(item => (
          <Tooltip key={item.id} content={item.label} relationship="label" positioning="after">
            <Button
              appearance="subtle"
              icon={item.icon}
              className={`railItem ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
              aria-current={active === item.id ? 'page' : undefined}
            >
              {item.label}
            </Button>
          </Tooltip>
        ))}
      </div>
      <div className="railFooter">
        <Badge appearance="outline" color="informative">Fluent 2</Badge>
      </div>
    </nav>
  )
}

function TopBar({
  dark,
  setDark,
  query,
  setQuery,
  split,
  setSplit,
  searchOpen,
  setSearchOpen,
  searchResults,
  activeSearchIndex,
  setActiveSearchIndex,
  openSearchResult,
}: {
  dark: boolean
  setDark: (v: boolean) => void
  query: string
  setQuery: (v: string) => void
  split: boolean
  setSplit: (v: boolean) => void
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  searchResults: SearchResult[]
  activeSearchIndex: number
  setActiveSearchIndex: (index: number) => void
  openSearchResult: (result: SearchResult) => void
}) {
  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && searchResults.length) {
      event.preventDefault()
      setSearchOpen(true)
      setActiveSearchIndex(moveSearchIndex(activeSearchIndex, 1, searchResults.length))
    }
    if (event.key === 'ArrowUp' && searchResults.length) {
      event.preventDefault()
      setSearchOpen(true)
      setActiveSearchIndex(moveSearchIndex(activeSearchIndex, -1, searchResults.length))
    }
    if (event.key === 'Enter' && activeSearchIndex >= 0 && searchResults[activeSearchIndex]) {
      event.preventDefault()
      openSearchResult(searchResults[activeSearchIndex])
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setSearchOpen(false)
    }
  }

  return (
    <header className="topBar">
      <div className="appIdentity">
        <ProductMark value="M" accent="neutral" compact />
        <div>
          <Text weight="semibold">Microsoft Data Guide</Text>
          <Text size={200} className="muted">Fabric + Azure engineering study workspace</Text>
        </div>
      </div>
      <div className="globalSearch">
        <SearchBox
          aria-label="Search the Microsoft Data Guide"
          aria-controls="global-search-results"
          aria-expanded={searchOpen && query.trim().length > 0}
          aria-haspopup="listbox"
          aria-activedescendant={searchOpen && activeSearchIndex >= 0 && searchResults[activeSearchIndex] ? `search-option-${activeSearchIndex}` : undefined}
          value={query}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={onSearchKeyDown}
          onChange={(_, d) => { setQuery(d.value); setSearchOpen(true); setActiveSearchIndex(0) }}
          placeholder="Search concepts, decisions, exams, labs, code…  Ctrl+K"
        />
      </div>
      <div className="topActions">
        <Switch checked={split} onChange={(_, d) => setSplit(d.checked)} label="2-page" />
        <Switch checked={dark} onChange={(_, d) => setDark(d.checked)} label="Dark" />
      </div>
    </header>
  )
}

function HomePage({ navigate, selectConcept, masteredCount, completedLabCount, bookmarkedCount, bookmarkedConceptIds }: { navigate: (p: Page) => void; selectConcept: (id: string) => void; masteredCount: number; completedLabCount: number; bookmarkedCount: number; bookmarkedConceptIds: Set<string> }) {
  const currentLabs = labs.filter(l => l.status === 'current').length
  const fabricLabs = labs.filter(l => l.platform === 'Fabric' && l.status === 'current').length
  const dbxLabs = labs.filter(l => l.platform === 'Azure Databricks' && l.status === 'current').length
  const openPlatform = (name: string) => {
    navigate('concepts')
    const hit = concepts.find(c => c.platform === name)
    if (hit) selectConcept(hit.id)
  }

  return (
    <main className="page homePage">
      <div className="fabricToolbar">
        <div className="fabricToolbarIdentity">
          <ProductMark value="F" accent="fabric" compact />
          <div><Text weight="semibold">Microsoft data study hub</Text><Text size={200} className="muted">Fabric-style navigation with Azure and Databricks kept distinct.</Text></div>
        </div>
        <div className="fabricToolbarActions">
          <Button appearance="primary" onClick={() => navigate('concepts')}>Start studying</Button>
          <Button onClick={() => navigate('decisions')}>Decision center</Button>
          <Button onClick={() => navigate('labs')}>Open labs</Button>
          <Button appearance="subtle" onClick={() => navigate('sources')}>Check freshness</Button>
        </div>
      </div>
      <section className="hero">
        <div className="heroCopy">
          <Badge appearance="tint" color="informative">Verified 16 Sep 2026</Badge>
          <Title1>Learn the Microsoft data stack as a system, not a pile of pages.</Title1>
          <Text size={500} className="heroLead">
            Product map, certification blueprint, concepts, runnable code patterns, and hands-on labs in one navigable workspace.
          </Text>
          <div className="heroActions">
            <Button appearance="primary" size="large" onClick={() => navigate('concepts')}>Open concept guide</Button>
            <Button size="large" onClick={() => navigate('decisions')}>Choose the right tool</Button>
            <Button size="large" onClick={() => navigate('certifications')}>Deconstruct a certification</Button>
          </div>
        </div>
        <div className="heroPanel" aria-label="Guide status">
          <div className="heroMetric"><strong>{currentLabs}</strong><span>current labs indexed</span></div>
          <div className="heroMetric"><strong>{concepts.length}</strong><span>core concepts defined</span></div>
          <div className="heroMetric"><strong>{exams.filter(e => e.status === 'current').length}</strong><span>current exam maps</span></div>
          <div className="heroMetric studyMetric"><strong>{masteredCount}/{concepts.length}</strong><span>concepts understood</span></div>
          <div className="heroMetric studyMetric"><strong>{completedLabCount}</strong><span>labs completed</span></div>
          <div className="heroMetric studyMetric"><strong>{bookmarkedCount}</strong><span>bookmarked concepts</span></div>
          <Divider />
          <div className="freshLine"><span className="freshDot"/>Official certification pages checked against Microsoft Learn.</div>
          <div className="freshLine"><span className="freshDot reference"/>Uploaded archives are classified before they enter study flows.</div>
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading">
          <div><Subtitle1>Start by platform</Subtitle1><Text className="muted">A Fabric-style launchpad, but organized around how data engineers actually work.</Text></div>
        </div>
        <div className="platformGrid">
          {Object.entries(platformMeta).map(([name, meta]) => (
            <Card
              key={name}
              className={`platformCard ${meta.accent}`}
              role="button"
              tabIndex={0}
              aria-label={`Explore ${name} concepts`}
              onClick={() => openPlatform(name)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPlatform(name) } }}
            >
              <div className="platformTop"><ProductMark value={meta.mark} accent={meta.accent}/><Badge appearance="outline">{concepts.filter(c => c.platform === name).length} concepts</Badge></div>
              <Title2>{name}</Title2>
              <Text className="muted">{meta.subtitle}</Text>
              <div className="platformFoot"><span>Explore architecture</span><span>→</span></div>
            </Card>
          ))}
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading"><div><Subtitle1>Three data-engineering mental models</Subtitle1><Text className="muted">Do not collapse Fabric, Azure integration services, and Azure Databricks into one product diagram.</Text></div></div>
        <div className="architectureMap">
          <Card className="flowCard fabricFlow">
            <div className="flowTitle"><ProductMark value="F" accent="fabric" compact/><div><strong>Fabric-native</strong><span>SaaS analytics platform</span></div></div>
            <div className="flowLine"><span>Sources</span><b>→</b><span>Data Factory / Eventstream</span><b>→</b><span>OneLake</span><b>→</b><span>Lakehouse / Warehouse / Eventhouse</span><b>→</b><span>Semantic model / AI</span></div>
          </Card>
          <Card className="flowCard azureFlow">
            <div className="flowTitle"><ProductMark value="A" accent="azure" compact/><div><strong>Azure composable</strong><span>Provisioned PaaS services</span></div></div>
            <div className="flowLine"><span>Sources</span><b>→</b><span>ADF / Event Hubs</span><b>→</b><span>ADLS Gen2</span><b>→</b><span>Databricks / SQL engines</span><b>→</b><span>Power BI / apps</span></div>
          </Card>
          <Card className="flowCard dbxFlow">
            <div className="flowTitle"><ProductMark value="D" accent="databricks" compact/><div><strong>Databricks lakehouse</strong><span>Engineering + governance runtime</span></div></div>
            <div className="flowLine"><span>Sources</span><b>→</b><span>Lakeflow Connect / Auto Loader</span><b>→</b><span>Delta tables</span><b>→</b><span>Unity Catalog + Jobs</span><b>→</b><span>BI / ML / AI</span></div>
          </Card>
        </div>
      </section>

      <section className="homeColumns">
        <Card className="dashboardCard">
          <div className="cardTitleRow"><Subtitle1>Certification radar</Subtitle1><Button appearance="subtle" onClick={() => navigate('certifications')}>View all</Button></div>
          {exams.filter(e => e.status === 'current').map(exam => (
            <div className="examMini" key={exam.code}>
              <ProductMark value={exam.code.replace('DP-', '').replace('PL-', '')} accent={exam.platform.includes('Databricks') ? 'databricks' : exam.platform.includes('Power BI') ? 'powerbi' : 'fabric'} compact/>
              <div className="examMiniBody"><strong>{exam.code}</strong><span>{exam.title}</span></div>
              <StatusBadge status={exam.status}/>
            </div>
          ))}
        </Card>

        <Card className="dashboardCard">
          <div className="cardTitleRow"><Subtitle1>Hands-on inventory</Subtitle1><Button appearance="subtle" onClick={() => navigate('labs')}>Browse labs</Button></div>
          <div className="inventoryRow"><span>Fabric labs</span><strong>{fabricLabs}</strong></div>
          <ProgressBar value={fabricLabs / 50}/>
          <div className="inventoryRow"><span>Current DP-750 labs</span><strong>{dbxLabs}</strong></div>
          <ProgressBar value={dbxLabs / 20}/>
          <div className="inventoryRow"><span>Labs you completed</span><strong>{completedLabCount}</strong></div>
          <ProgressBar value={currentLabs ? Math.min(1, completedLabCount / currentLabs) : 0}/>
          <div className="inventoryRow"><span>Reference + legacy exercises isolated</span><strong>{labs.filter(l => l.status !== 'current').length}</strong></div>
          <ProgressBar value={Math.min(1, labs.filter(l => l.status !== 'current').length / 50)}/>
        </Card>

        <Card className="dashboardCard">
          <div className="cardTitleRow"><Subtitle1>Useful first route</Subtitle1></div>
          <ol className="routeList">
            <li><Button appearance="transparent" onClick={() => { navigate('concepts'); selectConcept('onelake') }}>OneLake → Lakehouse → Warehouse</Button></li>
            <li><Button appearance="transparent" onClick={() => { navigate('concepts'); selectConcept('fabric-pipeline') }}>Pipeline vs Dataflow vs Notebook</Button></li>
            <li><Button appearance="transparent" onClick={() => { navigate('concepts'); selectConcept('semantic-model') }}>Semantic model → Direct Lake → DAX</Button></li>
            <li><Button appearance="transparent" onClick={() => { navigate('concepts'); selectConcept('adf') }}>ADF → ADLS → Azure Databricks</Button></li>
            <li><Button appearance="transparent" onClick={() => { navigate('concepts'); selectConcept('unity-catalog') }}>Unity Catalog → Lakeflow → Jobs</Button></li>
          </ol>
          <Divider />
          <div className="bookmarkResume">
            <strong>Bookmarked for review</strong>
            {[...bookmarkedConceptIds].length ? [...bookmarkedConceptIds].slice(0, 4).map(id => {
              const item = concepts.find(c => c.id === id)
              return item ? <Button key={id} appearance="subtle" size="small" onClick={() => { navigate('concepts'); selectConcept(id) }}>{item.title} →</Button> : null
            }) : <Text size={200} className="muted">Bookmark concepts while reading and they will appear here.</Text>}
          </div>
        </Card>
      </section>
    </main>
  )
}

function ConceptSidebar({ selected, onSelect, query, examLens, setExamLens }: { selected: string; onSelect: (id: string) => void; query: string; examLens: string; setExamLens: (value: string) => void }) {
  const grouped = useMemo(() => {
    const filtered = concepts.filter(c => (examLens === 'All' || c.examRefs.some(ref => ref.startsWith(examLens))) && (!query.trim() || searchMatch([c.title, c.short, c.area, c.platform, c.definition].join(' '), query)))
    const byPlatform = new Map<string, Map<string, Concept[]>>()
    filtered.forEach(c => {
      if (!byPlatform.has(c.platform)) byPlatform.set(c.platform, new Map())
      const byArea = byPlatform.get(c.platform)!
      if (!byArea.has(c.area)) byArea.set(c.area, [])
      byArea.get(c.area)!.push(c)
    })
    return byPlatform
  }, [query, examLens])

  return (
    <aside className="conceptSidebar">
      <div className="sideTitle">
        <div><Text weight="semibold">Knowledge tree</Text><Text size={200} className="muted">Platform → area → concept</Text></div>
        <Badge appearance="outline">{[...grouped.values()].reduce((sum, areas) => sum + [...areas.values()].reduce((inner, items) => inner + items.length, 0), 0)}</Badge>
      </div>
      <div className="conceptLens">
        <Text size={200} weight="semibold">Certification lens</Text>
        <Dropdown aria-label="Filter concepts by certification" value={examLens === 'All' ? 'All concepts' : examLens} selectedOptions={[examLens]} onOptionSelect={(_, d) => setExamLens(String(d.optionValue ?? 'All'))}>
          <Option value="All">All concepts</Option>
          {exams.filter(exam => exam.status === 'current').map(exam => <Option key={exam.code} value={exam.code}>{exam.code} · {exam.role}</Option>)}
        </Dropdown>
      </div>
      <Tree key={examLens} aria-label="Microsoft data concept hierarchy" className="conceptTree" defaultOpenItems={[...grouped.keys()].map(platform => `platform-${platform}`)}>
        {[...grouped.entries()].map(([platform, areas]) => (
          <TreeItem itemType="branch" key={platform} value={`platform-${platform}`}>
            <TreeItemLayout iconBefore={<ProductMark value={platform === 'Azure Databricks' ? 'D' : platform[0]} accent={platformMeta[platform]?.accent || 'neutral'} compact/>}>
              <span className="treePlatformLabel">{platform}</span>
            </TreeItemLayout>
            <Tree defaultOpenItems={[...areas.keys()].map(area => `area-${platform}-${area}`)}>
              {[...areas.entries()].map(([area, items]) => (
                <TreeItem itemType="branch" key={`${platform}-${area}`} value={`area-${platform}-${area}`}>
                  <TreeItemLayout><span className="treeAreaLabel">{area}</span></TreeItemLayout>
                  <Tree>
                    {items.map(item => (
                      <TreeItem itemType="leaf" key={item.id} value={item.id}>
                        <TreeItemLayout
                          className={`treeLeaf ${selected === item.id ? 'active' : ''}`}
                          aria-current={selected === item.id ? 'page' : undefined}
                          onClick={() => onSelect(item.id)}
                        >
                          {item.title}
                        </TreeItemLayout>
                      </TreeItem>
                    ))}
                  </Tree>
                </TreeItem>
              ))}
            </Tree>
          </TreeItem>
        ))}
      </Tree>
    </aside>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    let success = false
    try {
      await navigator.clipboard.writeText(code)
      success = true
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = code
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        success = document.execCommand('copy')
        textarea.remove()
      } catch { success = false }
    }
    if (success) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    }
  }
  return (
    <div className="codeBlock">
      <div className="codeHeader"><span>{language}</span><Button appearance="subtle" size="small" onClick={(event) => { event.stopPropagation(); void copy() }}>{copied ? 'Copied' : 'Copy'}</Button></div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

function ConceptPage({ selected, setSelected, query, split, mastered, bookmarked, toggleMastered, toggleBookmarked, openLab }: { selected: string; setSelected: (id: string) => void; query: string; split: boolean; mastered: Set<string>; bookmarked: Set<string>; toggleMastered: (id: string) => void; toggleBookmarked: (id: string) => void; openLab: (id: string) => void }) {
  const [examLens, setExamLens] = useState('All')
  const visibleConcepts = useMemo(() => examLens === 'All' ? concepts : concepts.filter(c => c.examRefs.some(ref => ref.startsWith(examLens))), [examLens])
  const concept = visibleConcepts.find(c => c.id === selected) || visibleConcepts[0] || concepts[0]

  useEffect(() => {
    if (examLens !== 'All' && !visibleConcepts.some(c => c.id === selected) && visibleConcepts[0]) setSelected(visibleConcepts[0].id)
  }, [examLens, selected, setSelected, visibleConcepts])
  const relatedSnippets = snippets.filter(s => concept.code?.includes(s.id) || s.conceptIds.includes(concept.id))
  const matchingLabs = labs.filter(l => {
    if (!concept.labKeywords?.length) return false
    const hay = `${l.title} ${l.description} ${l.module} ${l.categories.join(' ')}`.toLowerCase()
    return concept.labKeywords.some(k => hay.includes(k.toLowerCase())) && l.status === 'current'
  }).slice(0, 4)
  const conceptIndex = visibleConcepts.findIndex(c => c.id === concept.id)
  const previousConcept = conceptIndex > 0 ? visibleConcepts[conceptIndex - 1] : undefined
  const nextConcept = conceptIndex >= 0 && conceptIndex < visibleConcepts.length - 1 ? visibleConcepts[conceptIndex + 1] : undefined

  return (
    <main className="page noPad conceptPage">
      <ConceptSidebar selected={concept.id} onSelect={setSelected} query={query} examLens={examLens} setExamLens={setExamLens}/>
      <section className="readerShell">
        <div className="readerToolbar">
          <div className="breadcrumb"><span>{concept.platform}</span><span>›</span><span>{concept.area}</span><span>›</span><strong>{concept.title}</strong></div>
          <div className="readerToolbarActions">
            <div className="readerMode"><span className="modeDot"/>{split ? 'Two-page study view' : 'Single-page study view'}</div>
            <Button size="small" appearance={bookmarked.has(concept.id) ? 'primary' : 'subtle'} onClick={() => toggleBookmarked(concept.id)}>{bookmarked.has(concept.id) ? 'Bookmarked' : 'Bookmark'}</Button>
            <Button size="small" appearance={mastered.has(concept.id) ? 'primary' : 'subtle'} onClick={() => toggleMastered(concept.id)}>{mastered.has(concept.id) ? 'Understood ✓' : 'Mark understood'}</Button>
            <Button size="small" appearance="subtle" disabled={!previousConcept} onClick={() => previousConcept && setSelected(previousConcept.id)}>← Previous</Button>
            <Button size="small" appearance="subtle" disabled={!nextConcept} onClick={() => nextConcept && setSelected(nextConcept.id)}>Next →</Button>
          </div>
        </div>
        <div className={`bookSpread ${split ? 'split' : 'single'}`}>
          <article className="bookPage leftPage">
            <div className="pageKicker"><Badge appearance="tint" color="informative">Concept</Badge><span>{concept.platform}</span></div>
            <Title1>{concept.title}</Title1>
            <Text size={500} className="conceptShort">{concept.short}</Text>
            <section className="definitionBox">
              <Subtitle2>Definition</Subtitle2>
              <Text>{concept.definition}</Text>
            </section>
            <section>
              <Subtitle2>Mental model</Subtitle2>
              <blockquote>{concept.mentalModel}</blockquote>
            </section>
            <section>
              <Subtitle2>Use it when</Subtitle2>
              <ul className="cleanList">{concept.useWhen.map(x => <li key={x}>{x}</li>)}</ul>
            </section>
            {concept.compare?.length ? (
              <section>
                <Subtitle2>Do not confuse it with</Subtitle2>
                <ul className="cleanList compareList">{concept.compare.map(x => <li key={x}>{x}</li>)}</ul>
              </section>
            ) : null}
          </article>

          {split && <div className="bookGutter"/>}

          <article className="bookPage rightPage">
            <div className="pageKicker"><Badge appearance="tint" color="success">Practice</Badge><span>Exam + code + lab</span></div>
            <section>
              <Subtitle2>Certification relevance</Subtitle2>
              <div className="tagWrap">{concept.examRefs.map(r => <Badge key={r} appearance="outline">{r}</Badge>)}</div>
            </section>
            <section>
              <div className="inlineHeading"><Subtitle2>Code pattern</Subtitle2><Button appearance="subtle" size="small">{relatedSnippets.length} linked</Button></div>
              {relatedSnippets.length ? <CodeBlock language={relatedSnippets[0].language} code={relatedSnippets[0].code}/> : <div className="emptyState">This concept is architectural; no code snippet is required.</div>}
            </section>
            <section>
              <Subtitle2>Relevant hands-on labs</Subtitle2>
              <div className="compactLabList">
                {matchingLabs.length ? matchingLabs.map(l => (
                  <div className="compactLab" key={l.id}>
                    <div><strong>{l.title}</strong><span>{l.duration || l.module}</span></div>
                    <div className="compactLabActions"><StatusBadge status={l.status}/><Button size="small" appearance="subtle" onClick={() => openLab(l.id)}>Open →</Button></div>
                  </div>
                )) : <div className="emptyState">No direct lab indexed yet. Use the Labs view to search the full archive.</div>}
              </div>
            </section>
            <section className="nextConcepts">
              <Subtitle2>Continue with</Subtitle2>
              <div className="nextButtons">
                {visibleConcepts.filter(c => c.area === concept.area && c.id !== concept.id).slice(0, 3).map(c => <Button key={c.id} appearance="secondary" onClick={() => setSelected(c.id)}>{c.title}</Button>)}
              </div>
              <div className="conceptPager">
                <Button appearance="subtle" disabled={!previousConcept} onClick={() => previousConcept && setSelected(previousConcept.id)}>← {previousConcept?.title ?? 'Start'}</Button>
                <span>{conceptIndex + 1} / {visibleConcepts.length}{examLens !== 'All' ? ` · ${examLens}` : ''}</span>
                <Button appearance="subtle" disabled={!nextConcept} onClick={() => nextConcept && setSelected(nextConcept.id)}>{nextConcept?.title ?? 'End'} →</Button>
              </div>
            </section>
          </article>
        </div>
      </section>
    </main>
  )
}

function DecisionsPage({ query, split, selectedGuideId, setSelectedGuideId, openConcept }: { query: string; split: boolean; selectedGuideId: string; setSelectedGuideId: (id: string) => void; openConcept: (id: string) => void }) {
  const filtered = decisionGuides.filter(guide => !query.trim() || searchMatch(`${guide.title} ${guide.question} ${guide.summary} ${guide.options.map(option => `${option.label} ${option.bestFor} ${option.signal}`).join(' ')}`, query))
  const guide = decisionGuides.find(item => item.id === selectedGuideId) || decisionGuides[0]

  return (
    <main className="page decisionPage">
      <div className="pageHeader">
        <div><Badge appearance="tint" color="informative">Architecture decisions</Badge><Title1>Choose the Microsoft data tool for a reason.</Title1><Text className="muted">Side-by-side decision guides for the product boundaries Microsoft Learn often teaches on separate pages.</Text></div>
      </div>
      <div className="decisionLayout">
        <aside className="decisionList" aria-label="Decision guides">
          {filtered.length ? filtered.map(item => (
            <Button key={item.id} appearance="subtle" className={`decisionPicker ${guide.id === item.id ? 'active' : ''}`} onClick={() => setSelectedGuideId(item.id)}>
              <span className="decisionPickerBody"><strong>{item.title}</strong><small>{item.examRefs.join(' · ')}</small></span>
            </Button>
          )) : <div className="emptyState">No decision guide matches this search.</div>}
        </aside>
        <section className="decisionDetail">
          <div className="readerToolbar decisionToolbar">
            <div className="breadcrumb"><span>Decision center</span><span>›</span><strong>{guide.title}</strong></div>
            <div className="readerMode"><span className="modeDot"/>{split ? 'Two-page comparison' : 'Single-page comparison'}</div>
          </div>
          <div className={`bookSpread decisionBook ${split ? 'split' : 'single'}`}>
            <article className="bookPage leftPage">
              <div className="pageKicker"><Badge appearance="tint" color="informative">Decision</Badge><span>{guide.examRefs.join(' · ')}</span></div>
              <Title1>{guide.question}</Title1>
              <Text size={500} className="conceptShort">{guide.summary}</Text>
              <section className="definitionBox decisionRule">
                <Subtitle2>Rule of thumb</Subtitle2>
                <Text>{guide.ruleOfThumb}</Text>
              </section>
              <section>
                <Subtitle2>Fast signals</Subtitle2>
                <div className="signalList">
                  {guide.options.map((option, index) => (
                    <button key={option.conceptId} className="signalRow" onClick={() => openConcept(option.conceptId)}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div><strong>{option.label}</strong><small>{option.signal}</small></div>
                      <b>→</b>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <Subtitle2>Exam lens</Subtitle2>
                <div className="tagWrap">{guide.examRefs.map(ref => <Badge key={ref} appearance="outline">{ref}</Badge>)}</div>
              </section>
            </article>
            {split && <div className="bookGutter"/>}
            <article className="bookPage rightPage">
              <div className="pageKicker"><Badge appearance="tint" color="success">Compare</Badge><span>Best fit + failure mode</span></div>
              <div className="decisionOptionList">
                {guide.options.map(option => (
                  <Card key={option.conceptId} className="decisionOption">
                    <div className="decisionOptionHead"><Subtitle1>{option.label}</Subtitle1><Button size="small" appearance="subtle" onClick={() => openConcept(option.conceptId)}>Open concept →</Button></div>
                    <div className="decisionOptionGrid">
                      <div><small>BEST FOR</small><Text>{option.bestFor}</Text></div>
                      <div><small>WATCH FOR</small><Text>{option.watchFor}</Text></div>
                    </div>
                  </Card>
                ))}
              </div>
              <section className="decisionDebrief">
                <Subtitle2>Architecture check</Subtitle2>
                <ul className="cleanList"><li>What is the dominant access pattern?</li><li>Which team operates this service every day?</li><li>Where do identity, storage, compute, orchestration, and governance boundaries sit?</li><li>What would make you switch to another option in this comparison?</li></ul>
              </section>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}

function CertificationsPage({ query, selectedCode, setSelectedCode, navigateToConcept, navigateToDecision }: { query: string; selectedCode: string; setSelectedCode: (code: string) => void; navigateToConcept: (id: string) => void; navigateToDecision: (id: string) => void }) {
  const filtered = exams.filter(e => !query.trim() || searchMatch(`${e.code} ${e.title} ${e.platform} ${e.summary}`, query))
  const exam = exams.find(e => e.code === selectedCode) || exams[0]
  const paths = learningPaths.filter(p => p.certification.includes(exam.code))
  const mappedConcepts = concepts.filter(c => c.examRefs.some(ref => ref.startsWith(exam.code)))
  const mappedLabs = labs.filter(l => l.status === 'current' && labCertifications(l).includes(exam.code))
  const mappedDecisions = decisionGuides.filter(guide => guide.examRefs.includes(exam.code))

  return (
    <main className="page certificationPage">
      <div className="pageHeader">
        <div><Badge appearance="tint" color="informative">Certification intelligence</Badge><Title1>Deconstruct the exam before studying it.</Title1><Text className="muted">Blueprint → concepts → code → labs → official training. Legacy exams are visibly isolated.</Text></div>
      </div>
      <div className="certLayout">
        <aside className="certList">
          {filtered.length ? filtered.map(e => (
            <Button key={e.code} appearance="subtle" className={`certPicker ${exam.code === e.code ? 'active' : ''}`} onClick={() => setSelectedCode(e.code)}>
              <div className="certPickerContent">
                <div className="certPickerTop"><strong>{e.code}</strong><StatusBadge status={e.status}/></div>
                <span>{e.title}</span>
                <small>{e.platform}</small>
              </div>
            </Button>
          )) : <div className="emptyState">No certification matches this search.</div>}
        </aside>
        <section className="certDetail">
          <Card className="certHero">
            <div className="certHeroTop">
              <ProductMark value={exam.code.split('-')[1] || exam.code} accent={exam.platform.includes('Databricks') ? 'databricks' : exam.platform.includes('Power BI') ? 'powerbi' : exam.platform === 'Azure' ? 'azure' : 'fabric'}/>
              <div className="certHeroTitle"><div className="tagWrap"><StatusBadge status={exam.status}/><Badge appearance="outline">{exam.role}</Badge><Badge appearance="outline">{exam.skillsAsOf}</Badge></div><Title1>{exam.code} · {exam.title}</Title1><Text size={500}>{exam.summary}</Text></div>
            </div>
            <div className="certSource"><span>Last verified {exam.verified}</span><ExternalLink href={exam.sourceUrl}>Official study guide</ExternalLink></div>
          </Card>

          {exam.status === 'current' && exam.instructorCourse ? (
            <section className="sectionBlock compact">
              <div className="sectionHeading"><div><Subtitle1>Choose the study mode</Subtitle1><Text className="muted">Same official syllabus, reorganized here into a practical path.</Text></div></div>
              <Card className="studyModesCard">
                <div className="studyMode">
                  <div className="studyModeIcon">I</div>
                  <div><Badge appearance="tint" color="informative">Instructor-led</Badge><Subtitle1>{exam.instructorCourse.code}</Subtitle1><Text>{exam.instructorCourse.title}</Text><div className="studyMeta"><span>{exam.instructorCourse.duration}</span><span>{exam.instructorCourse.level}</span></div><ExternalLink href={exam.instructorCourse.url}>Official course</ExternalLink></div>
                </div>
                <div className="studyMode">
                  <div className="studyModeIcon self">S</div>
                  <div><Badge appearance="tint" color="success">Self-paced</Badge><Subtitle1>{paths.length} mapped learning paths</Subtitle1><Text>Use the concept guide first, then Microsoft Learn modules and the indexed labs below as evidence of mastery.</Text><div className="studyMeta"><span>Concept → code → lab</span><span>Exam-weight aware</span></div></div>
                </div>
              </Card>
              <div className="studyLoop" aria-label="Recommended study loop">
                <div><span>1</span><strong>Understand</strong><small>Concept + mental model</small></div>
                <b>→</b>
                <div><span>2</span><strong>See it</strong><small>Code + architecture</small></div>
                <b>→</b>
                <div><span>3</span><strong>Build it</strong><small>Structured lab</small></div>
                <b>→</b>
                <div><span>4</span><strong>Verify</strong><small>Exam objective + debrief</small></div>
              </div>
            </section>
          ) : null}

          {exam.skills.length ? (
            <section className="sectionBlock compact">
              <div className="sectionHeading"><div><Subtitle1>Skills measured</Subtitle1><Text className="muted">Use the weight as study-allocation guidance, not just a checklist.</Text></div></div>
              <div className="skillGrid">
                {exam.skills.map((skill, idx) => (
                  <Card key={skill.name} className="skillCard">
                    <div className="skillTop"><span className="skillNumber">0{idx+1}</span><Badge appearance="filled" color="informative">{skill.weight}</Badge></div>
                    <Subtitle1>{skill.name}</Subtitle1>
                    <ProgressBar value={weightValue(skill.weight)} thickness="large" />
                    <ul className="cleanList">{skill.detail.map(d => <li key={d}>{d}</li>)}</ul>
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            <Card className="legacyNotice"><StatusBadge status="legacy"/><div><Subtitle1>Historical reference only</Subtitle1><Text>{exam.summary}</Text></div></Card>
          )}

          {exam.status === 'current' ? (
            <section className="sectionBlock compact">
              <div className="sectionHeading"><div><Subtitle1>Guide coverage</Subtitle1><Text className="muted">Jump from the blueprint directly into concepts and current hands-on evidence.</Text></div></div>
              <div className="coverageGrid">
                <Card className="coverageMetric"><strong>{mappedConcepts.length}</strong><span>mapped concepts</span></Card>
                <Card className="coverageMetric"><strong>{mappedDecisions.length}</strong><span>decision guides</span></Card>
                <Card className="coverageMetric"><strong>{mappedLabs.length}</strong><span>current labs</span></Card>
                <Card className="coverageMetric"><strong>{paths.length}</strong><span>official learning paths</span></Card>
              </div>
              <div className="coverageConcepts">
                {mappedConcepts.slice(0, 10).map(c => <Button key={c.id} appearance="secondary" onClick={() => navigateToConcept(c.id)}>{c.title}</Button>)}
              </div>
              {mappedDecisions.length ? <div className="coverageDecisions"><Text size={200} weight="semibold">Architecture decisions</Text><div>{mappedDecisions.map(guide => <Button key={guide.id} appearance="subtle" onClick={() => navigateToDecision(guide.id)}>{guide.title} →</Button>)}</div></div> : null}
            </section>
          ) : null}

          <section className="sectionBlock compact">
            <div className="sectionHeading"><div><Subtitle1>Mapped learning paths</Subtitle1><Text className="muted">Microsoft’s training is useful as source material; this guide reorganizes it around decisions and practice.</Text></div></div>
            <div className="pathList">
              {paths.length ? paths.map(path => (
                <Card className="pathCard" key={path.title}>
                  <div className="pathMeta"><Badge appearance="outline">{path.modules} modules</Badge><Badge appearance="outline">{path.level}</Badge></div>
                  <Subtitle1>{path.title}</Subtitle1>
                  <Text>{path.summary}</Text>
                  <div className="pathFooter"><span>{path.role}</span><ExternalLink href={path.url}>Microsoft Learn</ExternalLink></div>
                </Card>
              )) : <div className="emptyState">No current learning path is mapped because this credential is legacy.</div>}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

function LabReader({ lab, onClose, split, completed, toggleCompleted, openConcept }: { lab: Lab; onClose: () => void; split: boolean; completed: boolean; toggleCompleted: () => void; openConcept: (id: string) => void }) {
  const visibleSections = lab.sections.slice(0, 12)
  const midpoint = Math.ceil(visibleSections.length / 2)
  const leftSections = visibleSections.slice(0, midpoint)
  const rightSections = visibleSections.slice(midpoint)
  const labHaystack = `${lab.title} ${lab.description} ${lab.module} ${lab.categories.join(' ')}`.toLowerCase()
  const relatedConcepts = concepts.filter(c => c.labKeywords?.some(keyword => labHaystack.includes(keyword.toLowerCase()))).slice(0, 6)
  const renderSection = (section: Lab['sections'][number], idx: number) => (
    <section className="labStep" key={`${section.title}-${idx}`}>
      <div className="labStepHead"><span>{String(idx + 1).padStart(2, '0')}</span><Subtitle2>{section.title}</Subtitle2></div>
      {section.summary && <Text>{section.summary}</Text>}
      {section.code && <CodeBlock language="code" code={section.code}/>} 
    </section>
  )

  return (
    <section className="labReaderShell">
      <div className="readerToolbar">
        <div className="breadcrumb"><span>{lab.platform}</span><span>›</span><span>{labCertifications(lab).join(' · ') || 'Lab'}</span><span>›</span><strong>{lab.title}</strong></div>
        <div className="readerToolbarActions"><Button size="small" appearance={completed ? 'primary' : 'secondary'} onClick={toggleCompleted}>{completed ? 'Completed ✓' : 'Mark lab complete'}</Button><Button size="small" appearance="subtle" onClick={onClose}>Close lab</Button></div>
      </div>
      <div className={`bookSpread labBook ${split ? 'split' : 'single'}`}>
        <article className="bookPage leftPage">
          <div className="pageKicker"><StatusBadge status={lab.status}/><span>{lab.duration || lab.module}</span></div>
          <Title1>{lab.title}</Title1>
          <Text size={500} className="conceptShort">{lab.description}</Text>
          <section className="definitionBox">
            <Subtitle2>Lab brief</Subtitle2>
            <Text>Source: {lab.source}</Text>
            <div className="tagWrap labReaderTags">{labCertifications(lab).map(c => <Badge key={c} appearance="outline">{c}</Badge>)}{lab.categories.map(c => <Badge key={c} appearance="outline">{c}</Badge>)}</div>
          </section>
          {leftSections.length ? leftSections.map(renderSection) : lab.outline.map((title, i) => renderSection({ title, summary: '', code: '' }, i))}
        </article>
        {split && <div className="bookGutter"/>}
        <article className="bookPage rightPage">
          <div className="pageKicker"><Badge appearance="tint" color="success">Hands-on</Badge><span>Do → verify → understand</span></div>
          <section className="labChecklist">
            <Subtitle2>Before you start</Subtitle2>
            <ul className="cleanList"><li>Read the goal and identify the Microsoft service being exercised.</li><li>Predict the resource/data flow before following the steps.</li><li>After each major step, explain what changed in storage, compute, orchestration, or governance.</li></ul>
          </section>
          {rightSections.length ? rightSections.map((x, i) => renderSection(x, i + leftSections.length)) : <div className="emptyState">The source lab has no additional structured sections.</div>}
          {relatedConcepts.length ? <section>
            <Subtitle2>Related concepts</Subtitle2>
            <div className="coverageConcepts">{relatedConcepts.map(c => <Button key={c.id} appearance="secondary" size="small" onClick={() => openConcept(c.id)}>{c.title}</Button>)}</div>
          </section> : null}
          <section className="labDebrief">
            <Subtitle2>Debrief</Subtitle2>
            <ul className="cleanList"><li>What object did you create?</li><li>Where is the data physically/logically stored?</li><li>Which identity or permission boundary applies?</li><li>Which exam objective does this lab prove?</li><li>How would this change in production?</li></ul>
          </section>
        </article>
      </div>
    </section>
  )
}

function LabsPage({ query, split, selectedLabId, setSelectedLabId, completedLabs, toggleCompletedLab, openConcept }: { query: string; split: boolean; selectedLabId: string | null; setSelectedLabId: (id: string | null) => void; completedLabs: Set<string>; toggleCompletedLab: (id: string) => void; openConcept: (id: string) => void }) {
  const [platform, setPlatform] = useState('All')
  const [status, setStatus] = useState<'all' | Freshness>('current')
  const [course, setCourse] = useState('All')
  const [progress, setProgress] = useState<'all' | 'todo' | 'done'>('all')
  const courses = useMemo(() => ['All', ...Array.from(new Set(labs.flatMap(labCertifications))).filter(Boolean).sort()], [])
  const platforms = ['All', ...Array.from(new Set(labs.map(l => l.platform))).sort()]

  const filtered = useMemo(() => labs.filter(l => {
    const matchesQuery = !query.trim() || searchMatch(`${l.title} ${l.description} ${l.module} ${l.categories.join(' ')} ${labCertifications(l).join(' ')} ${l.outline.join(' ')}`, query)
    const matchesProgress = progress === 'all' || (progress === 'done' ? completedLabs.has(l.id) : !completedLabs.has(l.id))
    return matchesQuery && matchesProgress && (platform === 'All' || l.platform === platform) && (status === 'all' || l.status === status) && (course === 'All' || labCertifications(l).includes(course))
  }), [query, platform, status, course, progress, completedLabs])
  const selectedLab = selectedLabId ? labs.find(l => l.id === selectedLabId) : undefined

  return (
    <main className="page labsPage">
      <div className="pageHeader labsHeader">
        <div><Badge appearance="tint" color="success">{labs.length} indexed exercises</Badge><Title1>Lab library</Title1><Text className="muted">One place to find the practical exercise that proves a concept. Open a lab to read it as a structured two-page brief instead of a long markdown page.</Text></div>
        <div className="labStat"><strong>{filtered.length}</strong><span>matching labs</span></div>
      </div>
      {selectedLab && <LabReader lab={selectedLab} onClose={() => setSelectedLabId(null)} split={split} completed={completedLabs.has(selectedLab.id)} toggleCompleted={() => toggleCompletedLab(selectedLab.id)} openConcept={openConcept}/>} 
      <div className="filterBar" aria-label="Lab filters">
        <div className="filterControl">
          <Text size={200} weight="semibold">Platform</Text>
          <Dropdown value={platform} selectedOptions={[platform]} onOptionSelect={(_, d) => setPlatform(String(d.optionValue ?? 'All'))}>
            {platforms.map(p => <Option key={p} value={p}>{p}</Option>)}
          </Dropdown>
        </div>
        <div className="filterControl">
          <Text size={200} weight="semibold">Certification</Text>
          <Dropdown value={course} selectedOptions={[course]} onOptionSelect={(_, d) => setCourse(String(d.optionValue ?? 'All'))}>
            {courses.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Dropdown>
        </div>
        <div className="filterControl">
          <Text size={200} weight="semibold">Freshness</Text>
          <Dropdown value={status === 'all' ? 'All' : statusLabel(status)} selectedOptions={[status]} onOptionSelect={(_, d) => setStatus(String(d.optionValue ?? 'current') as typeof status)}>
            <Option value="current">Current</Option>
            <Option value="reference">Reference</Option>
            <Option value="legacy">Legacy</Option>
            <Option value="all">All</Option>
          </Dropdown>
        </div>
        <div className="filterControl progressFilter">
          <Text size={200} weight="semibold">Study progress</Text>
          <Dropdown value={progress === 'done' ? 'Completed' : progress === 'todo' ? 'Not completed' : 'All'} selectedOptions={[progress]} onOptionSelect={(_, d) => setProgress(String(d.optionValue ?? 'all') as typeof progress)}>
            <Option value="all">All</Option>
            <Option value="todo">Not completed</Option>
            <Option value="done">Completed</Option>
          </Dropdown>
        </div>
        <Button appearance="subtle" onClick={() => { setPlatform('All'); setCourse('All'); setStatus('current'); setProgress('all') }}>Reset filters</Button>
        <div className="filterSummary"><strong>{filtered.length}</strong><span>visible</span></div>
      </div>
      <div className="labGrid">
        {filtered.map(lab => (
          <Card key={lab.id} className={`labCard ${lab.status}`}>
            <div className="labCardTop"><div className="tagWrap"><StatusBadge status={lab.status}/>{completedLabs.has(lab.id) && <Badge appearance="filled" color="success">Completed</Badge>}{lab.duration && <Badge appearance="outline">{lab.duration}</Badge>}</div><ProductMark compact value={lab.platform === 'Azure Databricks' ? 'D' : lab.platform === 'Power BI' ? 'P' : lab.platform === 'Azure SQL' ? 'S' : lab.platform === 'Fabric' ? 'F' : 'R'} accent={lab.platform === 'Azure Databricks' ? 'databricks' : lab.platform === 'Power BI' ? 'powerbi' : lab.platform === 'Fabric' ? 'fabric' : 'azure'}/></div>
            <Subtitle1>{lab.title}</Subtitle1>
            <Text className="labDesc">{lab.description}</Text>
            {lab.outline.length ? <div className="labOutline"><small>LAB FLOW</small>{lab.outline.slice(0,4).map((x,i) => <span key={x}><b>{i+1}</b>{x}</span>)}</div> : null}
            <div className="labCardBottom">
              <div><div className="tagWrap">{labCertifications(lab).slice(0,3).map(c => <Badge key={c} appearance="outline">{c}</Badge>)}</div><Button className="openLabButton" appearance="primary" size="small" onClick={() => { setSelectedLabId(lab.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Open structured lab</Button></div>
              <span className="sourceName">{lab.source}</span>
            </div>
          </Card>
        ))}
      </div>
      {!filtered.length && <div className="emptyState large">No lab matches the current filters.</div>}
    </main>
  )
}

function CodePage({ query, openConcept, selectedSnippetId, setSelectedSnippetId }: { query: string; openConcept: (id: string) => void; selectedSnippetId: string | null; setSelectedSnippetId: (id: string | null) => void }) {
  const [language, setLanguage] = useState('All')
  const langs = ['All', ...Array.from(new Set(snippets.map(s => s.language)))]
  const baseFiltered = snippets.filter(s => (language === 'All' || s.language === language) && (!query.trim() || searchMatch(`${s.title} ${s.language} ${s.note} ${s.code}`, query)))
  const selectedSnippet = selectedSnippetId ? snippets.find(s => s.id === selectedSnippetId) : undefined
  const filtered = selectedSnippet && !baseFiltered.some(s => s.id === selectedSnippet.id) ? [selectedSnippet, ...baseFiltered] : baseFiltered

  useEffect(() => {
    if (!selectedSnippetId) return
    const timer = window.setTimeout(() => document.getElementById(`snippet-${selectedSnippetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
    return () => window.clearTimeout(timer)
  }, [selectedSnippetId])

  return (
    <main className="page codePage">
      <div className="pageHeader"><div><Badge appearance="tint" color="informative">Pattern book</Badge><Title1>Code that explains the concept.</Title1><Text className="muted">Short, reusable patterns tied back to architecture and certification topics. Search results can deep-link to one exact snippet.</Text></div></div>
      <TabList selectedValue={language} onTabSelect={(_, d) => { setLanguage(String(d.value)); setSelectedSnippetId(null) }}>{langs.map(l => <Tab key={l} value={l}>{l}</Tab>)}</TabList>
      <div className="codeGrid">
        {filtered.map(s => (
          <Card id={`snippet-${s.id}`} className={`snippetCard ${selectedSnippetId === s.id ? 'selected' : ''}`} key={s.id} onClick={() => setSelectedSnippetId(s.id)}>
            <div className="snippetHead"><div><Badge appearance="outline">{s.language}</Badge><Subtitle1>{s.title}</Subtitle1></div>{selectedSnippetId === s.id && <Badge appearance="filled" color="informative">Selected</Badge>}</div>
            <Text>{s.note}</Text>
            <CodeBlock language={s.language} code={s.code}/>
            <div className="tagWrap snippetLinks">{s.conceptIds.map(id => <Button key={id} appearance="subtle" size="small" onClick={(event) => { event.stopPropagation(); openConcept(id) }}>{concepts.find(c => c.id === id)?.title || id} →</Button>)}</div>
          </Card>
        ))}
      </div>
      {!filtered.length && <div className="emptyState large">No code pattern matches the current filter.</div>}
    </main>
  )
}


function buildGlobalSearchResults(query: string): SearchResult[] {
  const candidates: Array<SearchResult & { searchText: string }> = [
    ...concepts.map(c => ({ id: c.id, kind: 'concept' as const, title: c.title, meta: `${c.platform} · ${c.area}`, page: 'concepts' as const, searchText: `${c.title} ${c.short} ${c.area} ${c.platform} ${c.definition}` })),
    ...decisionGuides.map(g => ({ id: g.id, kind: 'decision' as const, title: g.title, meta: `${g.examRefs.join(' · ')} · architecture decision`, page: 'decisions' as const, searchText: `${g.title} ${g.question} ${g.summary} ${g.ruleOfThumb} ${g.options.map(o => `${o.label} ${o.bestFor} ${o.watchFor} ${o.signal}`).join(' ')}` })),
    ...exams.map(e => ({ id: e.code, kind: 'exam' as const, title: `${e.code} · ${e.title}`, meta: `${e.platform} · ${statusLabel(e.status)}`, page: 'certifications' as const, searchText: `${e.code} ${e.title} ${e.platform} ${e.summary}` })),
    ...labs.map(l => ({ id: l.id, kind: 'lab' as const, title: l.title, meta: `${l.platform} · ${labCertifications(l).join(' · ') || statusLabel(l.status)}`, page: 'labs' as const, searchText: `${l.title} ${l.description} ${labCertifications(l).join(' ')} ${l.platform} ${l.source}` })),
    ...snippets.map(s => ({ id: s.id, kind: 'code' as const, title: s.title, meta: `${s.language} · code pattern`, page: 'code' as const, searchText: `${s.title} ${s.language} ${s.note} ${s.code}` })),
  ]
  return rankSearchCandidates(candidates, query, 12).map(({ searchText: _searchText, ...result }) => result)
}

function GlobalSearchResults({ results, activeIndex, onOpen }: { results: SearchResult[]; activeIndex: number; onOpen: (result: SearchResult) => void }) {
  return (
    <div id="global-search-results" className="globalSearchPanel" role="listbox" aria-label="Global search results">
      <div className="searchPanelHeader"><span>Search everywhere</span><Badge appearance="outline">{results.length} results</Badge></div>
      {results.length ? results.map((result, index) => (
        <Button
          id={`search-option-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          key={`${result.kind}-${result.id}`}
          appearance="subtle"
          className={`searchResult ${index === activeIndex ? 'active' : ''}`}
          onClick={() => onOpen(result)}
        >
          <span className={`searchKind ${result.kind}`}>{result.kind === 'concept' ? 'C' : result.kind === 'decision' ? '⇄' : result.kind === 'exam' ? 'E' : result.kind === 'lab' ? 'L' : '</>'}</span>
          <span className="searchResultText"><strong>{result.title}</strong><small>{result.meta}</small></span>
          <span className="searchArrow">→</span>
        </Button>
      )) : <div className="emptySearch">Type at least two characters or try a broader term.</div>}
      {activeIndex >= 0 && results[activeIndex] ? <span className="srOnly" aria-live="polite">Selected {results[activeIndex].title}</span> : null}
    </div>
  )
}

function SourcesPage() {
  return (
    <main className="page sourcesPage">
      <div className="pageHeader"><div><Badge appearance="tint" color="warning">Freshness control</Badge><Title1>Know what is current before you study it.</Title1><Text className="muted">The guide treats uploaded repositories as evidence. Current Microsoft documentation wins when terminology or certification scope changed.</Text></div></div>
      <Card className="freshnessPolicy">
        <div className="policyStep"><span>1</span><div><strong>Current</strong><Text>Live certification/product documentation verified for this build.</Text></div></div>
        <div className="policyStep"><span>2</span><div><strong>Reference</strong><Text>Still technically useful, but not necessarily a current exam blueprint.</Text></div></div>
        <div className="policyStep"><span>3</span><div><strong>Legacy</strong><Text>Retired certification/course or superseded product guidance. Never used silently.</Text></div></div>
      </Card>
      <div className="sourceTable">
        <div className="sourceRow header"><span>Source</span><span>Status</span><span>Checked</span><span>Why it matters</span></div>
        {sourceRegistry.map(src => (
          <div className="sourceRow" key={src.name}>
            <strong><ExternalLink href={src.url}>{src.name}</ExternalLink></strong>
            <span><StatusBadge status={src.status}/></span>
            <span>{src.checked}</span>
            <span>{src.note}</span>
          </div>
        ))}
      </div>
      <Card className="releaseNote">
        <Subtitle1>Notable corrections captured in this build</Subtitle1>
        <ul className="cleanList">
          <li>DP-203 is retired and should not be presented as the current Azure Data Engineer certification route.</li>
          <li>DP-500 is legacy; its uploaded labs are separated from current Power BI/Fabric study.</li>
          <li>DP-600’s current blueprint includes modern Fabric semantics and AI-ready content, including newer Fabric IQ / ontology material in current learning paths.</li>
          <li>ADF remains valid Azure technology, but Microsoft’s current ADF documentation explicitly points new data-integration users toward Fabric Data Factory.</li>
          <li>DP-750 is a distinct Azure Databricks track with Unity Catalog and Lakeflow terminology rather than a Fabric certification.</li>
        </ul>
      </Card>
    </main>
  )
}

export default function App() {
  const initialRoute = useMemo(readRouteFromHash, [])
  const [active, setActive] = useState<Page>(initialRoute.page)
  const [dark, setDark] = usePersistentBoolean('mdg-dark-theme', false)
  const [split, setSplit] = usePersistentBoolean('mdg-two-page-mode', true)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchResults = useMemo(() => buildGlobalSearchResults(query), [query])
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1)
  const [selectedConcept, setSelectedConcept] = useState(initialRoute.page === 'concepts' && initialRoute.target && concepts.some(c => c.id === initialRoute.target) ? initialRoute.target : 'lakehouse')
  const [selectedDecision, setSelectedDecision] = useState(initialRoute.page === 'decisions' && initialRoute.target && decisionGuides.some(g => g.id === initialRoute.target) ? initialRoute.target : decisionGuides[0].id)
  const [selectedExam, setSelectedExam] = useState(initialRoute.page === 'certifications' && initialRoute.target && exams.some(e => e.code === initialRoute.target) ? initialRoute.target : 'DP-600')
  const [selectedLabId, setSelectedLabId] = useState<string | null>(initialRoute.page === 'labs' && initialRoute.target && labs.some(l => l.id === initialRoute.target) ? initialRoute.target : null)
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(initialRoute.page === 'code' && initialRoute.target && snippets.some(s => s.id === initialRoute.target) ? initialRoute.target : null)
  const validConceptIds = useMemo(() => new Set(concepts.map(concept => concept.id)), [])
  const validLabIds = useMemo(() => new Set(labs.map(lab => lab.id)), [])
  const masteredConcepts = usePersistentSet('mdg-mastered-concepts', validConceptIds)
  const bookmarkedConcepts = usePersistentSet('mdg-bookmarked-concepts', validConceptIds)
  const completedLabs = usePersistentSet('mdg-completed-labs', validLabIds)

  useEffect(() => {
    setActiveSearchIndex(searchResults.length ? 0 : -1)
  }, [query, searchResults.length])

  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const syncRouteFromLocation = () => {
      const route = readRouteFromHash()
      const canonicalHash = buildGuideHash(route.page, route.target)
      if (window.location.hash !== canonicalHash) window.history.replaceState(null, '', canonicalHash)
      setActive(route.page)
      if (route.page === 'concepts' && route.target && concepts.some(c => c.id === route.target)) setSelectedConcept(route.target)
      if (route.page === 'decisions' && route.target && decisionGuides.some(g => g.id === route.target)) setSelectedDecision(route.target)
      if (route.page === 'certifications' && route.target && exams.some(e => e.code === route.target)) setSelectedExam(route.target)
      if (route.page === 'labs') setSelectedLabId(route.target && labs.some(l => l.id === route.target) ? route.target : null)
      if (route.page === 'code') setSelectedSnippetId(route.target && snippets.some(s => s.id === route.target) ? route.target : null)
      setSearchOpen(false)
      setQuery('')
    }
    syncRouteFromLocation()
    window.addEventListener('popstate', syncRouteFromLocation)
    window.addEventListener('hashchange', syncRouteFromLocation)
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation)
      window.removeEventListener('hashchange', syncRouteFromLocation)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const input = document.querySelector<HTMLInputElement>('input[aria-label="Search the Microsoft Data Guide"]')
        input?.focus()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const target = active === 'concepts' ? selectedConcept
      : active === 'decisions' ? selectedDecision
      : active === 'certifications' ? selectedExam
      : active === 'labs' ? selectedLabId
      : active === 'code' ? selectedSnippetId
      : undefined
    const nextHash = buildGuideHash(active, target)
    if (window.location.hash !== nextHash) window.history.pushState(null, '', nextHash)
  }, [active, selectedConcept, selectedDecision, selectedExam, selectedLabId, selectedSnippetId])

  const openConcept = (id: string) => { setSelectedConcept(id); setActive('concepts'); setQuery(''); setSearchOpen(false) }
  const openLab = (id: string) => { setSelectedLabId(id); setActive('labs'); setQuery(''); setSearchOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const navigate = (page: Page) => { setActive(page); setSearchOpen(false); setQuery('') }
  const openSearchResult = (result: SearchResult) => {
    setSearchOpen(false)
    setQuery('')
    if (result.kind === 'concept') { openConcept(result.id); return }
    if (result.kind === 'decision') { setSelectedDecision(result.id); setActive('decisions'); return }
    if (result.kind === 'exam') { setSelectedExam(result.id); setActive('certifications'); return }
    if (result.kind === 'lab') { openLab(result.id); return }
    setSelectedSnippetId(result.id)
    setActive('code')
  }

  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} className={dark ? 'themeDark' : 'themeLight'}>
      <div className="appShell">
        <ShellNav active={active} setActive={navigate}/>
        <div className="mainShell">
          <TopBar dark={dark} setDark={setDark} query={query} setQuery={setQuery} split={split} setSplit={setSplit} searchOpen={searchOpen} setSearchOpen={setSearchOpen} searchResults={searchResults} activeSearchIndex={activeSearchIndex} setActiveSearchIndex={setActiveSearchIndex} openSearchResult={openSearchResult}/>
          {searchOpen && query.trim().length > 0 && <><div className="searchScrim" onClick={() => setSearchOpen(false)} aria-hidden="true"/><GlobalSearchResults results={searchResults} activeIndex={activeSearchIndex} onOpen={openSearchResult}/></>}
          <div className="contentShell">
            {active === 'home' && <HomePage navigate={navigate} selectConcept={setSelectedConcept} masteredCount={masteredConcepts.values.size} completedLabCount={completedLabs.values.size} bookmarkedCount={bookmarkedConcepts.values.size} bookmarkedConceptIds={bookmarkedConcepts.values}/>} 
            {active === 'concepts' && <ConceptPage selected={selectedConcept} setSelected={setSelectedConcept} query={query} split={split} mastered={masteredConcepts.values} bookmarked={bookmarkedConcepts.values} toggleMastered={masteredConcepts.toggle} toggleBookmarked={bookmarkedConcepts.toggle} openLab={openLab}/>} 
            {active === 'decisions' && <DecisionsPage query={query} split={split} selectedGuideId={selectedDecision} setSelectedGuideId={setSelectedDecision} openConcept={openConcept}/>} 
            {active === 'certifications' && <CertificationsPage query={query} selectedCode={selectedExam} setSelectedCode={setSelectedExam} navigateToConcept={openConcept} navigateToDecision={(id) => { setSelectedDecision(id); setActive('decisions'); setQuery(''); setSearchOpen(false) }}/>} 
            {active === 'labs' && <LabsPage query={query} split={split} selectedLabId={selectedLabId} setSelectedLabId={setSelectedLabId} completedLabs={completedLabs.values} toggleCompletedLab={completedLabs.toggle} openConcept={openConcept}/>} 
            {active === 'code' && <CodePage query={query} openConcept={openConcept} selectedSnippetId={selectedSnippetId} setSelectedSnippetId={setSelectedSnippetId}/>} 
            {active === 'sources' && <SourcesPage/>}
          </div>
        </div>
      </div>
    </FluentProvider>
  )
}
