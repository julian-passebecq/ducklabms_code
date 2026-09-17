import type { PropsWithChildren } from 'react'
import { Button, Caption1, Text, Tooltip } from '@fluentui/react-components'
import { DismissRegular } from '@fluentui/react-icons'

export function PanelShell({ title, subtitle, children, removable = false, onRemove, collapsed = false, onToggleCollapsed }: PropsWithChildren<{ title: string; subtitle?: string; removable?: boolean; onRemove?: () => void; collapsed?: boolean; onToggleCollapsed?: () => void }>) {
  return (
    <section className={`panel-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <header className="panel-header drag-handle">
        <div className="panel-grip" aria-hidden="true">::</div>
        <div className="panel-title-group">
          <Text weight="semibold" size={200}>{title}</Text>
          {subtitle && <Caption1>{subtitle}</Caption1>}
        </div>
        {onToggleCollapsed && (
          <Tooltip content={collapsed ? 'Expand block' : 'Collapse block'} relationship="label">
            <Button
              appearance="subtle"
              size="small"
              className="panel-collapse"
              aria-label={collapsed ? 'Expand block' : 'Collapse block'}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onToggleCollapsed() }}
            >
              {collapsed ? '▸' : '▾'}
            </Button>
          </Tooltip>
        )}
        {removable && onRemove && (
          <Tooltip content="Remove block from this view" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              className="panel-remove"
              icon={<DismissRegular />}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onRemove() }}
            />
          </Tooltip>
        )}
      </header>
      {!collapsed && <div className="panel-body">{children}</div>}
    </section>
  )
}
