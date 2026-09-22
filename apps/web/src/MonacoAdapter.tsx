import {useRef,useEffect} from 'react';
import Editor,{loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import type {EditorProps} from './CodeEditor';
// Local Vite worker, not a runtime CDN dependency.
(self as unknown as {MonacoEnvironment:unknown}).MonacoEnvironment={getWorker:()=>new EditorWorker()};
loader.config({monaco});
// Bounded inactive editor cache. Durable source always belongs to the notebook;
// eviction may discard editor undo, never a saved draft.
const retained=new Map<string,monaco.editor.ITextModel>();
const active=new Set<string>();
function trimModels(){for(const [key,model] of retained){if(retained.size<=16)break;if(!active.has(key)){model.dispose();retained.delete(key)}}}
export default function MonacoAdapter({value,language,onChange,onRun,readOnly,modelId}:EditorProps){
 const runRef=useRef(onRun);runRef.current=onRun;
 const valueRef=useRef(value);valueRef.current=value;
 const path=modelId?`datapass://notebook/${modelId}`:undefined;
 useEffect(()=>{if(path)active.add(path);return()=>{if(path)active.delete(path);trimModels()}},[path]);
 const monacoLanguage=language==='sparklab'||language==='polars'?'python':language==='dbt'?'sql':language;
 return <div className="monaco-host"><Editor path={path} keepCurrentModel={!!path} saveViewState height="100%" language={monacoLanguage} value={value} onChange={text=>onChange(text??'')} onMount={(editor,m)=>{const model=editor.getModel();if(model&&model.getValue()!==valueRef.current)model.setValue(valueRef.current);if(path&&model){active.add(path);retained.delete(path);retained.set(path,model);trimModels()}editor.addCommand(m.KeyMod.CtrlCmd|m.KeyCode.Enter,()=>runRef.current())}} theme="vs" options={{readOnly,minimap:{enabled:false},fontSize:12,lineHeight:21,fontFamily:'Cascadia Code, Consolas, monospace',scrollBeyondLastLine:false,wordWrap:'on',automaticLayout:true,padding:{top:12,bottom:8},renderLineHighlight:'gutter',overviewRulerBorder:false}}/></div>;
}
