import { Text } from '@fluentui/react-components'
import { publicSurfaceLabel } from '../lib/projectEvidence'
import type { Project, ProjectStatus } from '../types'
import { AppIcon } from './AppIcon'
import { StatusBadge } from './StatusBadge'

const sections: { status: ProjectStatus; title: string; description: string }[] = [
  { status: 'Live', title: 'Live / released', description: 'Publicly deployed sites or products with a working user-facing surface.' },
  { status: 'In progress', title: 'Active development', description: 'Implementation or release work that is actively moving forward.' },
  { status: 'Prototype', title: 'Prototype / validation', description: 'Useful code exists, but a validation, integration or packaging gate remains.' },
  { status: 'Planned', title: 'Planned', description: 'Defined product direction with a concrete next milestone but no finished release.' },
  { status: 'Concept', title: 'Concept', description: 'Recent project direction that is intentionally not presented as implemented.' },
  { status: 'Legacy', title: 'Legacy / reference', description: 'Retained for historical value or unique content, not current feature development.' },
]

export function RoadmapView({ projects, onOpen }: { projects: Project[]; onOpen: (project: Project) => void }) {
  const live = projects.filter((project) => project.status === 'Live').length
  const active = projects.filter((project) => project.status === 'In progress' || project.status === 'Prototype').length
  const planned = projects.filter((project) => project.status === 'Planned' || project.status === 'Concept').length
  const surfaces = projects.filter((project) => project.live).length

  return (
    <section className="content-page">
      <div className="content-page__header">
        <div>
          <span className="page-eyebrow">PROJECT ROADMAP</span>
          <Text as="h1" size={700} weight="semibold">Delivery state and next milestones</Text>
          <p>Each entry separates shipped work, active implementation, prototype validation and future concepts. ETA labels are kept at the level actually supported by the project record.</p>
        </div>
      </div>

      <div className="roadmap-summary">
        <div><span>Live products</span><strong>{live}</strong></div>
        <div><span>Active + prototype</span><strong>{active}</strong></div>
        <div><span>Planned + concept</span><strong>{planned}</strong></div>
        <div><span>Public surfaces</span><strong>{surfaces}</strong></div>
      </div>

      <div className="roadmap-board">
        {sections.map((section) => {
          const items = projects.filter((project) => project.status === section.status)
          if (!items.length) return null
          return (
            <div className="roadmap-section" key={section.status}>
              <div className="roadmap-section__head">
                <div>
                  <div className="roadmap-section__title-row"><StatusBadge status={section.status} /><strong>{section.title}</strong><span>{items.length}</span></div>
                  <p>{section.description}</p>
                </div>
              </div>
              <div className="roadmap-section__items">
                {items.map((project) => (
                  <button type="button" className="roadmap-item" key={project.id} onClick={() => onOpen(project)}>
                    <div className="roadmap-item__marker"><span /></div>
                    <div className="roadmap-item__body">
                      <div className="roadmap-item__topline">
                        <strong>{project.name}</strong>
                        <span>{project.eta}</span>
                      </div>
                      <p>{project.nextMilestone}</p>
                      <div className="roadmap-item__meta">
                        {project.live && <span><AppIcon name="play" size={13} /> {publicSurfaceLabel(project)}</span>}
                        {project.github && <span><AppIcon name="github" size={13} /> Repository recorded</span>}
                        {project.release && <span><AppIcon name="document" size={13} /> {project.release}</span>}
                      </div>
                    </div>
                    <AppIcon name="arrow" size={16} />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
