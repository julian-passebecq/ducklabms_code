import { Button, Input, Textarea } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { expressionLooksValid, previewExpression, type ExpressionContext } from '../lib/expressions';

interface SuggestionGroup { title: string; items: string[] }

function groupsFor(context: ExpressionContext): SuggestionGroup[] {
  return [
    { title: 'Pipeline parameters', items: context.parameters.map((parameter) => `@pipeline().parameters.${parameter.name}`) },
    { title: 'Variables', items: context.variables.map((variable) => `@variables('${variable.name}')`) },
    { title: 'Activity outputs', items: context.nodes.flatMap((node) => {
      if (node.type === 'lookup') return [`@activity('${node.name}').output.value`, `@activity('${node.name}').output.firstRow`, `@activity('${node.name}').output.firstRow.rowCount`];
      if (node.type === 'notebook') return [`@activity('${node.name}').output.maxRisk`, `@activity('${node.name}').output.rowCount`];
      if (node.type === 'invokePipeline') return [`@activity('${node.name}').output.pipelineRunId`];
      return [`@activity('${node.name}').output.rowCount`];
    }) },
    { title: 'Iteration & trigger', items: ['@item()', '@item().last_successful_ts', '@pipeline()?.TriggerEvent?.FileName', '@pipeline()?.TriggerEvent?.FolderPath', '@trigger().outputs.windowStartTime', '@trigger().outputs.windowEndTime'] },
    { title: 'Functions', items: ['@utcNow()', "@concat('prefix-', pipeline().parameters.batch_date)", '@greater(0.91, 0.8)', "@equals('ready', 'ready')"] },
  ].filter((group) => group.items.length);
}

export function ExpressionBuilder({ open, label, value, context, onApply, onClose }: {
  open: boolean;
  label: string;
  value: string;
  context: ExpressionContext;
  onApply: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState('');
  useEffect(() => { setDraft(value); if (open) setQuery(''); }, [value, open]);
  const groups = useMemo(() => groupsFor(context).map((group) => ({ ...group, items: group.items.filter((item) => !query.trim() || item.toLowerCase().includes(query.trim().toLowerCase())) })).filter((group) => group.items.length), [context, query]);
  if (!open) return null;
  const valid = expressionLooksValid(draft);
  const preview = previewExpression(draft, context);

  return <div className="studio-modal-backdrop expression-backdrop" onMouseDown={onClose}>
    <section className="studio-modal expression-builder" onMouseDown={(event) => event.stopPropagation()}>
      <header className="studio-modal-header"><div><span className="eyebrow">Add dynamic content</span><h2>{label}</h2><p>Browse pipeline values and activity outputs, then preview the expression against the current mock runtime context.</p></div><button className="icon-button" onClick={onClose}>×</button></header>
      <div className="expression-layout">
        <aside className="expression-suggestions"><strong>Dynamic content</strong><Input size="small" placeholder="Search parameters, outputs, functions" value={query} onChange={(_, data) => setQuery(data.value)} />{groups.map((group) => <section className="expression-group" key={group.title}><h4>{group.title}</h4>{group.items.map((suggestion) => <button key={suggestion} onClick={() => setDraft(suggestion)}>{suggestion}</button>)}</section>)}{!groups.length && <span className="expression-empty">No matching dynamic content.</span>}</aside>
        <main className="expression-editor"><label>Expression</label><Textarea resize="vertical" value={draft} onChange={(_, data) => setDraft(data.value)} /><div className={`expression-validity ${valid ? 'valid' : 'invalid'}`}>{valid ? 'Syntax recognized by simulator' : 'Expression syntax is not recognized'}</div><label>Resolved preview</label><pre>{preview}</pre><div className="expression-context-summary"><strong>Runtime context</strong><span>{context.parameters.length} parameters</span><span>{context.variables.length} variables</span><span>{context.nodes.length} activities available for output references</span></div></main>
      </div>
      <footer className="studio-modal-actions"><Button appearance="secondary" onClick={onClose}>Cancel</Button><Button appearance="primary" disabled={!valid} onClick={() => { onApply(draft); onClose(); }}>Apply</Button></footer>
    </section>
  </div>;
}
