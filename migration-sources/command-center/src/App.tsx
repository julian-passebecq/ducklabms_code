import {
  Button,
  FluentProvider,
  Input,
  Select,
  Tab,
  TabList,
  Text,
  Tooltip,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components'
import { useEffect, useMemo, useState } from 'react'
import { AboutView } from './components/AboutView'
import { AppIcon } from './components/AppIcon'
import { Hero } from './components/Hero'
import { ProjectCard } from './components/ProjectCard'
import { ProjectDrawer } from './components/ProjectDrawer'
import { RightRail } from './components/RightRail'
import { RoadmapView } from './components/RoadmapView'
import { Sidebar } from './components/Sidebar'
import { TechStackView } from './components/TechStackView'
import { getProjectCaseStudy, hasProjectCaseStudy } from './data/caseStudies'
import { evidenceFilters, normalizeEvidenceFilter, projectMatchesEvidence, sortModes, sortProjects } from './lib/catalogFilters'
import type { EvidenceFilter, SortMode } from './lib/catalogFilters'
import { hasPublicSurface, hasRepositoryRecord } from './lib/projectEvidence'
import { categories, projects, SNAPSHOT_DATE } from './data/projects'
import type { NavigationView, Project, ProjectCategory, ProjectStatus } from './types'

const statusFilters: Array<ProjectStatus | 'All'> = ['All', 'Live', 'In progress', 'Prototype', 'Planned', 'Concept', 'Legacy']
const navigationViews: NavigationView[] = ['Projects', 'Roadmap', 'Tech Stack', 'About']

type LocationState = {
  category: ProjectCategory | 'All'
  view: NavigationView
  status: ProjectStatus | 'All'
  evidence: EvidenceFilter
  sort: SortMode
  search: string
  project?: Project
}
function projectMatchesQuery(project: Project, query: string) {
  if (!query) return true
  const caseStudy = getProjectCaseStudy(project.id)
  return [
    project.name,
    project.shortName,
    project.summary,
    project.description,
    project.primaryCategory,
    ...project.categories,
    ...project.stack,
    ...project.features,
    project.nextMilestone,
    project.eta,
    project.release,
    project.archivedStatus,
    caseStudy?.challenge,
    caseStudy?.solution,
    caseStudy?.deliverable,
    ...(caseStudy?.flow ?? []),
    ...(caseStudy?.engineering ?? []),
    ...(caseStudy?.proofPoints ?? []),
    ...(caseStudy?.tradeoffs ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query)
}

function isProjectCategory(value: string | null): value is ProjectCategory {
  return Boolean(value && categories.includes(value as ProjectCategory))
}

function isProjectStatus(value: string | null): value is ProjectStatus {
  return Boolean(value && statusFilters.includes(value as ProjectStatus))
}

function readLocationState(): LocationState {
  if (typeof window === 'undefined') {
    return { category: 'Microsoft Cloud', view: 'Projects', status: 'All', evidence: 'All evidence', sort: 'featured', search: '' }
  }

  const params = new URLSearchParams(window.location.search)
  const projectId = params.get('project')
  const project = projectId ? projects.find((item) => item.id === projectId) : undefined
  const categoryParam = params.get('category')
  const category: ProjectCategory | 'All' = categoryParam === 'All'
    ? 'All'
    : isProjectCategory(categoryParam)
      ? categoryParam
      : project?.primaryCategory ?? 'Microsoft Cloud'

  const viewParam = params.get('view')
  const view = viewParam && navigationViews.includes(viewParam as NavigationView) ? viewParam as NavigationView : 'Projects'
  const statusParam = params.get('status')
  const status = statusParam === 'All' || isProjectStatus(statusParam) ? statusParam as ProjectStatus | 'All' : 'All'
  const evidence = normalizeEvidenceFilter(params.get('evidence'))
  const sortParam = params.get('sort')
  const sort = sortParam && sortModes.includes(sortParam as SortMode) ? sortParam as SortMode : 'featured'

  return {
    category,
    view,
    status,
    evidence,
    sort,
    search: params.get('q') ?? '',
    project,
  }
}

function setProjectUrl(projectId?: string, mode: 'push' | 'replace' = 'replace') {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (projectId) url.searchParams.set('project', projectId)
  else url.searchParams.delete('project')
  const previousState = window.history.state ?? {}
  const state = projectId
    ? { ...previousState, projectOverlay: mode === 'push' ? true : Boolean(previousState.projectOverlay) }
    : { ...previousState, projectOverlay: false }
  if (mode === 'push') window.history.pushState(state, '', url)
  else window.history.replaceState(state, '', url)
}

function initialThemeIsDark() {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem('project-command-center-theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export default function App() {
  const initialLocation = useMemo(() => readLocationState(), [])
  const [category, setCategory] = useState<ProjectCategory | 'All'>(initialLocation.category)
  const [view, setView] = useState<NavigationView>(initialLocation.view)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>(initialLocation.status)
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>(initialLocation.evidence)
  const [search, setSearch] = useState(initialLocation.search)
  const [sort, setSort] = useState<SortMode>(initialLocation.sort)
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(initialLocation.project)
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialLocation.project))
  const [dark, setDark] = useState(initialThemeIsDark)

  const scopedProjects = useMemo(
    () => category === 'All' ? projects : projects.filter((project) => project.categories.includes(category)),
    [category],
  )

  const query = search.trim().toLowerCase()
  const evidenceAndSearchProjects = useMemo(
    () => scopedProjects.filter((project) => projectMatchesQuery(project, query) && projectMatchesEvidence(project, evidenceFilter)),
    [scopedProjects, query, evidenceFilter],
  )

  const visibleProjects = useMemo(() => {
    const filtered = evidenceAndSearchProjects.filter((project) => statusFilter === 'All' || project.status === statusFilter)
    return sortProjects(filtered, sort)
  }, [evidenceAndSearchProjects, statusFilter, sort])

  const stats = useMemo(() => ({
    total: visibleProjects.length,
    surfaces: visibleProjects.filter(hasPublicSurface).length,
    repositories: visibleProjects.filter(hasRepositoryRecord).length,
    active: visibleProjects.filter((project) => project.status === 'In progress').length,
    caseStudies: visibleProjects.filter((project) => hasProjectCaseStudy(project.id)).length,
    prototype: visibleProjects.filter((project) => project.status === 'Prototype').length,
    planned: visibleProjects.filter((project) => project.status === 'Planned' || project.status === 'Concept').length,
  }), [visibleProjects])

  const statusCounts = useMemo(() => Object.fromEntries(
    statusFilters.map((status) => [status, status === 'All' ? evidenceAndSearchProjects.length : evidenceAndSearchProjects.filter((project) => project.status === status).length]),
  ) as Record<ProjectStatus | 'All', number>, [evidenceAndSearchProjects])

  const categoryCounts = useMemo(() => Object.fromEntries(
    categories.map((item) => [item, projects.filter((project) => project.categories.includes(item)).length]),
  ) as Record<ProjectCategory, number>, [])

  const hasActiveFilters = Boolean(query) || statusFilter !== 'All' || evidenceFilter !== 'All evidence' || sort !== 'featured'

  useEffect(() => {
    window.localStorage.setItem('project-command-center-theme', dark ? 'dark' : 'light')
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const onPopState = () => {
      const next = readLocationState()
      setCategory(next.category)
      setView(next.view)
      setStatusFilter(next.status)
      setEvidenceFilter(next.evidence)
      setSort(next.sort)
      setSearch(next.search)
      setSelectedProject(next.project)
      setDrawerOpen(Boolean(next.project))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const setOrDelete = (key: string, value: string, defaultValue: string) => value === defaultValue ? url.searchParams.delete(key) : url.searchParams.set(key, value)
    setOrDelete('category', category, 'Microsoft Cloud')
    setOrDelete('view', view, 'Projects')
    setOrDelete('status', statusFilter, 'All')
    setOrDelete('evidence', evidenceFilter, 'All evidence')
    setOrDelete('sort', sort, 'featured')
    if (search.trim()) url.searchParams.set('q', search.trim())
    else url.searchParams.delete('q')
    const projectParam = url.searchParams.get('project')
    if (projectParam && !projects.some((project) => project.id === projectParam)) url.searchParams.delete('project')
    window.history.replaceState(window.history.state ?? {}, '', url)
  }, [category, view, statusFilter, evidenceFilter, sort, search])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable
      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        const input = document.querySelector<HTMLInputElement>('.topbar__search input')
        input?.focus()
      }
      if (event.key === 'Escape' && target?.matches('.topbar__search input') && search) {
        setSearch('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [search])

  const openProject = (project: Project) => {
    setSelectedProject(project)
    const alreadyInDrawer = drawerOpen
    setDrawerOpen(true)
    setProjectUrl(project.id, alreadyInDrawer ? 'replace' : 'push')
  }

  const closeProject = () => {
    setDrawerOpen(false)
    setSelectedProject(undefined)
    if (window.history.state?.projectOverlay) window.history.back()
    else setProjectUrl(undefined, 'replace')
  }

  const selectCategory = (nextCategory: ProjectCategory) => {
    setCategory(nextCategory)
    setStatusFilter('All')
    setEvidenceFilter('All evidence')
    setView('Projects')
  }

  const showHome = () => {
    setCategory('All')
    setStatusFilter('All')
    setEvidenceFilter('All evidence')
    setView('Projects')
  }

  const selectView = (nextView: NavigationView) => setView(nextView)

  const selectDrawerCategory = (nextCategory: ProjectCategory) => {
    setDrawerOpen(false)
    setSelectedProject(undefined)
    setProjectUrl(undefined, 'replace')
    selectCategory(nextCategory)
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setEvidenceFilter('All evidence')
    setSort('featured')
  }

  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} className={dark ? 'theme-dark' : 'theme-light'}>
      <a className="skip-link" href="#main-content">Skip to project content</a>
      <div className="app-shell">
        <Sidebar
          selectedCategory={category}
          view={view}
          categoryCounts={categoryCounts}
          totalProjects={projects.length}
          onCategory={selectCategory}
          onHome={showHome}
          onView={selectView}
        />

        <main id="main-content" className="app-main" tabIndex={-1}>
          <header className="topbar">
            <div className="topbar__title">
              <Text as="div" size={500} weight="semibold">Project Command Center</Text>
              <span>{view === 'Projects' ? `${category === 'All' ? 'All projects' : category} · ${visibleProjects.length} shown` : view} · snapshot {SNAPSHOT_DATE}</span>
            </div>
            <div className="topbar__search">
              <Input
                size="medium"
                value={search}
                onFocus={() => view !== 'Projects' && setView('Projects')}
                onChange={(_, data) => setSearch(data.value)}
                contentBefore={<AppIcon name="search" size={18} />}
                contentAfter={<span className="search-shortcut" aria-hidden="true">/</span>}
                placeholder="Search projects, stack or capabilities..."
                aria-label="Search project catalog"
              />
            </div>
            <div className="topbar__actions">
              <div className="topbar__external-links">
                <Tooltip content="GitHub profile" relationship="label">
                  <Button
                    appearance="subtle"
                    icon={<AppIcon name="github" size={18} />}
                    aria-label="Open GitHub profile"
                    onClick={() => window.open('https://github.com/julian-passebecq', '_blank', 'noopener,noreferrer')}
                  />
                </Tooltip>
                <Tooltip content="Portfolio website" relationship="label">
                  <Button
                    appearance="subtle"
                    icon={<AppIcon name="external" size={17} />}
                    aria-label="Open portfolio website"
                    onClick={() => window.open('https://j.datapassj.com', '_blank', 'noopener,noreferrer')}
                  />
                </Tooltip>
              </div>
              <Tooltip content={dark ? 'Use light theme' : 'Use dark theme'} relationship="label">
                <Button
                  appearance="subtle"
                  icon={<AppIcon name={dark ? 'sun' : 'moon'} size={18} />}
                  aria-label={dark ? 'Use light theme' : 'Use dark theme'}
                  onClick={() => setDark((value) => !value)}
                />
              </Tooltip>
              <div className="profile-chip">
                <div className="profile-chip__avatar">JP</div>
                <div><strong>Julian Passebecq</strong><span>Cloud · Data · BI</span></div>
              </div>
            </div>
          </header>

          {view === 'Projects' ? (
            <>
              <section className="kpi-row" aria-label="Project summary for current filters">
                <Metric icon="cube" label="Matching projects" value={stats.total} tone="brand" />
                <Metric icon="play" label="Public surfaces" value={stats.surfaces} tone="success" />
                <Metric icon="github" label="Repository records" value={stats.repositories} tone="neutral" />
                <Metric icon="clock" label="Active builds" value={stats.active} tone="warning" />
                <Metric icon="document" label="Case studies" value={stats.caseStudies} tone="purple" />
                <Metric icon="calendar" label="Planned / concept" value={stats.planned} tone="info" />
              </section>

              <div className="dashboard-layout">
                <div className="dashboard-center">
                  <Hero
                    category={category}
                    projects={scopedProjects}
                    onViewAll={showHome}
                    onRoadmap={() => setView('Roadmap')}
                    onOpen={openProject}
                  />

                  <section className="project-toolbar" aria-label="Project filters">
                    <div className="category-chips">
                      <Button
                        appearance={category === 'All' ? 'primary' : 'subtle'}
                        size="small"
                        icon={<AppIcon name="grid" size={16} />}
                        onClick={showHome}
                        aria-pressed={category === 'All'}
                      >
                        All projects
                      </Button>
                      {categories.map((item) => (
                        <Button
                          key={item}
                          appearance={category === item ? 'primary' : 'subtle'}
                          size="small"
                          onClick={() => selectCategory(item)}
                          aria-pressed={category === item}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                    <div className="project-toolbar__right">
                      <Select size="small" value={evidenceFilter} onChange={(_, data) => setEvidenceFilter(data.value as EvidenceFilter)} aria-label="Filter projects by evidence">
                        {evidenceFilters.map((filter) => <option value={filter} key={filter}>{filter}</option>)}
                      </Select>
                      <Select size="small" value={sort} onChange={(_, data) => setSort(data.value as SortMode)} aria-label="Sort projects">
                        <option value="featured">Featured first</option>
                        <option value="live">Public surfaces first</option>
                        <option value="status">Status</option>
                        <option value="name">Name</option>
                      </Select>
                      {hasActiveFilters && <Button appearance="subtle" size="small" onClick={resetFilters}>Reset</Button>}
                    </div>
                  </section>

                  <section className="status-filter-row" aria-label="Status filters">
                    <TabList
                      size="small"
                      selectedValue={statusFilter}
                      onTabSelect={(_, data) => setStatusFilter(data.value as ProjectStatus | 'All')}
                    >
                      {statusFilters.map((status) => <Tab key={status} value={status}>{status} <span className="status-filter-count">{statusCounts[status]}</span></Tab>)}
                    </TabList>
                  </section>

                  <section className="project-section-heading" aria-live="polite">
                    <div>
                      <Text as="h2" size={500} weight="semibold">
                        {category === 'All' ? 'Project catalog' : `${category} projects`}
                      </Text>
                      <span>{visibleProjects.length} result{visibleProjects.length === 1 ? '' : 's'} · source, deployment state and technical capabilities shown on each card</span>
                    </div>
                    {hasActiveFilters && <Button appearance="subtle" size="small" onClick={resetFilters}>Clear filters</Button>}
                  </section>

                  <section id="project-grid" className="project-grid" aria-label="Projects">
                    {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} onOpen={openProject} />)}
                  </section>

                  {!visibleProjects.length && (
                    <section className="empty-state">
                      <div className="empty-state__icon"><AppIcon name="search" size={30} /></div>
                      <Text as="h2" weight="semibold" size={500}>No projects match these filters</Text>
                      <p>Clear the search, evidence filter or status filter.</p>
                      <Button appearance="primary" onClick={resetFilters}>Clear filters</Button>
                    </section>
                  )}
                </div>

                <RightRail projects={visibleProjects} allProjects={projects} onOpen={openProject} />
              </div>
            </>
          ) : view === 'Roadmap' ? (
            <RoadmapView projects={projects} onOpen={openProject} />
          ) : view === 'Tech Stack' ? (
            <TechStackView projects={projects} onOpen={openProject} />
          ) : (
            <AboutView />
          )}
        </main>
      </div>

      <ProjectDrawer
        project={selectedProject}
        projects={projects}
        open={drawerOpen}
        onClose={closeProject}
        onOpen={openProject}
        onCategory={selectDrawerCategory}
      />
    </FluentProvider>
  )
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: Parameters<typeof AppIcon>[0]['name']
  label: string
  value: string | number
  tone: 'brand' | 'success' | 'warning' | 'purple' | 'info' | 'neutral'
}) {
  return (
    <div className={`metric metric--${tone}`}>
      <div className="metric__icon"><AppIcon name={icon} size={20} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  )
}
