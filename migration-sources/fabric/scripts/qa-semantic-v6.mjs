import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=path.resolve('.qa-semantic-v6'); fs.rmSync(root,{recursive:true,force:true}); fs.mkdirSync(root,{recursive:true});
const shim=path.join(root,'shims.d.ts');
fs.writeFileSync(shim, `
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } interface IntrinsicAttributes { key?: any } }
declare namespace React { type ReactNode=any; type CSSProperties=Record<string, any>; type MouseEvent<T=any>=any; type DragEvent<T=any>=any; type ChangeEvent<T=any>=any; }
declare module 'react' {
  export function useState<T>(initial:T|(()=>T)): [T, (value:T|((previous:T)=>T))=>void];
  export function useEffect(effect:()=>void|(()=>void), deps?:any[]): void;
  export function useMemo<T>(factory:()=>T, deps:any[]): T;
  export function useRef<T>(initial:T): { current:T };
  export const StrictMode:any; export type ReactNode=any; const React:any; export default React;
}
declare module 'react/jsx-runtime' { export const jsx:any; export const jsxs:any; export const Fragment:any; }
declare module 'react-dom/client' { export const createRoot:any; }
declare module '@fluentui/react-components' {
  export const Badge:any; export const Button:any; export const Checkbox:any; export const Dropdown:any; export const Field:any;
  export const FluentProvider:any; export const Input:any; export const Option:any; export const Tab:any; export const TabList:any;
  export const Textarea:any; export const Tooltip:any; export const webLightTheme:any; export type Theme=any;
}
declare module '@xyflow/react' {
  export const Background:any; export const BackgroundVariant:any; export const Controls:any; export const Handle:any; export const MarkerType:any;
  export const MiniMap:any; export const Position:any; export const ReactFlow:any; export const ReactFlowProvider:any; export const applyNodeChanges:any;
  export type Connection=any; export type Node=any; export type NodeChange=any; export type NodeProps=any; export type ReactFlowInstance=any;
}
declare module '@motherduck/wasm-client' { export const MDConnection:any; }
declare module '@xyflow/react/dist/style.css';
`);
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?walk(path.join(dir,entry.name)):/\.tsx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]);
const sources=walk('src');
const args=[shim,...sources,'--noEmit','--target','ES2022','--module','ESNext','--moduleResolution','bundler','--jsx','react-jsx','--skipLibCheck','--strict','false','--allowSyntheticDefaultImports','true'];
const result=spawnSync('tsc',args,{encoding:'utf8'});
if(result.status!==0){ console.error(result.stdout||result.stderr); fs.rmSync(root,{recursive:true,force:true}); process.exit(1); }
console.log(`PASS  Shimmed semantic TypeScript pass (${sources.length} TS/TSX files)`);
fs.rmSync(root,{recursive:true,force:true});
