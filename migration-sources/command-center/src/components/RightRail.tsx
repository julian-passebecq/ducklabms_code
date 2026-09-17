import { Button, ProgressBar, Text } from '@fluentui/react-components'
import { hasProjectCaseStudy } from '../data/caseStudies'
import { hasPublicSurface, hasRepositoryRecord, publicSurfaceLabel } from '../lib/projectEvidence'
import type { Project, ProjectStatus } from '../types'
import { AppIcon } from './AppIcon'

const statusOrder: ProjectStatus[] = ['Live', 'In progress', 'Prototype', 'Planned', 'Concept', 'Legacy']

export function RightRail({
  projects,
  allProjects,
  onOpen,
}: {
  projects: Project[]
  allProjects: Project[]
  onOpen: (project: Project) => void
}) {
  const counts = Object.fromEntries(statusOrder.map((status) => [status, projects.filter((p) => p.status === status).length])) as Record<ProjectStatus, number>
  const active = projects.filter((p) => p.status === 'In progress' || p.status === 'Prototype').slice(0, 4)
  const featured = [...projects]
    .filter((p) => p.featured)
    .sort((a, b) => Number(Boolean(b.live)) - Number(Boolean(a.live)) || a.name.localeCompare(b.name))
    .slice(0, 4)
  const linkedRepos = projects.filter(hasRepositoryRecord).length
  const publicSurfaces = projects.filter(hasPublicSurface).length
  const caseStudies = projects.filter((p) => hasProjectCaseStudy(p.id)).length
  const repoCoverage = projects.length ? linkedRepos / projects.length : 0
  const surfaceCoverage = projects.length ? publicSurfaces / projects.length : 0
  const caseStudyCoverage = projects.length ? caseStudies / projects.length : 0

  return (
    <aside className="right-rail">
      <section className="rail-panel">
        <div className="rail-panel__header">
          <Text weight="semibold">Availability</Text>
          <span className="rail-panel__count">{projects.length} in view</span>
        </div>
        <div className="status-summary">
          {statusOrder.filter((status) => counts[status] > 0).map((status) => (
            <div className="status-summary__row" key={status}>
              <span className={`status-dot status-dot--${status.toLowerCase().replace(' ', '-')}`} />
              <span>{status}</span>
              <strong>{counts[status]}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="rail-panel">
        <div className="rail-panel__header">
          <Text weight="semibold">Portfolio evidence</Text>
          <AppIcon name="check" size={17} />
        </div>
        <div className="evidence-meter">
          <div className="evidence-meter__row"><span>Repository recorded</span><strong>{linkedRepos}/{projects.length}</strong></div>
          <ProgressBar value={repoCoverage} thickness="medium" />
        </div>
        <div className="evidence-meter">
          <div className="evidence-meter__row"><span>Public surface</span><strong>{publicSurfaces}/{projects.length}</strong></div>
          <ProgressBar value={surfaceCoverage} thickness="medium" />
        </div>
        <div className="evidence-meter">
          <div className="evidence-meter__row"><span>Case study</span><strong>{caseStudies}/{projects.length}</strong></div>
          <ProgressBar value={caseStudyCoverage} thickness="medium" />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="rail-panel">
          <div className="rail-panel__header">
            <Text weight="semibold">Featured in this view</Text>
            <AppIcon name="spark" size={17} />
          </div>
          <div className="rail-projects">
            {featured.map((project) => (
              <button type="button" key={project.id} className="rail-project" onClick={() => onOpen(project)}>
                <span className="rail-project__indicator rail-project__indicator--featured" />
                <span>
                  <strong>{project.shortName ?? project.name}</strong>
                  <small>{project.live ? publicSurfaceLabel(project) : project.eta}</small>
                </span>
                <AppIcon name="arrow" size={15} />
              </button>
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section className="rail-panel">
          <div className="rail-panel__header">
            <Text weight="semibold">Active work</Text>
            <AppIcon name="clock" size={17} />
          </div>
          <div className="rail-projects">
            {active.map((project) => (
              <button type="button" key={project.id} className="rail-project" onClick={() => onOpen(project)}>
                <span className="rail-project__indicator rail-project__indicator--active" />
                <span>
                  <strong>{project.shortName ?? project.name}</strong>
                  <small>{project.eta}</small>
                </span>
                <AppIcon name="arrow" size={15} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rail-panel rail-panel--links">
        <div>
          <Text weight="semibold">Full portfolio</Text>
          <p>{allProjects.length} projects across cloud, data, AI, visualization and learning.</p>
        </div>
        <div className="rail-link-actions">
          <Button size="small" appearance="secondary" icon={<AppIcon name="github" size={16} />} onClick={() => window.open('https://github.com/julian-passebecq', '_blank', 'noopener,noreferrer')}>GitHub</Button>
          <Button size="small" appearance="secondary" icon={<AppIcon name="external" size={15} />} onClick={() => window.open('https://j.datapassj.com', '_blank', 'noopener,noreferrer')}>Portfolio</Button>
        </div>
      </section>
    </aside>
  )
}
