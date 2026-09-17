const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
let ts;
try { ts = require('typescript'); }
catch {
  try { ts = require(path.join(execSync('npm root -g', {encoding:'utf8'}).trim(), 'typescript')); }
  catch { console.error('TypeScript parser is unavailable. Install dependencies or a global TypeScript package before npm run check:syntax.'); process.exit(2); }
}
const files=[];
function walk(dir){ for(const name of fs.readdirSync(dir)){ const full=path.join(dir,name); const st=fs.statSync(full); if(st.isDirectory()) walk(full); else if(/\.(jsx|js|mjs)$/.test(name)) files.push(full); } }
walk(path.join(process.cwd(),'src')); walk(path.join(process.cwd(),'scripts'));
let failed=false;
for(const file of files){ const text=fs.readFileSync(file,'utf8'); const kind=file.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS; const sf=ts.createSourceFile(file,text,ts.ScriptTarget.ESNext,true,kind); if(sf.parseDiagnostics.length){ failed=true; console.error(`FAIL: ${path.relative(process.cwd(),file)}`); for(const d of sf.parseDiagnostics) console.error(`  ${d.messageText} @ ${d.start}`); } }
if(failed) process.exit(1);
console.log(`Syntax checks passed: ${files.length} JS/JSX/MJS files.`);
