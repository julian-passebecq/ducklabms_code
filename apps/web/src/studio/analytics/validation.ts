export const MAX_JSON_BYTES = 8_000_000;
export const MAX_SOURCE = 100_000;
export function record(value: unknown, label = 'object'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected ${label}.`);
  return value as Record<string, unknown>;
}
export function string(value: unknown, label: string, max = 4000): string {
  if (typeof value !== 'string' || value.length > max || value.includes('\0')) throw new Error(`Invalid ${label}.`);
  return value;
}
export function optionalString(value: unknown, max = 4000): string {return value == null ? '' : string(value, 'text', max);}
export function array(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid ${label}; limit ${max}.`);
  return value;
}
export function finite(value: unknown, label: string, min = -1e15, max = 1e15): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label}.`);
  return value;
}
/** No reviver or dynamic code. Bound traversal after JSON.parse; reject prototype keys everywhere. */
export function safeJson(text: string, maxBytes = MAX_JSON_BYTES): unknown {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) throw new Error(`JSON exceeds ${Math.round(maxBytes / 1_000_000)} MB.`);
  const value: unknown = JSON.parse(text);
  const queue: Array<[unknown, number]> = [[value, 0]]; let visited = 0;
  while (queue.length) {
    const [v, depth] = queue.pop()!;
    if (++visited > 150_000 || depth > 40) throw new Error('JSON structure is too large or deeply nested.');
    if (v && typeof v === 'object') for (const [key, child] of Object.entries(v)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe object key in import.');
      queue.push([child, depth + 1]);
    }
  }
  return value;
}
export function unique(values: string[], label: string): void {if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}.`);}
export function identifier(value: unknown, label = 'identifier'): string {
  const s = string(value, label, 100);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw new Error(`${label} must be a simple SQL identifier.`);
  return s;
}
export function sourcePath(value: unknown): string {
  const path = string(value, 'project path', 220);
  if (!/^(models|tests|macros|snapshots|seeds|charts)\/[A-Za-z0-9_./-]+\.(sql|ya?ml|csv)$/.test(path) && !['dbt_project.yml', 'dbt_charts.yml'].includes(path)) throw new Error('Use a relative dbt project path. Credentials and profiles are not imported into the browser.');
  if (path.split('/').some(p => p === '.' || p === '..' || !p || p.startsWith('.') || p.endsWith('.') || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p))) throw new Error('Unsafe project path.');
  return path;
}
export function quoteIdentifier(s: string): string {return `"${identifier(s).replaceAll('"', '""')}"`;}
export function freshId(prefix: string): string {return `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;}
