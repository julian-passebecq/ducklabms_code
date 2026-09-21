/** Pure text edits; shared state remains owned by the canonical notebook. */
export interface TextEdit {value: string; start: number; end: number}
function selection(value: string, start: number, end: number) {
  const a = Math.max(0, Math.min(value.length, Math.trunc(Number.isFinite(start) ? start : 0)));
  const b = Math.max(a, Math.min(value.length, Math.trunc(Number.isFinite(end) ? end : a)));
  return {start: a, end: b};
}
interface PrefixEdit {position: number; removed: number; added: string}
function applyEdits(value: string, start: number, end: number, edits: PrefixEdit[]): TextEdit {
  const translate = (pos: number) => pos + edits.reduce((delta, e) => delta + (pos < e.position ? 0 : e.added.length - Math.min(e.removed, pos - e.position)), 0);
  const result = edits.slice().reverse().reduce((text, e) => text.slice(0, e.position) + e.added + text.slice(e.position + e.removed), value);
  return {value: result, start: translate(start), end: translate(end)};
}
export function indentSelection(value: string, start: number, end: number, outdent = false, width = 4): TextEdit {
  ({start, end} = selection(value, start, end));
  const spaces = ' '.repeat(Math.max(1, Math.min(8, Math.trunc(width) || 4)));
  if (start === end && !outdent) return {value: value.slice(0, start) + spaces + value.slice(end), start: start + spaces.length, end: start + spaces.length};
  const lineStart = (start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1);
  // A selection ending at the start of the next line does not indent that next line.
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const newline = value.indexOf('\n', last);
  const stop = newline < 0 ? value.length : newline;
  const lines = value.slice(lineStart, stop).split('\n');
  const edits: Array<{position: number; removed: number; added: string}> = [];
  let position = lineStart;
  for (const line of lines) {
    const removed = outdent ? (line.startsWith('\t') ? 1 : Math.min(spaces.length, (line.match(/^ */)?.[0].length ?? 0))) : 0;
    edits.push({position, removed, added: outdent ? '' : spaces});
    position += line.length + 1;
  }
  return applyEdits(value, start, end, edits);

}
export function insertNewline(value: string, start: number, end: number, language: string): TextEdit {
  ({start, end} = selection(value, start, end));
  const line = value.slice((start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1), start);
  let indentation = line.match(/^[ \t]*/)?.[0] ?? '';
  if (['python', 'polars', 'sparklab'].includes(language) && line.trimEnd().endsWith(':')) indentation += '    ';
  const inserted = '\n' + indentation;
  return {value: value.slice(0, start) + inserted + value.slice(end), start: start + inserted.length, end: start + inserted.length};
}
export function toggleLineComment(value: string, start: number, end: number, language: string): TextEdit {
  ({start, end} = selection(value, start, end));
  const prefix = language === 'sql' || language === 'dbt' ? '--' : '#';
  const begin = (start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1);
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const newline = value.indexOf('\n', last);
  const stop = newline < 0 ? value.length : newline;
  const lines = value.slice(begin, stop).split('\n');
  const uncomment = lines.every(line => !line.trim() || line.trimStart().startsWith(prefix));
  const edits: Array<{position: number; removed: number; added: string}> = [];
  let offset = begin;
  for (const line of lines) {
    if (line.trim()) {
      const lead = line.length - line.trimStart().length;
      const position = offset + lead;
      const removed = uncomment ? prefix.length + (line[lead + prefix.length] === ' ' ? 1 : 0) : 0;
      edits.push({position, removed, added: uncomment ? '' : prefix + ' '});
    }
    offset += line.length + 1;
  }
  return applyEdits(value, start, end, edits);
}
