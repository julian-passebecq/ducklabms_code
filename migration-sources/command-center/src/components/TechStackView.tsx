import { ProgressBar, Text } from '@fluentui/react-components'
import { useMemo, useState } from 'react'
import { publicSurfaceLabel } from '../lib/projectEvidence'
import type { Project } from '../types'
import { AppIcon } from './AppIcon'

export function TechStackView({ projects, onOpen }: { projects: Project[]; onOpen: (project: Project) => void }) {
  const stack = useMemo(() => {
    const counts = new Map<string, number>()
    projects.forEach((project) => project.stack.forEach((tech) => counts.set(tech, (counts.get(tech) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [projects])
  const [selected, setSelected] = useState<string | null>(stack[0]?.[0] ?? null)
  const maxCount = stack[0]?.[1] ?? 1
  const selectedProjects = selected ? projects.filter((project) => project.stack.includes(selected)) : []
  const microsoftProjects = projects.filter((project) => project.microsoft || project.categories.includes('Microsoft Cloud')).length
  const deployedProjects = projects.filter((project) => project.live).length

  return (
    <section className="content-page">
      <div className="content-page__header">
        <div>
          <span className="page-eyebrow">TECH STACK</span>
          <Text as="h1" size={700} weight="semibold">Technology mapped to real projects</Text>
          <p>Usage counts are derived from the project catalog. Select a technology to see exactly where it appears and whether those projects are live, active or still experimental.</p>
        </div>
      </div>

      <div className="stack-summary">
        <div><span>Technologies</span><strong>{stack.length}</strong></div>
        <div><span>Microsoft-oriented projects</span><strong>{microsoftProjects}</strong></div>
        <div><span>Projects with public surfaces</span><strong>{deployedProjects}</strong></div>
      </div>

      <div className="stack-layout">
        <div className="stack-rank" aria-label="Technology usage ranking">
          <div className="stack-rank__header">
            <div><span>Technology</span><span>Project coverage</span></div>
            <strong>Projects</strong>
          </div>
          {stack.map(([tech, count]) => (
            <button type="button"
              key={tech}
              className={`stack-rank__item ${selected === tech ? 'stack-rank__item--active' : ''}`}
              onClick={() => setSelected(tech)}
              aria-pressed={selected === tech}
            >
              <div className="stack-rank__body">
                <div className="stack-rank__top"><strong>{tech}</strong><span>{Math.round((count / projects.length) * 100)}% of catalog</span></div>
                <ProgressBar value={count / maxCount} thickness="medium" />
              </div>
              <span className="stack-rank__count">{count}</span>
            </button>
          ))}
        </div>

        <div className="stack-detail">
          {selected ? (
            <>
              <div className="stack-detail__head">
                <div className="stack-detail__icon"><AppIcon name="stack" size={22} /></div>
                <div><span>Selected technology</span><h2>{selected}</h2></div>
              </div>
              <div className="stack-detail__summary">
                <span>Used in</span><strong>{selectedProjects.length} project{selectedProjects.length === 1 ? '' : 's'}</strong>
              </div>
              <div className="stack-detail__projects">
                {selectedProjects.map((project) => (
                  <button type="button" key={project.id} onClick={() => onOpen(project)}>
                    <span><strong>{project.name}</strong><small>{project.primaryCategory} · {project.status}{project.live ? ` · ${publicSurfaceLabel(project)}` : ''}</small></span>
                    <AppIcon name="arrow" size={16} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="stack-detail__empty">
              <AppIcon name="filter" size={28} />
              <strong>Select a technology</strong>
              <p>The projects using it will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
