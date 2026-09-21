import * as React from 'react';
import type {RootBlock, RootNotebook} from '../notebook';
import type {Asset, ExerciseDefinition} from '../../../../packages/contracts/src/index.ts';
import {
  DEFAULT_LAYOUT, arenaBlocks, filterCommands, groupCatalog, isCode, layoutKey,
  normalizeLayout, readLayout, semanticBlocks, visiblePanelSizes, writeLayout,
  type DesktopLayout, type DesktopMode, type PaletteCommand,
} from './desktopModel';
import './desktop.css';

export type IconName = 'notebook' | 'table' | 'folder' | 'search' | 'play' | 'save' | 'plus' | 'chevron' | 'code' | 'canvas' | 'arena' | 'close' | 'panel' | 'swap' | 'focus' | 'check' | 'download' | 'info' | 'clock';
const paths: Record<IconName, string> = {
  notebook: 'M5 3h13v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M7 3v18M10 7h5M10 11h5',
  table: 'M3 4h18v16H3zM3 9h18M9 9v11M15 9v11M3 14h18',
  folder: 'M3 6h7l2 2h9v12H3zM3 6V4h7l2 2h7',
  search: 'M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14M15 15l6 6',
  play: 'M8 4l12 8-12 8z', save: 'M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8',
  plus: 'M12 5v14M5 12h14', chevron: 'M9 5l7 7-7 7', code: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 3l-4 18',
  canvas: 'M3 3h8v8H3zM15 3h6v6h-6zM3 15h6v6H3zM13 13h8v8h-8z',
  arena: 'M3 4h18v16H3zM10 4v16M10 15h11M5 8l2 2-2 2M13 8h5',
  close: 'M6 6l12 12M18 6L6 18', panel: 'M3 4h18v16H3zM15 4v16',
  swap: 'M3 7h16l-4-4M21 17H5l4 4', focus: 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',
  check: 'M4 12l5 5L20 6', download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v6M12 7v1',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l4 2',
};
export function Icon({name, size = 18}: {name: IconName; size?: number}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
function storage() {try {return window.localStorage;} catch {return null;}}

interface DividerProps {
  label: string; value: number; min: number; max: number; horizontal?: boolean; reverse?: boolean;
  onChange(value: number): void; onCommit?(): void;
}
/** Native pointer listeners work with mouse, touch and pen, with a keyboard alternative. */
class Divider extends React.Component<DividerProps> {
  private node: HTMLDivElement | null = null;
  private drag: {id: number; start: number; value: number} | null = null;
  componentDidMount() {this.node?.addEventListener('pointerdown', this.down);}
  componentWillUnmount() {this.node?.removeEventListener('pointerdown', this.down); this.cleanup();}
  private cleanup = () => {
    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    window.removeEventListener('pointercancel', this.up);
    window.removeEventListener('blur', this.up);
    document.body.classList.remove('dp-resizing');
    this.drag = null;
  };
  private down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault(); this.node?.focus();
    this.drag = {id: event.pointerId, start: this.props.horizontal ? event.clientY : event.clientX, value: this.props.value};
    document.body.classList.add('dp-resizing');
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    window.addEventListener('blur', this.up);
  };
  private move = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.id) return;
    const position = this.props.horizontal ? event.clientY : event.clientX;
    const direction = this.props.reverse ? -1 : 1;
    this.props.onChange(Math.max(this.props.min, Math.min(this.props.max, this.drag.value + (position - this.drag.start) * direction)));
  };
  private up = () => {if (this.drag) {this.cleanup(); this.props.onCommit?.();}};
  private key = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 40 : 16;
    const direction = this.props.reverse ? -1 : 1;
    let value = this.props.value;
    if (event.key === 'Home') value = this.props.min;
    else if (event.key === 'End') value = this.props.max;
    else if (event.key === (this.props.horizontal ? 'ArrowUp' : 'ArrowLeft')) value -= step * direction;
    else if (event.key === (this.props.horizontal ? 'ArrowDown' : 'ArrowRight')) value += step * direction;
    else return;
    event.preventDefault();
    this.props.onChange(Math.max(this.props.min, Math.min(this.props.max, value)));
    // onChange may be batched by React; parent persistence runs in its state callback.
  };
  render() {
    return <div ref={node => {this.node = node;}} role="separator" tabIndex={0} aria-label={this.props.label}
      aria-orientation={this.props.horizontal ? 'horizontal' : 'vertical'}
      aria-valuemin={this.props.min} aria-valuemax={this.props.max} aria-valuenow={Math.round(this.props.value)}
      className={`dp-divider ${this.props.horizontal ? 'dp-divider-horizontal' : ''}`} onKeyDown={this.key}><span/></div>;
  }
}

export interface NotebookDesktopProps {
  workspaceId: string; workspaceTitle: string; notebook: RootNotebook; mode: DesktopMode;
  assets: Asset[]; linkedNotebooks?: Array<{id: string; title: string}>;
  exercise?: ExerciseDefinition; selectedBlockId: string; busy: boolean; dirty: boolean;
  runtimeLabel: string; runtimeDetail: string; canRun: boolean; preview?: boolean; managed?: boolean;
  canvas: React.ReactNode; renderBlock(block: RootBlock): React.ReactNode;
  onMode(mode: DesktopMode): void; onSelect(id: string): void; onInspect(name: string): void;
  onOpenNotebook?(id: string): void; onAdd(kernel: 'sql' | 'python' | 'polars' | 'markdown'): void;
  onSave(): void; onRunAll(): void; onRunChecks?(): void; onSubmit?(): void;
  onExport(): void; onResetExercise?(): void;
}
interface DesktopState {
  layout: DesktopLayout; focus: boolean; width: number; search: string; selectedAsset: string;
  explorerTab: 'lakehouse' | 'files'; arenaTab: 'problem' | 'data' | 'hints' | 'problems';
  palette: boolean; commandQuery: string; commandIndex: number; warning: string;
  mobileExplorer: boolean; inspectorTab: 'context' | 'outline';
}
export class NotebookDesktop extends React.Component<NotebookDesktopProps, DesktopState> {
  state: DesktopState = {
    layout: {...DEFAULT_LAYOUT}, focus: false, width: 1200, search: '', selectedAsset: '',
    explorerTab: 'lakehouse', arenaTab: 'problem', palette: false, commandQuery: '', commandIndex: 0,
    warning: '', mobileExplorer: false, inspectorTab: 'context',
  };
  private root: HTMLDivElement | null = null;
  private paletteInput: HTMLInputElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private returnFocus: HTMLElement | null = null;
  private observer?: ResizeObserver;
  private saveTimer?: ReturnType<typeof setTimeout>;
  componentDidMount() {
    this.restoreLayout(); this.measure();
    if (typeof ResizeObserver !== 'undefined' && this.root) {
      this.observer = new ResizeObserver(this.measure); this.observer.observe(this.root);
    }
    window.addEventListener('resize', this.measure);
    window.addEventListener('keydown', this.shortcuts);
  }
  componentDidUpdate(previous: NotebookDesktopProps) {
    if (previous.workspaceId !== this.props.workspaceId || previous.notebook.id !== this.props.notebook.id) {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.restoreLayout();
      this.setState({selectedAsset: '', palette: false, search: '', mobileExplorer: false});
    }
  }
  componentWillUnmount() {
    this.observer?.disconnect();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.persist();
    window.removeEventListener('resize', this.measure);
    window.removeEventListener('keydown', this.shortcuts);
  }
  private key = () => layoutKey(this.props.workspaceId, this.props.notebook.id);
  private restoreLayout = () => {
    const saved = readLayout(storage(), this.key()); this.setState({layout: saved.layout, warning: saved.warning});
  };
  private measure = () => {if (this.root) this.setState({width: this.root.clientWidth});};
  private persist = () => writeLayout(storage(), this.key(), this.state.layout);
  private changeLayout = (patch: Partial<DesktopLayout>) => {
    this.setState(state => ({layout: normalizeLayout({...state.layout, ...patch})}), () => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {this.setState({warning: this.persist()});}, 160);
    });
  };
  private shortcuts = (event: KeyboardEvent) => {
    if (this.props.managed && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); this.openPalette();
    } else if (event.key === 'Escape') {
      if (this.state.palette) {event.preventDefault(); this.closePalette();}
      else if (this.state.mobileExplorer) this.setState({mobileExplorer: false});
      else if (this.state.focus) this.setState({focus: false});
    }
  };
  private openPalette = () => {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.setState({palette: true, commandQuery: '', commandIndex: 0}, () => this.paletteInput?.focus());
  };
  private closePalette = () => {this.setState({palette: false}, () => this.returnFocus?.focus());};
  private selectCell = (id: string) => {
    this.props.onSelect(id); this.setState({mobileExplorer: false});
    requestAnimationFrame(() => {
      const element = [...(this.root?.querySelectorAll<HTMLElement>('[data-block-id]') ?? [])].find(node => node.dataset.blockId === id);
      element?.scrollIntoView({block: 'nearest', behavior: 'auto'});
    });
  };
  private commands = (): PaletteCommand[] => [
    {id: 'save', kind: 'action', label: 'Save notebook', detail: 'Use the existing workspace save operation', disabled: this.props.busy, run: this.props.onSave},
    {id: 'notebook', kind: 'action', label: 'Notebook layout', detail: 'Fabric-inspired sequential notebook', run: () => this.props.onMode('notebook')},
    {id: 'canvas', kind: 'action', label: 'Free canvas', detail: 'Move and resize the same notebook blocks', run: () => this.props.onMode('canvas')},
    {id: 'focus', kind: 'action', label: this.state.focus ? 'Exit focus mode' : 'Focus mode', detail: 'Hide side panels without deleting them', run: () => this.setState({focus: !this.state.focus})},
    {id: 'side', kind: 'action', label: 'Move explorer to the other side', detail: 'Layout only; code and execution order do not change', run: () => this.changeLayout({explorerSide: this.state.layout.explorerSide === 'left' ? 'right' : 'left'})},
    {id: 'reset-panels', kind: 'action', label: 'Reset panel layout', detail: 'Restore panel sizes; never reset source', run: () => this.changeLayout({...DEFAULT_LAYOUT})},
    ...semanticBlocks(this.props.notebook).filter(b => b.type !== 'notebook-output').map(b => ({id: `cell:${b.id}`, kind: 'cell' as const, label: b.title, detail: `${b.kernel ?? 'notes'} cell`, run: () => this.selectCell(b.id)})),
    ...this.props.assets.map(a => ({id: `table:${a.name}`, kind: 'table' as const, label: a.name, detail: `${a.layer} table / ${a.row_count} rows`, run: () => this.inspect(a.name)})),
    ...(this.props.linkedNotebooks ?? []).map(n => ({id: `notebook:${n.id}`, kind: 'notebook' as const, label: n.title, detail: 'Workspace notebook', disabled: this.props.busy, run: () => this.props.onOpenNotebook?.(n.id)})),
  ];
  private inspect = (name: string) => {
    this.setState({selectedAsset: name, inspectorTab: 'context'});
    this.changeLayout({inspectorOpen: true});
  };
  private renderDataContext() {
    const contexts = this.props.exercise?.data_context ?? [];
    if (!contexts.length) return <div className="dp-empty"><Icon name="table" size={28}/><h3>Explore the shared catalog</h3><p>Select a table in Lakehouse. Metadata comes from the workspace; columns are never invented.</p><button className="dp-button" onClick={() => {this.changeLayout({explorerOpen: true}); this.setState({explorerTab: 'lakehouse', mobileExplorer: true});}}>Open lakehouse</button></div>;
    return <div className="dp-data-context">{contexts.map(context => <section key={context.name}><h3><Icon name="table"/>{context.name}</h3><table><thead><tr><th>Column</th><th>Type</th></tr></thead><tbody>{Object.entries(context.columns).map(([column, type]) => <tr key={column}><td><code>{column}</code></td><td>{type}</td></tr>)}</tbody></table>{context.sample_rows.length > 0 && <details><summary>Fixture sample rows</summary><pre>{JSON.stringify(context.sample_rows.slice(0, 5), null, 2)}</pre></details>}</section>)}</div>;
  }
  private renderExplorer() {
    const {notebook, linkedNotebooks, assets, busy} = this.props;
    const q = this.state.search.trim().toLocaleLowerCase();
    const cells = semanticBlocks(notebook).filter(b => b.type !== 'notebook-output' && (!q || `${b.title} ${b.kernel ?? ''}`.toLocaleLowerCase().includes(q)));
    const groups = groupCatalog(assets, this.state.search);
    return <aside className="dp-explorer" aria-label="Lakehouse and notebook explorer">
      <div className="dp-panel-title"><strong>Explorer</strong><div><button className="dp-icon-button" title="Move explorer to the other side" aria-label="Move explorer to the other side" onClick={() => this.changeLayout({explorerSide: this.state.layout.explorerSide === 'left' ? 'right' : 'left'})}><Icon name="swap"/></button><button className="dp-icon-button" aria-label="Close explorer" onClick={() => {this.changeLayout({explorerOpen: false}); this.setState({mobileExplorer: false});}}><Icon name="close"/></button></div></div>
      <div className="dp-tabs" role="tablist" aria-label="Explorer content">{(['lakehouse', 'files'] as const).map(tab => <button role="tab" key={tab} aria-selected={this.state.explorerTab === tab} onClick={() => this.setState({explorerTab: tab})}><Icon name={tab === 'lakehouse' ? 'table' : 'folder'}/>{tab === 'lakehouse' ? 'Lakehouse' : 'Notebooks'}</button>)}</div>
      <label className="dp-search"><Icon name="search" size={16}/><input aria-label="Filter explorer" placeholder="Find a table or notebook..." value={this.state.search} onChange={e => this.setState({search: e.target.value})}/>{q && <button aria-label="Clear explorer filter" className="dp-icon-button" onClick={() => this.setState({search: ''})}><Icon name="close" size={14}/></button>}</label>
      <div className="dp-explorer-scroll">
        {this.state.explorerTab === 'lakehouse' ? <div className="dp-tree"><div className="dp-tree-root"><Icon name="folder"/><b>Workspace lakehouse</b></div>{groups.map(group => <details open key={group.layer}><summary><span className={`dp-layer dp-layer-${group.layer}`}/>{group.layer}<span className="dp-count">{group.assets.length}</span></summary>{group.assets.map(asset => <button key={asset.name} className={`dp-tree-item ${this.state.selectedAsset === asset.name ? 'is-selected' : ''}`} title={asset.name} onClick={() => this.inspect(asset.name)}><Icon name="table" size={16}/><span>{asset.name.includes('.') ? asset.name.substring(asset.name.indexOf('.') + 1) : asset.name}</span><small>{asset.row_count.toLocaleString()}</small></button>)}</details>)}{!groups.length && <p className="dp-empty-inline">{assets.length ? 'No matching tables.' : 'No tables yet. This panel reads the shared workspace catalog.'}</p>}</div> : <div className="dp-tree"><div className="dp-tree-root"><Icon name="folder"/><b>Notebooks</b></div>{(linkedNotebooks ?? [{id: notebook.id, title: notebook.title}]).filter(n => !q || n.title.toLocaleLowerCase().includes(q)).map(n => <button key={n.id} className={`dp-tree-item ${n.id === notebook.id ? 'is-selected' : ''}`} disabled={busy} onClick={() => this.props.onOpenNotebook?.(n.id)}><Icon name="notebook" size={16}/><span>{n.title}</span></button>)}<div className="dp-tree-root dp-tree-subtitle"><span>IN THIS NOTEBOOK</span><small>{cells.length}</small></div>{cells.map((block, index) => <button key={block.id} className={`dp-tree-item ${block.id === this.props.selectedBlockId ? 'is-selected' : ''}`} onClick={() => this.selectCell(block.id)}><small className="dp-cell-number">{index + 1}</small><span>{block.title}</span><small>{block.kernel ?? 'MD'}</small></button>)}{!cells.length && <p className="dp-empty-inline">No matching cells.</p>}</div>}
      </div><div className="dp-explorer-note"><Icon name="info" size={15}/><span>One catalog. One notebook source.<br/>Different ways to work.</span></div>
    </aside>;
  }
  private renderInspector() {
    const asset = this.props.assets.find(a => a.name === this.state.selectedAsset);
    return <aside className="dp-inspector" aria-label="Context inspector"><div className="dp-panel-title"><strong>Context</strong><button className="dp-icon-button" aria-label="Close inspector" onClick={() => this.changeLayout({inspectorOpen: false})}><Icon name="close"/></button></div><div className="dp-tabs" role="tablist" aria-label="Inspector content"><button role="tab" aria-selected={this.state.inspectorTab === 'context'} onClick={() => this.setState({inspectorTab: 'context'})}>Table</button><button role="tab" aria-selected={this.state.inspectorTab === 'outline'} onClick={() => this.setState({inspectorTab: 'outline'})}>Outline</button></div>
      <div className="dp-inspector-scroll">{this.state.inspectorTab === 'outline' ? <div className="dp-outline"><h3>Execution order</h3><p>Moving a panel never changes this order.</p>{semanticBlocks(this.props.notebook).filter(isCode).map((b, i) => <button className="dp-tree-item" key={b.id} onClick={() => this.selectCell(b.id)}><small>{i + 1}</small><span>{b.title}</span></button>)}</div> : asset ? <div className="dp-asset-details"><div className="dp-asset-symbol"><Icon name="table" size={26}/></div><h3>{asset.name}</h3><span className={`dp-pill ${asset.fresh ? 'dp-pill-success' : 'dp-pill-warning'}`}>{asset.fresh ? 'Fresh' : 'Stale'}</span><dl><dt>Layer</dt><dd>{asset.layer}</dd><dt>Rows</dt><dd>{asset.row_count.toLocaleString()}</dd><dt>Producer</dt><dd>{asset.producer ?? 'Source table'}</dd>{asset.storage && <div className="dp-meta-block"><dt>Parquet files</dt><dd>{asset.storage.file_count}</dd><dt>Measured bytes</dt><dd>{asset.storage.size_bytes.toLocaleString()}</dd><dt>Snapshot</dt><dd>{asset.storage.snapshot_id ?? 'Unavailable'}</dd></div>}</dl><button className="dp-button dp-primary dp-full" disabled={this.props.busy} onClick={() => this.props.onInspect(asset.name)}><Icon name="code"/>Open SQL preview cell</button><p className="dp-subtle">Adds a SELECT cell. Nothing executes automatically.</p>{asset.storage && <small className="dp-truth-note">{asset.storage.truth}</small>}</div> : <div className="dp-empty"><Icon name="table" size={28}/><h3>Inspect a table</h3><p>Choose one in Lakehouse to see metadata and add a SQL preview cell.</p></div>}</div>
      <div className="dp-runtime-card"><span className="dp-eyebrow">RUNTIME TRUTH</span><b>{this.props.runtimeLabel}</b><p>{this.props.runtimeDetail}</p></div>
    </aside>;
  }
  private renderArena() {
    const {notebook, exercise} = this.props;
    const groups = arenaBlocks(notebook);
    const sides = visiblePanelSizes(this.state.layout, this.state.width, this.state.focus);
    const centerWidth = this.state.width - sides.explorer - sides.inspector - (sides.explorer ? 6 : 0) - (sides.inspector ? 6 : 0);
    const maxProblem = Math.min(650, Math.max(240, centerWidth - 326));
    const problemWidth = Math.min(this.state.layout.problemWidth, maxProblem);
    const tabs = [{id: 'problem', label: 'Description'}, {id: 'data', label: 'Data'}, {id: 'hints', label: 'Hints'}, {id: 'problems', label: 'Problems'}] as const;
    return <div className="dp-arena" style={{'--dp-problem': `${problemWidth}px`, '--dp-result': `${this.state.layout.resultHeight}px`} as React.CSSProperties}>
      <section className="dp-problem-pane" aria-label="Exercise problem"><div className="dp-tabs" role="tablist" aria-label="Exercise information">{tabs.map(tab => <button key={tab.id} role="tab" aria-selected={this.state.arenaTab === tab.id} onClick={() => this.setState({arenaTab: tab.id})}>{tab.label}</button>)}</div><div className="dp-problem-scroll">{this.state.arenaTab === 'problem' ? <div><div className="dp-problem-meta"><span className={`dp-pill ${exercise?.difficulty === 'easy' ? 'dp-pill-success' : ''}`}>{exercise?.difficulty ?? 'Exercise'}</span><span>{exercise?.language ?? 'Code'}</span></div>{groups.problems.map(b => <div key={b.id}>{this.props.renderBlock(b)}</div>)}</div> : this.state.arenaTab === 'data' ? this.renderDataContext() : (this.state.arenaTab === 'hints' ? groups.help : groups.browsers).map(b => <div key={b.id}>{this.props.renderBlock(b)}</div>)}</div></section>
      <Divider label="Resize problem panel" value={problemWidth} min={240} max={maxProblem} onChange={problemWidth => this.changeLayout({problemWidth})}/>
      <div className="dp-solution-pane"><section className="dp-answer-pane" aria-label="Exercise answer"><div className="dp-editor-heading"><span><Icon name="code"/>Solution</span><small>{exercise?.runtime ?? 'Shared notebook editor'}</small></div><div className="dp-answer-scroll">{groups.answers.map(b => <div key={b.id}>{this.props.renderBlock(b)}</div>)}{!groups.answers.length && <div className="dp-empty"><h3>Answer cell unavailable</h3><p>Your source has not been replaced. Reopen or restore this exercise.</p></div>}{groups.scratch.length > 0 && <details className="dp-scratch"><summary>Scratch cells ({groups.scratch.length})</summary>{groups.scratch.map(b => <div key={b.id}>{this.props.renderBlock(b)}</div>)}</details>}</div></section>
        <Divider label="Resize result panel" horizontal reverse value={this.state.layout.resultHeight} min={120} max={560} onChange={resultHeight => this.changeLayout({resultHeight})}/>
        <section className="dp-result-pane" aria-label="Exercise results"><div className="dp-editor-heading"><span><Icon name="check"/>Results &amp; attempts</span><small>{this.props.preview ? 'No code has been executed' : 'Run checks first; Submit records an attempt'}</small></div><div className="dp-result-scroll">{groups.results.map(b => <div key={b.id}>{this.props.renderBlock(b)}</div>)}{!groups.results.length && <div className="dp-empty-inline"><b>No result evidence yet.</b><p>Run visible checks when a local runtime is connected. Hidden tests remain server-owned.</p></div>}</div></section>
      </div>
    </div>;
  }
  private renderNotebook() {
    const blocks = semanticBlocks(this.props.notebook);
    return <div className="dp-notebook-scroll"><div className="dp-notebook-page"><div className="dp-document-heading"><span className="dp-eyebrow">NOTEBOOK / {this.props.workspaceTitle}</span><h1>{this.props.notebook.title}</h1><p>Explore your data, write code, keep the context alongside.</p></div>{blocks.filter(b => !['exercise-browser', 'exercise-help', 'problem'].includes(b.role ?? '')).map(block => <div key={block.id} className={`dp-flow-cell ${this.props.selectedBlockId === block.id ? 'is-active' : ''}`} onFocusCapture={() => this.props.onSelect(block.id)}>{this.props.renderBlock(block)}</div>)}<div className="dp-add-row"><span>Add a cell</span>{(['sql', 'python', 'polars', 'markdown'] as const).map(kernel => <button className="dp-button" key={kernel} disabled={this.props.busy} onClick={() => this.props.onAdd(kernel)}><Icon name="plus" size={14}/>{kernel === 'markdown' ? 'Text' : kernel === 'sql' ? 'SQL' : kernel[0].toUpperCase() + kernel.slice(1)}</button>)}</div></div></div>;
  }
  private renderPalette() {
    if (!this.state.palette) return null;
    const results = filterCommands(this.commands(), this.state.commandQuery);
    const active = Math.min(this.state.commandIndex, Math.max(0, results.length - 1));
    const choose = (command?: PaletteCommand) => {if (command && !command.disabled) {this.closePalette(); command.run();}};
    return <div className="dp-modal-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) this.closePalette();}}><div className="dp-command-dialog" role="dialog" aria-modal="true" aria-label="Command palette" ref={node => {this.dialog = node;}} onKeyDown={event => {
      if (event.key === 'Tab') {
        const nodes = [...(this.dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input') ?? [])];
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
      }
    }}><label className="dp-command-input"><Icon name="search"/><input ref={node => {this.paletteInput = node;}} aria-label="Search commands" aria-controls="dp-command-results" aria-activedescendant={results.length ? `dp-command-${active}` : undefined} role="combobox" aria-expanded="true" autoComplete="off" value={this.state.commandQuery} placeholder="Search commands, cells and tables..." onChange={event => this.setState({commandQuery: event.target.value, commandIndex: 0})} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault(); this.setState({commandIndex: Math.max(0, Math.min(results.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))});}
      if (event.key === 'Enter') {event.preventDefault(); choose(results[active]);}
    }}/><button className="dp-icon-button" aria-label="Close command palette" onClick={this.closePalette}><Icon name="close"/></button></label><div id="dp-command-results" role="listbox" aria-label="Matching commands" className="dp-command-results">{results.map((command, index) => <button key={command.id} id={`dp-command-${index}`} role="option" aria-selected={index === active} disabled={command.disabled} className={index === active ? 'is-selected' : ''} onMouseEnter={() => this.setState({commandIndex: index})} onClick={() => choose(command)}><Icon name={command.kind === 'table' ? 'table' : command.kind === 'cell' ? 'code' : command.kind === 'notebook' ? 'notebook' : 'chevron'}/><span><b>{command.label}</b><small>{command.detail}</small></span><small>{command.kind}</small></button>)}{!results.length && <p className="dp-empty-inline">No matching commands.</p>}</div><footer><span>Arrow keys to navigate</span><span>Enter to select / Esc to close</span></footer></div></div>;
  }
  render() {
    const {layout, focus, width} = this.state;
    const sizes = visiblePanelSizes(layout, width, focus);
    const leftExplorer = layout.explorerSide === 'left';
    const leftWidth = leftExplorer ? sizes.explorer : sizes.inspector;
    const rightWidth = leftExplorer ? sizes.inspector : sizes.explorer;
    const divider = (explorer: boolean, reverse: boolean) => <Divider label={explorer ? 'Resize explorer' : 'Resize inspector'} value={explorer ? layout.explorerWidth : layout.inspectorWidth} min={explorer ? 180 : 200} max={460} reverse={reverse} onChange={value => this.changeLayout(explorer ? {explorerWidth: value} : {inspectorWidth: value})}/>;
    const canExecute = this.props.canRun && !this.props.busy;
    return <div ref={node => {this.root = node;}} className={`dp-desktop dp-mode-${this.props.mode} ${focus ? 'dp-focused' : ''} ${layout.compact ? 'dp-compact' : ''}`} data-testid="notebook-desktop">
      <div className="dp-document-tabs"><div className="dp-document-tab"><Icon name="notebook"/><span>{this.props.notebook.title}</span><span className={`dp-save-dot ${this.props.dirty ? 'is-dirty' : ''}`} title={this.props.dirty ? 'Unsaved notebook changes' : 'Saved'}/></div><button className="dp-command-trigger" onClick={this.openPalette}><Icon name="search" size={15}/><span>Search workspace</span><kbd>Ctrl K</kbd></button></div>
      <div className="dp-toolbar"><div className="dp-mode-switch" role="group" aria-label="Notebook presentation">{([{id: 'notebook', label: 'Notebook', icon: 'notebook'}, {id: 'canvas', label: 'Canvas', icon: 'canvas'}, {id: 'arena', label: 'Arena', icon: 'arena'}] as const).map(mode => <button key={mode.id} aria-pressed={this.props.mode === mode.id} disabled={this.props.busy || (mode.id === 'arena' && !this.props.exercise)} title={mode.id === 'arena' && !this.props.exercise ? 'Open an exercise to use Arena' : mode.label} onClick={() => this.props.onMode(mode.id)}><Icon name={mode.icon} size={16}/><span>{mode.label}</span></button>)}</div><div className="dp-toolbar-divider"/>{this.props.mode === 'arena' ? <div className="dp-run-actions"><button className="dp-button" title={canExecute ? 'Run visible checks' : 'Connect a local runtime to execute'} disabled={!canExecute || !this.props.onRunChecks} onClick={this.props.onRunChecks}><Icon name="play" size={15}/>Run</button><button className="dp-button dp-primary" title="Submit records a graded attempt; it does not just run the editor" disabled={!canExecute || !this.props.onSubmit} onClick={this.props.onSubmit}>Submit</button></div> : <button className="dp-button dp-primary" disabled={!canExecute} title={canExecute ? 'Run in semantic notebook order' : 'No runtime connected. Source remains editable.'} onClick={this.props.onRunAll}><Icon name="play" size={15}/>Run all</button>}<button className="dp-button" aria-label="Save notebook" disabled={this.props.busy} onClick={this.props.onSave}><Icon name="save" size={15}/><span>Save</span></button><button className="dp-icon-button" title="Export notebook" aria-label="Export notebook" onClick={this.props.onExport}><Icon name="download"/></button>
        <div className="dp-toolbar-end"><button className="dp-icon-button" aria-label="Toggle explorer" aria-pressed={layout.explorerOpen} onClick={() => sizes.compactViewport ? this.setState({mobileExplorer: !this.state.mobileExplorer}) : this.changeLayout({explorerOpen: !layout.explorerOpen})}><Icon name="folder"/></button><button className="dp-icon-button" aria-label="Toggle context inspector" aria-pressed={layout.inspectorOpen} onClick={() => this.changeLayout({inspectorOpen: !layout.inspectorOpen})}><Icon name="panel"/></button><button className="dp-icon-button" aria-label={focus ? 'Exit focus mode' : 'Enter focus mode'} aria-pressed={focus} onClick={() => this.setState({focus: !focus})}><Icon name="focus"/></button><details className="dp-options"><summary aria-label="More layout options">...</summary><div><button onClick={() => this.changeLayout({compact: !layout.compact})}>{layout.compact ? 'Comfortable density' : 'Compact density'}</button><button onClick={() => this.changeLayout({...DEFAULT_LAYOUT})}>Reset panel layout</button>{this.props.mode === 'arena' && this.props.onResetExercise && <button disabled={this.props.busy} onClick={() => {if (window.confirm('Reset this exercise to its starter? Your edited answer will be replaced.')) this.props.onResetExercise?.();}}>Reset exercise source...</button>}</div></details></div>
      </div>
      <div className="dp-runtime-line"><span className={`dp-runtime-dot ${this.props.canRun ? '' : 'dp-runtime-offline'}`}/><b>{this.props.runtimeLabel}</b><span className="dp-runtime-detail" title={this.props.runtimeDetail}>{this.props.runtimeDetail}</span><span className="dp-local-badge">{this.props.preview ? 'UI PREVIEW / NO EXECUTION' : 'SHARED WORKSPACE'}</span></div>
      {this.state.warning && <div role="status" className="dp-warning">{this.state.warning}<button onClick={() => this.setState({warning: ''})} aria-label="Dismiss layout warning">Dismiss</button></div>}
      <div className="dp-body" style={{gridTemplateColumns: `${leftWidth}px ${leftWidth ? 6 : 0}px minmax(0, 1fr) ${rightWidth ? 6 : 0}px ${rightWidth}px`} as React.CSSProperties}>
        <div className="dp-left-slot">{leftWidth > 0 && (leftExplorer ? this.renderExplorer() : this.renderInspector())}</div>{leftWidth > 0 ? divider(leftExplorer, false) : <div/>}
        <main className="dp-center" aria-label="Notebook coding area">{this.props.mode === 'arena' ? this.renderArena() : this.props.mode === 'canvas' ? <div className="dp-canvas-scroll"><div className="dp-canvas-caption"><Icon name="canvas"/><span>Drag cell headers. Resize corners. Source and execution order stay unchanged.</span></div>{this.props.canvas}</div> : this.renderNotebook()}</main>
        {rightWidth > 0 ? divider(!leftExplorer, true) : <div/>}<div className="dp-right-slot">{rightWidth > 0 && (leftExplorer ? this.renderInspector() : this.renderExplorer())}</div>
      </div>
      <div className="dp-bottom-bar"><span><Icon name="notebook" size={13}/>{semanticBlocks(this.props.notebook).filter(isCode).length} code cells<span className="dp-dot-divider">/</span>{this.props.assets.length} catalog tables</span><span>{focus ? 'Focus mode / Esc to exit' : 'Panel preferences / this browser'}<span className="dp-dot-divider">/</span>{this.props.busy ? 'Working' : this.props.dirty ? 'Unsaved notebook edits' : 'Ready'}</span></div>
      {sizes.compactViewport && this.state.mobileExplorer && <div className="dp-drawer-backdrop" onClick={e => {if (e.target === e.currentTarget) this.setState({mobileExplorer: false});}}><div className="dp-mobile-explorer">{this.renderExplorer()}</div></div>}
      {layout.inspectorOpen && sizes.inspector === 0 && !focus && <div className="dp-floating-inspector">{this.renderInspector()}</div>}
      {this.renderPalette()}
    </div>;
  }
}
