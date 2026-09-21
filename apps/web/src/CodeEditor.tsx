import {Component, useRef, useState, lazy, Suspense, type ReactNode} from 'react';
import {indentSelection, insertNewline, toggleLineComment, type TextEdit} from './studio/editorEdits';
const MonacoAdapter = lazy(() => import('./MonacoAdapter'));
export interface EditorProps {
  value: string; language: string; onChange: (source: string) => void; onRun: () => void;
  readOnly?: boolean; canRun?: boolean; modelId?: string; active?: boolean;
}
class EditorBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {return this.state.failed ? <div><div className="editor-load-notice" role="status">Monaco could not load. The plain editor remains available; your source is unchanged.</div>{this.props.fallback}</div> : this.props.children;}
}
export function CodeEditor(props: EditorProps) {
  const [simple, setSimple] = useState(props.active === false);
  const guarded = {...props, onRun: () => {if (!props.readOnly && props.canRun !== false) props.onRun();}};
  const plain = <PlainEditor {...guarded}/>;
  return <div className="editor-host"><div className="editor-mode"><span>{props.language}</span><button type="button" onClick={() => setSimple(!simple)}>{simple ? 'Use Monaco' : 'Use plain editor'}</button></div>{simple ? plain : <EditorBoundary key={props.modelId ?? 'editor'} fallback={plain}><Suspense fallback={plain}><MonacoAdapter {...guarded}/></Suspense></EditorBoundary>}</div>;
}
/** A dependency-light adapter, not a second source store. No CDN downloads. */
function PlainEditor({value, language, onChange, onRun, readOnly = false, canRun = true, modelId}: EditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tabMovesFocus, setTabMovesFocus] = useState(false);
  const apply = (edit: TextEdit) => {
    const element = ref.current;
    onChange(edit.value);
    requestAnimationFrame(() => {if (element === ref.current) element?.setSelectionRange(edit.start, edit.end);});
  };
  return <div className="plain-editor-wrapper"><div className="code-editor"><div className="line-numbers" aria-hidden="true">{value.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}</div><textarea ref={ref} aria-label={`${language} cell source`} data-model-id={modelId} value={value} readOnly={readOnly} spellCheck={false} autoCapitalize="off" autoComplete="off" onChange={e => onChange(e.target.value)} onScroll={e => {const line = e.currentTarget.previousElementSibling; if (line) line.scrollTop = e.currentTarget.scrollTop;}} onKeyDown={e => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {setTabMovesFocus(true); return;}
    // Submit's Ctrl+Shift+Enter belongs to the parent interview controller.
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'Enter') {e.preventDefault(); if (!readOnly && canRun) onRun(); return;}
    if (readOnly) return;
    const {selectionStart: start, selectionEnd: end} = e.currentTarget;
    if (e.key === 'Tab' && !tabMovesFocus) {e.preventDefault(); apply(indentSelection(value, start, end, e.shiftKey));}
    else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {e.preventDefault(); apply(insertNewline(value, start, end, language));}
    else if ((e.ctrlKey || e.metaKey) && e.key === '/') {e.preventDefault(); apply(toggleLineComment(value, start, end, language));}
  }}/></div><div className="plain-editor-help"><span>{tabMovesFocus ? 'Tab moves focus' : 'Tab indents / Shift+Tab unindents / Esc lets Tab move focus'}</span><button type="button" onClick={() => setTabMovesFocus(!tabMovesFocus)}>{tabMovesFocus ? 'Use Tab to indent' : 'Use Tab to move focus'}</button></div></div>;
}
