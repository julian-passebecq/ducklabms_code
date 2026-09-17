import { useId, useMemo } from 'react';

export interface GraphItem {
  id: string;
  label: string;
  subLabel?: string;
  dependsOn: string[];
  state?: string;
  kind?: string;
  group?: string;
  selectable?: boolean;
}

interface Props {
  items: GraphItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
  emptyMessage?: string;
}

const stateClass = (state?: string) => state ? `state-${state}` : 'state-idle';

export function GraphCanvas({items, selectedId, onSelect, compact=false, emptyMessage='No graph nodes.'}: Props) {
  const markerId=`graph-arrow-${useId().replace(/:/g,'')}`;
  const layout = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id,item]));
    const depthMemo = new Map<string,number>();
    const depthOf = (id:string, stack=new Set<string>()):number => {
      if (depthMemo.has(id)) return depthMemo.get(id) ?? 0;
      if (stack.has(id)) return 0;
      stack.add(id);
      const item=byId.get(id); if(!item) return 0;
      const deps=item.dependsOn.filter((dep)=>byId.has(dep));
      const depth=deps.length ? 1+Math.max(...deps.map((dep)=>depthOf(dep,new Set(stack)))) : 0;
      depthMemo.set(id,depth); return depth;
    };
    const columns = new Map<number,GraphItem[]>();
    items.forEach((item)=>{const depth=depthOf(item.id); columns.set(depth,[...(columns.get(depth)??[]),item]);});
    const positions = new Map<string,{x:number;y:number}>();
    const xGap=compact?190:230; const yGap=compact?82:96; const top=76; const left=compact?100:120;
    [...columns.entries()].forEach(([depth,col])=>col.forEach((item,index)=>positions.set(item.id,{x:left+depth*xGap,y:top+index*yGap})));
    const nodeWidth=compact?138:166; const nodeHeight=compact?52:62;
    const groupBoxes=[...new Set(items.map((item)=>item.group).filter((group):group is string=>Boolean(group)))].map((group)=>{
      const points=items.filter((item)=>item.group===group).map((item)=>positions.get(item.id)).filter((point):point is {x:number;y:number}=>Boolean(point));
      const minX=Math.min(...points.map((point)=>point.x-nodeWidth/2))-18;
      const maxX=Math.max(...points.map((point)=>point.x+nodeWidth/2))+18;
      const minY=Math.min(...points.map((point)=>point.y-nodeHeight/2))-28;
      const maxY=Math.max(...points.map((point)=>point.y+nodeHeight/2))+18;
      return {group,x:minX,y:minY,width:maxX-minX,height:maxY-minY};
    });
    const maxDepth=Math.max(0,...columns.keys()); const maxRows=Math.max(1,...[...columns.values()].map((col)=>col.length));
    const contentWidth=left+maxDepth*xGap+nodeWidth/2+55;
    const groupWidth=Math.max(0,...groupBoxes.map((box)=>box.x+box.width+20));
    const contentHeight=top+(maxRows-1)*yGap+nodeHeight/2+70;
    const groupHeight=Math.max(0,...groupBoxes.map((box)=>box.y+box.height+30));
    return {positions,groupBoxes,width:Math.max(contentWidth,groupWidth),height:Math.max(contentHeight,groupHeight),nodeWidth,nodeHeight};
  },[items,compact]);

  if (!items.length) return <div className="empty-state"><strong>Structured graph unavailable</strong><span>{emptyMessage}</span></div>;

  return <div className="graph-scroll" data-testid="graph-canvas">
    <svg className="dag-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Dependency graph">
      <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" className="edge-arrow" /></marker></defs>
      {layout.groupBoxes.map((box)=><g className="graph-group" key={box.group}><rect x={box.x} y={box.y} width={box.width} height={box.height} rx="12"/><text x={box.x+10} y={box.y+16} className="graph-group-label">{box.group}</text></g>)}
      {items.flatMap((item)=>item.dependsOn.map((dep)=>{
        const from=layout.positions.get(dep); const to=layout.positions.get(item.id); if(!from||!to)return null;
        const x1=from.x+layout.nodeWidth/2; const y1=from.y; const x2=to.x-layout.nodeWidth/2-12; const y2=to.y;
        const mx=(x1+x2)/2;
        return <path key={`${dep}-${item.id}`} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} className="graph-edge" markerEnd={`url(#${markerId})`}/>;
      }))}
      {items.map((item)=>{
        const p=layout.positions.get(item.id); if(!p)return null; const w=layout.nodeWidth; const h=layout.nodeHeight;
        const selectable=item.selectable??Boolean(onSelect);
        return <g key={item.id} transform={`translate(${p.x-w/2},${p.y-h/2})`} className={`graph-node ${selectable?'':'static'} ${stateClass(item.state)} ${selectedId===item.id?'selected':''}`} onClick={selectable?()=>onSelect?.(item.id):undefined} role={selectable?'button':undefined} tabIndex={selectable?0:undefined} aria-label={`${item.label}${item.subLabel?`, ${item.subLabel}`:''}, state ${item.state??'idle'}`} aria-pressed={selectable?selectedId===item.id:undefined} onKeyDown={selectable?(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.(item.id);}}:undefined}>
          <rect width={w} height={h} rx="8" />
          <text x="12" y={compact?22:25} className="node-label">{item.label.length>22?`${item.label.slice(0,21)}…`:item.label}</text>
          <text x="12" y={compact?39:45} className="node-sublabel">{item.subLabel??item.kind??''}</text>
        </g>;
      })}
    </svg>
  </div>;
}
