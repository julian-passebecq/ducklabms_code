export interface CopyMappingRow {
  id: string;
  source: string;
  sourceType: string;
  destination: string;
  destinationType: string;
}

export interface CopyMappingDefinition {
  autoMap: boolean;
  rows: CopyMappingRow[];
}

function id() {
  return `map-${Math.random().toString(36).slice(2, 9)}`;
}

export function inferMockSchema(hint: unknown): { name: string; type: string }[] {
  const text = String(hint ?? '').toLowerCase();
  if (text.includes('sales') || text.includes('order')) return [
    { name: 'sale_id', type: 'Int64' }, { name: 'customer_id', type: 'Int64' }, { name: 'product_id', type: 'Int64' },
    { name: 'quantity', type: 'Int32' }, { name: 'amount', type: 'Decimal' }, { name: 'sale_ts', type: 'Datetime' },
  ];
  if (text.includes('turbine') || text.includes('iot') || text.includes('telemetry')) return [
    { name: 'event_id', type: 'String' }, { name: 'turbine_id', type: 'String' }, { name: 'event_ts', type: 'Datetime' },
    { name: 'temperature_c', type: 'Double' }, { name: 'vibration_mm_s', type: 'Double' }, { name: 'power_kw', type: 'Double' },
  ];
  if (text.includes('customer') || text.includes('erp')) return [
    { name: 'customer_id', type: 'Int64' }, { name: 'customer_name', type: 'String' }, { name: 'country', type: 'String' }, { name: 'updated_at', type: 'Datetime' },
  ];
  return [{ name: 'id', type: 'Int64' }, { name: 'name', type: 'String' }, { name: 'value', type: 'String' }, { name: 'updated_at', type: 'Datetime' }];
}

export function parseCopyMapping(value: unknown): CopyMappingDefinition {
  const source = String(value ?? '').trim();
  if (!source || source.toLowerCase().includes('auto map')) return { autoMap: true, rows: [] };
  if (source.startsWith('{')) {
    try {
      const parsed = JSON.parse(source);
      if (parsed && Array.isArray(parsed.rows)) {
        return {
          autoMap: parsed.autoMap !== false,
          rows: parsed.rows.map((row: Partial<CopyMappingRow>) => ({
            id: String(row.id ?? id()), source: String(row.source ?? ''), sourceType: String(row.sourceType ?? 'String'),
            destination: String(row.destination ?? ''), destinationType: String(row.destinationType ?? 'String'),
          })),
        };
      }
    } catch { /* legacy text below */ }
  }
  const rows = source.split(/\r?\n|\|/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [left, right] = line.split(/->|=>|:/).map((part) => part.trim());
    return { id: id(), source: left ?? '', sourceType: 'String', destination: right ?? left ?? '', destinationType: 'String' };
  });
  return { autoMap: false, rows };
}

export function serializeCopyMapping(definition: CopyMappingDefinition): string {
  return JSON.stringify(definition);
}

export function importMockMapping(sourceHint: unknown, destinationHint: unknown): CopyMappingDefinition {
  const source = inferMockSchema(sourceHint);
  const destination = inferMockSchema(destinationHint);
  return {
    autoMap: true,
    rows: source.map((column, index) => ({
      id: id(),
      source: column.name,
      sourceType: column.type,
      destination: destination[index]?.name ?? column.name,
      destinationType: destination[index]?.type ?? column.type,
    })),
  };
}
