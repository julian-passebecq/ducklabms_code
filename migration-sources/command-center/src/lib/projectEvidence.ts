import type { Project } from '../types'

export function hasPublicSurface(project: Project) {
  return Boolean(project.live)
}

export function publicSurfaceLabel(project: Project) {
  if (project.live) return project.liveLabel?.trim() || 'Public live surface'
  return project.liveLabel?.trim() || 'No public surface'
}

export function hasRepositoryRecord(project: Project) {
  return Boolean(project.github)
}

export function canOpenRepository(project: Project) {
  return Boolean(project.github && project.repoVisibility !== 'Private')
}

export function repositoryLabel(project: Project) {
  if (!project.github) return 'No repository link'
  if (project.repoVisibility === 'Private') return 'Private repository'
  if (project.repoVisibility === 'Public') return 'Public repository'
  return 'Repository linked'
}
