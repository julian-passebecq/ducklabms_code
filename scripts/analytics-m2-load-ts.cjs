const fs = require('node:fs');
const path = require('node:path');
let ts;
try {ts = require('typescript');} catch {
  if (!process.env.TYPESCRIPT_PATH) throw new Error('Install TypeScript locally or set TYPESCRIPT_PATH to its installed package directory. The bundled preview does not need this build tool.');
  ts = require(process.env.TYPESCRIPT_PATH);
}
const cache = new Map();
function loadTs(filename) {
  const file = path.resolve(filename);
  if (cache.has(file)) return cache.get(file).exports;
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {fileName:file, reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true}});
  if (result.diagnostics?.length) throw new Error(result.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));
  const module = {exports:{}}; cache.set(file,module);
  const requireLocal = name => name.startsWith('.') ? loadTs(path.resolve(path.dirname(file),name + (path.extname(name) ? '' : '.ts'))) : require(name);
  new Function('require','module','exports',result.outputText)(requireLocal,module,module.exports);
  return module.exports;
}
module.exports = {loadTs, ts};
