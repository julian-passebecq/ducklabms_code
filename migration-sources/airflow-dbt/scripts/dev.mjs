import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
execFileSync(process.platform==='win32'?'node.exe':'node',[resolve(root,'scripts/build.mjs')],{cwd:root,stdio:'inherit'});
const dist=resolve(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
  const raw=(req.url??'/').split('?')[0];
  const candidate=normalize(join(dist,raw));
  let file=(candidate===dist||candidate.startsWith(dist+sep))&&existsSync(candidate)&&statSync(candidate).isFile()?candidate:join(dist,'index.html');
  res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});
  res.end(readFileSync(file));
});
server.listen(5173,'127.0.0.1',()=>console.log('Orchestration Studio: http://127.0.0.1:5173/airflow'));
