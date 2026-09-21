import * as React from 'react';
import {indentSelection, insertNewline, toggleLineComment} from '../editorEdits';
export function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function JsonDownload({name, value, children}: {name: string; value: unknown; children: React.ReactNode}) {
  return <button onClick={() => downloadText(name, JSON.stringify(value, null, 2), 'application/json')}>{children}</button>;
}
export function FileImport({label, accept = '.json', limit = 8_000_000, onRead, onError}: {label: string; accept?: string; limit?: number; onRead: (text: string, name: string) => void; onError: (message: string) => void}) {
  const alive = React.useRef(true);
  React.useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  return <label className="an-file-button">{label}<input type="file" aria-label={label} accept={accept} onChange={event => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return;
    if (file.size > limit) {onError(`File exceeds the ${Math.round(limit / 1_000_000)} MB limit.`); return;}
    file.text().then(text => {if (alive.current) onRead(text, file.name);}).catch(error => {if (alive.current) onError(String(error));});
  }}/></label>;
}
export function SourceEditor({source, onChange, label, language = 'sql', readOnly = false}: {source: string; onChange: (source: string) => void; label: string; language?: string; readOnly?: boolean}) {
  const [escapeTab, setEscapeTab] = React.useState(false);
  return <div className="an-source"><div className="an-editor-caption"><span>{language.toUpperCase()} / {readOnly ? 'READ ONLY' : 'DRAFT'}</span><span>{source.split('\n').length} lines</span></div><textarea spellCheck={false} aria-label={label} value={source} readOnly={readOnly} onChange={e => onChange(e.target.value)} onKeyDown={e => {
    if (e.nativeEvent.isComposing || readOnly) return;
    if (e.key === 'Escape') {setEscapeTab(true); return;}
    const node = e.currentTarget;
    const edit = e.key === 'Tab' && !escapeTab ? indentSelection(source, node.selectionStart, node.selectionEnd, e.shiftKey)
      : e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey ? insertNewline(source, node.selectionStart, node.selectionEnd, language)
      : (e.ctrlKey || e.metaKey) && e.key === '/' ? toggleLineComment(source, node.selectionStart, node.selectionEnd, language) : null;
    if (edit) {e.preventDefault(); onChange(edit.value); requestAnimationFrame(() => node.setSelectionRange(edit.start, edit.end));}
  }}/><small>{readOnly ? 'Read-only view. No code executed in this session.' : escapeTab ? 'Tab moves focus. Click to enable indentation.' : 'Tab: indent / Shift+Tab: outdent / Esc: release focus / Ctrl+/: comment'}{!readOnly && escapeTab && <button onClick={() => setEscapeTab(false)}>Enable indentation</button>}</small></div>;
}
export function RowsTable({rows, columns, label}: {rows: Array<Record<string, unknown>>; columns?: string[]; label: string}) {
  const keys = columns ?? Object.keys(rows[0] ?? {});
  return <div className="an-table-scroll"><table aria-label={label}><thead><tr>{keys.map(k => <th key={k}>{k}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((r, i) => <tr key={i}>{keys.map(k => <td key={k}>{r[k] === null ? <span className="an-muted">NULL</span> : String(r[k] ?? '')}</td>)}</tr>)}</tbody></table>{!rows.length && <p>No rows in this snapshot.</p>}{rows.length > 100 && <small>Showing the first 100 of {rows.length} rows. Export retains all bounded rows.</small>}</div>;
}
export function Title({eyebrow, title, children}: {eyebrow: string; title: string; children?: React.ReactNode}) {return <div className="an-title"><div><small>{eyebrow}</small><h2>{title}</h2></div>{children}</div>;}
