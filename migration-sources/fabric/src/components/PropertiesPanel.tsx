import { Button, Checkbox, Dropdown, Field as FluentField, Input, Option, Tab, TabList, Textarea } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import type { Experience, PipelineEdge, PipelineNode, PipelineParameter, PipelineVariable } from '../types/app';
import { ExpressionBuilder } from './ExpressionBuilder';
import { CopyMappingEditor } from './CopyMappingEditor';
import { NestedActivityEditor } from './NestedActivityEditor';
import { nestedActivityChoices, parseNestedActivities, serializeNestedActivities } from '../lib/nestedActivities';

type ConfigValue = string | number | boolean;
type ExpressionTarget = { key: string; label: string; value: string } | null;
type NestedTarget = { key: 'innerActivities' | 'trueActivities' | 'falseActivities'; label: string } | null;

function Field({ label, value, type = 'text', onChange, onExpression, placeholder }: { label: string; value: ConfigValue; type?: 'text' | 'number' | 'boolean' | 'textarea'; onChange: (v: ConfigValue) => void; onExpression?: () => void; placeholder?: string }) {
  if (type === 'boolean') {
    return <FluentField label={label} className="form-field fluent-form-field"><Checkbox checked={Boolean(value)} onChange={(_, data) => onChange(Boolean(data.checked))} label={Boolean(value) ? 'Enabled' : 'Disabled'} /></FluentField>;
  }
  const control = type === 'textarea'
    ? <Textarea resize="vertical" placeholder={placeholder} value={String(value)} onChange={(_, data) => onChange(data.value)} />
    : <Input type={type === 'number' ? 'number' : 'text'} placeholder={placeholder} value={String(value)} onChange={(_, data) => onChange(type === 'number' ? Number(data.value) : data.value)} />;
  return <FluentField label={label} className="form-field fluent-form-field"><div className={`property-input-wrap ${onExpression ? 'has-expression' : ''}`}>{control}{onExpression && <Button appearance="subtle" size="small" className="fx-button" onClick={onExpression}>fx</Button>}</div></FluentField>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <FluentField label={label} className="form-field fluent-form-field"><Dropdown value={value} selectedOptions={[value]} onOptionSelect={(_, data) => onChange(String(data.optionValue ?? ''))}>{options.map((option) => <Option key={option} value={option}>{option}</Option>)}</Dropdown></FluentField>;
}

function ContainerSequence({ title, subtitle, value, onChange, onOpen }: { title: string; subtitle: string; value: string; onChange: (value: string) => void; onOpen?: () => void }) {
  const items = parseNestedActivities(value);
  const add = (type: string) => {
    const choice = nestedActivityChoices.find((item) => item.type === type);
    if (!choice) return;
    onChange(serializeNestedActivities([...items, { id: `nested-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: choice.type, name: choice.label, x: 60 + items.length * 220, y: 120 }]));
  };
  const remove = (index: number) => onChange(serializeNestedActivities(items.filter((_, i) => i !== index)));
  const move = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((item, itemIndex) => { item.x = 60 + itemIndex * 220; });
    onChange(serializeNestedActivities(next));
  };
  return <section className="container-sequence">
    <div className="container-sequence-heading"><div><strong>{title}</strong><span>{subtitle}</span></div><div className="container-sequence-actions">{onOpen && <Button appearance="secondary" size="small" onClick={onOpen}>✎ Edit activities</Button>}<Dropdown placeholder="+ Add activity" onOptionSelect={(_, data) => data.optionValue && add(String(data.optionValue))}>{nestedActivityChoices.map((item) => <Option key={item.type} value={item.type}>{item.label}</Option>)}</Dropdown></div></div>
    <div className="container-mini-canvas">{items.length ? items.map((item, index) => <div className="container-mini-step" key={item.id}><span>{index + 1}</span><strong>{item.name}</strong><div className="container-step-actions"><button disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button><button onClick={() => remove(index)}>×</button></div>{index < items.length - 1 && <i>→</i>}</div>) : <div className="container-empty">Drop/add child activities here. They execute inside this container rather than on the parent pipeline canvas.</div>}</div>
  </section>;
}

function JsonHint({ value, expected }: { value: unknown; expected: 'array' | 'object' }) {
  let valid = true;
  try {
    const parsed = JSON.parse(String(value || (expected === 'array' ? '[]' : '{}')));
    valid = expected === 'array' ? Array.isArray(parsed) : Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch { valid = false; }
  return <div className={`json-hint ${valid ? 'valid' : 'invalid'}`}>{valid ? `✓ Valid JSON ${expected}` : `✕ Expected a JSON ${expected}`}</div>;
}

export function PropertiesPanel({ experience, node, edge, nodes, parameters, variables, onChange, onEdgeChange, onDelete, onDeleteEdge, onOpenNotebook, onOpenDataflow, onOpenSql }: {
  experience: Experience;
  node: PipelineNode | null;
  edge: PipelineEdge | null;
  nodes: PipelineNode[];
  parameters: PipelineParameter[];
  variables: PipelineVariable[];
  onChange: (node: PipelineNode) => void;
  onEdgeChange: (edge: PipelineEdge) => void;
  onDelete: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onOpenNotebook: () => void;
  onOpenDataflow: () => void;
  onOpenSql: () => void;
}) {
  const [tab, setTab] = useState<'General' | 'Settings' | 'Policy' | 'User properties'>('Settings');
  const [copyTab, setCopyTab] = useState<'Source' | 'Sink' | 'Mapping' | 'Settings'>('Source');
  const [expressionTarget, setExpressionTarget] = useState<ExpressionTarget>(null);
  const [nestedTarget, setNestedTarget] = useState<NestedTarget>(null);
  const expressionContext = useMemo(() => ({ parameters, variables, nodes }), [parameters, variables, nodes]);

  if (edge) {
    const from = nodes.find((candidate) => candidate.id === edge.from)?.name ?? edge.from;
    const to = nodes.find((candidate) => candidate.id === edge.to)?.name ?? edge.to;
    return <aside className="properties-panel fluent-pane dependency-properties">
      <div className="properties-title-row"><div><span className="eyebrow">Dependency</span><strong>{from} → {to}</strong></div><Button appearance="subtle" size="small" className="danger-icon" onClick={() => onDeleteEdge(edge.id)}>Delete</Button></div>
      <div className="properties-scroll"><FluentField label="Dependency condition" className="form-field fluent-form-field"><Dropdown value={edge.condition} selectedOptions={[edge.condition]} onOptionSelect={(_, data) => onEdgeChange({ ...edge, condition: data.optionValue as PipelineEdge['condition'] })}><Option value="Succeeded">Succeeded</Option><Option value="Failed">Failed</Option><Option value="Completed">Completed</Option><Option value="Skipped">Skipped</Option></Dropdown></FluentField><div className="dependency-condition-guide"><strong>Execution rule</strong><span>Succeeded follows the happy path. Failed creates an error path. Completed runs after success or failure. Skipped follows a skipped upstream branch.</span></div></div>
    </aside>;
  }

  if (!node) return <aside className="properties-panel fluent-pane"><div className="empty-pane">Select an activity or dependency to configure it.</div></aside>;

  const updateConfig = (key: string, value: ConfigValue) => onChange({ ...node, config: { ...node.config, [key]: value } });
  const openExpression = (key: string, label: string) => setExpressionTarget({ key, label, value: String(node.config[key] ?? '') });
  const policyKeys = new Set(['description', 'timeout', 'retry', 'retryIntervalSeconds', 'retryIntervalType', 'maxRetryIntervalSeconds', 'retryConditionField', 'retryConditionOperator', 'retryConditionValue', 'secureInput', 'secureOutput', 'simulateFailure', 'simulateFailureType', 'simulateErrorCode', 'simulateErrorMessage']);
  const specialKeys = new Set(['sourceQuery', 'sourceFormat', 'sinkFormat', 'mapping', 'parallelCopies', 'preCopyScript', 'innerActivities', 'trueActivities', 'falseActivities', 'lookupMode', 'storedProcedure', 'table', 'firstRowOnly', 'parametersJson', 'logDestination', 'logPath', 'invokeSource', 'authenticationKind', 'connection', 'workspace', 'pipeline', 'waitOnCompletion', 'procedure', 'project', 'command', 'target', 'select', 'exclude', 'fullRefresh', 'failFast', 'threads', 'variables']);
  const genericFields = Object.entries(node.config).filter(([key]) => !policyKeys.has(key) && !specialKeys.has(key));
  const expressionKeys = new Set(['source', 'destination', 'query', 'items', 'expression', 'parameters', 'parameter', 'value', 'url', 'body', 'watermarkValue', 'script']);

  const copySettings = node.type === 'copy' && <>
    <TabList className="copy-settings-tabs" selectedValue={copyTab} onTabSelect={(_, data) => setCopyTab(data.value as typeof copyTab)} size="small"><Tab value="Source">Source</Tab><Tab value="Sink">Sink</Tab><Tab value="Mapping">Mapping</Tab><Tab value="Settings">Settings</Tab></TabList>
    {copyTab === 'Source' && <div className="copy-tab-content"><Field label="Source" value={String(node.config.source ?? '')} onChange={(v) => updateConfig('source', v)} onExpression={() => openExpression('source', 'Source')} /><Field label="Source query" value={String(node.config.sourceQuery ?? '')} type="textarea" onChange={(v) => updateConfig('sourceQuery', v)} onExpression={() => openExpression('sourceQuery', 'Source query')} /><Field label="Source format" value={String(node.config.sourceFormat ?? 'Auto')} onChange={(v) => updateConfig('sourceFormat', v)} /></div>}
    {copyTab === 'Sink' && <div className="copy-tab-content"><Field label="Destination" value={String(node.config.destination ?? '')} onChange={(v) => updateConfig('destination', v)} onExpression={() => openExpression('destination', 'Destination')} /><Field label="Sink format" value={String(node.config.sinkFormat ?? 'Delta')} onChange={(v) => updateConfig('sinkFormat', v)} /><Field label="Write behavior" value={String(node.config.writeMode ?? 'Append')} onChange={(v) => updateConfig('writeMode', v)} /><Field label="Pre-copy script" value={String(node.config.preCopyScript ?? '')} type="textarea" onChange={(v) => updateConfig('preCopyScript', v)} /></div>}
    {copyTab === 'Mapping' && <div className="copy-tab-content"><CopyMappingEditor value={String(node.config.mapping ?? 'Auto map by name')} source={String(node.config.source ?? '')} destination={String(node.config.destination ?? '')} onChange={(value) => updateConfig('mapping', value)} /><div className="property-note">Import mock schemas, inspect source/destination data types, enable auto mapping, or build manual mappings before running Debug.</div></div>}
    {copyTab === 'Settings' && <div className="copy-tab-content"><Field label="Parallel copies" value={Number(node.config.parallelCopies ?? 4)} type="number" onChange={(v) => updateConfig('parallelCopies', v)} /><div className="property-note">Runtime policy such as retry, timeout and secure input/output moved to the Policy tab, matching the way execution concerns are separated from source/sink configuration.</div></div>}
  </>;

  const lookupSettings = node.type === 'lookup' && <div className="activity-specific-settings">
    <Field label="Connection" value={String(node.config.connection ?? '')} onChange={(v) => updateConfig('connection', v)} />
    <SelectField label="Lookup source" value={String(node.config.lookupMode ?? 'Query')} options={['Query', 'Stored procedure', 'Table']} onChange={(v) => updateConfig('lookupMode', v)} />
    {String(node.config.lookupMode ?? 'Query') === 'Query' && <Field label="Query" value={String(node.config.query ?? '')} type="textarea" onChange={(v) => updateConfig('query', v)} onExpression={() => openExpression('query', 'Lookup query')} />}
    {String(node.config.lookupMode) === 'Stored procedure' && <Field label="Stored procedure" value={String(node.config.storedProcedure ?? '')} onChange={(v) => updateConfig('storedProcedure', v)} />}
    {String(node.config.lookupMode) === 'Table' && <Field label="Table" value={String(node.config.table ?? '')} onChange={(v) => updateConfig('table', v)} />}
    <Field label="First row only" value={Boolean(node.config.firstRowOnly)} type="boolean" onChange={(v) => updateConfig('firstRowOnly', v)} />
    <div className="property-note">First row only produces <code>output.firstRow</code>. Returning multiple rows produces <code>output.value</code>, which is commonly consumed by ForEach.</div>
  </div>;

  const storedProcedureSettings = node.type === 'storedProcedure' && <div className="activity-specific-settings">
    <Field label="Connection" value={String(node.config.connection ?? '')} onChange={(v) => updateConfig('connection', v)} />
    <Field label="Stored procedure" value={String(node.config.procedure ?? '')} onChange={(v) => updateConfig('procedure', v)} />
    <div className="inline-heading"><strong>Parameters</strong><Button appearance="subtle" size="small" onClick={() => updateConfig('parametersJson', '[\n  {"name":"batch_date","type":"Date","value":"@pipeline().parameters.batch_date","nullable":false}\n]')}>Import sample</Button></div>
    <Field label="Parameter definitions (JSON)" value={String(node.config.parametersJson ?? (node.config.parameter ? JSON.stringify([{ name: node.config.parameter, type: 'String', value: node.config.value ?? '', nullable: false }], null, 2) : '[]'))} type="textarea" onChange={(v) => updateConfig('parametersJson', v)} />
    <JsonHint value={node.config.parametersJson ?? '[]'} expected="array" />
    <div className="property-note">The simulator models imported/manual parameter name, type, value and nullability. Legacy single-parameter case-study settings still remain compatible.</div>
  </div>;

  const scriptSettings = node.type === 'script' && <div className="activity-specific-settings">
    <Field label="Connection" value={String(node.config.connection ?? '')} onChange={(v) => updateConfig('connection', v)} />
    <Field label="Script" value={String(node.config.script ?? '')} type="textarea" onChange={(v) => updateConfig('script', v)} onExpression={() => openExpression('script', 'Script')} />
    <SelectField label="Log destination" value={String(node.config.logDestination ?? 'Activity output')} options={['Activity output', 'External store']} onChange={(v) => updateConfig('logDestination', v)} />
    {String(node.config.logDestination) === 'External store' && <Field label="Log path" value={String(node.config.logPath ?? '')} onChange={(v) => updateConfig('logPath', v)} />}
    <div className="property-note">Use Activity output for quick diagnostics or an external location when you want durable execution logs in the simulator.</div>
  </div>;

  const dbtSettings = node.type === 'dbt' && <div className="activity-specific-settings">
    <Field label="dbt project" value={String(node.config.project ?? 'dbt_training')} onChange={(v) => updateConfig('project', v)} />
    <SelectField label="Operation" value={String(node.config.command ?? 'dbt build')} options={['dbt build', 'dbt run', 'dbt compile', 'dbt test']} onChange={(v) => updateConfig('command', v)} />
    <Field label="Select" value={String(node.config.select ?? '')} onChange={(v) => updateConfig('select', v)} onExpression={() => openExpression('select', 'dbt Select')} placeholder="model_name or stg_*" />
    <Field label="Exclude" value={String(node.config.exclude ?? '')} onChange={(v) => updateConfig('exclude', v)} onExpression={() => openExpression('exclude', 'dbt Exclude')} placeholder="optional" />
    <Field label="Threads" value={Number(node.config.threads ?? 4)} type="number" onChange={(v) => updateConfig('threads', v)} />
    <Field label="Full refresh" value={Boolean(node.config.fullRefresh)} type="boolean" onChange={(v) => updateConfig('fullRefresh', v)} />
    <Field label="Fail fast" value={Boolean(node.config.failFast)} type="boolean" onChange={(v) => updateConfig('failFast', v)} />
    <Field label="Variables (JSON)" value={String(node.config.variables ?? '{}')} type="textarea" onChange={(v) => updateConfig('variables', v)} onExpression={() => openExpression('variables', 'dbt variables')} />
    <div className="property-note">The learning runtime executes build/run/compile/test against the shared workspace. Fabric-managed dbt compute, authentication and package installation remain simulated.</div>
  </div>;


  const fabricRetryFeatures = experience === 'fabric';
  const conditionalRetrySupported = fabricRetryFeatures && ['copy', 'notebook', 'dataflow', 'storedProcedure'].includes(node.type);
  const policySettings = <>
    <Field label="Timeout" value={String(node.config.timeout ?? '12:00:00')} onChange={(v) => updateConfig('timeout', v)} />
    <Field label="Retry" value={Number(node.config.retry ?? 0)} type="number" onChange={(v) => updateConfig('retry', v)} />
    {Number(node.config.retry ?? 0) > 0 && <>
      {fabricRetryFeatures && <SelectField label="Retry interval type" value={String(node.config.retryIntervalType ?? 'Fixed')} options={['Fixed', 'Increasing Delay']} onChange={(v) => updateConfig('retryIntervalType', v)} />}
      <Field label="Retry interval (seconds)" value={Number(node.config.retryIntervalSeconds ?? 30)} type="number" onChange={(v) => updateConfig('retryIntervalSeconds', v)} />
      {fabricRetryFeatures && String(node.config.retryIntervalType ?? 'Fixed') === 'Increasing Delay' && <Field label="Max retry interval (seconds)" value={Number(node.config.maxRetryIntervalSeconds ?? 3600)} type="number" onChange={(v) => updateConfig('maxRetryIntervalSeconds', v)} />}
      {conditionalRetrySupported && <>
        <SelectField label="Retry condition (preview)" value={String(node.config.retryConditionField ?? 'Any failure')} options={['Any failure', 'Error code', 'Failure type', 'Error message']} onChange={(v) => updateConfig('retryConditionField', v)} />
        {String(node.config.retryConditionField ?? 'Any failure') !== 'Any failure' && <>
          <SelectField label="Condition operator" value={String(node.config.retryConditionOperator ?? 'Contains')} options={['Contains', 'Equals', 'Starts with']} onChange={(v) => updateConfig('retryConditionOperator', v)} />
          <Field label="Condition value" value={String(node.config.retryConditionValue ?? '')} onChange={(v) => updateConfig('retryConditionValue', v)} />
        </>}
      </>}
    </>}
    <Field label="Secure input" value={Boolean(node.config.secureInput)} type="boolean" onChange={(v) => updateConfig('secureInput', v)} />
    <Field label="Secure output" value={Boolean(node.config.secureOutput)} type="boolean" onChange={(v) => updateConfig('secureOutput', v)} />
    <Field label="Simulate failure in Debug" value={Boolean(node.config.simulateFailure)} type="boolean" onChange={(v) => updateConfig('simulateFailure', v)} />
    {Boolean(node.config.simulateFailure) && <>
      <SelectField label="Simulated failure type" value={String(node.config.simulateFailureType ?? 'System error')} options={['System error', 'User error', 'Timeout']} onChange={(v) => updateConfig('simulateFailureType', v)} />
      <Field label="Simulated error code" value={String(node.config.simulateErrorCode ?? '429')} onChange={(v) => updateConfig('simulateErrorCode', v)} />
      <Field label="Simulated error message" value={String(node.config.simulateErrorMessage ?? 'Transient service throttling')} onChange={(v) => updateConfig('simulateErrorMessage', v)} />
    </>}
    <div className="property-note">Fabric mode models fixed or increasing-delay backoff and conditional retry matching for supported activities. ADF mode keeps the simpler fixed retry interval. Secure input/output hides those payloads in Monitoring.</div>
  </>;
  const invokeSettings = node.type === 'invokePipeline' && <div className="activity-specific-settings">
    <SelectField label="Target platform" value={String(node.config.invokeSource ?? (experience === 'fabric' ? 'Fabric' : 'Azure Data Factory'))} options={experience === 'fabric' ? ['Fabric', 'Azure Data Factory', 'Synapse'] : ['Azure Data Factory', 'Synapse']} onChange={(v) => updateConfig('invokeSource', v)} />
    {String(node.config.invokeSource ?? 'Fabric') === 'Fabric' && <><SelectField label="Authentication kind" value={String(node.config.authenticationKind ?? 'Workspace identity')} options={['Organizational account', 'Service principal', 'Workspace identity']} onChange={(v) => updateConfig('authenticationKind', v)} /><Field label="Connection" value={String(node.config.connection ?? '')} onChange={(v) => updateConfig('connection', v)} /><Field label="Workspace" value={String(node.config.workspace ?? '')} onChange={(v) => updateConfig('workspace', v)} /></>}
    <Field label="Pipeline" value={String(node.config.pipeline ?? '')} onChange={(v) => updateConfig('pipeline', v)} />
    <Field label="Wait on completion" value={Boolean(node.config.waitOnCompletion ?? true)} type="boolean" onChange={(v) => updateConfig('waitOnCompletion', v)} />
    <Field label="Parameter mapping (JSON object)" value={String(node.config.parametersJson ?? '{}')} type="textarea" onChange={(v) => updateConfig('parametersJson', v)} />
    <JsonHint value={node.config.parametersJson ?? '{}'} expected="object" />
    <div className="property-note">Use Invoke Pipeline to practice modular orchestration. In Fabric mode the simulator exposes target workspace, connection and authentication choices; in ADF mode it behaves like Execute Pipeline.</div>
  </div>;

  return <aside className="properties-panel fluent-pane">
    <div className="properties-title-row"><div><span className="eyebrow">Activity</span><strong>{node.name}</strong><span>{node.type}</span></div><Button appearance="subtle" size="small" className="danger-icon" onClick={() => onDelete(node.id)}>Delete</Button></div>
    <TabList className="properties-tabs fluent-properties-tabs" selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as typeof tab)} size="small"><Tab value="General">General</Tab><Tab value="Settings">Settings</Tab><Tab value="Policy">Policy</Tab><Tab value="User properties">User properties</Tab></TabList>
    <div className="properties-scroll">
      {tab === 'General' && <><Field label="Name" value={node.name} onChange={(v) => onChange({ ...node, name: String(v) })} /><Field label="Description" value={String(node.config.description ?? '')} type="textarea" onChange={(v) => updateConfig('description', v)} /></>}
      {tab === 'Policy' && policySettings}
      {tab === 'Settings' && <>
        {copySettings}{lookupSettings}{storedProcedureSettings}{scriptSettings}{dbtSettings}{invokeSettings}
        {node.type === 'foreach' && <><Field label="Items" value={String(node.config.items ?? '')} type="textarea" onChange={(v) => updateConfig('items', v)} onExpression={() => openExpression('items', 'Items')} /><Field label="Sequential" value={Boolean(node.config.sequential)} type="boolean" onChange={(v) => updateConfig('sequential', v)} />{!node.config.sequential && <Field label="Batch count" value={Number(node.config.batchCount ?? 20)} type="number" onChange={(v) => updateConfig('batchCount', v)} />}<ContainerSequence title="ForEach activities" subtitle="These child activities run for each item." value={String(node.config.innerActivities ?? '')} onChange={(value) => updateConfig('innerActivities', value)} onOpen={() => setNestedTarget({ key: 'innerActivities', label: 'Activities' })} /></>}
        {node.type === 'if' && <><Field label="Expression" value={String(node.config.expression ?? '')} type="textarea" onChange={(v) => updateConfig('expression', v)} onExpression={() => openExpression('expression', 'If expression')} /><ContainerSequence title="True activities" subtitle="Runs when the expression evaluates to true." value={String(node.config.trueActivities ?? '')} onChange={(value) => updateConfig('trueActivities', value)} onOpen={() => setNestedTarget({ key: 'trueActivities', label: 'True activities' })} /><ContainerSequence title="False activities" subtitle="Runs when the expression evaluates to false." value={String(node.config.falseActivities ?? '')} onChange={(value) => updateConfig('falseActivities', value)} onOpen={() => setNestedTarget({ key: 'falseActivities', label: 'False activities' })} /></>}
        {node.type === 'until' && <><Field label="Until expression" value={String(node.config.expression ?? '')} type="textarea" onChange={(v) => updateConfig('expression', v)} onExpression={() => openExpression('expression', 'Until expression')} /><ContainerSequence title="Until activities" subtitle="Child activities repeat until the expression becomes true or the timeout policy is reached." value={String(node.config.innerActivities ?? '')} onChange={(value) => updateConfig('innerActivities', value)} onOpen={() => setNestedTarget({ key: 'innerActivities', label: 'Activities' })} /></>}
        {(node.type === 'setVariable' || node.type === 'appendVariable') && <><FluentField label="Pipeline variable" className="form-field fluent-form-field"><Dropdown value={String(node.config.variableName ?? '')} placeholder="Choose variable" selectedOptions={node.config.variableName ? [String(node.config.variableName)] : []} onOptionSelect={(_, data) => updateConfig('variableName', String(data.optionValue ?? ''))}>{variables.filter((variable) => node.type !== 'appendVariable' || variable.type === 'Array').map((variable) => <Option key={variable.id} value={variable.name}>{variable.name} · {variable.type}</Option>)}</Dropdown></FluentField><Field label={node.type === 'appendVariable' ? 'Value to append' : 'Value'} value={String(node.config.value ?? '')} type="textarea" onChange={(v) => updateConfig('value', v)} onExpression={() => openExpression('value', node.type === 'appendVariable' ? 'Append variable value' : 'Set variable value')} /><div className="property-note">{node.type === 'appendVariable' ? 'Append Variable accepts an Array pipeline variable. The simulator mutates its current value after a successful Debug run.' : 'Set Variable mutates the selected pipeline variable after a successful Debug run.'}</div></>}
        {!['copy', 'lookup', 'storedProcedure', 'script', 'dbt', 'invokePipeline', 'foreach', 'if', 'until', 'setVariable', 'appendVariable'].includes(node.type) && genericFields.map(([key, value]) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())} value={value} type={typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : (key === 'query' || key === 'expression' || key === 'script' || key === 'body') ? 'textarea' : 'text'} onChange={(v) => updateConfig(key, v)} onExpression={typeof value === 'string' && expressionKeys.has(key) ? () => openExpression(key, key.replace(/([A-Z])/g, ' $1')) : undefined} />)}
      </>}
      {tab === 'User properties' && <><div className="property-note">User properties are metadata surfaced in monitoring. They help operators filter runs by source system, domain, batch identifier or SLA class.</div><div className="user-property-demo"><span>domain</span><strong>{node.type === 'copy' ? 'ingestion' : node.type === 'notebook' ? 'transformation' : 'orchestration'}</strong><span>activity_type</span><strong>{node.type}</strong></div></>}
    </div>
    <div className="properties-footer">{node.type === 'notebook' && <Button appearance="secondary" onClick={onOpenNotebook}>Open notebook</Button>}{node.type === 'dataflow' && <Button appearance="secondary" onClick={onOpenDataflow}>Open Dataflow Gen2</Button>}{node.type === 'storedProcedure' && <Button appearance="secondary" onClick={onOpenSql}>Open SQL editor</Button>}</div>
    <NestedActivityEditor open={Boolean(nestedTarget)} parentName={node.name} branchLabel={nestedTarget?.label ?? 'Activities'} value={nestedTarget ? String(node.config[nestedTarget.key] ?? '') : ''} onChange={(value) => nestedTarget && updateConfig(nestedTarget.key, value)} onClose={() => setNestedTarget(null)} />
    <ExpressionBuilder open={Boolean(expressionTarget)} label={expressionTarget?.label ?? ''} value={expressionTarget?.value ?? ''} context={expressionContext} onApply={(value) => expressionTarget && updateConfig(expressionTarget.key, value)} onClose={() => setExpressionTarget(null)} />
  </aside>;
}
