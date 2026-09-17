import type { Experience, PipelineParameter } from '../types/app';

export type TriggerKind = 'Fixed schedule' | 'Interval schedule' | 'Event' | 'Schedule' | 'Tumbling window';

export interface PipelineSchedule {
  enabled: boolean;
  kind: TriggerKind;
  frequency: 'Minute' | 'Hourly' | 'Daily' | 'Weekly';
  interval: number;
  startDate: string;
  endDate: string;
  time: string;
  timeZone: string;
  eventSource: string;
  eventType: string;
  subjectFilter: string;
  parametersJson: string;
  failureNotifications: string;
}

export function triggerKindsFor(experience: Experience): TriggerKind[] {
  return experience === 'fabric' ? ['Fixed schedule', 'Interval schedule', 'Event'] : ['Schedule', 'Tumbling window', 'Event'];
}

export function validateTriggerDefinition(trigger: PipelineSchedule, experience: Experience, parameters: PipelineParameter[] = []): string[] {
  if (!trigger.enabled) return [];
  const problems: string[] = [];
  const kinds = triggerKindsFor(experience);
  if (!kinds.includes(trigger.kind)) problems.push(`${trigger.kind} is not available for ${experience === 'fabric' ? 'Fabric' : 'Azure Data Factory'} in this simulator.`);
  if (trigger.kind === 'Event') {
    if (!trigger.eventSource.trim()) problems.push('Event source is required.');
    if (!trigger.eventType.trim()) problems.push('Event type is required.');
  } else {
    if (!trigger.startDate) problems.push('Start date is required.');
    if (experience === 'fabric' && !trigger.endDate) problems.push('Fabric schedules require an end date in this learning model.');
    if (!Number.isFinite(trigger.interval) || trigger.interval < 1) problems.push('Interval must be at least 1.');
  }
  try {
    const parsed = JSON.parse(trigger.parametersJson || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) problems.push('Trigger parameter values must be a JSON object.');
    else {
      const known = new Set(parameters.map((parameter) => parameter.name));
      Object.keys(parsed).forEach((name) => {
        if (known.size && !known.has(name)) problems.push(`Trigger parameter ${name} does not match a pipeline parameter.`);
      });
    }
  } catch {
    problems.push('Trigger parameter values must be valid JSON.');
  }
  return problems;
}

export function applyTriggerParameterValues(trigger: PipelineSchedule, parameters: PipelineParameter[]): PipelineParameter[] {
  let values: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(trigger.parametersJson || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) values = parsed as Record<string, unknown>;
  } catch {
    values = {};
  }
  return parameters.map((parameter) => {
    if (!(parameter.name in values)) return parameter;
    const raw = values[parameter.name];
    const defaultValue = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return { ...parameter, defaultValue };
  });
}

export function triggerSummary(trigger: PipelineSchedule): string {
  if (!trigger.enabled) return 'Disabled';
  if (trigger.kind === 'Event') return `Event · ${trigger.eventType || 'unconfigured'}`;
  return `${trigger.kind} · every ${trigger.interval} ${trigger.frequency.toLowerCase()}${trigger.interval === 1 ? '' : 's'}`;
}
