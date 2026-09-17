export interface ExplorerItem { id:string; label:string; path:string; kind:'file'|'folder'; depth:number; accent?:string; }
interface Props { title:string; items:ExplorerItem[]; selectedPath?:string; onSelect:(path:string)=>void; }

export function Explorer({title,items,selectedPath,onSelect}:Props){
  return <aside className="project-explorer">
    <div className="pane-title"><span>PROJECT</span><strong>{title}</strong></div>
    <div className="tree" role="tree">
      {items.map((item)=><button key={item.id} type="button" role="treeitem" aria-selected={item.kind==='file'?selectedPath===item.path:undefined} aria-expanded={item.kind==='folder'?true:undefined} className={`tree-row ${item.kind} ${selectedPath===item.path?'active':''}`} style={{paddingLeft:`${12+item.depth*15}px`}} onClick={()=>item.kind==='file'&&onSelect(item.path)} disabled={item.kind==='folder'}>
        <span className="tree-glyph">{item.kind==='folder'?'▾':'·'}</span><span>{item.label}</span>{item.accent&&<span className="tree-accent">{item.accent}</span>}
      </button>)}
    </div>
  </aside>;
}
