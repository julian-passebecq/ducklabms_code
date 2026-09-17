export interface NestedActivityDefinition {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
}

const labelToType: Record<string, string> = {
  'Copy data': 'copy',
  Notebook: 'notebook',
  'Stored procedure': 'storedProcedure',
  Script: 'script',
  'Set variable': 'setVariable',
  Wait: 'wait',
  Lookup: 'lookup',
  'Invoke pipeline': 'invokePipeline',
  'If Condition': 'if',
};

const typeToLabel: Record<string, string> = Object.fromEntries(Object.entries(labelToType).map(([label, type]) => [type, label]));

export const nestedActivityChoices = Object.entries(labelToType).map(([label, type]) => ({ label, type }));

function fromLegacy(value: string): NestedActivityDefinition[] {
  return value.split('|').map((item) => item.trim()).filter(Boolean).map((label, index) => ({
    id: `nested-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: labelToType[label] ?? 'script',
    name: label,
    x: 60 + index * 220,
    y: 120,
  }));
}

export function parseNestedActivities(value: unknown): NestedActivityDefinition[] {
  const source = String(value ?? '').trim();
  if (!source) return [];
  if (!source.startsWith('[')) return fromLegacy(source);
  try {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) return fromLegacy(source);
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `nested-${index}`),
      type: String(item?.type ?? labelToType[String(item?.name ?? '')] ?? 'script'),
      name: String(item?.name ?? typeToLabel[String(item?.type ?? '')] ?? `Activity ${index + 1}`),
      x: Number.isFinite(Number(item?.x)) ? Number(item.x) : 60 + index * 220,
      y: Number.isFinite(Number(item?.y)) ? Number(item.y) : 120,
    }));
  } catch {
    return fromLegacy(source);
  }
}

export function serializeNestedActivities(items: NestedActivityDefinition[]): string {
  return JSON.stringify(items.map((item) => ({ id: item.id, type: item.type, name: item.name, x: Math.round(item.x), y: Math.round(item.y) })));
}

export function nestedActivityCount(value: unknown): number {
  return parseNestedActivities(value).length;
}
