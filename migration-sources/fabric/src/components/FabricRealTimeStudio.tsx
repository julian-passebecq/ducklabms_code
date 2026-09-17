import { Button } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { LearningGraph } from '../graph-engine/LearningGraph';
import type { CaseStudy } from '../types/app';

const RT_MIME = 'application/x-eventstream-node';
const rtPalette = ['Source', 'Transform', 'Destination'];

type RtNode = { id: string; type: string; title: string; subtitle: string; x: number; y: number; active: boolean };
type RtEdge = { id: string; source: string; target: string };

export function FabricRealTimeStudio({ caseStudy }: { caseStudy: CaseStudy }) {
  const [nodes, setNodes] = useState<RtNode[]>([]);
  const [edges, setEdges] = useState<RtEdge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [queryRan, setQueryRan] = useState(false);
  const [alert, setAlert] = useState(false);
  const streamTable = caseStudy.tables.find(t => t.layer === 'stream') ?? caseStudy.tables[0];

  const sourceAdded = nodes.some((n) => n.type === 'Source');
  const transformAdded = nodes.some((n) => n.type === 'Transform');
  const destinationAdded = nodes.some((n) => n.type === 'Destination');
  const graphNodes = useMemo(() => nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, title: node.title, subtitle: node.subtitle, kind: node.type === 'Source' ? 'eventstream' : node.type === 'Destination' ? 'kql' : 'dataflow', status: streaming && node.active ? 'In progress' : node.active ? 'Configured' : 'Not run' })), [nodes, streaming]);

  const addNode = (type: string, x = 150 + nodes.length * 260, y = 130) => {
    const presets: Record<string, [string, string]> = {
      Source: ['Azure Event Hubs', 'iot-turbines'],
      Transform: ['Manage fields', 'filter + derive severity'],
      Destination: ['Eventhouse', 'EH_Operations / telemetry'],
    };
    const [title, subtitle] = presets[type] ?? [type, 'Eventstream item'];
    const node = { id: `${type}-${Date.now()}`, type, title, subtitle, x, y, active: true };
    setNodes([...nodes, node]);
    setSelected(node.id);
  };

  return <div className="studio-page realtime-studio">
    <div className="studio-commandbar"><div><span className="fabric-item-icon">RT</span><strong>Real-Time Intelligence</strong><span className="muted">Eventstream · Eventhouse · KQL · Activator</span></div><div><Button appearance="secondary" size="small">Open Real-Time hub</Button><Button appearance="primary" size="small" onClick={() => setStreaming(v=>!v)}>{streaming?'Stop stream':'Start stream'}</Button></div></div>
    <div className="realtime-workbench">
      <main className="eventstream-canvas fluent-eventstream-canvas">
        <div className="canvas-title"><div><span className="eyebrow">Eventstream</span><h2>ES_Turbine_Operations</h2></div><span className={`status-pill ${streaming?'success':''}`}>{streaming?'Running':'Stopped'}</span></div>
        <div className="eventstream-authoring-grid">
          <aside className="eventstream-palette"><div className="pane-title">Nodes</div>{rtPalette.map((type) => <Button key={type} appearance="subtle" draggable onDragStart={(event) => { event.dataTransfer.setData(RT_MIME, type); event.dataTransfer.effectAllowed = 'copy'; }} onClick={() => addNode(type)}>＋ {type}</Button>)}</aside>
          <div className="eventstream-graph"><LearningGraph nodes={graphNodes} edges={edges.map((edge) => ({ ...edge, label: 'events', animated: streaming }))} selectedId={selected} onSelect={setSelected} onMove={(id,x,y)=>setNodes(nodes.map((n)=>n.id===id?{...n,x,y}:n))} onConnect={(source,target)=>{ if(source!==target&&!edges.some((e)=>e.source===source&&e.target===target)) setEdges([...edges,{id:`${source}-${target}-${Date.now()}`,source,target}]); }} onDeleteNodes={(ids)=>{const set=new Set(ids);setNodes(nodes.filter((n)=>!set.has(n.id)));setEdges(edges.filter((e)=>!set.has(e.source)&&!set.has(e.target)));}} onDeleteEdges={(ids)=>setEdges(edges.filter((e)=>!ids.includes(e.id)))} dropMime={RT_MIME} onDropPayload={(payload,x,y)=>addNode(payload,x,y)} emptyTitle="Build the eventstream" emptySubtitle="Add source, optional transform, and destination; then connect them in the order events should flow." /></div>
        </div>
        <div className="stream-preview"><div className="subsurface-title"><strong>Live data preview</strong><span>{streaming?'receiving events':'stream paused'}</span></div><table className="data-grid"><thead><tr>{streamTable.columns.slice(0,6).map(c=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{streamTable.rows.slice(0,4).map((r,i)=><tr key={i}>{streamTable.columns.slice(0,6).map(c=><td key={c.name}>{String(r[c.name]??'')}</td>)}</tr>)}</tbody></table></div>
      </main>
      <section className="kql-pane"><div className="pane-title">KQL Queryset</div><textarea defaultValue={`${streamTable.name}\n| where vibration_mm_s > 6.0\n| summarize avg_temp=avg(gearbox_temp_c), events=count() by turbine_id\n| order by avg_temp desc`}/><Button appearance="primary" size="small" onClick={()=>setQueryRan(true)}>▶ Run KQL</Button>{queryRan&&<div className="kql-result"><strong>WT-07</strong><span>avg_temp 82.9 · events 1</span><strong>WT-03</strong><span>avg_temp 64.0 · events 1</span></div>}
        <div className="activator-box"><div><strong>Activator rule</strong><span>IF risk_score &gt; 0.85 for 1 event</span></div><Button appearance={alert?'primary':'secondary'} size="small" onClick={()=>setAlert(true)}>{alert?'✓ Rule active':'Create rule'}</Button></div>
      </section>
      <aside className="learning-side-panel standalone"><div className="pane-title">Real-time learning path</div><Check ok={sourceAdded} text="Connect a streaming source"/><Check ok={transformAdded} text="Transform events in-flight"/><Check ok={destinationAdded} text="Route to Eventhouse/KQL DB"/><Check ok={streaming} text="Start ingestion"/><Check ok={queryRan} text="Query with KQL"/><Check ok={alert} text="Create Activator rule"/><div className="learning-box"><strong>Core loop</strong><p>Ingest → transform → store → query → act. Eventstream handles data in motion, Eventhouse/KQL handles analytical storage, and Activator turns a condition into an operational action.</p></div></aside>
    </div>
  </div>;
}
function Check({ok,text}:{ok:boolean;text:string}){return <div className={`check-row ${ok?'done':''}`}><span>{ok?'✓':'○'}</span><p>{text}</p></div>}
