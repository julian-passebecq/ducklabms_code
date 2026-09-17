import fs from 'node:fs';

const files = {
  pkg: fs.readFileSync('package.json', 'utf8'),
  pipeline: fs.readFileSync('src/lib/pipeline.ts', 'utf8'),
  expressions: fs.readFileSync('src/lib/expressions.ts', 'utf8'),
  triggers: fs.readFileSync('src/lib/triggers.ts', 'utf8'),
  studio: fs.readFileSync('src/components/PipelineStudio.tsx', 'utf8'),
  properties: fs.readFileSync('src/components/PropertiesPanel.tsx', 'utf8'),
  diagnostics: fs.readFileSync('src/components/ActivityDiagnostics.tsx', 'utf8'),
  output: fs.readFileSync('src/components/RunOutput.tsx', 'utf8'),
  monitor: fs.readFileSync('src/components/MonitorView.tsx', 'utf8'),
  schedule: fs.readFileSync('src/components/ScheduleDialog.tsx', 'utf8'),
  storage: fs.readFileSync('src/lib/storage.ts', 'utf8'),
  cases: fs.readFileSync('src/data/caseStudies.ts', 'utf8'),
};
const results=[];
const check=(name, ok)=>results.push({name,ok:Boolean(ok)});
const has=(text, ...parts)=>parts.every((part)=>text.includes(part));

check('Activity diagnostics component exists', has(files.diagnostics,'export function ActivityDiagnostics','attempts','metrics'));
check('Run output uses activity diagnostics', has(files.output,'ActivityDiagnostics'));
check('Monitor uses activity diagnostics', has(files.monitor,'ActivityDiagnostics'));
check('Monitor Gantt uses dependency-aware start offsets', has(files.monitor,'startOffsetMs'));
check('Copy diagnostics expose rows and transfer metrics', has(files.diagnostics,'rowsRead','dataReadBytes','throughputMBps','parallelCopies'));
check('Activity policy exposes retry interval', has(files.properties,'Retry interval (seconds)','retryIntervalSeconds'));
check('Activity policy exposes secure input/output', has(files.properties,'Secure input','Secure output','secureInput','secureOutput'));
check('Lookup editor supports query/stored procedure/table', has(files.properties,'lookupMode','Stored procedure','Table','First row only'));
check('Stored procedure editor supports parameter JSON', has(files.properties,'parametersJson','Import sample','Stored procedure'));
check('Script editor supports external logging', has(files.properties,'External store','logDestination','logPath'));
check('Invoke Pipeline editor supports target and parameter mapping', has(files.properties,'invokeSource','authenticationKind','workspace','waitOnCompletion','parametersJson'));
check('Fabric and ADF trigger kinds are distinct', has(files.triggers,"'Fixed schedule', 'Interval schedule', 'Event'","'Schedule', 'Tumbling window', 'Event'"));
check('Trigger editor can test a trigger', has(files.schedule,'Test trigger','onTest'));
check('Pipeline launches trigger test as a simulated run', has(files.studio,'applyTriggerParameterValues','triggerSummary','onTest'));
check('Trigger parameters are validated', has(files.triggers,'Trigger parameter','does not match a pipeline parameter'));
check('Trigger-event expressions are supported', has(files.expressions,'TriggerEvent?.FileName','TriggerEvent?.FolderPath'));
check('Tumbling-window expressions are supported', has(files.expressions,'windowStartTime','windowEndTime'));
check('ForEach item property expressions are supported', has(files.expressions,'@item().last_successful_ts','itemFieldMatch'));
check('Runtime expression validation checks missing activities', has(files.pipeline,"references missing ${kind}","'activity'"));
check('Runtime expression validation scans nested JSON mappings', has(files.pipeline,'nestedExpressionStrings','parameter mapping'));
check('Debug run tracks attempts', has(files.pipeline,'attempts','retry + 1'));
check('Debug run tracks secure payload flags', has(files.pipeline,'secureInput','secureOutput'));
check('Debug run computes dependency-aware start offsets', has(files.pipeline,'startOffsetsFor','startOffsetMs'));
check('Debug run exposes Copy performance metrics', has(files.pipeline,'throughputMBps','queueMs','transferMs'));
check('Storage migrates richer run diagnostics', has(files.storage,'startOffsetMs','attempts','secureInput','metrics'));
check('Retail case study uses real batch_date parameter', files.cases.includes('@pipeline().parameters.batch_date') && !files.cases.includes('@pipeline().parameters.p_batch_date'));
check('Turbine solution references named scoring activity', has(files.cases,'Score_Turbine_Risk','output.maxRisk','output.turbine_id'));
check('If/ForEach runtime uses full activity graph', has(files.pipeline,'{ parameters, variables, nodes }'));

const failed=results.filter((r)=>!r.ok);
for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}`);
console.log(`\n${results.length-failed.length}/${results.length} V6 static/depth QA checks passed.`);
if(failed.length) process.exit(1);
