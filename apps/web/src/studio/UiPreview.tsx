import * as React from 'react';
import {Icon, NotebookDesktop} from './NotebookDesktop';
import type {RootBlock, RootNotebook} from '../notebook';
import {clamp, previewSql, semanticBlocks, type DesktopMode} from './desktopModel';
import {PREVIEW_ASSETS, PREVIEW_EXERCISES, PREVIEW_STORAGE_KEY, SAMPLE_ROWS, fixtureKey, fixtureSource, makeExerciseFixture, makeNotebookFixture, readFixtureDocuments} from './previewFixtures';
import './preview.css';
import {indentSelection, insertNewline, toggleLineComment} from './editorEdits';
import {AnalyticsWorkbench} from './analytics/AnalyticsWorkbench';
import {LAB_KEY, readProject} from './analytics/project';

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function highlight(source: string): React.ReactNode[] {
  // JSX text escaping remains in control. No HTML injection or eval.
  const regex = /(--[^\n]*|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:SELECT|FROM|WHERE|GROUP|BY|ORDER|DESC|ASC|AS|SUM|COUNT|ROUND|LIMIT|def|return|for|in|if|import|False|True|None)\b|\b\d+(?:\.\d+)?\b)/g;
  const parts = source.split(regex);
  return parts.map((part, i) => <span key={i} className={i % 2 === 0 ? '' : part.startsWith('--') || part.startsWith('#') ? 'pv-token-comment' : /^["']/.test(part) ? 'pv-token-string' : /^\d/.test(part) ? 'pv-token-number' : 'pv-token-keyword'}>{part}</span>);
}
class PreviewEditor extends React.Component<{source: string; label: string; language: string; onChange(source: string): void}, {tabMovesFocus: boolean}> {
  state = {tabMovesFocus: false};
  private backdrop: HTMLPreElement | null = null;
  render() {
    return <div className="pv-editor"><div className="pv-line-numbers" aria-hidden="true">{this.props.source.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}</div><div className="pv-code-surface"><pre ref={node => {this.backdrop = node;}} aria-hidden="true">{highlight(this.props.source)}{'\n'}</pre><textarea aria-label={this.props.label} spellCheck={false} autoCapitalize="off" autoComplete="off" value={this.props.source} onChange={e => this.props.onChange(e.target.value)} onScroll={e => {if (this.backdrop) {this.backdrop.scrollTop = e.currentTarget.scrollTop; this.backdrop.scrollLeft = e.currentTarget.scrollLeft;}}} onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Escape') {this.setState({tabMovesFocus: true}); return;}
      const node = e.currentTarget, start = node.selectionStart, end = node.selectionEnd;
      const language = this.props.language;
      const edit = e.key === 'Tab' && !this.state.tabMovesFocus ? indentSelection(this.props.source, start, end, e.shiftKey)
        : e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey ? insertNewline(this.props.source, start, end, language)
        : (e.ctrlKey || e.metaKey) && e.key === '/' ? toggleLineComment(this.props.source, start, end, language) : null;
      if (edit) {e.preventDefault(); this.props.onChange(edit.value); requestAnimationFrame(() => node.setSelectionRange(edit.start, edit.end));}
    }}/></div><button className="pv-tab-mode" onClick={() => this.setState({tabMovesFocus: !this.state.tabMovesFocus})}>{this.state.tabMovesFocus ? 'Tab moves focus / click to indent' : 'Tab indents / Esc to move focus'}</button></div>;
  }
}
interface CanvasProps {notebook: RootNotebook; renderBlock(block: RootBlock): React.ReactNode; onLayout(layout: RootNotebook['views'][number]['layout']): void}
/** Harness-only pointer driver over the real NotebookView.layout shape. Production uses NotebookCanvas/react-grid-layout. */
class FixtureCanvas extends React.Component<CanvasProps> {
  private root: HTMLDivElement | null = null;
  private drag: {id: string; pointer: number; resize: boolean; x: number; y: number; col: number; item: RootNotebook['views'][number]['layout'][number]; layout: RootNotebook['views'][number]['layout']} | null = null;
  componentDidMount() {this.root?.addEventListener('pointerdown', this.down);}
  componentWillUnmount() {this.root?.removeEventListener('pointerdown', this.down); this.up();}
  private down = (e: PointerEvent) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const handle = e.target.closest<HTMLElement>('[data-drag-id], [data-resize-id]');
    if (!handle) return;
    const id = handle.dataset.dragId ?? handle.dataset.resizeId;
    const layout = this.props.notebook.views.find(v => v.id === 'free')?.layout ?? [];
    const item = layout.find(i => i.i === id);
    if (!item || !this.root) return;
    e.preventDefault();
    this.drag = {id: item.i, pointer: e.pointerId, resize: !!handle.dataset.resizeId, x: e.clientX, y: e.clientY, col: this.root.clientWidth / 12, item: {...item}, layout};
    window.addEventListener('pointermove', this.move); window.addEventListener('pointerup', this.up); window.addEventListener('pointercancel', this.up); window.addEventListener('blur', this.up);
  };
  private move = (e: PointerEvent) => {
    const d = this.drag; if (!d || e.pointerId !== d.pointer) return;
    const dx = Math.round((e.clientX - d.x) / d.col), dy = Math.round((e.clientY - d.y) / 24);
    const item = d.resize ? {...d.item, w: clamp(d.item.w + dx, 4, 12 - d.item.x), h: clamp(d.item.h + dy, 8, 40)} : {...d.item, x: clamp(d.item.x + dx, 0, 12 - d.item.w), y: clamp(d.item.y + dy, 0, 200)};
    this.props.onLayout(d.layout.map(i => i.i === d.id ? item : i));
  };
  private up = () => {this.drag = null; window.removeEventListener('pointermove', this.move); window.removeEventListener('pointerup', this.up); window.removeEventListener('pointercancel', this.up); window.removeEventListener('blur', this.up);};
  render() {
    const layout = this.props.notebook.views.find(v => v.id === 'free')?.layout ?? [];
    return <div ref={node => {this.root = node;}} className="pv-canvas" style={{height: Math.max(650, ...layout.map(i => (i.y + i.h) * 24 + 16))}}>{layout.map(item => {
      const b = this.props.notebook.blocks.find(b => b.id === item.i); if (!b) return null;
      return <div key={b.id} className="pv-canvas-card" style={{left: `calc(${item.x / 12 * 100}% + 7px)`, top: item.y * 24, width: `calc(${item.w / 12 * 100}% - 14px)`, height: item.h * 24}}><div className="pv-canvas-handle" data-drag-id={b.id}><span>::</span>{b.title}<small>Drag</small></div><div className="pv-canvas-content">{this.props.renderBlock(b)}</div><button className="pv-canvas-resize" data-resize-id={b.id} aria-label={`Resize ${b.title}`} title="Drag to resize" onKeyDown={e => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault(); const next = {...item, w: clamp(item.w + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0), 4, 12 - item.x), h: clamp(item.h + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0), 8, 40)};
        this.props.onLayout(layout.map(i => i.i === item.i ? next : i));
      }}>\</button></div>;
    })}</div>;
  }
}
function fixtureMode(notebook: RootNotebook): DesktopMode {return notebook.preferredView === 'free' ? 'canvas' : notebook.preferredView === 'notebook' ? 'notebook' : notebook.exercise ? 'arena' : 'notebook';}
interface PreviewState {documents: Record<string, RootNotebook>; activeId: string; mode: DesktopMode; selected: string; dirty: boolean; notice: string; hints: boolean; notesEditing: string | null}
export class UiPreview extends React.Component<{analytics?: boolean}, PreviewState> {
  private seed = makeNotebookFixture();
  state: PreviewState = {documents: {[this.seed.id]: this.seed}, activeId: this.seed.id, mode: 'notebook', selected: 'revenue', dirty: false, notice: '', hints: false, notesEditing: null};
  private counter = 0;
  componentDidMount() {
    try {
      const raw = localStorage.getItem(this.props.analytics ? 'datapass:ui-fixture-notebooks:m2' : PREVIEW_STORAGE_KEY);
      if (raw) {const docs = readFixtureDocuments(raw); this.setState({documents: {...this.state.documents, ...docs}, mode: fixtureMode(docs[this.seed.id] ?? this.seed), notice: 'Restored UI fixture notebooks from this browser. No execution evidence was loaded.'});}
    } catch {this.setState({notice: 'Browser fixture storage could not be read. Fresh examples loaded; nothing was executed.'});}
    window.addEventListener('beforeunload', this.unload);
  }
  componentWillUnmount() {window.removeEventListener('beforeunload', this.unload);}
  private unload = (e: BeforeUnloadEvent) => {if (this.state.dirty) {e.preventDefault(); e.returnValue = '';}};
  private notebook = () => this.state.documents[this.state.activeId];
  private update = (notebook: RootNotebook) => this.setState(s => ({documents: {...s.documents, [notebook.id]: notebook}, dirty: true}));
  private changeSource = (id: string, source: string) => {
    const n = this.notebook(), b = n.blocks.find(b => b.id === id); if (!b) return;
    this.update({...n, blockState: {...n.blockState, [fixtureKey(b)]: source}});
  };
  private open = (id: string) => {
    const doc = this.state.documents[id]; if (!doc) return;
    this.setState({activeId: id, selected: semanticBlocks(doc).find(b => b.kernel)?.id ?? doc.blocks[0]?.id ?? '', mode: fixtureMode(doc), hints: false});
  };
  private openExercise = (index: number) => {
    const exercise = PREVIEW_EXERCISES[index], fresh = makeExerciseFixture(exercise);
    this.setState(s => ({documents: {...s.documents, [fresh.id]: s.documents[fresh.id] ?? fresh}, activeId: fresh.id, selected: 'answer', mode: 'arena', hints: false}));
  };
  private add = (kernel: 'sql' | 'python' | 'polars' | 'markdown', source?: string) => {
    const n = this.notebook(), id = `ui-${Date.now()}-${++this.counter}`;
    const block: RootBlock = {id, title: kernel === 'markdown' ? 'New note' : `New ${kernel.toUpperCase()} cell`, type: kernel, ...(kernel === 'markdown' ? {} : {kernel}), role: kernel === 'markdown' ? 'note' : 'code', notebook: {source: 'ipynb', cellId: id, cellType: kernel === 'markdown' ? 'markdown' : 'code', originalIndex: n.blocks.length}};
    const next = {...n, blocks: [...n.blocks, block], blockState: {...n.blockState, [fixtureKey(block)]: source ?? (kernel === 'markdown' ? '# Notes\n\nWrite your observations.' : kernel === 'sql' ? '-- Write your SQL here\n' : '# Write your code here\n')}, views: n.views.map(v => ({...v, blockIds: [...v.blockIds, id], layout: [...v.layout, {i: id, x: 0, y: Math.max(0, ...v.layout.map(i => i.y + i.h)) + 1, w: v.id === 'free' ? 6 : 12, h: 12}]}))};
    this.update(next); this.setState({selected: id, mode: 'notebook'});
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.scrollIntoView({block: 'nearest'}), 80);
  };
  private save = () => {
    try {readFixtureDocuments(JSON.stringify(this.state.documents));localStorage.setItem(this.props.analytics ? 'datapass:ui-fixture-notebooks:m2' : PREVIEW_STORAGE_KEY, JSON.stringify(this.state.documents)); this.setState({dirty: false, notice: 'UI fixture notebook sources saved in this browser. Export JSON for a portable backup.'});}
    catch {this.setState({notice: 'Save failed: browser storage is unavailable or full. Your edits remain in memory. Export JSON now to keep a copy.'});}
  };
  private renderBlock = (block: RootBlock) => {
    const n = this.notebook(), exercise = PREVIEW_EXERCISES.find(e => e.id === n.exercise?.id);
    let content: React.ReactNode;
    if (block.role === 'problem' && exercise) content = <div className="lesson-pane"><h2>{exercise.title}</h2><p>{exercise.prompt}</p>{exercise.sections.map(s => <section key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>)}<div className="pv-problem-example"><b>Example</b><pre>{exercise.language === 'sql' ? 'customer_id | orders | revenue\n101         | 1      | 125.50\n102         | 1      |  89.00' : 'Input:  [{order_id: 1}, {order_id: 1}, {order_id: 2}]\nOutput: [{order_id: 1}, {order_id: 2}]'}</pre><small>Illustrative example, not a check result.</small></div><h3>Keep in mind</h3><p>{exercise.language === 'sql' ? 'Null amounts do not satisfy net_amount > 0. Return one row per customer.' : 'Rows are dictionaries. Preserve the first full row, not just the identifier.'}</p></div>;
    else if (block.role === 'exercise-help' && exercise) content = <div className="lesson-pane"><h3>A nudge, not the answer</h3><p>Try solving the problem before revealing the hint.</p><button className="dp-button" onClick={() => this.setState({hints: !this.state.hints})}>{this.state.hints ? 'Hide hint' : 'Reveal hint'}</button>{this.state.hints && <p className="pv-hint">{exercise.hints[0]}</p>}<hr/><h3>Run versus Submit</h3><p>In the connected app, Run executes visible checks. Submit runs the configured grading checks and records an attempt. This fixture does neither.</p></div>;
    else if (block.role === 'exercise-browser') content = <div className="lesson-pane"><h3>UI practice fixtures</h3>{PREVIEW_EXERCISES.map((e, i) => <button key={e.id} className="pv-exercise-link" onClick={() => this.openExercise(i)}><b>{e.title}</b><small>{e.language.toUpperCase()} / Easy / UI fixture only</small></button>)}</div>;
    else if (block.type === 'notebook-output') content = n.exercise ? <div className="pv-not-run"><span className="dp-pill">Not run</span><h3>Your result evidence will appear here</h3><p>The editor and layout work without infrastructure. Running and grading require the local Datapass API. No result or attempt has been fabricated.</p><div><span>Visible checks</span><b>Not executed</b></div><div><span>Hidden checks</span><b>Server-owned</b></div></div> : <div className="pv-table-wrap"><div className="pv-example-label"><Icon name="info" size={14}/><span>Example output / not executed / does not change when you edit code</span></div><table className="pv-table"><thead><tr>{Object.keys(SAMPLE_ROWS[0]).map(k => <th key={k}>{k}<small>{k === 'customer_name' ? 'VARCHAR' : k === 'revenue' ? 'DECIMAL' : 'INTEGER'}</small></th>)}</tr></thead><tbody>{SAMPLE_ROWS.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table><div className="pv-table-footer">{SAMPLE_ROWS.length} sample rows<span>Fixture data, not runtime evidence</span></div></div>;
    else if (block.type === 'markdown') {
      const source = fixtureSource(n, block);
      content = this.state.notesEditing === block.id ? <div className="pv-note-edit"><textarea aria-label={`Edit ${block.title}`} value={source} onChange={e => this.changeSource(block.id, e.target.value)}/><button className="dp-button" onClick={() => this.setState({notesEditing: null})}>Preview text</button></div> : <div className="pv-markdown" onDoubleClick={() => this.setState({notesEditing: block.id})}>{source.split('\n').filter(Boolean).map((line, i) => line.startsWith('# ') ? <h2 key={i}>{line.slice(2)}</h2> : <p key={i}>{line}</p>)}<button className="pv-edit-note" onClick={() => this.setState({notesEditing: block.id})}>Edit text</button></div>;
    } else content = <div><div className="pv-kernel"><span><span className="pv-kernel-icon">{block.kernel === 'sql' ? 'SQL' : 'Py'}</span>{block.kernel === 'sql' ? 'SQL' : block.kernel === 'polars' ? 'Polars' : 'Python'}</span><small>Editable / runtime disconnected</small></div><PreviewEditor source={fixtureSource(n, block)} label={`Source: ${block.title}`} language={block.kernel??'sql'} onChange={source => this.changeSource(block.id, source)}/><div className="pv-cell-footer"><span>Tab inserts 4 spaces</span><span>No execution in UI preview</span></div></div>;
    return <section className={`notebook-block pv-block pv-block-${block.type}`} data-block-id={block.id}><header className="block-header"><div className="block-drag-handle"><Icon name={block.type === 'notebook-output' ? 'table' : block.type === 'markdown' ? 'notebook' : 'code'} size={15}/><b>{block.title}</b></div><div className="block-actions"><span>{block.kernel?.toUpperCase() ?? (block.type === 'notebook-output' ? 'OUTPUT SHAPE' : 'TEXT')}</span></div></header><div className="block-body">{content}</div></section>;
  };
  render() {
    const n = this.notebook(), exercise = PREVIEW_EXERCISES.find(e => e.id === n.exercise?.id);
    const analytics=readProject(n.blockState[LAB_KEY]);
    const desktop=<NotebookDesktop key={n.id} managed={this.props.analytics} workspaceId="ui-fixture-workspace" workspaceTitle="Retail analytics" notebook={n} mode={this.state.mode} assets={PREVIEW_ASSETS} linkedNotebooks={Object.values(this.state.documents)} exercise={exercise} selectedBlockId={this.state.selected} busy={false} dirty={this.state.dirty} runtimeLabel="UI preview / disconnected" runtimeDetail="Fixture catalog only. No Oracle, Spark, dbt or cloud service needed." canRun={false} preview renderBlock={this.renderBlock}
        canvas={<FixtureCanvas notebook={n} renderBlock={this.renderBlock} onLayout={layout => this.update({...n, views: n.views.map(v => v.id === 'free' ? {...v, layout} : v)})}/>}
        onMode={mode => {this.update({...n, preferredView: mode === 'canvas' ? 'free' : mode === 'arena' ? 'leetcode' : 'notebook'}); this.setState({mode});}} onSelect={selected => this.setState({selected})} onInspect={name => this.add('sql', previewSql(name))} onOpenNotebook={this.open} onAdd={this.add} onSave={this.save} onRunAll={() => {}} onExport={() => download(`${n.id}.json`, n)} onResetExercise={exercise ? () => {this.update(makeExerciseFixture(exercise)); this.setState({hints: false});} : undefined}/>;
    return <div className="pv-app"><header className="pv-app-header"><div className="pv-brand"><span className="pv-brand-mark"><i/><i/><i/><i/></span><b>Datapass</b><span>Studio</span><small>{this.props.analytics ? 'ANALYTICS M2' : 'UI MILESTONE 1'}</small></div><nav aria-label="Preview fixtures"><button className={!n.exercise ? 'active' : ''} onClick={() => this.open('m1-explore')}><Icon name="notebook" size={16}/>Notebook</button><button className={n.exercise?.id === 'ui-revenue' ? 'active' : ''} onClick={() => this.openExercise(0)}><Icon name="arena" size={16}/>SQL arena</button><button className={n.exercise?.id === 'ui-deduplicate' ? 'active' : ''} onClick={() => this.openExercise(1)}>Python arena</button></nav><div className="pv-avatar">JP</div></header><div className="pv-preview-banner"><Icon name="info" size={15}/><span><b>UI-only preview.</b> Edit notebooks, dbt sources, models and charts. Sample documents; no SQL/dbt/Python runner is connected in this preview.</span><details><summary>About</summary><div>Production uses the existing React 19 + Fluent UI app, API, CodeEditor, NotebookCanvas and exercise grader. This no-install harness uses a bundled React 18-era compatibility runtime, recovered from the supplied AtlasNote public build. Source export uses the existing RootNotebook JSON shape. No data is uploaded.</div></details></div>{this.state.notice && <div className="pv-notice" role="status"><span>{this.state.notice}</span><button onClick={() => this.setState({notice: ''})} aria-label="Dismiss preview notice"><Icon name="close" size={14}/></button></div>}
      <div className="pv-main">{this.props.analytics ? <AnalyticsWorkbench key={`analytics-${n.id}`} project={analytics.project} restoreError={analytics.error}
        ownerTitle={n.title} preview onSave={this.save} notebookContent={desktop} onChange={project => {
          const current=this.notebook(); if(current.id!==n.id){this.setState({notice:'Notebook changed; analytics edit was cancelled.'});return;}
          this.update({...current,blockState:{...current.blockState,[LAB_KEY]:project}});
        }}/> : desktop}</div>
    </div>;
  }
}
