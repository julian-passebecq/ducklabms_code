import { Button, Text } from '@fluentui/react-components'
import { hasProjectCaseStudy } from '../data/caseStudies'
import { hasPublicSurface } from '../lib/projectEvidence'
import type { Project, ProjectCategory } from '../types'
import { AppIcon } from './AppIcon'
import { StatusBadge } from './StatusBadge'

const copy: Record<ProjectCategory | 'All', { eyebrow: string; title: string; body: string }> = {
  All: {
    eyebrow: 'PROJECT PORTFOLIO',
    title: 'A technical portfolio organized like a product catalog',
    body: 'Explore Microsoft Cloud, data engineering, AI development, visualization and learning products with source, deployment state, capabilities and current milestones in one place.',
  },
  'Microsoft Cloud': {
    eyebrow: 'MICROSOFT CLOUD · DEFAULT VIEW',
    title: 'Microsoft cloud, data and BI projects at the front',
    body: 'Azure, Fabric, Power BI and Microsoft-oriented developer products, with direct evidence of what is deployed, what is being built and what is still a concept.',
  },
  'AI Dev Tools': {
    eyebrow: 'AI DEV TOOLS',
    title: 'AI-assisted tools with inspectable technical boundaries',
    body: 'Knowledge tools, visual-evidence extraction, productivity experiments and engineering workbenches designed around explicit data and execution contracts.',
  },
  'Data Engineering': {
    eyebrow: 'DATA ENGINEERING',
    title: 'Pipelines, models, execution and engineering practice',
    body: 'SQL, Python, PySpark, dbt, local execution, pipeline reasoning, synthetic data and cloud architecture organized as concrete project evidence.',
  },
  Visualization: {
    eyebrow: 'VISUALIZATION',
    title: 'Reusable visual systems for data and technical explanation',
    body: 'D3, SVG, semantic specifications and animation engines used for analytical storytelling, algorithm explanation and data-product interfaces.',
  },
  Learning: {
    eyebrow: 'LEARNING PRODUCTS',
    title: 'Technical learning built around practice and systems thinking',
    body: 'Interview workstations, architecture labs, visual explanations and study products designed to make technical reasoning visible and repeatable.',
  },
  Portfolio: {
    eyebrow: 'PORTFOLIO SURFACES',
    title: 'Project evidence packaged for employers and collaborators',
    body: 'Portfolio apps, CV tooling, project dossiers and live showcases that connect screenshots, capabilities, source repositories and deployed work.',
  },
  'Energy & Industry': {
    eyebrow: 'ENERGY & INDUSTRY DATA',
    title: 'Industry data used as a serious engineering domain',
    body: 'Oil, gas and renewable projects are presented through source systems, data movement, transformation, relationships, KPIs and analytics—not decorative scenery.',
  },
  Utilities: {
    eyebrow: 'UTILITIES',
    title: 'Focused tools that support the wider engineering workflow',
    body: 'Smaller desktop and developer utilities kept clearly separated from the larger cloud, data and learning products.',
  },
}

export function Hero({
  category,
  projects,
  onViewAll,
  onRoadmap,
  onOpen,
}: {
  category: ProjectCategory | 'All'
  projects: Project[]
  onViewAll: () => void
  onRoadmap: () => void
  onOpen: (project: Project) => void
}) {
  const content = copy[category]
  const featured = [...projects]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(Boolean(b.live)) - Number(Boolean(a.live)))
    .slice(0, 3)
  const liveCount = projects.filter(hasPublicSurface).length
  const caseStudyCount = projects.filter((project) => hasProjectCaseStudy(project.id)).length
  const topStack = [...new Set(projects.flatMap((project) => project.stack))].slice(0, 5)

  return (
    <section className="hero">
      <div className="hero__content">
        <div className="hero__eyebrow"><span className="ms-mark"><i /><i /><i /><i /></span>{content.eyebrow}</div>
        <Text as="h1" className="hero__title">{content.title}</Text>
        <Text className="hero__body">{content.body}</Text>
        <div className="hero__actions">
          {category !== 'All' && (
            <Button appearance="primary" iconPosition="after" icon={<AppIcon name="arrow" size={17} />} onClick={onViewAll}>
              View complete catalog
            </Button>
          )}
          <Button appearance={category === 'All' ? 'primary' : 'secondary'} icon={<AppIcon name="roadmap" size={17} />} onClick={onRoadmap}>
            Open roadmap
          </Button>
        </div>
      </div>

      <div className="hero__portfolio-panel">
        <div className="hero-scope__head">
          <div>
            <span>Current portfolio scope</span>
            <strong>{category === 'All' ? 'All project areas' : category}</strong>
          </div>
          <div className="hero-scope__mark"><AppIcon name={category === 'Energy & Industry' ? 'drop' : category === 'Data Engineering' ? 'database' : category === 'AI Dev Tools' ? 'spark' : 'cloud'} size={20} /></div>
        </div>
        <div className="hero-scope__metrics">
          <div><strong>{projects.length}</strong><span>projects</span></div>
          <div><strong>{caseStudyCount}</strong><span>case studies</span></div>
          <div><strong>{liveCount}</strong><span>public surfaces</span></div>
        </div>
        <div className="hero-scope__projects">
          {featured.map((project) => (
            <button type="button" key={project.id} onClick={() => onOpen(project)}>
              <span><strong>{project.shortName ?? project.name}</strong><small>{project.summary}</small></span>
              <StatusBadge status={project.status} />
            </button>
          ))}
        </div>
        <div className="hero-scope__stack">
          {topStack.map((tech) => <span key={tech}>{tech}</span>)}
        </div>
      </div>
    </section>
  )
}
