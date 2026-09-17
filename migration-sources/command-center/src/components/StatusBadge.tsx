import { Badge } from '@fluentui/react-components'
import type { ProjectStatus } from '../types'

const colorMap: Record<ProjectStatus, 'success' | 'warning' | 'informative' | 'subtle' | 'important'> = {
  Live: 'success',
  'In progress': 'warning',
  Prototype: 'important',
  Planned: 'informative',
  Concept: 'subtle',
  Legacy: 'subtle',
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge appearance="tint" color={colorMap[status]} size="medium" className="status-badge">
      {status}
    </Badge>
  )
}
