import {
  Button,
  Divider,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  Tab,
  TabList,
  Text,
} from '@fluentui/react-components'
import { useEffect, useMemo, useState } from 'react'
import { getProjectCaseStudy } from '../data/caseStudies'
import { canOpenRepository, publicSurfaceLabel, repositoryLabel } from '../lib/projectEvidence'
import type { Project, ProjectCategory } from '../types'
import { AppIcon } from './AppIcon'
import { StatusBadge } from './StatusBadge'

type DrawerTab = 'overview' | 'case-study' | 'evidence'

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

function relationScore(source: Project, candidate: Project) {
  const sharedStack = candidate.stack.filter((item) => source.stack.includes(item)).length
  const sharedCategories = candidate.categories.filter((item) => source.categories.includes(item)).length
  const samePrimary = candidate.primaryCategory === source.primaryCategory ? 2 : 0
  return sharedStack * 3 + sharedCategories * 2 + samePrimary + Number(Boolean(candidate.featured))
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

export function ProjectDrawer({
  project,
  projects,
  open,
  onClose,
  onOpen,
  onCategory,
}: {
  project?: Project
  projects: Project[]
  open: boolean
  onClose: () => void
  onOpen: (project: Project) => void
  onCategory: (category: ProjectCategory) => void
}) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')

  useEffect(() => {
    setCopied(false)
    setActiveTab('overview')
  }, [project?.id])

  const related = useMemo(() => {
    if (!project) return []
    return projects
      .filter((candidate) => candidate.id !== project.id)
      .map((candidate) => ({ candidate, score: relationScore(project, candidate) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || Number(Boolean(b.candidate.live)) - Number(Boolean(a.candidate.live)) || a.candidate.name.localeCompare(b.candidate.name))
      .slice(0, 3)
      .map(({ candidate }) => candidate)
  }, [project, projects])

  if (!project) return null

  const caseStudy = getProjectCaseStudy(project.id)

  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('project', project.id)
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url.toString())
      else if (!fallbackCopy(url.toString())) throw new Error('Clipboard unavailable')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const sourceState = repositoryLabel(project)
  const surfaceState = publicSurfaceLabel(project)

  return (
    <OverlayDrawer position="end" open={open} onOpenChange={(_, data) => !data.open && onClose()} size="medium">
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" icon={<AppIcon name="close" />} aria-label="Close project details" onClick={onClose} />
          }
        >
          Project dossier
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className="detail-drawer">
        <div className="detail-drawer__headline">
          <div className={`project-icon project-icon--large project-icon--${project.primaryCategory.replace(/ /g, '-').replace('&', 'and').toLowerCase()}`}>
            <AppIcon name={projectGlyph(project)} size={27} />
          </div>
          <div>
            <div className="detail-drawer__title-line">
              <Text as="h2" size={600} weight="semibold">{project.name}</Text>
              <StatusBadge status={project.status} />
            </div>
            <Text className="detail-drawer__summary">{project.summary}</Text>
          </div>
        </div>

        <div className="detail-category-row" aria-label="Project categories">
          {project.categories.map((category) => (
            <button type="button" key={category} onClick={() => onCategory(category)}>{category}</button>
          ))}
        </div>

        <div className="detail-actions">
          {canOpenRepository(project) && (
            <Button
              appearance="secondary"
              icon={<AppIcon name="github" size={18} />}
              onClick={() => window.open(project.github, '_blank', 'noopener,noreferrer')}
            >
              Open repository
            </Button>
          )}
          {project.live && (
            <Button
              appearance="primary"
              icon={<AppIcon name="external" size={18} />}
              onClick={() => window.open(project.live, '_blank', 'noopener,noreferrer')}
            >
              {project.liveLabel ?? 'Open public surface'}
            </Button>
          )}
          <Button appearance="subtle" icon={<AppIcon name="link" size={16} />} onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy project link'}
          </Button>
        </div>

        <div className="detail-evidence-grid">
          <div className="detail-evidence-card">
            <div className="detail-evidence-card__icon"><AppIcon name="github" size={18} /></div>
            <span>Source</span>
            <strong>{sourceState}</strong>
          </div>
          <div className="detail-evidence-card">
            <div className="detail-evidence-card__icon"><AppIcon name="play" size={18} /></div>
            <span>Availability</span>
            <strong>{surfaceState}</strong>
          </div>
          <div className="detail-evidence-card">
            <div className="detail-evidence-card__icon"><AppIcon name={caseStudy ? 'document' : 'clock'} size={18} /></div>
            <span>{caseStudy ? 'Case study' : 'Current stage'}</span>
            <strong>{caseStudy ? 'Documented' : project.eta}</strong>
          </div>
        </div>

        <div className="detail-tabs">
          <TabList
            size="small"
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as DrawerTab)}
            aria-label="Project dossier sections"
          >
            <Tab value="overview">Overview</Tab>
            {caseStudy && <Tab value="case-study">Case study</Tab>}
            <Tab value="evidence">Evidence & status</Tab>
          </TabList>
        </div>

        <Divider />

        {activeTab === 'overview' && (
          <div className="detail-tab-panel" role="tabpanel" aria-label="Project overview">
            <section className="detail-section">
              <Text as="h3" weight="semibold" size={400}>Overview</Text>
              <Text>{project.description}</Text>
            </section>

            <section className="detail-section">
              <Text as="h3" weight="semibold" size={400}>Key capabilities</Text>
              <ul className="feature-list">
                {project.features.map((feature) => (
                  <li key={feature}><span className="feature-check"><AppIcon name="check" size={14} /></span>{feature}</li>
                ))}
              </ul>
            </section>

            <section className="detail-section">
              <Text as="h3" weight="semibold" size={400}>Technology</Text>
              <div className="tag-row">
                {project.stack.map((item) => <span className="tag" key={item}>{item}</span>)}
              </div>
            </section>

            <div className="detail-grid">
              <div className="detail-info-card">
                <span className="detail-info-card__label">Primary area</span>
                <strong>{project.primaryCategory}</strong>
              </div>
              <div className="detail-info-card">
                <span className="detail-info-card__label">Status</span>
                <strong>{project.status}</strong>
              </div>
              <div className="detail-info-card detail-info-card--wide">
                <span className="detail-info-card__label">Next milestone</span>
                <strong>{project.nextMilestone}</strong>
              </div>
              {project.release && (
                <div className="detail-info-card detail-info-card--wide">
                  <span className="detail-info-card__label">Release line</span>
                  <strong>{project.release}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'case-study' && caseStudy && (
          <div className="detail-tab-panel detail-case-study" role="tabpanel" aria-label="Project case study">
            <div className="case-study-pair">
              <section className="case-study-card">
                <span className="case-study-card__label">Challenge</span>
                <Text>{caseStudy.challenge}</Text>
              </section>
              <section className="case-study-card">
                <span className="case-study-card__label">Approach</span>
                <Text>{caseStudy.solution}</Text>
              </section>
            </div>

            <section className="detail-section">
              <Text as="h3" weight="semibold" size={400}>System flow</Text>
              <div className="case-study-flow" aria-label="Project system flow">
                {caseStudy.flow.map((step, index) => (
                  <div className="case-study-flow__step" key={step}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{step}</strong>
                    {index < caseStudy.flow.length - 1 && <AppIcon name="arrow" size={14} />}
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section">
              <Text as="h3" weight="semibold" size={400}>Engineering decisions</Text>
              <ul className="feature-list">
                {caseStudy.engineering.map((item) => (
                  <li key={item}><span className="feature-check"><AppIcon name="check" size={14} /></span>{item}</li>
                ))}
              </ul>
            </section>

            {(caseStudy.proofPoints?.length || caseStudy.tradeoffs?.length) && (
              <div className="case-study-proof-grid">
                {caseStudy.proofPoints?.length ? (
                  <section className="case-study-proof-card case-study-proof-card--evidence">
                    <div className="case-study-proof-card__heading">
                      <AppIcon name="check" size={16} />
                      <Text as="h3" weight="semibold" size={300}>Technical proof</Text>
                    </div>
                    <ul>
                      {caseStudy.proofPoints.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </section>
                ) : null}
                {caseStudy.tradeoffs?.length ? (
                  <section className="case-study-proof-card">
                    <div className="case-study-proof-card__heading">
                      <AppIcon name="info" size={16} />
                      <Text as="h3" weight="semibold" size={300}>Boundaries / trade-offs</Text>
                    </div>
                    <ul>
                      {caseStudy.tradeoffs.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}

            <section className="case-study-deliverable">
              <div><AppIcon name="document" size={18} /></div>
              <span>
                <small>Current deliverable</small>
                <strong>{caseStudy.deliverable}</strong>
              </span>
            </section>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="detail-tab-panel" role="tabpanel" aria-label="Project evidence and status">
            <section className="evidence-matrix" aria-label="Evidence matrix">
              <div>
                <span>Repository</span>
                <strong>{sourceState}</strong>
                <small>{project.github ? 'Repository URL recorded in the catalog.' : 'No source URL is presented as public evidence.'}</small>
              </div>
              <div>
                <span>Live surface</span>
                <strong>{surfaceState}</strong>
                <small>{project.live ? 'A public URL is available for this project surface.' : 'No public browser surface is claimed.'}</small>
              </div>
              <div>
                <span>Release / maturity</span>
                <strong>{project.release ?? project.status}</strong>
                <small>{project.eta}</small>
              </div>
              <div>
                <span>Case-study coverage</span>
                <strong>{caseStudy ? `${caseStudy.flow.length}-step technical case study` : 'Not yet documented'}</strong>
                <small>{caseStudy ? `${caseStudy.engineering.length} engineering decisions${caseStudy.proofPoints?.length ? ` · ${caseStudy.proofPoints.length} proof points` : ''}${caseStudy.tradeoffs?.length ? ` · ${caseStudy.tradeoffs.length} boundaries` : ''}.` : 'The catalog currently exposes metadata and technical capabilities only.'}</small>
              </div>
            </section>

            <section className="detail-section detail-section--milestone">
              <Text as="h3" weight="semibold" size={400}>Next milestone</Text>
              <Text>{project.nextMilestone}</Text>
            </section>

            {project.archivedStatus && (
              <div className="archive-note">
                <AppIcon name="info" size={18} />
                <span><strong>Catalog status:</strong> {project.archivedStatus}</span>
              </div>
            )}
          </div>
        )}

        {related.length > 0 && (
          <section className="detail-related">
            <div className="detail-related__heading">
              <div>
                <span>RELATED WORK</span>
                <strong>Explore adjacent projects</strong>
              </div>
              <AppIcon name="stack" size={18} />
            </div>
            <div className="detail-related__list">
              {related.map((item) => (
                <button type="button" key={item.id} onClick={() => onOpen(item)}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.primaryCategory} · {item.status}{item.live ? ' · live surface' : ''}</small>
                  </span>
                  <AppIcon name="arrow" size={16} />
                </button>
              ))}
            </div>
          </section>
        )}
      </DrawerBody>
    </OverlayDrawer>
  )
}
