import { Button, Divider, Text, Tooltip } from '@fluentui/react-components'
import type { NavigationView, ProjectCategory } from '../types'
import { AppIcon } from './AppIcon'

type NavItem = {
  label: ProjectCategory
  icon: Parameters<typeof AppIcon>[0]['name']
}

const categoryItems: NavItem[] = [
  { label: 'Microsoft Cloud', icon: 'cloud' },
  { label: 'AI Dev Tools', icon: 'spark' },
  { label: 'Data Engineering', icon: 'database' },
  { label: 'Visualization', icon: 'chart' },
  { label: 'Learning', icon: 'learning' },
  { label: 'Portfolio', icon: 'briefcase' },
  { label: 'Energy & Industry', icon: 'drop' },
  { label: 'Utilities', icon: 'tools' },
]

const utilityItems: { label: NavigationView; icon: Parameters<typeof AppIcon>[0]['name'] }[] = [
  { label: 'Roadmap', icon: 'roadmap' },
  { label: 'Tech Stack', icon: 'stack' },
  { label: 'About', icon: 'info' },
]

export function Sidebar({
  selectedCategory,
  view,
  categoryCounts,
  totalProjects,
  onCategory,
  onHome,
  onView,
}: {
  selectedCategory: ProjectCategory | 'All'
  view: NavigationView
  categoryCounts: Record<ProjectCategory, number>
  totalProjects: number
  onCategory: (category: ProjectCategory) => void
  onHome: () => void
  onView: (view: NavigationView) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">JP</div>
        <div className="brand__copy">
          <Text weight="semibold">Project Command Center</Text>
          <span>Cloud · Data · AI portfolio</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Portfolio navigation">
        <Button
          appearance="subtle"
          className={`sidebar-item ${view === 'Projects' && selectedCategory === 'All' ? 'sidebar-item--active' : ''}`}
          icon={<AppIcon name="home" />}
          onClick={onHome}
          aria-current={view === 'Projects' && selectedCategory === 'All' ? 'page' : undefined}
        >
          <span className="sidebar-item__label">All projects</span>
          <span className="sidebar-item__count">{totalProjects}</span>
        </Button>

        <div className="sidebar__section-label">PROJECT AREAS</div>
        {categoryItems.map((item) => (
          <Button
            key={item.label}
            appearance="subtle"
            className={`sidebar-item ${view === 'Projects' && selectedCategory === item.label ? 'sidebar-item--active' : ''}`}
            icon={<AppIcon name={item.icon} />}
            onClick={() => onCategory(item.label)}
            aria-current={view === 'Projects' && selectedCategory === item.label ? 'page' : undefined}
          >
            <span className="sidebar-item__label">{item.label}</span>
            <span className="sidebar-item__count">{categoryCounts[item.label]}</span>
          </Button>
        ))}

        <Divider className="sidebar__divider" />
        <div className="sidebar__section-label sidebar__section-label--secondary">PORTFOLIO VIEWS</div>
        {utilityItems.map((item) => (
          <Button
            key={item.label}
            appearance="subtle"
            className={`sidebar-item ${view === item.label ? 'sidebar-item--active' : ''}`}
            icon={<AppIcon name={item.icon} />}
            onClick={() => onView(item.label)}
            aria-current={view === item.label ? 'page' : undefined}
          >
            <span className="sidebar-item__label">{item.label}</span>
          </Button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__footer-mark">JP</div>
        <div>
          <Text weight="semibold" size={200}>Julian Passebecq</Text>
          <span className="sidebar__footer-role">Cloud BI Consultant</span>
          <div className="sidebar__footer-links">
            <Tooltip content="Open GitHub profile" relationship="label">
              <a href="https://github.com/julian-passebecq" target="_blank" rel="noreferrer"><AppIcon name="github" size={16} /></a>
            </Tooltip>
            <Tooltip content="Open portfolio" relationship="label">
              <a href="https://j.datapassj.com" target="_blank" rel="noreferrer"><AppIcon name="external" size={16} /></a>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  )
}
