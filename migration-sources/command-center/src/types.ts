export type ProjectStatus = 'Live' | 'In progress' | 'Prototype' | 'Planned' | 'Concept' | 'Legacy'

export type ProjectCategory =
  | 'Microsoft Cloud'
  | 'AI Dev Tools'
  | 'Data Engineering'
  | 'Visualization'
  | 'Learning'
  | 'Portfolio'
  | 'Energy & Industry'
  | 'Utilities'


export type ProjectCaseStudy = {
  challenge: string
  solution: string
  flow: string[]
  engineering: string[]
  deliverable: string
  proofPoints?: string[]
  tradeoffs?: string[]
}

export type Project = {
  id: string
  name: string
  shortName?: string
  summary: string
  description: string
  primaryCategory: ProjectCategory
  categories: ProjectCategory[]
  status: ProjectStatus
  github?: string
  live?: string
  liveLabel?: string
  repoVisibility?: 'Public' | 'Private' | 'Unknown'
  stack: string[]
  features: string[]
  nextMilestone: string
  eta: string
  release?: string
  archivedStatus?: string
  featured?: boolean
  microsoft?: boolean
}

export type NavigationView = 'Projects' | 'Roadmap' | 'Tech Stack' | 'About'
