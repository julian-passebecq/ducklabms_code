import { Button, Input } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import type { PipelineParameter } from '../types/app';

export function DebugParametersDialog({ open, parameters, onRun, onClose }: {
  open: boolean;
  parameters: PipelineParameter[];
  onRun: (parameters: PipelineParameter[]) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) setValues(Object.fromEntries(parameters.map((parameter) => [parameter.id, parameter.defaultValue])));
  }, [open, parameters]);
  if (!open) return null;
  const runtimeParameters = parameters.map((parameter) => ({ ...parameter, defaultValue: values[parameter.id] ?? parameter.defaultValue }));
  return <div className="studio-modal-backdrop" onMouseDown={onClose}>
    <section className="studio-modal debug-parameters-modal" onMouseDown={(event) => event.stopPropagation()}>
      <header className="studio-modal-header"><div><span className="eyebrow">Debug pipeline</span><h2>Pipeline parameters</h2><p>Override parameter values for this debug run. Saved defaults are not changed.</p></div><button className="icon-button" onClick={onClose}>×</button></header>
      <div className="debug-parameter-list">{parameters.map((parameter) => <label key={parameter.id}><span><strong>{parameter.name}</strong><small>{parameter.type}</small></span><Input value={values[parameter.id] ?? parameter.defaultValue} onChange={(_, data) => setValues((current) => ({ ...current, [parameter.id]: data.value }))} /></label>)}</div>
      <footer className="studio-modal-actions"><Button appearance="secondary" onClick={onClose}>Cancel</Button><Button appearance="primary" onClick={() => onRun(runtimeParameters)}>Run Debug</Button></footer>
    </section>
  </div>;
}
