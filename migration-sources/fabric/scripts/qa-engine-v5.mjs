import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp = path.resolve('.qa-engine-v5');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });

const compile = spawnSync('tsc', [
  'src/types/app.ts', 'src/lib/expressions.ts', 'src/lib/pipeline.ts',
  '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
  '--outDir', temp, '--esModuleInterop', '--skipLibCheck', '--strict'
], { encoding: 'utf8' });

if (compile.status !== 0) {
  console.error(compile.stdout || compile.stderr);
  fs.rmSync(temp, { recursive: true, force: true });
  process.exit(1);
}
fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const expressions = require(path.join(temp, 'lib/expressions.js'));
const pipeline = require(path.join(temp, 'lib/pipeline.js'));
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

const parameters = [{ id: 'p1', name: 'batch_date', type: 'String', defaultValue: '2026-09-16' }];
const variables = [{ id: 'v1', name: 'run_mode', type: 'String', defaultValue: 'incremental', currentValue: 'full' }];
const lookup = { id: 'l1', type: 'lookup', name: 'Lookup_Watermarks', x: 0, y: 0, status: 'Not run', config: { connection: 'Fabric Warehouse', query: 'select 1' } };
const context = { parameters, variables, nodes: [lookup] };

check('Parameter expression resolves', expressions.evaluateExpression('@pipeline().parameters.batch_date', context) === '2026-09-16');
check('Variable expression resolves current value', expressions.evaluateExpression("@variables('run_mode')", context) === 'full');
check('Lookup output expression resolves array', Array.isArray(expressions.evaluateExpression("@activity('Lookup_Watermarks').output.value", context)));
check('greater() expression resolves boolean', expressions.evaluateExpression('@greater(0.91, 0.8)', context) === true);
check('Unknown expression syntax is rejected', expressions.expressionLooksValid('@bogus(1)') === false);

const foreach = { id: 'f1', type: 'foreach', name: 'Loop', x: 0, y: 0, status: 'Not run', config: { items: "@activity('Lookup_Watermarks').output.value", sequential: false, batchCount: 4, innerActivities: 'Copy data|Notebook' } };
const foreachProblems = pipeline.validatePipeline([lookup, foreach], [{ id: 'e', from: 'l1', to: 'f1', condition: 'Succeeded' }], parameters, variables);
check('ForEach dynamic-content pipeline validates', foreachProblems.length === 0, foreachProblems.join('; '));

const missingParam = { id: 's1', type: 'script', name: 'Script', x: 0, y: 0, status: 'Not run', config: { script: '@pipeline().parameters.missing' } };
check('Missing parameter reference is detected', pipeline.validatePipeline([missingParam], [], parameters, variables).some((problem) => problem.includes('missing pipeline parameter')));

const fakeCase = { id: 'demo', title: 'Demo', subtitle: '', industry: '', difficulty: 'Beginner', duration: '', purpose: '', scenario: '', learningGoals: [], tools: [], architecture: [], tables: [], notebook: [], storedProcedure: '', storedProcedureName: '', steps: [] };
const ifNode = { id: 'i1', type: 'if', name: 'RiskGate', x: 0, y: 0, status: 'Not run', config: { expression: '@greater(0.91, 0.8)', trueActivities: 'Stored procedure|Web', falseActivities: 'Wait' } };
const run = pipeline.createRun(fakeCase, 'fabric', [foreach, ifNode], undefined, parameters, variables);
check('ForEach output reports nested execution', run.activities[0].output.includes('2 inner activities'));
check('If output selects true branch', run.activities[1].output.includes('True') && run.activities[1].output.includes('2 nested'));

const runtimeVariables = [
  { id: 'mode', name: 'run_mode', type: 'String', defaultValue: 'incremental', currentValue: 'incremental' },
  { id: 'arr', name: 'audit', type: 'Array', defaultValue: '[]', currentValue: '[]' }
];
const setNode = { id: 'sv', type: 'setVariable', name: 'Set_Mode', x: 0, y: 0, status: 'Not run', config: { variableName: 'run_mode', value: 'full' } };
const appendNode = { id: 'av', type: 'appendVariable', name: 'Append_Audit', x: 0, y: 0, status: 'Not run', config: { variableName: 'audit', value: '@pipeline().parameters.batch_date' } };
const variableStatuses = new Map([['sv', 'Succeeded'], ['av', 'Succeeded']]);
const mutated = pipeline.applyVariableActivities([setNode, appendNode], variableStatuses, parameters, runtimeVariables);
check('Set Variable mutates current value', mutated.find((item) => item.name === 'run_mode')?.currentValue === 'full');
check('Append Variable appends evaluated value', mutated.find((item) => item.name === 'audit')?.currentValue.includes('2026-09-16'));
const badAppend = { id: 'bad-av', type: 'appendVariable', name: 'Bad_Append', x: 0, y: 0, status: 'Not run', config: { variableName: 'run_mode', value: 'x' } };
check('Append Variable rejects non-array variable', pipeline.validatePipeline([badAppend], [], parameters, runtimeVariables).some((problem) => problem.includes('requires an Array variable')));

const untilNode = { id: 'u1', type: 'until', name: 'Until_Done', x: 0, y: 0, status: 'Not run', config: { expression: '@equals(1, 1)', timeout: '00:10:00', innerActivities: 'Set variable' } };
check('Until configuration validates', pipeline.validatePipeline([untilNode], [], parameters, runtimeVariables).length === 0);

const a = { id: 'a', type: 'wait', name: 'A', x: 0, y: 0, status: 'Not run', config: { seconds: 1, simulateFailure: true } };
const b = { id: 'b', type: 'wait', name: 'B', x: 0, y: 0, status: 'Not run', config: { seconds: 1 } };
const c = { id: 'c', type: 'wait', name: 'C', x: 0, y: 0, status: 'Not run', config: { seconds: 1 } };
const plan = pipeline.buildDebugPlan([a, b, c], [{ id: 'ab', from: 'a', to: 'b', condition: 'Succeeded' }, { id: 'ac', from: 'a', to: 'c', condition: 'Failed' }]);
const byId = Object.fromEntries(plan.map((step) => [step.nodeId, step.finalStatus]));
check('Failure branch dependency semantics retained', byId.a === 'Failed' && byId.b === 'Skipped' && byId.c === 'Succeeded', JSON.stringify(byId));

const cyclic = pipeline.validatePipeline([a, b], [{ id: 'ab', from: 'a', to: 'b', condition: 'Succeeded' }, { id: 'ba', from: 'b', to: 'a', condition: 'Succeeded' }]);
check('Cycle detection retained', cyclic.some((problem) => problem.includes('dependency cycle')));

const failed = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` :: ${result.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} V5 engine smoke tests passed.`);
fs.rmSync(temp, { recursive: true, force: true });
if (failed.length) process.exit(1);
