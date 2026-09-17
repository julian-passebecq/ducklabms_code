import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const compiled=resolve(root,'.compiled');
const dist=resolve(root,'dist');
rmSync(compiled,{recursive:true,force:true}); rmSync(dist,{recursive:true,force:true});
execFileSync(process.platform==='win32'?'tsc.cmd':'tsc',['-p','tsconfig.build.json'],{cwd:root,stdio:'inherit'});
mkdirSync(resolve(dist,'src'),{recursive:true});
cpSync(compiled,resolve(dist,'src'),{recursive:true});
cpSync(resolve(root,'index.html'),resolve(dist,'index.html'));
cpSync(resolve(root,'src/styles.css'),resolve(dist,'styles.css'));
if(!existsSync(resolve(dist,'src/main.js'))) throw new Error('Build did not emit src/main.js');
console.log('Production bundle emitted to dist/ (ES modules + import map).');
