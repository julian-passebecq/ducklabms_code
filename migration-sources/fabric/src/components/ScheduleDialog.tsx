import { Button, Checkbox, Dropdown, Field, Input, Option, Textarea } from '@fluentui/react-components';
import type { Experience, PipelineParameter } from '../types/app';
import { triggerKindsFor, triggerSummary, validateTriggerDefinition, type PipelineSchedule } from '../lib/triggers';
export type { PipelineSchedule } from '../lib/triggers';

export function ScheduleDialog({ open, experience, parameters, schedule, onChange, onTest, onClose }: {
  open: boolean;
  experience: Experience;
  parameters: PipelineParameter[];
  schedule: PipelineSchedule;
  onChange: (schedule: PipelineSchedule) => void;
  onTest: (schedule: PipelineSchedule) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const problems = validateTriggerDefinition(schedule, experience, parameters);
  const scheduleKind = schedule.kind !== 'Event';
  const kinds = triggerKindsFor(experience);
  return (
    <div className="modal-backdrop schedule-backdrop" onMouseDown={onClose}>
      <section className="modal-card schedule-card trigger-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><span className="eyebrow">Simulated trigger</span><h2>{experience === 'fabric' ? 'Run, schedule or trigger pipeline' : 'Pipeline trigger'}</h2><p>{triggerSummary(schedule)}</p></div><Button appearance="subtle" onClick={onClose}>×</Button></div>
        <div className="schedule-form">
          <Field label="Enable trigger"><Checkbox checked={schedule.enabled} label={schedule.enabled ? 'Enabled' : 'Disabled'} onChange={(_, data) => onChange({ ...schedule, enabled: Boolean(data.checked) })} /></Field>
          <Field label="Trigger type"><Dropdown value={schedule.kind} selectedOptions={[schedule.kind]} onOptionSelect={(_, data) => onChange({ ...schedule, kind: data.optionValue as PipelineSchedule['kind'] })}>{kinds.map((kind) => <Option key={kind} value={kind}>{kind}</Option>)}</Dropdown></Field>
          {scheduleKind ? <>
            <div className="trigger-two-col"><Field label="Frequency"><Dropdown value={schedule.frequency} selectedOptions={[schedule.frequency]} onOptionSelect={(_, data) => onChange({ ...schedule, frequency: data.optionValue as PipelineSchedule['frequency'] })}><Option value="Minute">Minute</Option><Option value="Hourly">Hourly</Option><Option value="Daily">Daily</Option><Option value="Weekly">Weekly</Option></Dropdown></Field><Field label="Interval"><Input type="number" min={1} value={String(schedule.interval)} onChange={(_, data) => onChange({ ...schedule, interval: Number(data.value) })} /></Field></div>
            <div className="trigger-two-col"><Field label="Start date"><Input type="date" value={schedule.startDate} onChange={(_, data) => onChange({ ...schedule, startDate: data.value })} /></Field><Field label="End date"><Input type="date" value={schedule.endDate} onChange={(_, data) => onChange({ ...schedule, endDate: data.value })} /></Field></div>
            <div className="trigger-two-col"><Field label="Run time"><Input type="time" value={schedule.time} onChange={(_, data) => onChange({ ...schedule, time: data.value })} /></Field><Field label="Time zone"><Input value={schedule.timeZone} onChange={(_, data) => onChange({ ...schedule, timeZone: data.value })} /></Field></div>
          </> : <>
            <Field label="Event source"><Input placeholder={experience === 'fabric' ? 'OneLake / Azure Blob / workspace event' : 'Azure Blob / custom event'} value={schedule.eventSource} onChange={(_, data) => onChange({ ...schedule, eventSource: data.value })} /></Field>
            <Field label="Event type"><Input placeholder="BlobCreated" value={schedule.eventType} onChange={(_, data) => onChange({ ...schedule, eventType: data.value })} /></Field>
            <Field label="Subject/file filter"><Input placeholder="/landing/orders/*.parquet" value={schedule.subjectFilter} onChange={(_, data) => onChange({ ...schedule, subjectFilter: data.value })} /></Field>
          </>}
          <Field label="Pipeline parameter values (JSON)"><Textarea resize="vertical" value={schedule.parametersJson} onChange={(_, data) => onChange({ ...schedule, parametersJson: data.value })} /></Field>
          <Field label="Failure notifications"><Input placeholder="dataops@contoso.example" value={schedule.failureNotifications} onChange={(_, data) => onChange({ ...schedule, failureNotifications: data.value })} /></Field>
          <div className={`trigger-validation ${problems.length ? 'invalid' : 'valid'}`}><strong>{problems.length ? `${problems.length} configuration issue${problems.length === 1 ? '' : 's'}` : 'Trigger definition valid'}</strong>{problems.length ? <ul>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : <span>This definition is stored only in the simulator; it does not create a cloud trigger.</span>}</div>
          <div className="learning-box wide"><strong>Learning note</strong><p>{experience === 'fabric' ? 'Fabric supports on-demand runs, multiple schedules and event-based triggers. Interval scheduling and event metadata are represented here for practice.' : 'ADF separates schedule, tumbling-window and event trigger concepts. A real trigger starts only after the factory changes are published.'}</p></div>
        </div>
        <div className="modal-actions"><Button appearance="secondary" onClick={onClose}>Cancel</Button><Button appearance="secondary" disabled={!schedule.enabled || problems.length > 0} onClick={() => onTest(schedule)}>Test trigger</Button><Button appearance="primary" disabled={schedule.enabled && problems.length > 0} onClick={onClose}>Save trigger</Button></div>
      </section>
    </div>
  );
}
