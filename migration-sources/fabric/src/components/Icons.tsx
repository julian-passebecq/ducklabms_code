import type { ActivityType, PageKey } from '../types/app';

const glyphs: Record<ActivityType | PageKey | 'fabric' | 'azure' | 'databricksProduct' | 'run' | 'validate' | 'solution' | 'link' | 'trash' | 'settings' | 'learn', string> = {
  copy: '⇄', copyJob: '⇅', notebook: '⌘', storedProcedure: 'SP', dataflow: '◆', dbt: 'dbt', lookup: '⌕', foreach: '↻', if: '◇', script: '</>', invokePipeline: '⇥', web: '◎', delete: '⌫', wait: '◷', setVariable: '=V', appendVariable: '+V', until: '↺', eventstream: '≋', kql: 'KQ', databricks: 'DB',
  home: '⌂', 'case-study': 'CS', pipeline: '⤧', airflow: 'AF', toolchoice: '↯', practice: 'EX', challenge: 'E2E', production: 'OPS', recovery: '↺', sql: 'SQL', data: '▦', monitor: '◉', manage: '⚙', lakehouse: 'LH', runtime: '⚡', realtime: 'RT', governance: '◈', deployment: '⇧', copyjob: 'CJ',
  'dbx-home': 'DB', 'dbx-production': 'OPS', 'dbx-notebook': '⌘', 'dbx-catalog': 'UC', 'dbx-compute': 'CPU', 'dbx-pipelines': 'LP', 'dbx-jobs': 'LJ', 'dbx-sql': 'SQL', 'dbx-streaming': '≋', 'dbx-monitor': '◉', 'dbx-adf-integration': '↔',
  'powerbi-placeholder': 'PBI',
  fabric: 'F', azure: 'A', databricksProduct: 'DB', run: '▶', validate: '✓', solution: '☼', link: '→', trash: '×', settings: '⚙', learn: '?'
};

export type IconName = keyof typeof glyphs;

export function isIconName(name?: string): name is IconName {
  return Boolean(name && name in glyphs);
}

export function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  return <span className={`icon-glyph ${small ? 'icon-small' : ''}`}>{glyphs[name]}</span>;
}
