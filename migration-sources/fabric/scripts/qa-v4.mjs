import fs from 'node:fs';

const checks = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('src/App.tsx');
const pipeline = read('src/components/PipelineStudio.tsx');
const graph = read('src/graph-engine/LearningGraph.tsx');
const props = read('src/components/PropertiesPanel.tsx');
const monitor = read('src/components/MonitorView.tsx');
const output = read('src/components/RunOutput.tsx');
const engine = read('src/lib/pipeline.ts');
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
assert('Graph supports node and edge selection', graph.includes('onEdgeClick') && graph.includes('selectedEdgeId'));
assert('Graph supports node context menu', graph.includes('onNodeContextMenu'));
assert('Graph supports keyboard deletion', graph.includes("deleteKeyCode={['Backspace', 'Delete']}"));
assert('Graph includes zoom controls and minimap', graph.includes('<Controls') && graph.includes('<MiniMap'));
assert('Pipeline has undo/redo', pipeline.includes('const undo =') && pipeline.includes('const redo ='));
assert('Pipeline supports palette drag-drop', pipeline.includes('onDropAdd'));
assert('Pipeline has collapsible authoring panes', pipeline.includes('paletteOpen') && pipeline.includes('propertiesOpen') && pipeline.includes('tutorialOpen'));
assert('Pipeline has node context actions', pipeline.includes('Duplicate activity') && pipeline.includes('Reset run status'));
assert('Pipeline schedule editor is wired', pipeline.includes('ScheduleDialog') && fs.existsSync('src/components/ScheduleDialog.tsx'));
assert('Dependency conditions are editable', props.includes('Dependency condition') && props.includes('Completed') && props.includes('Skipped'));
assert('Debug failure simulation exists', props.includes('Simulate failure in Debug') && engine.includes('simulateFailure'));
assert('Debug engine understands dependency outcomes', engine.includes('dependencyMatches') && engine.includes('buildDebugPlan'));
assert('Validation detects dependency cycles', engine.includes('hasDependencyCycle') && engine.includes('dependency cycle'));
assert('Run output shows live debugging states', output.includes('debugging') && output.includes('Waiting for dependencies'));
assert('Monitor filters runs', monitor.includes('const filtered = useMemo'));
assert('Monitor exports CSV', monitor.includes('pipeline-runs.csv') && monitor.includes('createObjectURL'));
assert('Monitor expands activity details', monitor.includes('View details') && monitor.includes('monitor-run-details'));
assert('ADF Mapping Data Flow uses LearningGraph', mapping.includes('<LearningGraph'));
assert('Fabric Eventstream uses LearningGraph', realtime.includes('<LearningGraph'));
assert('Databricks Lakeflow surfaces use LearningGraph', (dbx.match(/<LearningGraph/g) ?? []).length >= 2);
assert('Power BI remains placeholder only', app.includes("case 'powerbi-placeholder'") && app.includes('reserved for the next pass'));
assert('Three Fabric case studies retained', (cases.match(/difficulty:/g) ?? []).length >= 3);
assert('Fabric curriculum retained', curriculum.includes('fabricModules'));
assert('Databricks curriculum retained', curriculum.includes('databricksModules'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} V4 static QA checks passed.`);
if (failed.length) process.exit(1);
