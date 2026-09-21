import type {ArtifactBundle, DbtNode, DbtResult, Graph, ProjectFile} from './types.ts';
import {array, finite, optionalString, record, safeJson, string, unique} from './validation.ts';
const SUPPORTED_MANIFESTS = new Set([9, 10, 11, 12]);
function schemaVersion(meta: Record<string, unknown>, artifact: string): number {
  const url = string(meta.dbt_schema_version, 'artifact schema', 240);
  const match = url.match(new RegExp(`^https://schemas\\.getdbt\\.com/dbt/${artifact}/v(\\d+)\\.json$`));
  if (!match) throw new Error(`This is not a dbt ${artifact} artifact.`);
  return Number(match[1]);
}
export function importManifest(text: string): ArtifactBundle {
  const root = record(safeJson(text), 'manifest'), meta = record(root.metadata, 'manifest metadata');
  const schema = schemaVersion(meta, 'manifest');
  if (!SUPPORTED_MANIFESTS.has(schema)) throw new Error(`Manifest v${schema} is not qualified. Supported: v9-v12. Existing project retained.`);
  const sources = root.sources == null ? {} : record(root.sources, 'sources');
  const rawNodes = {...record(root.nodes, 'nodes')};
  for (const [id, value] of Object.entries(sources)) {if (Object.hasOwn(rawNodes, id)) throw new Error('Duplicate source/node identity.'); rawNodes[id] = value;}
  if (Object.keys(rawNodes).length > 400) throw new Error('This UI import is bounded to 400 nodes, including tests and sources.');
  const nodes: DbtNode[] = Object.entries(rawNodes).map(([key, value]) => {
    const n = record(value, 'manifest node'); const id = string(n.unique_id, 'node identity', 500);
    if (id !== key) throw new Error('Manifest node key and unique_id do not match.');
    const dependencies = n.depends_on == null ? [] : array(record(n.depends_on).nodes ?? [], 'dependencies', 400).map(d => string(d, 'dependency', 500));
    unique(dependencies, 'dependencies');
    const cols = n.columns == null ? {} : record(n.columns, 'columns');
    if (Object.keys(cols).length > 250) throw new Error('Too many columns in one node.');
    const columns = Object.entries(cols).map(([name, value]) => {const c = record(value); return {name: string(c.name ?? name, 'column name', 200), type: optionalString(c.data_type, 100), description: optionalString(c.description)};});
    const config = n.config == null ? {} : record(n.config);
    return {id, name: string(n.name, 'node name', 250), kind: string(n.resource_type, 'resource type', 50), path: optionalString(n.original_file_path, 500)?.replace(/\\/g, '/'), description: optionalString(n.description, 20_000), materialization: optionalString(config.materialized, 80), dependencies, columns, source: optionalString(n.raw_code ?? n.raw_sql, 100_000), compiled: optionalString(n.compiled_code ?? n.compiled_sql, 100_000)};
  });
  const ids = new Set(nodes.map(n => n.id)), warnings: string[] = [];
  for (const n of nodes) for (const d of n.dependencies) if (!ids.has(d)) warnings.push(`${n.name}: unresolved dependency ${d}.`);
  if (nodes.reduce((sum, n) => sum + n.dependencies.length, 0) > 3000) throw new Error('Too many lineage edges.');
  return {schema, projectName: optionalString(meta.project_name, 200) || 'Imported project', generatedAt: optionalString(meta.generated_at, 100), invocationId: optionalString(meta.invocation_id, 100), nodes, results: [], warnings, provenance: 'imported-dbt-artifact'};
}
export function attachRunResults(bundle: ArtifactBundle, text: string): ArtifactBundle {
  const root = record(safeJson(text), 'run results'), meta = record(root.metadata, 'run metadata');
  const schema = schemaVersion(meta, 'run-results');
  if (![4, 5, 6].includes(schema)) throw new Error(`Run-results v${schema} is not qualified (v4-v6 supported).`);
  const invocation = optionalString(meta.invocation_id, 100);
  // Evidence cannot be silently applied to another manifest invocation.
  if (!invocation || !bundle.invocationId || invocation !== bundle.invocationId) throw new Error('Run results and manifest must have the same invocation_id. Import the matching manifest first.');
  const ids = new Set(bundle.nodes.map(n => n.id));
  const results: DbtResult[] = array(root.results, 'results', 400).map(value => {
    const r = record(value); const id = string(r.unique_id, 'result identity', 500);
    if (!ids.has(id)) throw new Error(`Result does not belong to this manifest: ${id}.`);
    return {id, status: string(r.status, 'status', 100), seconds: r.execution_time == null ? null : finite(r.execution_time, 'duration', 0, 1e9), message: optionalString(r.message, 10_000), failures: r.failures == null ? null : finite(r.failures, 'failure count', 0, 1e12)};
  });
  unique(results.map(r => r.id), 'result identity');
  return {...bundle, results, resultInvocationId: invocation, resultGeneratedAt: optionalString(meta.generated_at, 100)};
}
export function manifestGraph(bundle: ArtifactBundle, includeTests = false): Graph {
  const selected = bundle.nodes.filter(n => includeTests || !['test', 'unit_test'].includes(n.kind));
  const ids = new Set(selected.map(n => n.id));
  return {origin: 'imported-manifest', nodes: selected.map(n => ({id: n.id, label: n.name, kind: n.kind, detail: n.materialization || n.kind})), edges: selected.flatMap(n => n.dependencies.filter(d => ids.has(d)).map(d => ({id: `${d}->${n.id}`, from: d, to: n.id}))), warnings: bundle.warnings};
}
/** Conservative literal ref/source scanner, NOT Jinja compilation or general SQL lineage. */
export function draftGraph(files: ProjectFile[]): Graph {
  const models = files.filter(f => /^(models|snapshots|seeds)\//.test(f.path) && /\.(sql|csv)$/.test(f.path));
  const nodes = models.map(f => ({id: f.path, label: f.path.split('/').at(-1)!.replace(/\.(sql|csv)$/, ''), kind: f.path.startsWith('seeds/') ? 'seed' : f.path.startsWith('snapshots/') ? 'snapshot' : 'model', detail: f.path}));
  const byName = new Map<string, string[]>(); nodes.forEach(n => byName.set(n.label, [...(byName.get(n.label) ?? []), n.id]));
  const edges: Graph['edges'] = [], warnings = new Set<string>();
  for (const file of models) {
    const code = file.source.replace(/\{#[\s\S]*?#\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
    const calls = [...code.matchAll(/\{\{\s*(ref|source)\s*\(([^)]*)\)\s*\}\}/g)];
    if (/\{%/.test(code)) warnings.add('Control-flow macros are not expanded. Import a dbt manifest for resolved lineage.');
    for (const match of calls) {
      const args = [...match[2].matchAll(/(['"])([^'"]+)\1/g)].map(m => m[2]);
      const literal = /^\s*(['"])[A-Za-z_][A-Za-z0-9_.-]*\1\s*(,\s*(['"])[A-Za-z_][A-Za-z0-9_.-]*\3\s*)?$/.test(match[2]);
      if (!literal) {warnings.add(`${file.path}: dynamic ${match[1]} is unresolved.`); continue;}
      let dependency = '';
      if (match[1] === 'source' && args.length === 2) {
        dependency = `source:${args[0]}.${args[1]}`;
        if (!nodes.some(n => n.id === dependency)) nodes.push({id: dependency, label: args.join('.'), kind: 'source', detail: 'Literal source reference; definition not validated'});
      } else if (match[1] === 'ref' && args.length === 1) {
        const found = byName.get(args[0]) ?? [];
        if (found.length === 1) dependency = found[0];
        else {
          dependency = `unresolved:${args[0]}`;
          if (!nodes.some(n => n.id === dependency)) nodes.push({id: dependency, label: args[0], kind: 'unresolved', detail: 'Missing or ambiguous ref'});
          warnings.add(`${file.path}: ${args[0]} is missing or ambiguous.`);
        }
      } else {warnings.add(`${file.path}: package/versioned reference requires dbt parse.`); continue;}
      const id = `${dependency}->${file.path}`;
      if (!edges.some(e => e.id === id)) edges.push({id, from: dependency, to: file.path});
    }
  }
  const graph: Graph = {origin: 'draft-reference-scan', nodes, edges, warnings: [...warnings]};
  if (cyclicNodes(graph).length) graph.warnings.push('Dependency cycle found. dbt must validate the project before execution.');
  return graph;
}
export function cyclicNodes(graph: Graph): string[] {
  const indegree = new Map(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) if (indegree.has(e.to) && indegree.has(e.from)) indegree.set(e.to, indegree.get(e.to)! + 1);
  const ready = [...indegree].filter(([,d]) => d === 0).map(([id]) => id);
  while (ready.length) {const id = ready.shift()!; for (const e of graph.edges.filter(e => e.from === id)) {const degree = (indegree.get(e.to) ?? 1) - 1; indegree.set(e.to, degree); if (degree === 0) ready.push(e.to);}}
  return [...indegree].filter(([,d]) => d > 0).map(([id]) => id);
}
export function graphLevels(graph: Graph): Map<string, number> {
  const levels = new Map(graph.nodes.map(n => [n.id, 0]));
  if (cyclicNodes(graph).length) {graph.nodes.forEach((n, i) => levels.set(n.id, i % 3)); return levels;}
  for (let i = 0; i < graph.nodes.length; i++) {let changed = false; for (const edge of graph.edges) {
    if (!levels.has(edge.from) || !levels.has(edge.to)) continue;
    const next = levels.get(edge.from)! + 1;
    if (next > levels.get(edge.to)!) {levels.set(edge.to, next); changed = true;}
  } if (!changed) break;}
  return levels;
}
export function relatedNodes(graph: Graph, selected: string, direction: 'upstream' | 'downstream'): Set<string> {
  const found = new Set([selected]), todo = [selected];
  while (todo.length) {const id = todo.pop()!; for (const edge of graph.edges) {
    const next = direction === 'upstream' ? edge.to === id ? edge.from : null : edge.from === id ? edge.to : null;
    if (next && !found.has(next)) {found.add(next); todo.push(next);}
  }} return found;
}
