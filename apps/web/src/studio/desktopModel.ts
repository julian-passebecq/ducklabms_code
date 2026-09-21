/** Presentation-only utilities. No source writes, execution, upload or grading. */
export type DesktopMode = 'notebook' | 'canvas' | 'arena';
export interface DesktopLayout {
  version: 1;
  explorerSide: 'left' | 'right';
  explorerOpen: boolean;
  inspectorOpen: boolean;
  explorerWidth: number;
  inspectorWidth: number;
  problemWidth: number;
  resultHeight: number;
  compact: boolean;
}
export const DEFAULT_LAYOUT: Readonly<DesktopLayout> = Object.freeze({
  version: 1, explorerSide: 'left', explorerOpen: true, inspectorOpen: false,
  explorerWidth: 244, inspectorWidth: 264, problemWidth: 330,
  resultHeight: 230, compact: false,
});
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), Math.max(min, max));
}
export function normalizeLayout(value: unknown): DesktopLayout {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {...DEFAULT_LAYOUT};
  const v = value as Partial<DesktopLayout>;
  if (v.version !== 1) return {...DEFAULT_LAYOUT};
  const n = (x: unknown, fallback: number, min: number, max: number) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.round(clamp(x, min, max)) : fallback;
  return {
    version: 1,
    explorerSide: v.explorerSide === 'right' ? 'right' : 'left',
    explorerOpen: typeof v.explorerOpen === 'boolean' ? v.explorerOpen : true,
    inspectorOpen: typeof v.inspectorOpen === 'boolean' ? v.inspectorOpen : false,
    explorerWidth: n(v.explorerWidth, 244, 180, 460),
    inspectorWidth: n(v.inspectorWidth, 264, 200, 460),
    problemWidth: n(v.problemWidth, 330, 240, 650),
    resultHeight: n(v.resultHeight, 230, 120, 560),
    compact: v.compact === true,
  };
}
export function layoutKey(workspace: string, notebook: string): string {
  return `datapass:desktop:v1:${encodeURIComponent(workspace)}:${encodeURIComponent(notebook)}`;
}
export interface StoragePort {getItem(key: string): string | null; setItem(key: string, value: string): void}
export function readLayout(storage: StoragePort | null, key: string): {layout: DesktopLayout; warning: string} {
  try {
    const text = storage?.getItem(key);
    if (!text) return {layout: {...DEFAULT_LAYOUT}, warning: ''};
    return {layout: normalizeLayout(JSON.parse(text)), warning: ''};
  } catch {
    return {layout: {...DEFAULT_LAYOUT}, warning: 'Saved panel layout is unavailable. Defaults are in use; notebook source is unchanged.'};
  }
}
export function writeLayout(storage: StoragePort | null, key: string, layout: DesktopLayout): string {
  try {
    if (!storage) throw new Error('Storage unavailable');
    storage.setItem(key, JSON.stringify(normalizeLayout(layout)));
    return '';
  } catch {
    return 'Panel layout could not be saved in this browser. Current panels remain usable; notebook source is unchanged.';
  }
}
export interface BlockShape {
  id: string; title: string; type: string; role?: string; kernel?: string; exerciseId?: string;
  readOnly?: boolean; notebook?: {cellId: string; parentCellId?: string};
}
export interface NotebookShape<B extends BlockShape = BlockShape> {
  id: string; title: string; blocks: B[]; views: Array<{id: string; blockIds: string[]}>;
  exercise?: {id: string; version: string};
}
export function isCode(block: BlockShape): boolean {
  return ['sql', 'python', 'polars'].includes(block.type) && !block.readOnly;
}
/** Same semantic order used by App.runAll. Never sort by canvas coordinates. */
export function semanticBlocks<B extends BlockShape>(notebook: NotebookShape<B>): B[] {
  const byId = new Map(notebook.blocks.map(b => [b.id, b]));
  const ids = notebook.views.find(v => v.id === 'notebook')?.blockIds ?? notebook.blocks.map(b => b.id);
  const seen = new Set<string>();
  return ids.flatMap(id => {
    const block = byId.get(id);
    if (!block || seen.has(id)) return [];
    seen.add(id);
    return [block];
  });
}
export function arenaBlocks<B extends BlockShape>(notebook: NotebookShape<B>) {
  const blocks = semanticBlocks(notebook);
  // Browser/problem/help panels need not be in the semantic notebook view.
  const answers = notebook.exercise ? blocks.filter(b => isCode(b) && b.exerciseId === notebook.exercise!.id) : [];
  const answerIds = new Set(answers.map(b => b.notebook?.cellId ?? b.id));
  return {
    answers,
    scratch: blocks.filter(b => isCode(b) && !answers.some(a => a.id === b.id)),
    problems: notebook.blocks.filter(b => b.role === 'problem'),
    help: notebook.blocks.filter(b => b.role === 'exercise-help'),
    browsers: notebook.blocks.filter(b => b.role === 'exercise-browser'),
    results: notebook.blocks.filter(b => b.type === 'notebook-output' && answerIds.has(b.notebook?.parentCellId ?? '')),
  };
}
export interface CatalogShape {name: string; layer: string; row_count: number; fresh: boolean}
export function groupCatalog<T extends CatalogShape>(assets: T[], query: string): Array<{layer: string; assets: T[]}> {
  const q = query.trim().toLocaleLowerCase();
  const layers = ['source', 'bronze', 'silver', 'gold', 'warehouse', 'features', 'metrics'];
  const groups = new Map<string, T[]>();
  for (const asset of assets) {
    if (q && !`${asset.name} ${asset.layer}`.toLocaleLowerCase().includes(q)) continue;
    groups.set(asset.layer, [...(groups.get(asset.layer) ?? []), asset]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = layers.indexOf(a), bi = layers.indexOf(b);
    return (ai < 0 ? layers.length : ai) - (bi < 0 ? layers.length : bi) || a.localeCompare(b);
  }).map(([layer, rows]) => ({layer, assets: rows.slice().sort((a, b) => a.name.localeCompare(b.name))}));
}
/** Quotes each SQL identifier segment; a catalog name can never inject a second statement. */
export function previewSql(name: string): string {
  if (typeof name !== 'string' || !name.trim() || name.includes('\0')) throw new Error('Invalid catalog name');
  const parts = name.split('.');
  if (parts.some(part => !part.length)) throw new Error('Invalid catalog name');
  return `SELECT * FROM ${parts.map(p => `"${p.replaceAll('"', '""')}"`).join('.')} LIMIT 100`;
}
export function visiblePanelSizes(layout: DesktopLayout, width: number, focus: boolean) {
  const compactViewport = width < 900;
  const available = Math.max(0, width - 420);
  let explorer = layout.explorerOpen && !focus && !compactViewport ? Math.min(layout.explorerWidth, available) : 0;
  let inspector = layout.inspectorOpen && !focus && width >= 1180 ? Math.min(layout.inspectorWidth, Math.max(0, available - explorer)) : 0;
  if (inspector && inspector < 200) inspector = 0;
  if (explorer && explorer < 180) explorer = 0;
  return {explorer, inspector, compactViewport};
}
export interface PaletteCommand {id: string; label: string; detail: string; kind: 'action' | 'cell' | 'table' | 'notebook'; disabled?: boolean; run(): void}
export function filterCommands(commands: PaletteCommand[], query: string): PaletteCommand[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.filter(c => terms.every(t => `${c.label} ${c.detail}`.toLocaleLowerCase().includes(t))).slice(0, 80);
}

/** Optional presentation metadata; old notebooks safely keep their default view. */
export function normalizePreferredView(value: unknown, views: Array<{id: string}>): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= 100 && (value === 'practice' || views.some(v => v.id === value && !v.id.startsWith('saved-practice-'))) ? value : undefined;
}
