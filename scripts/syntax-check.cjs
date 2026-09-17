/* Syntax only. This does NOT replace typechecking or resolving real packages. */
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/usr/local/slides_js/node_modules/typescript')}
const roots=['apps/web/src','packages/contracts/src','packages/notebook-core/src'];let files=0,errors=0;
function walk(p){for(const ent of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,ent.name);if(ent.isDirectory())walk(q);else if(/\.tsx?$/.test(q)&&!q.endsWith('.d.ts')){files++;const r=ts.transpileModule(fs.readFileSync(q,'utf8'),{fileName:q,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true}});for(const d of r.diagnostics||[])if(d.category===ts.DiagnosticCategory.Error){errors++;console.error(q,ts.flattenDiagnosticMessageText(d.messageText,'\n'))}}}}
roots.forEach(walk);console.log(JSON.stringify({check:'TypeScript/TSX syntax only',files,errors,notVerified:['dependency resolution','full typecheck','Vite bundle','React rendering']}));process.exitCode=errors?1:0;
