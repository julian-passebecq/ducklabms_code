import { Button, Checkbox, Dropdown, Input, Option } from '@fluentui/react-components';
import { importMockMapping, parseCopyMapping, serializeCopyMapping, type CopyMappingDefinition, type CopyMappingRow } from '../lib/copyMapping';

const types = ['String', 'Int32', 'Int64', 'Decimal', 'Double', 'Boolean', 'Datetime', 'GUID'];

function mappingRow(onChange: (row: CopyMappingRow) => void, onDelete: () => void, row: CopyMappingRow) {
  return <div className="copy-mapping-row" key={row.id}>
    <Input value={row.source} onChange={(_, data) => onChange({ ...row, source: data.value })} />
    <Dropdown value={row.sourceType} selectedOptions={[row.sourceType]} onOptionSelect={(_, data) => onChange({ ...row, sourceType: String(data.optionValue ?? 'String') })}>{types.map((type) => <Option key={type} value={type}>{type}</Option>)}</Dropdown>
    <span className="copy-mapping-arrow">→</span>
    <Input value={row.destination} onChange={(_, data) => onChange({ ...row, destination: data.value })} />
    <Dropdown value={row.destinationType} selectedOptions={[row.destinationType]} onOptionSelect={(_, data) => onChange({ ...row, destinationType: String(data.optionValue ?? 'String') })}>{types.map((type) => <Option key={type} value={type}>{type}</Option>)}</Dropdown>
    <Button appearance="subtle" size="small" onClick={onDelete}>×</Button>
  </div>;
}

export function CopyMappingEditor({ value, source, destination, onChange }: { value: string; source: string; destination: string; onChange: (value: string) => void }) {
  const definition = parseCopyMapping(value);
  const commit = (next: CopyMappingDefinition) => onChange(serializeCopyMapping(next));
  const updateRow = (id: string, row: CopyMappingRow) => commit({ ...definition, autoMap: false, rows: definition.rows.map((candidate) => candidate.id === id ? row : candidate) });
  const addRow = () => commit({ ...definition, autoMap: false, rows: [...definition.rows, { id: `map-${Date.now()}`, source: '', sourceType: 'String', destination: '', destinationType: 'String' }] });
  const importSchemas = () => commit(importMockMapping(source, destination));
  const reset = () => commit({ autoMap: true, rows: [] });
  return <section className="copy-mapping-editor">
    <div className="copy-mapping-toolbar">
      <div><strong>Column mapping</strong><span>{definition.rows.length ? `${definition.rows.length} mapped columns` : 'Schema not imported yet'}</span></div>
      <div><Button size="small" appearance="secondary" onClick={importSchemas}>Import schemas</Button><Button size="small" appearance="subtle" onClick={addRow}>+ New mapping</Button><Button size="small" appearance="subtle" onClick={() => commit({ autoMap: false, rows: [] })}>Clear</Button><Button size="small" appearance="subtle" onClick={reset}>Reset</Button></div>
    </div>
    <Checkbox checked={definition.autoMap} label="Auto map matching column names" onChange={(_, data) => commit({ ...definition, autoMap: Boolean(data.checked) })} />
    <div className="copy-mapping-header"><span>Source column</span><span>Type</span><span /><span>Destination column</span><span>Type</span><span /></div>
    <div className="copy-mapping-rows">{definition.rows.length ? definition.rows.map((row) => mappingRow((changed) => updateRow(row.id, changed), () => commit({ ...definition, autoMap: false, rows: definition.rows.filter((candidate) => candidate.id !== row.id) }), row)) : <div className="copy-mapping-empty">Select <strong>Import schemas</strong> to simulate Fabric/ADF schema import, or create mappings manually.</div>}</div>
    <div className="property-note">The simulator models Fabric's Mapping tab: import schemas, auto mapping, manual source/destination projection and type visibility. Existing destinations keep their destination column names in a real pipeline.</div>
  </section>;
}
