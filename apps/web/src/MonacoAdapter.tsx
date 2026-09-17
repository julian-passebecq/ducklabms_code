import {useRef} from 'react';
import Editor,{loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import type {EditorProps} from './CodeEditor';
// Local Vite worker, not a runtime CDN dependency.
(self as unknown as {MonacoEnvironment:unknown}).MonacoEnvironment={getWorker:()=>new EditorWorker()};
loader.config({monaco});
export default function MonacoAdapter({value,language,onChange,onRun,readOnly}:EditorProps){
 const runRef=useRef(onRun);runRef.current=onRun;
 const monacoLanguage=language==='sparklab'||language==='polars'?'python':language==='dbt'?'sql':language;
 return <div className="monaco-host"><Editor height="100%" language={monacoLanguage} value={value} onChange={text=>onChange(text??'')} onMount={(editor,m)=>editor.addCommand(m.KeyMod.CtrlCmd|m.KeyCode.Enter,()=>runRef.current())} theme="vs" options={{readOnly,minimap:{enabled:false},fontSize:12,lineHeight:21,fontFamily:'Cascadia Code, Consolas, monospace',scrollBeyondLastLine:false,wordWrap:'on',automaticLayout:true,padding:{top:12,bottom:8},renderLineHighlight:'gutter',overviewRulerBorder:false}}/></div>;
}
