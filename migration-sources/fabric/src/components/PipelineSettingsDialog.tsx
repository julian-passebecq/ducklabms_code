import { Button, Dropdown, Input, Option, Tab, TabList } from '@fluentui/react-components';
import { useState } from 'react';
import type { PipelineParameter, PipelineValueType, PipelineVariable } from '../types/app';

const valueTypes: PipelineValueType[] = ['String', 'Int', 'Bool', 'Array'];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function PipelineSettingsDialog({ open, parameters, variables, onParameters, onVariables, onClose }: {
  open: boolean;
  parameters: PipelineParameter[];
  variables: PipelineVariable[];
  onParameters: (items: PipelineParameter[]) => void;
  onVariables: (items: PipelineVariable[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'Parameters' | 'Variables'>('Parameters');
  if (!open) return null;

  const addParameter = () => onParameters([...parameters, { id: makeId('param'), name: `parameter${parameters.length + 1}`, type: 'String', defaultValue: '' }]);
  const addVariable = () => onVariables([...variables, { id: makeId('var'), name: `variable${variables.length + 1}`, type: 'String', defaultValue: '', currentValue: '' }]);

  return <div className="studio-modal-backdrop" onMouseDown={onClose}>
    <section className="studio-modal pipeline-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
      <header className="studio-modal-header"><div><span className="eyebrow">Pipeline</span><h2>Parameters & variables</h2><p>Model runtime inputs and mutable pipeline state, then reference them with dynamic-content expressions.</p></div><button className="icon-button" onClick={onClose}>×</button></header>
      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as typeof tab)} className="settings-dialog-tabs">
        <Tab value="Parameters">Parameters ({parameters.length})</Tab>
        <Tab value="Variables">Variables ({variables.length})</Tab>
      </TabList>
      <div className="settings-grid-header"><span>Name</span><span>Type</span><span>Default value</span>{tab === 'Variables' && <span>Current value</span>}<span /></div>
      <div className="settings-grid-body">
        {tab === 'Parameters' ? parameters.map((parameter) => <div className="settings-grid-row" key={parameter.id}>
          <Input value={parameter.name} onChange={(_, data) => onParameters(parameters.map((item) => item.id === parameter.id ? { ...item, name: data.value } : item))} />
          <Dropdown value={parameter.type} selectedOptions={[parameter.type]} onOptionSelect={(_, data) => onParameters(parameters.map((item) => item.id === parameter.id ? { ...item, type: data.optionValue as PipelineValueType } : item))}>{valueTypes.map((type) => <Option key={type} value={type}>{type}</Option>)}</Dropdown>
          <Input value={parameter.defaultValue} onChange={(_, data) => onParameters(parameters.map((item) => item.id === parameter.id ? { ...item, defaultValue: data.value } : item))} />
          <Button appearance="subtle" onClick={() => onParameters(parameters.filter((item) => item.id !== parameter.id))}>Delete</Button>
        </div>) : variables.map((variable) => <div className="settings-grid-row variable-row" key={variable.id}>
          <Input value={variable.name} onChange={(_, data) => onVariables(variables.map((item) => item.id === variable.id ? { ...item, name: data.value } : item))} />
          <Dropdown value={variable.type} selectedOptions={[variable.type]} onOptionSelect={(_, data) => onVariables(variables.map((item) => item.id === variable.id ? { ...item, type: data.optionValue as PipelineValueType } : item))}>{valueTypes.map((type) => <Option key={type} value={type}>{type}</Option>)}</Dropdown>
          <Input value={variable.defaultValue} onChange={(_, data) => onVariables(variables.map((item) => item.id === variable.id ? { ...item, defaultValue: data.value } : item))} />
          <Input value={variable.currentValue} onChange={(_, data) => onVariables(variables.map((item) => item.id === variable.id ? { ...item, currentValue: data.value } : item))} />
          <Button appearance="subtle" onClick={() => onVariables(variables.filter((item) => item.id !== variable.id))}>Delete</Button>
        </div>)}
        {((tab === 'Parameters' && !parameters.length) || (tab === 'Variables' && !variables.length)) && <div className="settings-empty">No {tab.toLowerCase()} yet. Add one to practice parameterized pipelines and dynamic content.</div>}
      </div>
      <footer className="studio-modal-actions"><Button appearance="secondary" onClick={tab === 'Parameters' ? addParameter : addVariable}>+ Add {tab === 'Parameters' ? 'parameter' : 'variable'}</Button><Button appearance="primary" onClick={onClose}>Done</Button></footer>
    </section>
  </div>;
}
