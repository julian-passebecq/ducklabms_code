import type { PipelineNode, PipelineParameter, PipelineVariable } from '../types/app';

export interface ExpressionContext {
  parameters: PipelineParameter[];
  variables: PipelineVariable[];
  nodes: PipelineNode[];
  item?: unknown;
}

function scalar(value: unknown): string | number | boolean | null {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value) ?? String(value);
}

function parseLiteral(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function splitArgs(source: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let quote = '';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      current += char;
      if (char === quote && source[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === "'" || char === '"') { quote = char; current += char; continue; }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { args.push(current.trim()); current = ''; continue; }
    current += char;
  }
  if (current.trim() || source.trim()) args.push(current.trim());
  return args;
}

function mockActivityField(field: string): unknown {
  const normalized = field.toLowerCase();
  if (normalized === 'maxrisk' || normalized === 'risk_score') return 0.91;
  if (normalized === 'rowcount') return 2;
  if (normalized === 'turbine_id' || normalized === 'turbineid') return 'WT-07';
  if (normalized === 'pipelineRunId'.toLowerCase()) return 'child-run-001';
  return `sample-${field}`;
}

function evaluateToken(token: string, context: ExpressionContext): unknown {
  const source = token.trim();
  if (source.startsWith('@')) return evaluateExpression(source, context);
  if (/^(pipeline\(\)|variables\(|activity\(|item\(\)|trigger\(\))/.test(source)) return evaluateExpression(`@${source}`, context);
  return parseLiteral(source);
}

export function expressionSuggestions(context: ExpressionContext): string[] {
  return [
    ...context.parameters.map((parameter) => `@pipeline().parameters.${parameter.name}`),
    ...context.variables.map((variable) => `@variables('${variable.name}')`),
    ...context.nodes.filter((node) => node.type === 'lookup').flatMap((node) => [`@activity('${node.name}').output.value`, `@activity('${node.name}').output.firstRow`]),
    ...context.nodes.filter((node) => node.type === 'notebook').map((node) => `@activity('${node.name}').output.maxRisk`),
    '@item()',
    '@item().last_successful_ts',
    '@utcNow()',
    '@pipeline()?.TriggerEvent?.FileName',
    '@pipeline()?.TriggerEvent?.FolderPath',
    '@trigger().outputs.windowStartTime',
    '@trigger().outputs.windowEndTime',
    "@concat('prefix-', pipeline().parameters.batch_date)",
    '@greater(0.91, 0.8)',
  ];
}

export function evaluateExpression(expression: string, context: ExpressionContext): unknown {
  const source = expression.trim();
  if (!source.startsWith('@')) return source;

  const parameterMatch = source.match(/^@pipeline\(\)\.parameters\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (parameterMatch) return context.parameters.find((parameter) => parameter.name === parameterMatch[1])?.defaultValue ?? undefined;

  const variableMatch = source.match(/^@variables\(['"]([^'"]+)['"]\)$/);
  if (variableMatch) {
    const variable = context.variables.find((candidate) => candidate.name === variableMatch[1]);
    return variable?.currentValue || variable?.defaultValue;
  }

  if (source === '@item()') return context.item ?? { id: 1, name: 'sample-item', last_successful_ts: '2026-09-15T00:00:00Z' };
  const itemFieldMatch = source.match(/^@item\(\)\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (itemFieldMatch) {
    const item = (context.item ?? { id: 1, name: 'sample-item', last_successful_ts: '2026-09-15T00:00:00Z' }) as Record<string, unknown>;
    return item[itemFieldMatch[1]] ?? mockActivityField(itemFieldMatch[1]);
  }
  if (source === '@utcNow()') return new Date().toISOString();
  if (source === '@pipeline()?.TriggerEvent?.FileName') return 'orders_2026-09-16.parquet';
  if (source === '@pipeline()?.TriggerEvent?.FolderPath') return '/landing/orders/';
  if (source === '@trigger().outputs.windowStartTime') return '2026-09-16T08:00:00Z';
  if (source === '@trigger().outputs.windowEndTime') return '2026-09-16T09:00:00Z';

  const activityMatch = source.match(/^@activity\(['"]([^'"]+)['"]\)\.output\.(value|firstRow(?:\.([A-Za-z_][A-Za-z0-9_]*))?|([A-Za-z_][A-Za-z0-9_]*))$/);
  if (activityMatch) {
    const node = context.nodes.find((candidate) => candidate.name === activityMatch[1]);
    if (!node) return undefined;
    if (activityMatch[2] === 'value') return node.type === 'lookup' ? [{ table: 'customer', watermark: '2026-09-15T00:00:00Z' }, { table: 'sales', watermark: '2026-09-15T00:00:00Z' }] : [];
    if (activityMatch[2] === 'firstRow') return { maxRisk: 0.91, rowCount: 2, turbine_id: 'WT-07' };
    if (activityMatch[3]) return mockActivityField(activityMatch[3]);
    if (activityMatch[4]) return mockActivityField(activityMatch[4]);
  }

  const greaterMatch = source.match(/^@greater\((.*)\)$/);
  if (greaterMatch) {
    const args = splitArgs(greaterMatch[1]);
    if (args.length !== 2) return undefined;
    return Number(evaluateToken(args[0], context)) > Number(evaluateToken(args[1], context));
  }

  const equalsMatch = source.match(/^@equals\((.*)\)$/);
  if (equalsMatch) {
    const args = splitArgs(equalsMatch[1]);
    if (args.length !== 2) return undefined;
    return String(evaluateToken(args[0], context)) === String(evaluateToken(args[1], context));
  }

  const concatMatch = source.match(/^@concat\((.*)\)$/);
  if (concatMatch) return splitArgs(concatMatch[1]).map((part) => String(evaluateToken(part, context) ?? '')).join('');

  return undefined;
}

export function previewExpression(expression: string, context: ExpressionContext): string {
  try {
    const value = evaluateExpression(expression, context);
    if (value === undefined) return 'Expression is syntactically allowed in the simulator but cannot be resolved from the current mock context.';
    const resolved = scalar(value);
    return typeof resolved === 'string' ? resolved : JSON.stringify(resolved, null, 2);
  } catch (error) {
    return error instanceof Error ? error.message : 'Expression could not be evaluated.';
  }
}

export function expressionLooksValid(expression: string): boolean {
  const source = expression.trim();
  if (!source.startsWith('@')) return true;
  return [
    /^@pipeline\(\)\.parameters\.[A-Za-z_][A-Za-z0-9_]*$/,
    /^@variables\(['"][^'"]+['"]\)$/,
    /^@activity\(['"][^'"]+['"]\)\.output\.(value|firstRow(?:\.[A-Za-z_][A-Za-z0-9_]*)?|[A-Za-z_][A-Za-z0-9_]*)$/,
    /^@item\(\)$/,
    /^@item\(\)\.[A-Za-z_][A-Za-z0-9_]*$/,
    /^@utcNow\(\)$/,
    /^@pipeline\(\)\?\.TriggerEvent\?\.(FileName|FolderPath)$/,
    /^@trigger\(\)\.outputs\.(windowStartTime|windowEndTime)$/,
    /^@greater\(.+,\s*.+\)$/,
    /^@equals\(.+,\s*.+\)$/,
    /^@concat\(.*\)$/,
  ].some((pattern) => pattern.test(source));
}
