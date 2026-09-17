import fs from 'node:fs';

const checks = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('src/App.tsx');
const pipeline = read('src/components/PipelineStudio.tsx');
const graph = read('src/graph-engine/LearningGraph.tsx');
const mapping = read('src/components/AzureMappingDataFlowStudio.tsx');
const realtime = read('src/components/FabricRealTimeStudio.tsx');
const dbx = read('src/components/DatabricksStudios.tsx');
const cases = read('src/data/caseStudies.ts');
const curriculum = read('src/data/curriculum.ts');

function assert(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
  if (!condition) process.exitCode = 1;
}

assert('Fluent UI dependency declared', Boolean(pkg.dependencies['@fluentui/react-components']));
assert('XYFlow dependency declared', Boolean(pkg.dependencies['@xyflow/react']));
assert('FluentProvider wraps application', app.includes('FluentProvider'));
assert('Shared LearningGraph exists', graph.includes('export function LearningGraph'));
assert('Graph supports drag/drop', graph.includes('onDropPayload') && graph.includes('screenToFlowPosition'));
assert('Graph supports connections', graph.includes('onConnect={handleConnect}'));
assert('Graph supports keyboard deletion', graph.includes("deleteKeyCode={['Backspace', 'Delete']}"));
assert('Graph includes zoom controls', graph.includes('<Controls'));
assert('Graph includes minimap', graph.includes('<MiniMap'));
assert('Pipeline has undo/redo', pipeline.includes('const undo =') && pipeline.includes('const redo ='));
assert('Pipeline supports palette drag-drop', pipeline.includes('onDropAdd'));
assert('ADF Mapping Data Flow uses LearningGraph', mapping.includes('<LearningGraph'));
assert('Fabric Eventstream uses LearningGraph', realtime.includes('<LearningGraph'));
assert('Databricks Lakeflow surfaces use LearningGraph', (dbx.match(/<LearningGraph/g) ?? []).length >= 2);
assert('Power BI remains placeholder only', app.includes("case 'powerbi-placeholder'") && app.includes('reserved for the next pass'));
assert('Three Fabric case studies retained', (cases.match(/difficulty:/g) ?? []).length >= 3);
assert('Fabric curriculum retained', curriculum.includes('fabricModules'));
assert('Databricks curriculum retained', curriculum.includes('databricksModules'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} V3 static QA checks passed.`);
if (failed.length) process.exit(1);
