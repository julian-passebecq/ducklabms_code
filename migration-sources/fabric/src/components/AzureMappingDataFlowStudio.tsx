import { Button, Input, Tab, TabList } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { LearningGraph } from '../graph-engine/LearningGraph';
import type { CaseStudy } from '../types/app';

const transforms = ['Source', 'Derived Column', 'Select', 'Filter', 'Aggregate', 'Join', 'Conditional Split', 'Lookup', 'Union', 'Sink'];
const TRANSFORM_MIME = 'application/x-adf-transform';

type TransformNode = { id: string; type: string; name: string; x: number; y: number };
type TransformEdge = { id: string; source: string; target: string };

export function AzureMappingDataFlowStudio({ caseStudy }: { caseStudy: CaseStudy }) {
  const [nodes, setNodes] = useState<TransformNode[]>([
    { id: 'src', type: 'Source', name: 'Source1', x: 70, y: 125 },
    { id: 'derived', type: 'Derived Column', name: 'DeriveMetrics', x: 340, y: 125 },
    { id: 'sink', type: 'Sink', name: 'Sink1', x: 620, y: 125 },
  ]);
  const [edges, setEdges] = useState<TransformEdge[]>([
    { id: 'src-derived', source: 'src', target: 'derived' },
    { id: 'derived-sink', source: 'derived', target: 'sink' },
  ]);
  const [selected, setSelected] = useState<string | null>('derived');
  const [tab, setTab] = useState('Settings');
  const [debug, setDebug] = useState(false);
  const current = nodes.find((n) => n.id === selected) ?? nodes[0];
  const source = caseStudy.tables[0];
  const graphNodes = useMemo(() => nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, title: node.name, subtitle: node.type, kind: 'dataflow', detail: node.type === 'Derived Column' ? 'net_sales = qty * unit_price' : undefined })), [nodes]);

  const addTransform = (type: string, x = 110 + nodes.length * 70, y = 290) => {
    const node = { id: `${type}-${Date.now()}`, type, name: `${type.replaceAll(' ', '')}${nodes.length + 1}`, x, y };
    setNodes([...nodes, node]);
    setSelected(node.id);
  };

  const deleteNodes = (ids: string[]) => {
    const set = new Set(ids);
    setNodes(nodes.filter((n) => !set.has(n.id)));
    setEdges(edges.filter((e) => !set.has(e.source) && !set.has(e.target)));
    if (selected && set.has(selected)) setSelected(null);
  };

  return (
    <div className="adf-dataflow-page fluent-adf-dataflow">
      <div className="adf-dataflow-toolbar">
        <div><strong>DF_{caseStudy.id.replaceAll('-', '_')}</strong><span>Mapping data flow</span></div>
        <div className="command-group">
          <Button appearance="subtle" size="small" onClick={() => setDebug((v) => !v)}>Data flow debug <span className={debug ? 'toggle-on' : 'toggle-off'}>{debug ? 'On' : 'Off'}</span></Button>
          <Button appearance="subtle" size="small">Script</Button>
          <Button appearance="primary" size="small">Publish all</Button>
        </div>
      </div>
      <div className="adf-dataflow-body">
        <aside className="adf-transform-palette fluent-pane">
          <div className="pane-title"><span>Transformations</span><small>Drag to data flow</small></div>
          {transforms.map((type) => <Button appearance="subtle" key={type} draggable onDragStart={(event) => { event.dataTransfer.setData(TRANSFORM_MIME, type); event.dataTransfer.effectAllowed = 'copy'; }} onClick={() => addTransform(type)}><span className="transform-icon">+</span>{type}</Button>)}
        </aside>
        <main className="adf-flow-workspace">
          <div className="adf-flow-canvas xyflow-adf-canvas">
            <LearningGraph
              nodes={graphNodes}
              edges={edges.map((edge) => ({ ...edge, label: 'stream' }))}
              selectedId={selected}
              onSelect={setSelected}
              onMove={(id, x, y) => setNodes(nodes.map((node) => node.id === id ? { ...node, x, y } : node))}
              onConnect={(sourceId, targetId) => {
                if (sourceId === targetId || edges.some((edge) => edge.source === sourceId && edge.target === targetId)) return;
                setEdges([...edges, { id: `${sourceId}-${targetId}-${Date.now()}`, source: sourceId, target: targetId }]);
              }}
              onDeleteNodes={deleteNodes}
              onDeleteEdges={(ids) => setEdges(edges.filter((edge) => !ids.includes(edge.id)))}
              dropMime={TRANSFORM_MIME}
              onDropPayload={(payload, x, y) => addTransform(payload, x, y)}
              emptyTitle="Add a source or transformation"
              emptySubtitle="Build a Mapping Data Flow by dragging transformations and wiring streams between them."
            />
          </div>
          <section className="adf-transform-properties">
            <TabList className="adf-property-tabs fluent-properties-tabs" selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} size="small">
              <Tab value="Settings">Settings</Tab><Tab value="Optimize">Optimize</Tab><Tab value="Inspect">Inspect</Tab><Tab value="Data preview">Data preview</Tab>
            </TabList>
            {current && tab === 'Settings' && <div className="adf-property-grid">
              <label className="form-field"><span>Transformation name</span><Input value={current.name} onChange={(_, data) => setNodes(nodes.map((n) => n.id === current.id ? { ...n, name: data.value } : n))} /></label>
              <label className="form-field"><span>Transformation</span><Input value={current.type} readOnly /></label>
              <label className="form-field"><span>Expression / mapping</span><Input value={current.type === 'Derived Column' ? 'net_sales = qty * unit_price' : current.type === 'Sink' ? 'Allow insert: true' : 'Rule-based mapping'} readOnly /></label>
            </div>}
            {tab === 'Optimize' && <div className="adf-setting-callout"><strong>Partitioning</strong><span>Simulate round robin, hash, key or single-partition choices and explain shuffle impact.</span></div>}
            {tab === 'Inspect' && <div className="adf-setting-callout"><strong>Data flow schema</strong><span>{source.columns.length} projected columns · schema drift enabled for learning.</span></div>}
            <div className="adf-preview"><table className="data-grid"><thead><tr>{source.columns.slice(0,6).map((c) => <th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{source.rows.slice(0,3).map((r,i) => <tr key={i}>{source.columns.slice(0,6).map((c) => <td key={c.name}>{String(r[c.name] ?? '')}</td>)}</tr>)}</tbody></table></div>
          </section>
        </main>
      </div>
    </div>
  );
}
