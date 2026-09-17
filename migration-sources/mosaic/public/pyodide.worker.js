let pyodide = null;
let queue = Promise.resolve();
const loadedPackages = new Set();

async function ensurePyodide(packages = []) {
  if (!pyodide) {
    importScripts('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.js');
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/' });
  }
  const missing = packages.filter((name) => !loadedPackages.has(name));
  if (missing.length) {
    await pyodide.loadPackage(missing);
    missing.forEach((name) => loadedPackages.add(name));
  }
  return pyodide;
}

function pandasWrapper() {
  return `
import ast, json, sys, io
import pandas as pd
_payload = json.loads(__mosaic_input_json)
input_df = pd.DataFrame(_payload.get('rows', []), columns=_payload.get('columns', []))
_tree = ast.parse(__mosaic_code, mode='exec')
_buffer = io.StringIO()
_old = sys.stdout
sys.stdout = _buffer
_result = None
try:
    if _tree.body and isinstance(_tree.body[-1], ast.Expr):
        _prefix = ast.Module(body=_tree.body[:-1], type_ignores=[])
        if _prefix.body:
            exec(compile(_prefix, '<mosaic>', 'exec'), globals(), globals())
        _last = ast.Expression(_tree.body[-1].value)
        _result = eval(compile(_last, '<mosaic>', 'eval'), globals(), globals())
    else:
        exec(compile(_tree, '<mosaic>', 'exec'), globals(), globals())
finally:
    sys.stdout = _old
_out = _buffer.getvalue()
_table = None
if isinstance(_result, pd.Series):
    _result = _result.to_frame()
if isinstance(_result, pd.DataFrame):
    _total_rows = len(_result)
    _safe = _result.head(10000).copy()
    _safe = _safe.where(pd.notnull(_safe), None)
    _table = {
        'columns': [str(c) for c in _safe.columns],
        'rows': json.loads(_safe.to_json(orient='records', date_format='iso')),
        'schema': [{'name': str(c), 'type': str(t)} for c, t in zip(_safe.columns, _safe.dtypes)],
        'totalRows': _total_rows,
        'truncated': _total_rows > len(_safe)
    }
    _repr = _safe.to_string(index=False)
elif _result is not None:
    try:
        _repr = _result.to_string() if hasattr(_result, 'to_string') else repr(_result)
    except Exception:
        _repr = repr(_result)
else:
    _repr = ''
json.dumps({'stdout': _out, 'result': _repr, 'table': _table})
`;
}

function polarsWrapper() {
  return `
import ast, json, sys, io
import polars as pl
_payload = json.loads(__mosaic_input_json)
input_df = pl.DataFrame(_payload.get('rows', [])) if _payload.get('rows') else pl.DataFrame(schema=_payload.get('columns', []))
input_lazy = input_df.lazy()
_tree = ast.parse(__mosaic_code, mode='exec')
_buffer = io.StringIO()
_old = sys.stdout
sys.stdout = _buffer
_result = None
try:
    if _tree.body and isinstance(_tree.body[-1], ast.Expr):
        _prefix = ast.Module(body=_tree.body[:-1], type_ignores=[])
        if _prefix.body:
            exec(compile(_prefix, '<mosaic-polars>', 'exec'), globals(), globals())
        _last = ast.Expression(_tree.body[-1].value)
        _result = eval(compile(_last, '<mosaic-polars>', 'eval'), globals(), globals())
    else:
        exec(compile(_tree, '<mosaic-polars>', 'exec'), globals(), globals())
finally:
    sys.stdout = _old
_out = _buffer.getvalue()
_table = None
if isinstance(_result, pl.LazyFrame):
    _result = _result.collect()
if isinstance(_result, pl.Series):
    _result = _result.to_frame()
if isinstance(_result, pl.DataFrame):
    _total_rows = _result.height
    _safe = _result.head(10000)
    _table = {
        'columns': [str(c) for c in _safe.columns],
        'rows': json.loads(json.dumps(_safe.to_dicts(), default=str)),
        'schema': [{'name': str(name), 'type': str(dtype)} for name, dtype in _safe.schema.items()],
        'totalRows': _total_rows,
        'truncated': _total_rows > _safe.height
    }
    _repr = str(_safe)
elif _result is not None:
    _repr = repr(_result)
else:
    _repr = ''
json.dumps({'stdout': _out, 'result': _repr, 'table': _table})
`;
}

async function execute(event) {
  const { id, code, inputRows = [], inputColumns = [], engine = 'python' } = event.data;
  try {
    const packages = engine === 'polars' ? ['polars'] : ['pandas'];
    const runtime = await ensurePyodide(packages);
    runtime.globals.set('__mosaic_code', code);
    runtime.globals.set('__mosaic_input_json', JSON.stringify({ rows: inputRows, columns: inputColumns }));
    const wrapped = engine === 'polars' ? polarsWrapper() : pandasWrapper();
    const value = await runtime.runPythonAsync(wrapped);
    runtime.globals.delete('__mosaic_code');
    runtime.globals.delete('__mosaic_input_json');
    self.postMessage({ id, ok: true, payload: JSON.parse(value) });
  } catch (error) {
    try { pyodide?.globals.delete('__mosaic_code'); } catch (_) {}
    try { pyodide?.globals.delete('__mosaic_input_json'); } catch (_) {}
    self.postMessage({ id, ok: false, error: String(error && error.stack ? error.stack : error) });
  }
}

self.onmessage = (event) => {
  queue = queue.then(() => execute(event), () => execute(event));
};
