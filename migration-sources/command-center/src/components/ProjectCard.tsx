import { Button, Card, CardFooter, CardHeader, Text } from '@fluentui/react-components'
import { hasProjectCaseStudy } from '../data/caseStudies'
import { canOpenRepository, publicSurfaceLabel, repositoryLabel } from '../lib/projectEvidence'
import type { Project } from '../types'
import { AppIcon } from './AppIcon'
import { StatusBadge } from './StatusBadge'

function projectGlyph(project: Project) {
  if (project.primaryCategory === 'Microsoft Cloud') return 'cloud'
  if (project.primaryCategory === 'AI Dev Tools') return 'spark'
  if (project.primaryCategory === 'Data Engineering') return 'database'
  if (project.primaryCategory === 'Visualization') return 'chart'
  if (project.primaryCategory === 'Learning') return 'learning'
  if (project.primaryCategory === 'Portfolio') return 'briefcase'
  if (project.primaryCategory === 'Energy & Industry') return 'drop'
  return 'tools'
}

export function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  return (
    <Card className={`project-card ${project.featured ? 'project-card--featured' : ''}`} appearance="outline">
      <CardHeader
        image={
          <div className={`project-icon project-icon--${project.primaryCategory.replace(/ /g, '-').replace('&', 'and').toLowerCase()}`}>
            <AppIcon name={projectGlyph(project)} size={20} />
          </div>
        }
        header={
          <div className="project-card__title-row">
            <div className="project-card__name-line">
              <button type="button" className="project-card__title-button" onClick={() => onOpen(project)} aria-label={`Open ${project.name} project dossier`}>
                <Text weight="semibold" size={400} className="project-card__title">{project.name}</Text>
              </button>
              {project.featured && <span className="featured-mark" title="Featured project"><AppIcon name="spark" size={13} /></span>}
            </div>
            <StatusBadge status={project.status} />
          </div>
        }
        description={<Text className="project-card__summary">{project.summary}</Text>}
      />

      <div className="project-card__body">
        <div className="project-card__evidence" aria-label="Project evidence">
          <span className={canOpenRepository(project) ? 'evidence-pill evidence-pill--positive' : 'evidence-pill'}><AppIcon name="github" size={13} />{repositoryLabel(project)}</span>
          <span className={project.live ? 'evidence-pill evidence-pill--positive' : 'evidence-pill'}><AppIcon name="play" size={13} />{publicSurfaceLabel(project)}</span>
          {hasProjectCaseStudy(project.id) && (
            <span className="evidence-pill evidence-pill--case-study"><AppIcon name="document" size={13} />Case study</span>
          )}
        </div>

        <div className="tag-row" aria-label="Technology stack">
          {project.stack.slice(0, 4).map((item) => (
            <span className="tag" key={item}>{item}</span>
          ))}
          {project.stack.length > 4 && <span className="tag tag--muted">+{project.stack.length - 4}</span>}
        </div>

        <ul className="feature-list feature-list--compact">
          {project.features.slice(0, 3).map((feature) => (
            <li key={feature}><span className="feature-check"><AppIcon name="check" size={14} /></span>{feature}</li>
          ))}
        </ul>
      </div>

      <CardFooter className="project-card__footer">
        <div className="project-card__stage">
          <span>Stage</span>
          <strong>{project.eta}</strong>
        </div>
        <div className="project-card__links">
          {canOpenRepository(project) && (
            <Button
              appearance="subtle"
              size="small"
              icon={<AppIcon name="github" size={16} />}
              aria-label={`Open ${project.name} repository`}
              onClick={(event) => {
                event.stopPropagation()
                window.open(project.github, '_blank', 'noopener,noreferrer')
              }}
            />
          )}
          {project.live && (
            <Button
              appearance="subtle"
              size="small"
              icon={<AppIcon name="external" size={15} />}
              aria-label={`Open ${project.name} public surface`}
              onClick={(event) => {
                event.stopPropagation()
                window.open(project.live, '_blank', 'noopener,noreferrer')
              }}
            />
          )}
          <Button
            appearance="subtle"
            size="small"
            iconPosition="after"
            icon={<AppIcon name="arrow" size={15} />}
            onClick={(event) => {
              event.stopPropagation()
              onOpen(project)
            }}
          >
            Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
