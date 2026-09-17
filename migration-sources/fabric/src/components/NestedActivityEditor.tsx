import { Button, Dropdown, Input, Option } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { LearningGraph } from '../graph-engine/LearningGraph';
import { nestedActivityChoices, parseNestedActivities, serializeNestedActivities, type NestedActivityDefinition } from '../lib/nestedActivities';

function iconFor(type: string) {
  if (type === 'copy') return 'copy';
  if (type === 'notebook') return 'notebook';
  if (type === 'storedProcedure') return 'sql';
  if (type === 'lookup') return 'search';
  return 'pipeline';
}

export function NestedActivityEditor({ open, parentName, branchLabel, value, onChange, onClose }: {
  open: boolean;
  parentName: string;
  branchLabel: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = parseNestedActivities(value);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const graphNodes = useMemo(() => items.map((item) => ({ id: item.id, x: item.x, y: item.y, title: item.name, subtitle: item.type, kind: item.type, iconName: iconFor(item.type) as never })), [items]);
  const graphEdges = useMemo(() => items.slice(0, -1).map((item, index) => ({ id: `nested-edge-${index}`, source: item.id, target: items[index + 1].id, label: 'Succeeded' })), [items]);
  if (!open) return null;
  const commit = (next: NestedActivityDefinition[]) => onChange(serializeNestedActivities(next));
  const add = (type: string, label: string) => {
    const next: NestedActivityDefinition = { id: `nested-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, name: label, x: 70 + items.length * 220, y: 120 };
    commit([...items, next]);
    setSelectedId(next.id);
  };
  const remove = (id: string) => { commit(items.filter((item) => item.id !== id)); if (selectedId === id) setSelectedId(null); };
  const move = (id: string, x: number, y: number) => commit(items.map((item) => item.id === id ? { ...item, x, y } : item));
  const rename = (name: string) => selected && commit(items.map((item) => item.id === selected.id ? { ...item, name } : item));
  return <div className="studio-modal-backdrop nested-editor-backdrop" onMouseDown={onClose}>
    <section className="studio-modal nested-activity-editor" onMouseDown={(event) => event.stopPropagation()}>
      <header className="studio-modal-header nested-editor-header"><div><span className="eyebrow">Nested activity canvas</span><h2>{parentName} / {branchLabel}</h2><p><button className="nested-breadcrumb" onClick={onClose}>Pipeline</button><span>›</span><strong>{parentName}</strong><span>›</span><strong>{branchLabel}</strong></p></div><button className="icon-button" onClick={onClose}>×</button></header>
      <div className="nested-editor-commandbar"><Dropdown placeholder="+ Add activity" onOptionSelect={(_, data) => { const match = nestedActivityChoices.find((item) => item.type === data.optionValue); if (match) add(match.type, match.label); }}>{nestedActivityChoices.map((item) => <Option key={item.type} value={item.type}>{item.label}</Option>)}</Dropdown><span>{items.length} child activit{items.length === 1 ? 'y' : 'ies'} · dependencies execute left-to-right in this learning simulator</span></div>
      <div className="nested-editor-layout">
        <div className="nested-editor-canvas"><LearningGraph nodes={graphNodes} edges={graphEdges} selectedId={selectedId} onSelect={setSelectedId} onMove={move} onDeleteNodes={(ids) => ids.forEach(remove)} miniMap={items.length > 5} emptyTitle="Add a child activity" emptySubtitle="This is the inner canvas for the selected control-flow branch." /></div>
        <aside className="nested-editor-properties">{selected ? <><span className="eyebrow">Child activity</span><strong>{selected.name}</strong><label>Name</label><Input value={selected.name} onChange={(_, data) => rename(data.value)} /><label>Type</label><Input value={selected.type} disabled /><div className="property-note">Child activity configuration is intentionally lightweight; the graph, ordering, drill-down context and nested execution model are structural rather than a pipe-delimited list.</div><Button appearance="secondary" onClick={() => remove(selected.id)}>Delete child</Button></> : <div className="empty-pane">Select a child activity to inspect it.</div>}</aside>
      </div>
      <footer className="studio-modal-actions"><div className="nested-limit-note">ADF/Fabric nested activities use a drill-down canvas and breadcrumb context. ADF also limits some nested-container combinations.</div><Button appearance="primary" onClick={onClose}>Done</Button></footer>
    </section>
  </div>;
}
