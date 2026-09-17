import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import { Badge } from '@fluentui/react-components';
import { Icon, isIconName, type IconName } from '../components/Icons';

export interface LearningGraphNode {
  id: string;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  kind?: string;
  iconName?: IconName;
  status?: string;
  detail?: string;
}

export interface LearningGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  animated?: boolean;
}

interface GraphNodeData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  kind?: string;
  iconName?: IconName;
  status?: string;
  detail?: string;
}

function statusClass(status?: string) {
  return (status ?? 'not-run').toLowerCase().replaceAll(' ', '-');
}

function LearningNode({ data, selected }: NodeProps) {
  const nodeData = data as GraphNodeData;
  const iconName: IconName = nodeData.iconName ?? (isIconName(nodeData.kind) ? nodeData.kind : 'pipeline');
  return (
    <div className={`learning-flow-node ${selected ? 'selected' : ''} status-${statusClass(nodeData.status)}`}>
      <Handle type="target" position={Position.Left} className="learning-handle input-handle" />
      <div className="learning-node-icon"><Icon name={iconName} small /></div>
      <div className="learning-node-copy">
        <div className="learning-node-title-row">
          <strong>{nodeData.title}</strong>
          {nodeData.status && nodeData.status !== 'Not run' && <Badge appearance="tint" size="small">{nodeData.status}</Badge>}
        </div>
        <span>{nodeData.subtitle}</span>
        {nodeData.detail && <small>{nodeData.detail}</small>}
      </div>
      <Handle type="source" position={Position.Right} className="learning-handle output-handle" />
      <div className="dependency-legend">Dependency</div>
    </div>
  );
}

const nodeTypes = { learningNode: LearningNode };

export interface LearningGraphProps {
  nodes: LearningGraphNode[];
  edges: LearningGraphEdge[];
  selectedId?: string | null;
  selectedEdgeId?: string | null;
  onSelect?: (id: string | null) => void;
  onEdgeSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onConnect?: (source: string, target: string) => void;
  onDeleteNodes?: (ids: string[]) => void;
  onDeleteEdges?: (ids: string[]) => void;
  onNodeContextMenu?: (id: string, clientX: number, clientY: number) => void;
  onDropPayload?: (payload: string, x: number, y: number) => void;
  dropMime?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  miniMap?: boolean;
}

function GraphInner({
  nodes,
  edges,
  selectedId,
  selectedEdgeId,
  onSelect,
  onEdgeSelect,
  onMove,
  onConnect,
  onDeleteNodes,
  onDeleteEdges,
  onNodeContextMenu,
  onDropPayload,
  dropMime = 'application/x-learning-node',
  emptyTitle = 'Drop an item to start',
  emptySubtitle = 'Drag from the palette, or click an item to add it.',
  miniMap = true,
}: LearningGraphProps) {
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const mappedNodes = useMemo<Node[]>(() => nodes.map((node) => ({
    id: node.id,
    type: 'learningNode',
    position: { x: node.x, y: node.y },
    selected: node.id === selectedId,
    data: {
      title: node.title,
      subtitle: node.subtitle,
      kind: node.kind,
      iconName: node.iconName,
      status: node.status,
      detail: node.detail,
    },
  })), [nodes, selectedId]);

  const [flowNodes, setFlowNodes] = useState<Node[]>(mappedNodes);
  useEffect(() => setFlowNodes(mappedNodes), [mappedNodes]);

  const flowEdges = useMemo(() => edges.map((edge) => {
    const sourceStatus = nodes.find((node) => node.id === edge.source)?.status;
    const targetStatus = nodes.find((node) => node.id === edge.target)?.status;
    const isRunning = sourceStatus === 'In progress' || targetStatus === 'In progress';
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? edge.condition,
      type: 'smoothstep',
      selected: edge.id === selectedEdgeId,
      animated: edge.animated ?? isRunning,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      className: `learning-edge condition-${(edge.condition ?? 'succeeded').toLowerCase()}`,
      labelStyle: { fontSize: 9, fill: '#616161' },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 2,
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
    };
  }), [edges, nodes, selectedEdgeId]);

  const handleNodeChanges = (changes: NodeChange[]) => setFlowNodes((current) => applyNodeChanges(changes, current));
  const handleConnect = (connection: Connection) => {
    if (connection.source && connection.target && onConnect) onConnect(connection.source, connection.target);
  };

  return (
    <div
      className="learning-graph-host"
      onDragOver={(event) => {
        if (!onDropPayload) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        if (!onDropPayload) return;
        event.preventDefault();
        const payload = event.dataTransfer.getData(dropMime);
        if (!payload || !instanceRef.current) return;
        const point = instanceRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        onDropPayload(payload, point.x, point.y);
      }}
    >
      {nodes.length === 0 && <div className="learning-graph-empty"><div>＋</div><strong>{emptyTitle}</strong><span>{emptySubtitle}</span></div>}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onInit={(instance) => { instanceRef.current = instance; }}
        onNodesChange={handleNodeChanges}
        onNodeClick={(_, node) => { onEdgeSelect?.(null); onSelect?.(node.id); }}
        onEdgeClick={(_, edge) => { onSelect?.(null); onEdgeSelect?.(edge.id); }}
        onPaneClick={() => { onSelect?.(null); onEdgeSelect?.(null); }}
        onNodeContextMenu={(event, node) => {
          if (!onNodeContextMenu) return;
          event.preventDefault();
          onNodeContextMenu(node.id, event.clientX, event.clientY);
        }}
        onNodeDragStop={(_, node) => onMove?.(node.id, node.position.x, node.position.y)}
        onConnect={handleConnect}
        onNodesDelete={(deleted) => onDeleteNodes?.(deleted.map((node) => node.id))}
        onEdgesDelete={(deleted) => onDeleteEdges?.(deleted.map((edge) => edge.id))}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1.2 }}
        minZoom={0.35}
        maxZoom={1.8}
        snapToGrid
        snapGrid={[10, 10]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        {miniMap && <MiniMap zoomable pannable nodeStrokeWidth={2} />}
      </ReactFlow>
    </div>
  );
}

export function LearningGraph(props: LearningGraphProps) {
  return <ReactFlowProvider><GraphInner {...props} /></ReactFlowProvider>;
}
