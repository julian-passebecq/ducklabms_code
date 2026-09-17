import {useRef,useState,lazy,Suspense} from 'react';
const MonacoAdapter=lazy(()=>import('./MonacoAdapter'));
export interface EditorProps {value:string;language:string;onChange:(s:string)=>void;onRun:()=>void;readOnly?:boolean}
export function CodeEditor(props:EditorProps){
 const [simple,setSimple]=useState(false);
 return <div className="editor-host"><div className="editor-mode"><span>{props.language}</span><button onClick={()=>setSimple(!simple)}>{simple?'Use Monaco':'Use plain editor'}</button></div>{simple?<PlainEditor {...props}/>:<Suspense fallback={<PlainEditor {...props}/>}><MonacoAdapter {...props}/></Suspense>}</div>;
}


/** Dependency-light accessible editor adapter. Monaco can replace this component
 * without changing notebook state, API calls, cell identity or specialist modules.
 * Unlike the legacy Monaco setup, this root never downloads an editor from a CDN.
 */
function PlainEditor({value,language,onChange,onRun,readOnly=false}:{value:string;language:string;onChange:(s:string)=>void;onRun:()=>void;readOnly?:boolean}){
 const ref=useRef<HTMLTextAreaElement>(null);
 return <div className="code-editor"><div className="line-numbers" aria-hidden="true">{value.split('\n').map((_,i)=><div key={i}>{i+1}</div>)}</div><textarea ref={ref} aria-label={`${language} cell source`} value={value} readOnly={readOnly} spellCheck={false} onChange={e=>onChange(e.target.value)} onScroll={e=>{const line=e.currentTarget.previousElementSibling;if(line)line.scrollTop=e.currentTarget.scrollTop}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();onRun()}if(e.key==='Tab'&&!readOnly){e.preventDefault();const start=e.currentTarget.selectionStart,end=e.currentTarget.selectionEnd;onChange(value.slice(0,start)+'    '+value.slice(end));requestAnimationFrame(()=>ref.current?.setSelectionRange(start+4,start+4))}}}/></div>;
}
