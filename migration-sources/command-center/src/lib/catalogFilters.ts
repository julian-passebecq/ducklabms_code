import { hasProjectCaseStudy } from '../data/caseStudies'
import type { Project, ProjectStatus } from '../types'
import { hasPublicSurface, hasRepositoryRecord } from './projectEvidence'

export const sortModes = ['featured', 'live', 'status', 'name'] as const
export type SortMode = typeof sortModes[number]

export const evidenceFilters = ['All evidence', 'Public surface', 'Repository recorded', 'Case study', 'Featured'] as const
export type EvidenceFilter = typeof evidenceFilters[number]

const legacyEvidenceAliases: Record<string, EvidenceFilter> = {
  'Public demo': 'Public surface',
  'Source linked': 'Repository recorded',
}

export function normalizeEvidenceFilter(value: string | null): EvidenceFilter {
  if (!value) return 'All evidence'
  if (evidenceFilters.includes(value as EvidenceFilter)) return value as EvidenceFilter
  return legacyEvidenceAliases[value] ?? 'All evidence'
}

export function projectMatchesEvidence(project: Project, filter: EvidenceFilter) {
  if (filter === 'Public surface') return hasPublicSurface(project)
  if (filter === 'Repository recorded') return hasRepositoryRecord(project)
  if (filter === 'Case study') return hasProjectCaseStudy(project.id)
  if (filter === 'Featured') return Boolean(project.featured)
  return true
}

export function sortProjects(items: Project[], mode: SortMode) {
  const copy = [...items]
  if (mode === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name))
  if (mode === 'status') {
    const order: Record<ProjectStatus, number> = { Live: 0, 'In progress': 1, Prototype: 2, Planned: 3, Concept: 4, Legacy: 5 }
    return copy.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))
  }
  if (mode === 'live') {
    return copy.sort((a, b) => Number(hasPublicSurface(b)) - Number(hasPublicSurface(a)) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name))
  }
  return copy.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(hasPublicSurface(b)) - Number(hasPublicSurface(a)) || a.name.localeCompare(b.name))
}
