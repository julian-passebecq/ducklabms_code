import { Button, Input } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { activityCategory, activityLabels, azurePalette, fabricPalette } from '../lib/pipeline';
import type { ActivityType, Experience } from '../types/app';
import { Icon } from './Icons';

export const PIPELINE_ACTIVITY_MIME = 'application/x-pipeline-activity';

export function ActivityPalette({ experience, onAdd }: { experience: Experience; onAdd: (type: ActivityType) => void }) {
  const [search, setSearch] = useState('');
  const items = experience === 'fabric' ? fabricPalette : azurePalette;
  const visible = useMemo(() => items.filter((type) => activityLabels[type].toLowerCase().includes(search.trim().toLowerCase())), [items, search]);
  const groups = [...new Set(visible.map((i) => activityCategory[i]))];
  return (
    <aside className="activity-palette fluent-pane">
      <div className="pane-title"><span>Activities</span><small>Click or drag to canvas</small></div>
      <Input className="search-box fluent-search" size="small" placeholder="Search activities" value={search} onChange={(_, data) => setSearch(data.value)} />
      <div className="palette-scroll">
        {groups.map((group) => (
          <section key={group} className="palette-group">
            <h4>{group}</h4>
            {visible.filter((i) => activityCategory[i] === group).map((type) => (
              <Button
                appearance="subtle"
                key={type}
                className="palette-item"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(PIPELINE_ACTIVITY_MIME, type);
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onAdd(type)}
              >
                <Icon name={type} small />
                <span>{activityLabels[type]}</span>
                <span className="plus-mark">+</span>
              </Button>
            ))}
          </section>
        ))}
        {visible.length === 0 && <div className="palette-empty">No activity matches “{search}”.</div>}
      </div>
    </aside>
  );
}
