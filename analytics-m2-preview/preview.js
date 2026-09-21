(function(){'use strict';const modules={"desktopModel":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LAYOUT = void 0;
exports.clamp = clamp;
exports.normalizeLayout = normalizeLayout;
exports.layoutKey = layoutKey;
exports.readLayout = readLayout;
exports.writeLayout = writeLayout;
exports.isCode = isCode;
exports.semanticBlocks = semanticBlocks;
exports.arenaBlocks = arenaBlocks;
exports.groupCatalog = groupCatalog;
exports.previewSql = previewSql;
exports.visiblePanelSizes = visiblePanelSizes;
exports.filterCommands = filterCommands;
exports.normalizePreferredView = normalizePreferredView;
exports.DEFAULT_LAYOUT = Object.freeze({
    version: 1, explorerSide: 'left', explorerOpen: true, inspectorOpen: false,
    explorerWidth: 244, inspectorWidth: 264, problemWidth: 330,
    resultHeight: 230, compact: false,
});
function clamp(value, min, max) {
    return Math.min(Math.max(Number.isFinite(value) ? value : min, min), Math.max(min, max));
}
function normalizeLayout(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { ...exports.DEFAULT_LAYOUT };
    const v = value;
    if (v.version !== 1)
        return { ...exports.DEFAULT_LAYOUT };
    const n = (x, fallback, min, max) => typeof x === 'number' && Number.isFinite(x) ? Math.round(clamp(x, min, max)) : fallback;
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
function layoutKey(workspace, notebook) {
    return `datapass:desktop:v1:${encodeURIComponent(workspace)}:${encodeURIComponent(notebook)}`;
}
function readLayout(storage, key) {
    try {
        const text = storage?.getItem(key);
        if (!text)
            return { layout: { ...exports.DEFAULT_LAYOUT }, warning: '' };
        return { layout: normalizeLayout(JSON.parse(text)), warning: '' };
    }
    catch {
        return { layout: { ...exports.DEFAULT_LAYOUT }, warning: 'Saved panel layout is unavailable. Defaults are in use; notebook source is unchanged.' };
    }
}
function writeLayout(storage, key, layout) {
    try {
        if (!storage)
            throw new Error('Storage unavailable');
        storage.setItem(key, JSON.stringify(normalizeLayout(layout)));
        return '';
    }
    catch {
        return 'Panel layout could not be saved in this browser. Current panels remain usable; notebook source is unchanged.';
    }
}
function isCode(block) {
    return ['sql', 'python', 'polars'].includes(block.type) && !block.readOnly;
}
/** Same semantic order used by App.runAll. Never sort by canvas coordinates. */
function semanticBlocks(notebook) {
    const byId = new Map(notebook.blocks.map(b => [b.id, b]));
    const ids = notebook.views.find(v => v.id === 'notebook')?.blockIds ?? notebook.blocks.map(b => b.id);
    const seen = new Set();
    return ids.flatMap(id => {
        const block = byId.get(id);
        if (!block || seen.has(id))
            return [];
        seen.add(id);
        return [block];
    });
}
function arenaBlocks(notebook) {
    const blocks = semanticBlocks(notebook);
    // Browser/problem/help panels need not be in the semantic notebook view.
    const answers = notebook.exercise ? blocks.filter(b => isCode(b) && b.exerciseId === notebook.exercise.id) : [];
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
function groupCatalog(assets, query) {
    const q = query.trim().toLocaleLowerCase();
    const layers = ['source', 'bronze', 'silver', 'gold', 'warehouse', 'features', 'metrics'];
    const groups = new Map();
    for (const asset of assets) {
        if (q && !`${asset.name} ${asset.layer}`.toLocaleLowerCase().includes(q))
            continue;
        groups.set(asset.layer, [...(groups.get(asset.layer) ?? []), asset]);
    }
    return [...groups.entries()].sort(([a], [b]) => {
        const ai = layers.indexOf(a), bi = layers.indexOf(b);
        return (ai < 0 ? layers.length : ai) - (bi < 0 ? layers.length : bi) || a.localeCompare(b);
    }).map(([layer, rows]) => ({ layer, assets: rows.slice().sort((a, b) => a.name.localeCompare(b.name)) }));
}
/** Quotes each SQL identifier segment; a catalog name can never inject a second statement. */
function previewSql(name) {
    if (typeof name !== 'string' || !name.trim() || name.includes('\0'))
        throw new Error('Invalid catalog name');
    const parts = name.split('.');
    if (parts.some(part => !part.length))
        throw new Error('Invalid catalog name');
    return `SELECT * FROM ${parts.map(p => `"${p.replaceAll('"', '""')}"`).join('.')} LIMIT 100`;
}
function visiblePanelSizes(layout, width, focus) {
    const compactViewport = width < 900;
    const available = Math.max(0, width - 420);
    let explorer = layout.explorerOpen && !focus && !compactViewport ? Math.min(layout.explorerWidth, available) : 0;
    let inspector = layout.inspectorOpen && !focus && width >= 1180 ? Math.min(layout.inspectorWidth, Math.max(0, available - explorer)) : 0;
    if (inspector && inspector < 200)
        inspector = 0;
    if (explorer && explorer < 180)
        explorer = 0;
    return { explorer, inspector, compactViewport };
}
function filterCommands(commands, query) {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return commands.filter(c => terms.every(t => `${c.label} ${c.detail}`.toLocaleLowerCase().includes(t))).slice(0, 80);
}
/** Optional presentation metadata; old notebooks safely keep their default view. */
function normalizePreferredView(value, views) {
    return typeof value === 'string' && value.length > 0 && value.length <= 100 && (value === 'practice' || views.some(v => v.id === value && !v.id.startsWith('saved-practice-'))) ? value : undefined;
}

},
"editorEdits":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indentSelection = indentSelection;
exports.insertNewline = insertNewline;
exports.toggleLineComment = toggleLineComment;
function selection(value, start, end) {
    const a = Math.max(0, Math.min(value.length, Math.trunc(Number.isFinite(start) ? start : 0)));
    const b = Math.max(a, Math.min(value.length, Math.trunc(Number.isFinite(end) ? end : a)));
    return { start: a, end: b };
}
function applyEdits(value, start, end, edits) {
    const translate = (pos) => pos + edits.reduce((delta, e) => delta + (pos < e.position ? 0 : e.added.length - Math.min(e.removed, pos - e.position)), 0);
    const result = edits.slice().reverse().reduce((text, e) => text.slice(0, e.position) + e.added + text.slice(e.position + e.removed), value);
    return { value: result, start: translate(start), end: translate(end) };
}
function indentSelection(value, start, end, outdent = false, width = 4) {
    ({ start, end } = selection(value, start, end));
    const spaces = ' '.repeat(Math.max(1, Math.min(8, Math.trunc(width) || 4)));
    if (start === end && !outdent)
        return { value: value.slice(0, start) + spaces + value.slice(end), start: start + spaces.length, end: start + spaces.length };
    const lineStart = (start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1);
    // A selection ending at the start of the next line does not indent that next line.
    const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const newline = value.indexOf('\n', last);
    const stop = newline < 0 ? value.length : newline;
    const lines = value.slice(lineStart, stop).split('\n');
    const edits = [];
    let position = lineStart;
    for (const line of lines) {
        const removed = outdent ? (line.startsWith('\t') ? 1 : Math.min(spaces.length, (line.match(/^ */)?.[0].length ?? 0))) : 0;
        edits.push({ position, removed, added: outdent ? '' : spaces });
        position += line.length + 1;
    }
    return applyEdits(value, start, end, edits);
}
function insertNewline(value, start, end, language) {
    ({ start, end } = selection(value, start, end));
    const line = value.slice((start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1), start);
    let indentation = line.match(/^[ \t]*/)?.[0] ?? '';
    if (['python', 'polars', 'sparklab'].includes(language) && line.trimEnd().endsWith(':'))
        indentation += '    ';
    const inserted = '\n' + indentation;
    return { value: value.slice(0, start) + inserted + value.slice(end), start: start + inserted.length, end: start + inserted.length };
}
function toggleLineComment(value, start, end, language) {
    ({ start, end } = selection(value, start, end));
    const prefix = language === 'sql' || language === 'dbt' ? '--' : '#';
    const begin = (start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1);
    const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const newline = value.indexOf('\n', last);
    const stop = newline < 0 ? value.length : newline;
    const lines = value.slice(begin, stop).split('\n');
    const uncomment = lines.every(line => !line.trim() || line.trimStart().startsWith(prefix));
    const edits = [];
    let offset = begin;
    for (const line of lines) {
        if (line.trim()) {
            const lead = line.length - line.trimStart().length;
            const position = offset + lead;
            const removed = uncomment ? prefix.length + (line[lead + prefix.length] === ' ' ? 1 : 0) : 0;
            edits.push({ position, removed, added: uncomment ? '' : prefix + ' ' });
        }
        offset += line.length + 1;
    }
    return applyEdits(value, start, end, edits);
}

},
"NotebookDesktop":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookDesktop = void 0;
exports.Icon = Icon;
const React = require("react");
const desktopModel_1 = require("./desktopModel");
require("./desktop.css");
const paths = {
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
function Icon({ name, size = 18 }) {
    return React.createElement("svg", { "aria-hidden": "true", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: paths[name] }));
}
function storage() { try {
    return window.localStorage;
}
catch {
    return null;
} }
/** Native pointer listeners work with mouse, touch and pen, with a keyboard alternative. */
class Divider extends React.Component {
    node = null;
    drag = null;
    componentDidMount() { this.node?.addEventListener('pointerdown', this.down); }
    componentWillUnmount() { this.node?.removeEventListener('pointerdown', this.down); this.cleanup(); }
    cleanup = () => {
        window.removeEventListener('pointermove', this.move);
        window.removeEventListener('pointerup', this.up);
        window.removeEventListener('pointercancel', this.up);
        window.removeEventListener('blur', this.up);
        document.body.classList.remove('dp-resizing');
        this.drag = null;
    };
    down = (event) => {
        if (event.button !== 0)
            return;
        event.preventDefault();
        this.node?.focus();
        this.drag = { id: event.pointerId, start: this.props.horizontal ? event.clientY : event.clientX, value: this.props.value };
        document.body.classList.add('dp-resizing');
        window.addEventListener('pointermove', this.move);
        window.addEventListener('pointerup', this.up);
        window.addEventListener('pointercancel', this.up);
        window.addEventListener('blur', this.up);
    };
    move = (event) => {
        if (!this.drag || event.pointerId !== this.drag.id)
            return;
        const position = this.props.horizontal ? event.clientY : event.clientX;
        const direction = this.props.reverse ? -1 : 1;
        this.props.onChange(Math.max(this.props.min, Math.min(this.props.max, this.drag.value + (position - this.drag.start) * direction)));
    };
    up = () => { if (this.drag) {
        this.cleanup();
        this.props.onCommit?.();
    } };
    key = (event) => {
        const step = event.shiftKey ? 40 : 16;
        const direction = this.props.reverse ? -1 : 1;
        let value = this.props.value;
        if (event.key === 'Home')
            value = this.props.min;
        else if (event.key === 'End')
            value = this.props.max;
        else if (event.key === (this.props.horizontal ? 'ArrowUp' : 'ArrowLeft'))
            value -= step * direction;
        else if (event.key === (this.props.horizontal ? 'ArrowDown' : 'ArrowRight'))
            value += step * direction;
        else
            return;
        event.preventDefault();
        this.props.onChange(Math.max(this.props.min, Math.min(this.props.max, value)));
        // onChange may be batched by React; parent persistence runs in its state callback.
    };
    render() {
        return React.createElement("div", { ref: node => { this.node = node; }, role: "separator", tabIndex: 0, "aria-label": this.props.label, "aria-orientation": this.props.horizontal ? 'horizontal' : 'vertical', "aria-valuemin": this.props.min, "aria-valuemax": this.props.max, "aria-valuenow": Math.round(this.props.value), className: `dp-divider ${this.props.horizontal ? 'dp-divider-horizontal' : ''}`, onKeyDown: this.key },
            React.createElement("span", null));
    }
}
class NotebookDesktop extends React.Component {
    state = {
        layout: { ...desktopModel_1.DEFAULT_LAYOUT }, focus: false, width: 1200, search: '', selectedAsset: '',
        explorerTab: 'lakehouse', arenaTab: 'problem', palette: false, commandQuery: '', commandIndex: 0,
        warning: '', mobileExplorer: false, inspectorTab: 'context',
    };
    root = null;
    paletteInput = null;
    dialog = null;
    returnFocus = null;
    observer;
    saveTimer;
    componentDidMount() {
        this.restoreLayout();
        this.measure();
        if (typeof ResizeObserver !== 'undefined' && this.root) {
            this.observer = new ResizeObserver(this.measure);
            this.observer.observe(this.root);
        }
        window.addEventListener('resize', this.measure);
        window.addEventListener('keydown', this.shortcuts);
    }
    componentDidUpdate(previous) {
        if (previous.workspaceId !== this.props.workspaceId || previous.notebook.id !== this.props.notebook.id) {
            if (this.saveTimer)
                clearTimeout(this.saveTimer);
            this.restoreLayout();
            this.setState({ selectedAsset: '', palette: false, search: '', mobileExplorer: false });
        }
    }
    componentWillUnmount() {
        this.observer?.disconnect();
        if (this.saveTimer)
            clearTimeout(this.saveTimer);
        this.persist();
        window.removeEventListener('resize', this.measure);
        window.removeEventListener('keydown', this.shortcuts);
    }
    key = () => (0, desktopModel_1.layoutKey)(this.props.workspaceId, this.props.notebook.id);
    restoreLayout = () => {
        const saved = (0, desktopModel_1.readLayout)(storage(), this.key());
        this.setState({ layout: saved.layout, warning: saved.warning });
    };
    measure = () => { if (this.root)
        this.setState({ width: this.root.clientWidth }); };
    persist = () => (0, desktopModel_1.writeLayout)(storage(), this.key(), this.state.layout);
    changeLayout = (patch) => {
        this.setState(state => ({ layout: (0, desktopModel_1.normalizeLayout)({ ...state.layout, ...patch }) }), () => {
            if (this.saveTimer)
                clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => { this.setState({ warning: this.persist() }); }, 160);
        });
    };
    shortcuts = (event) => {
        if (this.props.managed && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
            return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            this.openPalette();
        }
        else if (event.key === 'Escape') {
            if (this.state.palette) {
                event.preventDefault();
                this.closePalette();
            }
            else if (this.state.mobileExplorer)
                this.setState({ mobileExplorer: false });
            else if (this.state.focus)
                this.setState({ focus: false });
        }
    };
    openPalette = () => {
        this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.setState({ palette: true, commandQuery: '', commandIndex: 0 }, () => this.paletteInput?.focus());
    };
    closePalette = () => { this.setState({ palette: false }, () => this.returnFocus?.focus()); };
    selectCell = (id) => {
        this.props.onSelect(id);
        this.setState({ mobileExplorer: false });
        requestAnimationFrame(() => {
            const element = [...(this.root?.querySelectorAll('[data-block-id]') ?? [])].find(node => node.dataset.blockId === id);
            element?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        });
    };
    commands = () => [
        { id: 'save', kind: 'action', label: 'Save notebook', detail: 'Use the existing workspace save operation', disabled: this.props.busy, run: this.props.onSave },
        { id: 'notebook', kind: 'action', label: 'Notebook layout', detail: 'Fabric-inspired sequential notebook', run: () => this.props.onMode('notebook') },
        { id: 'canvas', kind: 'action', label: 'Free canvas', detail: 'Move and resize the same notebook blocks', run: () => this.props.onMode('canvas') },
        { id: 'focus', kind: 'action', label: this.state.focus ? 'Exit focus mode' : 'Focus mode', detail: 'Hide side panels without deleting them', run: () => this.setState({ focus: !this.state.focus }) },
        { id: 'side', kind: 'action', label: 'Move explorer to the other side', detail: 'Layout only; code and execution order do not change', run: () => this.changeLayout({ explorerSide: this.state.layout.explorerSide === 'left' ? 'right' : 'left' }) },
        { id: 'reset-panels', kind: 'action', label: 'Reset panel layout', detail: 'Restore panel sizes; never reset source', run: () => this.changeLayout({ ...desktopModel_1.DEFAULT_LAYOUT }) },
        ...(0, desktopModel_1.semanticBlocks)(this.props.notebook).filter(b => b.type !== 'notebook-output').map(b => ({ id: `cell:${b.id}`, kind: 'cell', label: b.title, detail: `${b.kernel ?? 'notes'} cell`, run: () => this.selectCell(b.id) })),
        ...this.props.assets.map(a => ({ id: `table:${a.name}`, kind: 'table', label: a.name, detail: `${a.layer} table / ${a.row_count} rows`, run: () => this.inspect(a.name) })),
        ...(this.props.linkedNotebooks ?? []).map(n => ({ id: `notebook:${n.id}`, kind: 'notebook', label: n.title, detail: 'Workspace notebook', disabled: this.props.busy, run: () => this.props.onOpenNotebook?.(n.id) })),
    ];
    inspect = (name) => {
        this.setState({ selectedAsset: name, inspectorTab: 'context' });
        this.changeLayout({ inspectorOpen: true });
    };
    renderDataContext() {
        const contexts = this.props.exercise?.data_context ?? [];
        if (!contexts.length)
            return React.createElement("div", { className: "dp-empty" },
                React.createElement(Icon, { name: "table", size: 28 }),
                React.createElement("h3", null, "Explore the shared catalog"),
                React.createElement("p", null, "Select a table in Lakehouse. Metadata comes from the workspace; columns are never invented."),
                React.createElement("button", { className: "dp-button", onClick: () => { this.changeLayout({ explorerOpen: true }); this.setState({ explorerTab: 'lakehouse', mobileExplorer: true }); } }, "Open lakehouse"));
        return React.createElement("div", { className: "dp-data-context" }, contexts.map(context => React.createElement("section", { key: context.name },
            React.createElement("h3", null,
                React.createElement(Icon, { name: "table" }),
                context.name),
            React.createElement("table", null,
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null, "Column"),
                        React.createElement("th", null, "Type"))),
                React.createElement("tbody", null, Object.entries(context.columns).map(([column, type]) => React.createElement("tr", { key: column },
                    React.createElement("td", null,
                        React.createElement("code", null, column)),
                    React.createElement("td", null, type))))),
            context.sample_rows.length > 0 && React.createElement("details", null,
                React.createElement("summary", null, "Fixture sample rows"),
                React.createElement("pre", null, JSON.stringify(context.sample_rows.slice(0, 5), null, 2))))));
    }
    renderExplorer() {
        const { notebook, linkedNotebooks, assets, busy } = this.props;
        const q = this.state.search.trim().toLocaleLowerCase();
        const cells = (0, desktopModel_1.semanticBlocks)(notebook).filter(b => b.type !== 'notebook-output' && (!q || `${b.title} ${b.kernel ?? ''}`.toLocaleLowerCase().includes(q)));
        const groups = (0, desktopModel_1.groupCatalog)(assets, this.state.search);
        return React.createElement("aside", { className: "dp-explorer", "aria-label": "Lakehouse and notebook explorer" },
            React.createElement("div", { className: "dp-panel-title" },
                React.createElement("strong", null, "Explorer"),
                React.createElement("div", null,
                    React.createElement("button", { className: "dp-icon-button", title: "Move explorer to the other side", "aria-label": "Move explorer to the other side", onClick: () => this.changeLayout({ explorerSide: this.state.layout.explorerSide === 'left' ? 'right' : 'left' }) },
                        React.createElement(Icon, { name: "swap" })),
                    React.createElement("button", { className: "dp-icon-button", "aria-label": "Close explorer", onClick: () => { this.changeLayout({ explorerOpen: false }); this.setState({ mobileExplorer: false }); } },
                        React.createElement(Icon, { name: "close" })))),
            React.createElement("div", { className: "dp-tabs", role: "tablist", "aria-label": "Explorer content" }, ['lakehouse', 'files'].map(tab => React.createElement("button", { role: "tab", key: tab, "aria-selected": this.state.explorerTab === tab, onClick: () => this.setState({ explorerTab: tab }) },
                React.createElement(Icon, { name: tab === 'lakehouse' ? 'table' : 'folder' }),
                tab === 'lakehouse' ? 'Lakehouse' : 'Notebooks'))),
            React.createElement("label", { className: "dp-search" },
                React.createElement(Icon, { name: "search", size: 16 }),
                React.createElement("input", { "aria-label": "Filter explorer", placeholder: "Find a table or notebook...", value: this.state.search, onChange: e => this.setState({ search: e.target.value }) }),
                q && React.createElement("button", { "aria-label": "Clear explorer filter", className: "dp-icon-button", onClick: () => this.setState({ search: '' }) },
                    React.createElement(Icon, { name: "close", size: 14 }))),
            React.createElement("div", { className: "dp-explorer-scroll" }, this.state.explorerTab === 'lakehouse' ? React.createElement("div", { className: "dp-tree" },
                React.createElement("div", { className: "dp-tree-root" },
                    React.createElement(Icon, { name: "folder" }),
                    React.createElement("b", null, "Workspace lakehouse")),
                groups.map(group => React.createElement("details", { open: true, key: group.layer },
                    React.createElement("summary", null,
                        React.createElement("span", { className: `dp-layer dp-layer-${group.layer}` }),
                        group.layer,
                        React.createElement("span", { className: "dp-count" }, group.assets.length)),
                    group.assets.map(asset => React.createElement("button", { key: asset.name, className: `dp-tree-item ${this.state.selectedAsset === asset.name ? 'is-selected' : ''}`, title: asset.name, onClick: () => this.inspect(asset.name) },
                        React.createElement(Icon, { name: "table", size: 16 }),
                        React.createElement("span", null, asset.name.includes('.') ? asset.name.substring(asset.name.indexOf('.') + 1) : asset.name),
                        React.createElement("small", null, asset.row_count.toLocaleString()))))),
                !groups.length && React.createElement("p", { className: "dp-empty-inline" }, assets.length ? 'No matching tables.' : 'No tables yet. This panel reads the shared workspace catalog.')) : React.createElement("div", { className: "dp-tree" },
                React.createElement("div", { className: "dp-tree-root" },
                    React.createElement(Icon, { name: "folder" }),
                    React.createElement("b", null, "Notebooks")),
                (linkedNotebooks ?? [{ id: notebook.id, title: notebook.title }]).filter(n => !q || n.title.toLocaleLowerCase().includes(q)).map(n => React.createElement("button", { key: n.id, className: `dp-tree-item ${n.id === notebook.id ? 'is-selected' : ''}`, disabled: busy, onClick: () => this.props.onOpenNotebook?.(n.id) },
                    React.createElement(Icon, { name: "notebook", size: 16 }),
                    React.createElement("span", null, n.title))),
                React.createElement("div", { className: "dp-tree-root dp-tree-subtitle" },
                    React.createElement("span", null, "IN THIS NOTEBOOK"),
                    React.createElement("small", null, cells.length)),
                cells.map((block, index) => React.createElement("button", { key: block.id, className: `dp-tree-item ${block.id === this.props.selectedBlockId ? 'is-selected' : ''}`, onClick: () => this.selectCell(block.id) },
                    React.createElement("small", { className: "dp-cell-number" }, index + 1),
                    React.createElement("span", null, block.title),
                    React.createElement("small", null, block.kernel ?? 'MD'))),
                !cells.length && React.createElement("p", { className: "dp-empty-inline" }, "No matching cells."))),
            React.createElement("div", { className: "dp-explorer-note" },
                React.createElement(Icon, { name: "info", size: 15 }),
                React.createElement("span", null,
                    "One catalog. One notebook source.",
                    React.createElement("br", null),
                    "Different ways to work.")));
    }
    renderInspector() {
        const asset = this.props.assets.find(a => a.name === this.state.selectedAsset);
        return React.createElement("aside", { className: "dp-inspector", "aria-label": "Context inspector" },
            React.createElement("div", { className: "dp-panel-title" },
                React.createElement("strong", null, "Context"),
                React.createElement("button", { className: "dp-icon-button", "aria-label": "Close inspector", onClick: () => this.changeLayout({ inspectorOpen: false }) },
                    React.createElement(Icon, { name: "close" }))),
            React.createElement("div", { className: "dp-tabs", role: "tablist", "aria-label": "Inspector content" },
                React.createElement("button", { role: "tab", "aria-selected": this.state.inspectorTab === 'context', onClick: () => this.setState({ inspectorTab: 'context' }) }, "Table"),
                React.createElement("button", { role: "tab", "aria-selected": this.state.inspectorTab === 'outline', onClick: () => this.setState({ inspectorTab: 'outline' }) }, "Outline")),
            React.createElement("div", { className: "dp-inspector-scroll" }, this.state.inspectorTab === 'outline' ? React.createElement("div", { className: "dp-outline" },
                React.createElement("h3", null, "Execution order"),
                React.createElement("p", null, "Moving a panel never changes this order."),
                (0, desktopModel_1.semanticBlocks)(this.props.notebook).filter(desktopModel_1.isCode).map((b, i) => React.createElement("button", { className: "dp-tree-item", key: b.id, onClick: () => this.selectCell(b.id) },
                    React.createElement("small", null, i + 1),
                    React.createElement("span", null, b.title)))) : asset ? React.createElement("div", { className: "dp-asset-details" },
                React.createElement("div", { className: "dp-asset-symbol" },
                    React.createElement(Icon, { name: "table", size: 26 })),
                React.createElement("h3", null, asset.name),
                React.createElement("span", { className: `dp-pill ${asset.fresh ? 'dp-pill-success' : 'dp-pill-warning'}` }, asset.fresh ? 'Fresh' : 'Stale'),
                React.createElement("dl", null,
                    React.createElement("dt", null, "Layer"),
                    React.createElement("dd", null, asset.layer),
                    React.createElement("dt", null, "Rows"),
                    React.createElement("dd", null, asset.row_count.toLocaleString()),
                    React.createElement("dt", null, "Producer"),
                    React.createElement("dd", null, asset.producer ?? 'Source table'),
                    asset.storage && React.createElement("div", { className: "dp-meta-block" },
                        React.createElement("dt", null, "Parquet files"),
                        React.createElement("dd", null, asset.storage.file_count),
                        React.createElement("dt", null, "Measured bytes"),
                        React.createElement("dd", null, asset.storage.size_bytes.toLocaleString()),
                        React.createElement("dt", null, "Snapshot"),
                        React.createElement("dd", null, asset.storage.snapshot_id ?? 'Unavailable'))),
                React.createElement("button", { className: "dp-button dp-primary dp-full", disabled: this.props.busy, onClick: () => this.props.onInspect(asset.name) },
                    React.createElement(Icon, { name: "code" }),
                    "Open SQL preview cell"),
                React.createElement("p", { className: "dp-subtle" }, "Adds a SELECT cell. Nothing executes automatically."),
                asset.storage && React.createElement("small", { className: "dp-truth-note" }, asset.storage.truth)) : React.createElement("div", { className: "dp-empty" },
                React.createElement(Icon, { name: "table", size: 28 }),
                React.createElement("h3", null, "Inspect a table"),
                React.createElement("p", null, "Choose one in Lakehouse to see metadata and add a SQL preview cell."))),
            React.createElement("div", { className: "dp-runtime-card" },
                React.createElement("span", { className: "dp-eyebrow" }, "RUNTIME TRUTH"),
                React.createElement("b", null, this.props.runtimeLabel),
                React.createElement("p", null, this.props.runtimeDetail)));
    }
    renderArena() {
        const { notebook, exercise } = this.props;
        const groups = (0, desktopModel_1.arenaBlocks)(notebook);
        const sides = (0, desktopModel_1.visiblePanelSizes)(this.state.layout, this.state.width, this.state.focus);
        const centerWidth = this.state.width - sides.explorer - sides.inspector - (sides.explorer ? 6 : 0) - (sides.inspector ? 6 : 0);
        const maxProblem = Math.min(650, Math.max(240, centerWidth - 326));
        const problemWidth = Math.min(this.state.layout.problemWidth, maxProblem);
        const tabs = [{ id: 'problem', label: 'Description' }, { id: 'data', label: 'Data' }, { id: 'hints', label: 'Hints' }, { id: 'problems', label: 'Problems' }];
        return React.createElement("div", { className: "dp-arena", style: { '--dp-problem': `${problemWidth}px`, '--dp-result': `${this.state.layout.resultHeight}px` } },
            React.createElement("section", { className: "dp-problem-pane", "aria-label": "Exercise problem" },
                React.createElement("div", { className: "dp-tabs", role: "tablist", "aria-label": "Exercise information" }, tabs.map(tab => React.createElement("button", { key: tab.id, role: "tab", "aria-selected": this.state.arenaTab === tab.id, onClick: () => this.setState({ arenaTab: tab.id }) }, tab.label))),
                React.createElement("div", { className: "dp-problem-scroll" }, this.state.arenaTab === 'problem' ? React.createElement("div", null,
                    React.createElement("div", { className: "dp-problem-meta" },
                        React.createElement("span", { className: `dp-pill ${exercise?.difficulty === 'easy' ? 'dp-pill-success' : ''}` }, exercise?.difficulty ?? 'Exercise'),
                        React.createElement("span", null, exercise?.language ?? 'Code')),
                    groups.problems.map(b => React.createElement("div", { key: b.id }, this.props.renderBlock(b)))) : this.state.arenaTab === 'data' ? this.renderDataContext() : (this.state.arenaTab === 'hints' ? groups.help : groups.browsers).map(b => React.createElement("div", { key: b.id }, this.props.renderBlock(b))))),
            React.createElement(Divider, { label: "Resize problem panel", value: problemWidth, min: 240, max: maxProblem, onChange: problemWidth => this.changeLayout({ problemWidth }) }),
            React.createElement("div", { className: "dp-solution-pane" },
                React.createElement("section", { className: "dp-answer-pane", "aria-label": "Exercise answer" },
                    React.createElement("div", { className: "dp-editor-heading" },
                        React.createElement("span", null,
                            React.createElement(Icon, { name: "code" }),
                            "Solution"),
                        React.createElement("small", null, exercise?.runtime ?? 'Shared notebook editor')),
                    React.createElement("div", { className: "dp-answer-scroll" },
                        groups.answers.map(b => React.createElement("div", { key: b.id }, this.props.renderBlock(b))),
                        !groups.answers.length && React.createElement("div", { className: "dp-empty" },
                            React.createElement("h3", null, "Answer cell unavailable"),
                            React.createElement("p", null, "Your source has not been replaced. Reopen or restore this exercise.")),
                        groups.scratch.length > 0 && React.createElement("details", { className: "dp-scratch" },
                            React.createElement("summary", null,
                                "Scratch cells (",
                                groups.scratch.length,
                                ")"),
                            groups.scratch.map(b => React.createElement("div", { key: b.id }, this.props.renderBlock(b)))))),
                React.createElement(Divider, { label: "Resize result panel", horizontal: true, reverse: true, value: this.state.layout.resultHeight, min: 120, max: 560, onChange: resultHeight => this.changeLayout({ resultHeight }) }),
                React.createElement("section", { className: "dp-result-pane", "aria-label": "Exercise results" },
                    React.createElement("div", { className: "dp-editor-heading" },
                        React.createElement("span", null,
                            React.createElement(Icon, { name: "check" }),
                            "Results & attempts"),
                        React.createElement("small", null, this.props.preview ? 'No code has been executed' : 'Run checks first; Submit records an attempt')),
                    React.createElement("div", { className: "dp-result-scroll" },
                        groups.results.map(b => React.createElement("div", { key: b.id }, this.props.renderBlock(b))),
                        !groups.results.length && React.createElement("div", { className: "dp-empty-inline" },
                            React.createElement("b", null, "No result evidence yet."),
                            React.createElement("p", null, "Run visible checks when a local runtime is connected. Hidden tests remain server-owned."))))));
    }
    renderNotebook() {
        const blocks = (0, desktopModel_1.semanticBlocks)(this.props.notebook);
        return React.createElement("div", { className: "dp-notebook-scroll" },
            React.createElement("div", { className: "dp-notebook-page" },
                React.createElement("div", { className: "dp-document-heading" },
                    React.createElement("span", { className: "dp-eyebrow" },
                        "NOTEBOOK / ",
                        this.props.workspaceTitle),
                    React.createElement("h1", null, this.props.notebook.title),
                    React.createElement("p", null, "Explore your data, write code, keep the context alongside.")),
                blocks.filter(b => !['exercise-browser', 'exercise-help', 'problem'].includes(b.role ?? '')).map(block => React.createElement("div", { key: block.id, className: `dp-flow-cell ${this.props.selectedBlockId === block.id ? 'is-active' : ''}`, onFocusCapture: () => this.props.onSelect(block.id) }, this.props.renderBlock(block))),
                React.createElement("div", { className: "dp-add-row" },
                    React.createElement("span", null, "Add a cell"),
                    ['sql', 'python', 'polars', 'markdown'].map(kernel => React.createElement("button", { className: "dp-button", key: kernel, disabled: this.props.busy, onClick: () => this.props.onAdd(kernel) },
                        React.createElement(Icon, { name: "plus", size: 14 }),
                        kernel === 'markdown' ? 'Text' : kernel === 'sql' ? 'SQL' : kernel[0].toUpperCase() + kernel.slice(1))))));
    }
    renderPalette() {
        if (!this.state.palette)
            return null;
        const results = (0, desktopModel_1.filterCommands)(this.commands(), this.state.commandQuery);
        const active = Math.min(this.state.commandIndex, Math.max(0, results.length - 1));
        const choose = (command) => { if (command && !command.disabled) {
            this.closePalette();
            command.run();
        } };
        return React.createElement("div", { className: "dp-modal-backdrop", onMouseDown: event => { if (event.target === event.currentTarget)
                this.closePalette(); } },
            React.createElement("div", { className: "dp-command-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", ref: node => { this.dialog = node; }, onKeyDown: event => {
                    if (event.key === 'Tab') {
                        const nodes = [...(this.dialog?.querySelectorAll('button:not(:disabled), input') ?? [])];
                        const first = nodes[0], last = nodes[nodes.length - 1];
                        if (event.shiftKey && document.activeElement === first) {
                            event.preventDefault();
                            last?.focus();
                        }
                        else if (!event.shiftKey && document.activeElement === last) {
                            event.preventDefault();
                            first?.focus();
                        }
                    }
                } },
                React.createElement("label", { className: "dp-command-input" },
                    React.createElement(Icon, { name: "search" }),
                    React.createElement("input", { ref: node => { this.paletteInput = node; }, "aria-label": "Search commands", "aria-controls": "dp-command-results", "aria-activedescendant": results.length ? `dp-command-${active}` : undefined, role: "combobox", "aria-expanded": "true", autoComplete: "off", value: this.state.commandQuery, placeholder: "Search commands, cells and tables...", onChange: event => this.setState({ commandQuery: event.target.value, commandIndex: 0 }), onKeyDown: event => {
                            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                event.preventDefault();
                                this.setState({ commandIndex: Math.max(0, Math.min(results.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))) });
                            }
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                choose(results[active]);
                            }
                        } }),
                    React.createElement("button", { className: "dp-icon-button", "aria-label": "Close command palette", onClick: this.closePalette },
                        React.createElement(Icon, { name: "close" }))),
                React.createElement("div", { id: "dp-command-results", role: "listbox", "aria-label": "Matching commands", className: "dp-command-results" },
                    results.map((command, index) => React.createElement("button", { key: command.id, id: `dp-command-${index}`, role: "option", "aria-selected": index === active, disabled: command.disabled, className: index === active ? 'is-selected' : '', onMouseEnter: () => this.setState({ commandIndex: index }), onClick: () => choose(command) },
                        React.createElement(Icon, { name: command.kind === 'table' ? 'table' : command.kind === 'cell' ? 'code' : command.kind === 'notebook' ? 'notebook' : 'chevron' }),
                        React.createElement("span", null,
                            React.createElement("b", null, command.label),
                            React.createElement("small", null, command.detail)),
                        React.createElement("small", null, command.kind))),
                    !results.length && React.createElement("p", { className: "dp-empty-inline" }, "No matching commands.")),
                React.createElement("footer", null,
                    React.createElement("span", null, "Arrow keys to navigate"),
                    React.createElement("span", null, "Enter to select / Esc to close"))));
    }
    render() {
        const { layout, focus, width } = this.state;
        const sizes = (0, desktopModel_1.visiblePanelSizes)(layout, width, focus);
        const leftExplorer = layout.explorerSide === 'left';
        const leftWidth = leftExplorer ? sizes.explorer : sizes.inspector;
        const rightWidth = leftExplorer ? sizes.inspector : sizes.explorer;
        const divider = (explorer, reverse) => React.createElement(Divider, { label: explorer ? 'Resize explorer' : 'Resize inspector', value: explorer ? layout.explorerWidth : layout.inspectorWidth, min: explorer ? 180 : 200, max: 460, reverse: reverse, onChange: value => this.changeLayout(explorer ? { explorerWidth: value } : { inspectorWidth: value }) });
        const canExecute = this.props.canRun && !this.props.busy;
        return React.createElement("div", { ref: node => { this.root = node; }, className: `dp-desktop dp-mode-${this.props.mode} ${focus ? 'dp-focused' : ''} ${layout.compact ? 'dp-compact' : ''}`, "data-testid": "notebook-desktop" },
            React.createElement("div", { className: "dp-document-tabs" },
                React.createElement("div", { className: "dp-document-tab" },
                    React.createElement(Icon, { name: "notebook" }),
                    React.createElement("span", null, this.props.notebook.title),
                    React.createElement("span", { className: `dp-save-dot ${this.props.dirty ? 'is-dirty' : ''}`, title: this.props.dirty ? 'Unsaved notebook changes' : 'Saved' })),
                React.createElement("button", { className: "dp-command-trigger", onClick: this.openPalette },
                    React.createElement(Icon, { name: "search", size: 15 }),
                    React.createElement("span", null, "Search workspace"),
                    React.createElement("kbd", null, "Ctrl K"))),
            React.createElement("div", { className: "dp-toolbar" },
                React.createElement("div", { className: "dp-mode-switch", role: "group", "aria-label": "Notebook presentation" }, [{ id: 'notebook', label: 'Notebook', icon: 'notebook' }, { id: 'canvas', label: 'Canvas', icon: 'canvas' }, { id: 'arena', label: 'Arena', icon: 'arena' }].map(mode => React.createElement("button", { key: mode.id, "aria-pressed": this.props.mode === mode.id, disabled: this.props.busy || (mode.id === 'arena' && !this.props.exercise), title: mode.id === 'arena' && !this.props.exercise ? 'Open an exercise to use Arena' : mode.label, onClick: () => this.props.onMode(mode.id) },
                    React.createElement(Icon, { name: mode.icon, size: 16 }),
                    React.createElement("span", null, mode.label)))),
                React.createElement("div", { className: "dp-toolbar-divider" }),
                this.props.mode === 'arena' ? React.createElement("div", { className: "dp-run-actions" },
                    React.createElement("button", { className: "dp-button", title: canExecute ? 'Run visible checks' : 'Connect a local runtime to execute', disabled: !canExecute || !this.props.onRunChecks, onClick: this.props.onRunChecks },
                        React.createElement(Icon, { name: "play", size: 15 }),
                        "Run"),
                    React.createElement("button", { className: "dp-button dp-primary", title: "Submit records a graded attempt; it does not just run the editor", disabled: !canExecute || !this.props.onSubmit, onClick: this.props.onSubmit }, "Submit")) : React.createElement("button", { className: "dp-button dp-primary", disabled: !canExecute, title: canExecute ? 'Run in semantic notebook order' : 'No runtime connected. Source remains editable.', onClick: this.props.onRunAll },
                    React.createElement(Icon, { name: "play", size: 15 }),
                    "Run all"),
                React.createElement("button", { className: "dp-button", "aria-label": "Save notebook", disabled: this.props.busy, onClick: this.props.onSave },
                    React.createElement(Icon, { name: "save", size: 15 }),
                    React.createElement("span", null, "Save")),
                React.createElement("button", { className: "dp-icon-button", title: "Export notebook", "aria-label": "Export notebook", onClick: this.props.onExport },
                    React.createElement(Icon, { name: "download" })),
                React.createElement("div", { className: "dp-toolbar-end" },
                    React.createElement("button", { className: "dp-icon-button", "aria-label": "Toggle explorer", "aria-pressed": layout.explorerOpen, onClick: () => sizes.compactViewport ? this.setState({ mobileExplorer: !this.state.mobileExplorer }) : this.changeLayout({ explorerOpen: !layout.explorerOpen }) },
                        React.createElement(Icon, { name: "folder" })),
                    React.createElement("button", { className: "dp-icon-button", "aria-label": "Toggle context inspector", "aria-pressed": layout.inspectorOpen, onClick: () => this.changeLayout({ inspectorOpen: !layout.inspectorOpen }) },
                        React.createElement(Icon, { name: "panel" })),
                    React.createElement("button", { className: "dp-icon-button", "aria-label": focus ? 'Exit focus mode' : 'Enter focus mode', "aria-pressed": focus, onClick: () => this.setState({ focus: !focus }) },
                        React.createElement(Icon, { name: "focus" })),
                    React.createElement("details", { className: "dp-options" },
                        React.createElement("summary", { "aria-label": "More layout options" }, "..."),
                        React.createElement("div", null,
                            React.createElement("button", { onClick: () => this.changeLayout({ compact: !layout.compact }) }, layout.compact ? 'Comfortable density' : 'Compact density'),
                            React.createElement("button", { onClick: () => this.changeLayout({ ...desktopModel_1.DEFAULT_LAYOUT }) }, "Reset panel layout"),
                            this.props.mode === 'arena' && this.props.onResetExercise && React.createElement("button", { disabled: this.props.busy, onClick: () => { if (window.confirm('Reset this exercise to its starter? Your edited answer will be replaced.'))
                                    this.props.onResetExercise?.(); } }, "Reset exercise source..."))))),
            React.createElement("div", { className: "dp-runtime-line" },
                React.createElement("span", { className: `dp-runtime-dot ${this.props.canRun ? '' : 'dp-runtime-offline'}` }),
                React.createElement("b", null, this.props.runtimeLabel),
                React.createElement("span", { className: "dp-runtime-detail", title: this.props.runtimeDetail }, this.props.runtimeDetail),
                React.createElement("span", { className: "dp-local-badge" }, this.props.preview ? 'UI PREVIEW / NO EXECUTION' : 'SHARED WORKSPACE')),
            this.state.warning && React.createElement("div", { role: "status", className: "dp-warning" },
                this.state.warning,
                React.createElement("button", { onClick: () => this.setState({ warning: '' }), "aria-label": "Dismiss layout warning" }, "Dismiss")),
            React.createElement("div", { className: "dp-body", style: { gridTemplateColumns: `${leftWidth}px ${leftWidth ? 6 : 0}px minmax(0, 1fr) ${rightWidth ? 6 : 0}px ${rightWidth}px` } },
                React.createElement("div", { className: "dp-left-slot" }, leftWidth > 0 && (leftExplorer ? this.renderExplorer() : this.renderInspector())),
                leftWidth > 0 ? divider(leftExplorer, false) : React.createElement("div", null),
                React.createElement("main", { className: "dp-center", "aria-label": "Notebook coding area" }, this.props.mode === 'arena' ? this.renderArena() : this.props.mode === 'canvas' ? React.createElement("div", { className: "dp-canvas-scroll" },
                    React.createElement("div", { className: "dp-canvas-caption" },
                        React.createElement(Icon, { name: "canvas" }),
                        React.createElement("span", null, "Drag cell headers. Resize corners. Source and execution order stay unchanged.")),
                    this.props.canvas) : this.renderNotebook()),
                rightWidth > 0 ? divider(!leftExplorer, true) : React.createElement("div", null),
                React.createElement("div", { className: "dp-right-slot" }, rightWidth > 0 && (leftExplorer ? this.renderInspector() : this.renderExplorer()))),
            React.createElement("div", { className: "dp-bottom-bar" },
                React.createElement("span", null,
                    React.createElement(Icon, { name: "notebook", size: 13 }),
                    (0, desktopModel_1.semanticBlocks)(this.props.notebook).filter(desktopModel_1.isCode).length,
                    " code cells",
                    React.createElement("span", { className: "dp-dot-divider" }, "/"),
                    this.props.assets.length,
                    " catalog tables"),
                React.createElement("span", null,
                    focus ? 'Focus mode / Esc to exit' : 'Panel preferences / this browser',
                    React.createElement("span", { className: "dp-dot-divider" }, "/"),
                    this.props.busy ? 'Working' : this.props.dirty ? 'Unsaved notebook edits' : 'Ready')),
            sizes.compactViewport && this.state.mobileExplorer && React.createElement("div", { className: "dp-drawer-backdrop", onClick: e => { if (e.target === e.currentTarget)
                    this.setState({ mobileExplorer: false }); } },
                React.createElement("div", { className: "dp-mobile-explorer" }, this.renderExplorer())),
            layout.inspectorOpen && sizes.inspector === 0 && !focus && React.createElement("div", { className: "dp-floating-inspector" }, this.renderInspector()),
            this.renderPalette());
    }
}
exports.NotebookDesktop = NotebookDesktop;

},
"previewFixtures":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREVIEW_EXERCISES = exports.SAMPLE_ROWS = exports.PREVIEW_ASSETS = exports.PREVIEW_STORAGE_KEY = void 0;
exports.fixtureKey = fixtureKey;
exports.fixtureSource = fixtureSource;
exports.makeNotebookFixture = makeNotebookFixture;
exports.makeExerciseFixture = makeExerciseFixture;
exports.readFixtureDocuments = readFixtureDocuments;
const validation_1 = require("./analytics/validation");
exports.PREVIEW_STORAGE_KEY = 'datapass:ui-fixture-notebooks:m1';
exports.PREVIEW_ASSETS = [
    { name: 'source.orders', layer: 'source', row_count: 8, fresh: true },
    { name: 'source.customers', layer: 'source', row_count: 2, fresh: true },
    { name: 'bronze.orders_raw', layer: 'bronze', row_count: 8, fresh: true, producer: 'Fixture: ingestion' },
    { name: 'silver.orders_clean', layer: 'silver', row_count: 8, fresh: true, producer: 'Fixture: validation' },
    { name: 'gold.customer_revenue', layer: 'gold', row_count: 2, fresh: false, producer: 'Fixture: aggregation' },
];
exports.SAMPLE_ROWS = [
    { customer_id: 101, orders: 4, revenue: 2310 },
    { customer_id: 102, orders: 4, revenue: 1545 },
];
function fixtureKey(block) { return `mosaic:v2:${block.type === 'markdown' ? 'markdown' : 'code'}:${block.id}`; }
function fixtureSource(notebook, block) { return String(notebook.blockState[fixtureKey(block)] ?? ''); }
function block(id, title, kernel, role = 'code') {
    const type = kernel ?? 'markdown';
    return { id, title, type, kernel, role: kernel ? role : 'note', notebook: { source: 'ipynb', cellId: id, cellType: kernel ? 'code' : 'markdown', originalIndex: 0 } };
}
function document(id, title, cells) {
    const blocks = cells.map(c => c.block);
    return { schemaVersion: 1, id, title, blocks, info: null, blockState: Object.fromEntries(cells.map(c => [fixtureKey(c.block), c.source])),
        executions: {}, executedSource: {}, presentation: 'fabric', skin: 'fabric',
        views: [
            { id: 'notebook', label: 'Notebook', description: 'Semantic source order', blockIds: blocks.map(b => b.id), layout: blocks.map((b, i) => ({ i: b.id, x: 0, y: i * 12, w: 12, h: 12 })) },
            { id: 'free', label: 'Free canvas', description: 'Geometry only, no execution-order change', blockIds: blocks.map(b => b.id), layout: blocks.map((b, i) => ({ i: b.id, x: i % 2 * 6, y: Math.floor(i / 2) * 14, w: 6, h: 13, minW: 4, minH: 8 })) },
        ],
    };
}
function makeNotebookFixture() {
    const output = { id: 'out-revenue', type: 'notebook-output', title: 'Example result shape', role: 'result', notebook: { source: 'ipynb', cellId: 'out-revenue', parentCellId: 'revenue', cellType: 'output', originalIndex: 2 } };
    return document('m1-explore', 'Explore customer revenue', [
        { block: block('intro', 'A small lakehouse, a complete story'), source: '# Customer revenue\n\nStart with orders, keep valid transactions, and summarize revenue by customer.\n\nThis is a UI fixture: edit freely. The example output below is not an execution result.' },
        { block: block('revenue', '01 / Aggregate valid orders', 'sql'), source: '-- Revenue by customer\nSELECT\n    customer_id,\n    COUNT(*) AS orders,\n    ROUND(SUM(net_amount), 2) AS revenue\nFROM source.orders\nWHERE net_amount > 0\nGROUP BY customer_id\nORDER BY revenue DESC;' },
        { block: output, source: '' },
        { block: block('python', '02 / Inspect with Python', 'python'), source: '# Runs only with the trusted-local Python runtime enabled\nrows = query("SELECT * FROM source.orders")\nvalid_orders = [row for row in rows if row["net_amount"] > 0]\n\ndisplay(valid_orders[:5])' },
    ]);
}
function spec(id, language, title, prompt, starter) {
    return {
        schema_version: 1, id, version: 'ui-fixture-1', title, difficulty: 'easy', topics: [language === 'sql' ? 'aggregation' : 'deduplication', 'data quality'], tags: ['UI fixture'], origin: 'internal-demo', language,
        runtime: language === 'sql' ? 'Local SQL runtime (not connected)' : 'Trusted-local Python (not connected)', prompt,
        sections: [{ title: 'Your task', body: language === 'sql' ? 'Keep only orders where net_amount is greater than zero. Return customer_id, orders and revenue. Sort by revenue descending.' : 'Return a new list containing only the first occurrence of each order_id. Preserve input order and do not mutate the input.' },
            { title: 'Expected shape', body: language === 'sql' ? 'customer_id (integer), orders (integer), revenue (number)' : 'A list of order dictionaries; one dictionary per order_id.' }],
        starter_source: starter, fixtures: [{ id: 'orders-ui', version: '1' }], visible_checks: language === 'sql' ? [{ id: 'positive-only', description: 'Ignore zero and negative amounts.' }] : [{ id: 'first-occurrence', description: 'Keep the first full row for each order_id in input order.' }], hidden_check_refs: [], edge_check_refs: [],
        hints: [language === 'sql' ? 'Filter before aggregating. Use WHERE, GROUP BY, then ORDER BY.' : 'Track seen identifiers in a set. Append a row only when its identifier is new.'],
        solution: { available: false, reveal: 'explicit' }, explanation: 'This preview has no validator and never awards a passed status.', follow_ups: ['What changes when duplicate orders arrive?'],
        canonical_placement: { domain: 'analytics', topic: 'aggregation' }, related_associations: [], validator_version: 'not-installed-ui-preview',
        validation: { kind: 'rows', ordered: true, duplicate_sensitive: true, relative_tolerance: 0, absolute_tolerance: 0 },
        data_context: [{ name: 'source.orders', columns: { order_id: 'INTEGER', customer_id: 'INTEGER', net_amount: 'DECIMAL' }, sample_rows: [{ order_id: 1, customer_id: 101, net_amount: 125.5 }, { order_id: 2, customer_id: 101, net_amount: 0 }, { order_id: 3, customer_id: 102, net_amount: 89 }] }],
    };
}
exports.PREVIEW_EXERCISES = [
    spec('ui-revenue', 'sql', 'Revenue by customer', 'Build a customer revenue summary from order transactions. Invalid amounts must not affect your totals.', '-- Write your solution here\nSELECT\n    customer_id,\n    COUNT(*) AS orders,\n    SUM(net_amount) AS revenue\nFROM source.orders\n-- Filter, group, and sort below\n'),
    spec('ui-deduplicate', 'python', 'Keep the first order', 'An ingestion feed can deliver an order more than once. Keep the first occurrence of each order_id.', 'def solve(rows):\n    """Return the first row for each order_id, in input order."""\n    result = []\n    # Track identifiers already seen\n    return result\n'),
];
function makeExerciseFixture(exercise) {
    const answer = { ...block('answer', 'Your solution', exercise.language), exerciseId: exercise.id };
    const doc = document(`exercise-${exercise.id}-${exercise.version}`, exercise.title, [{ block: answer, source: exercise.starter_source }]);
    const panels = [
        { id: 'problem', type: 'markdown', title: exercise.title, role: 'problem' },
        { id: 'guidance', type: 'markdown', title: 'Hints and context', role: 'exercise-help' },
        { id: 'exercise-browser', type: 'markdown', title: 'Problem browser', role: 'exercise-browser' },
        { id: 'answer-output', type: 'notebook-output', title: 'Result evidence', role: 'result', notebook: { source: 'ipynb', cellId: 'answer-output', parentCellId: 'answer', cellType: 'output', originalIndex: 0 } },
    ];
    return { ...doc, exercise: { id: exercise.id, version: exercise.version }, presentation: 'leetcode', blocks: [...doc.blocks, ...panels],
        views: [...doc.views.map(v => ({ ...v, blockIds: [...v.blockIds, 'answer-output'], layout: [...v.layout, { i: 'answer-output', x: 0, y: 15, w: 12, h: 8 }] })),
            { id: 'leetcode', label: 'Arena', description: 'Shared exercise source', blockIds: ['problem', 'answer', 'answer-output', 'guidance', 'exercise-browser'], layout: [] }],
    };
}
/** Strictly bounded fixture restore. Does not claim to replace the real project importer. */
function readFixtureDocuments(text) {
    const docs = (0, validation_1.safeJson)(text, 8_000_000);
    if (!docs || typeof docs !== 'object' || Array.isArray(docs))
        throw new Error('Invalid preview backup');
    const entries = Object.entries(docs);
    if (entries.length > 10)
        throw new Error('Too many preview notebooks');
    const result = Object.create(null);
    for (const [id, value] of entries) {
        const n = value;
        if (!n || n.schemaVersion !== 1 || n.id !== id || typeof n.title !== 'string' || !Array.isArray(n.blocks) || !Array.isArray(n.views) || n.blocks.length > 300 || !n.blockState || typeof n.blockState !== 'object' || Array.isArray(n.blockState))
            throw new Error('Invalid preview notebook');
        if (n.blocks.some(b => !b || typeof b.id !== 'string' || typeof b.title !== 'string' || !['sql', 'python', 'polars', 'markdown', 'notebook-output'].includes(b.type)) || new Set(n.blocks.map(b => b.id)).size !== n.blocks.length)
            throw new Error('Invalid block identity');
        if (n.views.some(v => !v || typeof v.id !== 'string' || !Array.isArray(v.blockIds) || v.blockIds.some(id => typeof id !== 'string') || !Array.isArray(v.layout) || v.layout.some(i => !i || typeof i.i !== 'string' || ![i.x, i.y, i.w, i.h].every(Number.isFinite) || i.x < 0 || i.y < 0 || i.y > 10000 || i.w < 1 || i.w > 12 || i.h < 1 || i.h > 100 || i.x + i.w > 12)))
            throw new Error('Invalid layout');
        if (n.blocks.some(b => typeof n.blockState[fixtureKey(b)] !== 'undefined' && typeof n.blockState[fixtureKey(b)] !== 'string'))
            throw new Error('Invalid source value');
        // Saved browser data is never accepted as authentic execution evidence.
        result[id] = { ...n, executions: {}, executedSource: {}, outputCheckpoints: {}, clearedOutputs: [] };
    }
    return result;
}

},
"UiPreview":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiPreview = void 0;
const React = require("react");
const NotebookDesktop_1 = require("./NotebookDesktop");
const desktopModel_1 = require("./desktopModel");
const previewFixtures_1 = require("./previewFixtures");
require("./preview.css");
const editorEdits_1 = require("./editorEdits");
const AnalyticsWorkbench_1 = require("./analytics/AnalyticsWorkbench");
const project_1 = require("./analytics/project");
function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function highlight(source) {
    // JSX text escaping remains in control. No HTML injection or eval.
    const regex = /(--[^\n]*|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:SELECT|FROM|WHERE|GROUP|BY|ORDER|DESC|ASC|AS|SUM|COUNT|ROUND|LIMIT|def|return|for|in|if|import|False|True|None)\b|\b\d+(?:\.\d+)?\b)/g;
    const parts = source.split(regex);
    return parts.map((part, i) => React.createElement("span", { key: i, className: i % 2 === 0 ? '' : part.startsWith('--') || part.startsWith('#') ? 'pv-token-comment' : /^["']/.test(part) ? 'pv-token-string' : /^\d/.test(part) ? 'pv-token-number' : 'pv-token-keyword' }, part));
}
class PreviewEditor extends React.Component {
    state = { tabMovesFocus: false };
    backdrop = null;
    render() {
        return React.createElement("div", { className: "pv-editor" },
            React.createElement("div", { className: "pv-line-numbers", "aria-hidden": "true" }, this.props.source.split('\n').map((_, i) => React.createElement("div", { key: i }, i + 1))),
            React.createElement("div", { className: "pv-code-surface" },
                React.createElement("pre", { ref: node => { this.backdrop = node; }, "aria-hidden": "true" },
                    highlight(this.props.source),
                    '\n'),
                React.createElement("textarea", { "aria-label": this.props.label, spellCheck: false, autoCapitalize: "off", autoComplete: "off", value: this.props.source, onChange: e => this.props.onChange(e.target.value), onScroll: e => { if (this.backdrop) {
                        this.backdrop.scrollTop = e.currentTarget.scrollTop;
                        this.backdrop.scrollLeft = e.currentTarget.scrollLeft;
                    } }, onKeyDown: e => {
                        if (e.nativeEvent.isComposing)
                            return;
                        if (e.key === 'Escape') {
                            this.setState({ tabMovesFocus: true });
                            return;
                        }
                        const node = e.currentTarget, start = node.selectionStart, end = node.selectionEnd;
                        const language = this.props.language;
                        const edit = e.key === 'Tab' && !this.state.tabMovesFocus ? (0, editorEdits_1.indentSelection)(this.props.source, start, end, e.shiftKey)
                            : e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey ? (0, editorEdits_1.insertNewline)(this.props.source, start, end, language)
                                : (e.ctrlKey || e.metaKey) && e.key === '/' ? (0, editorEdits_1.toggleLineComment)(this.props.source, start, end, language) : null;
                        if (edit) {
                            e.preventDefault();
                            this.props.onChange(edit.value);
                            requestAnimationFrame(() => node.setSelectionRange(edit.start, edit.end));
                        }
                    } })),
            React.createElement("button", { className: "pv-tab-mode", onClick: () => this.setState({ tabMovesFocus: !this.state.tabMovesFocus }) }, this.state.tabMovesFocus ? 'Tab moves focus / click to indent' : 'Tab indents / Esc to move focus'));
    }
}
/** Harness-only pointer driver over the real NotebookView.layout shape. Production uses NotebookCanvas/react-grid-layout. */
class FixtureCanvas extends React.Component {
    root = null;
    drag = null;
    componentDidMount() { this.root?.addEventListener('pointerdown', this.down); }
    componentWillUnmount() { this.root?.removeEventListener('pointerdown', this.down); this.up(); }
    down = (e) => {
        if (e.button !== 0 || !(e.target instanceof Element))
            return;
        const handle = e.target.closest('[data-drag-id], [data-resize-id]');
        if (!handle)
            return;
        const id = handle.dataset.dragId ?? handle.dataset.resizeId;
        const layout = this.props.notebook.views.find(v => v.id === 'free')?.layout ?? [];
        const item = layout.find(i => i.i === id);
        if (!item || !this.root)
            return;
        e.preventDefault();
        this.drag = { id: item.i, pointer: e.pointerId, resize: !!handle.dataset.resizeId, x: e.clientX, y: e.clientY, col: this.root.clientWidth / 12, item: { ...item }, layout };
        window.addEventListener('pointermove', this.move);
        window.addEventListener('pointerup', this.up);
        window.addEventListener('pointercancel', this.up);
        window.addEventListener('blur', this.up);
    };
    move = (e) => {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointer)
            return;
        const dx = Math.round((e.clientX - d.x) / d.col), dy = Math.round((e.clientY - d.y) / 24);
        const item = d.resize ? { ...d.item, w: (0, desktopModel_1.clamp)(d.item.w + dx, 4, 12 - d.item.x), h: (0, desktopModel_1.clamp)(d.item.h + dy, 8, 40) } : { ...d.item, x: (0, desktopModel_1.clamp)(d.item.x + dx, 0, 12 - d.item.w), y: (0, desktopModel_1.clamp)(d.item.y + dy, 0, 200) };
        this.props.onLayout(d.layout.map(i => i.i === d.id ? item : i));
    };
    up = () => { this.drag = null; window.removeEventListener('pointermove', this.move); window.removeEventListener('pointerup', this.up); window.removeEventListener('pointercancel', this.up); window.removeEventListener('blur', this.up); };
    render() {
        const layout = this.props.notebook.views.find(v => v.id === 'free')?.layout ?? [];
        return React.createElement("div", { ref: node => { this.root = node; }, className: "pv-canvas", style: { height: Math.max(650, ...layout.map(i => (i.y + i.h) * 24 + 16)) } }, layout.map(item => {
            const b = this.props.notebook.blocks.find(b => b.id === item.i);
            if (!b)
                return null;
            return React.createElement("div", { key: b.id, className: "pv-canvas-card", style: { left: `calc(${item.x / 12 * 100}% + 7px)`, top: item.y * 24, width: `calc(${item.w / 12 * 100}% - 14px)`, height: item.h * 24 } },
                React.createElement("div", { className: "pv-canvas-handle", "data-drag-id": b.id },
                    React.createElement("span", null, "::"),
                    b.title,
                    React.createElement("small", null, "Drag")),
                React.createElement("div", { className: "pv-canvas-content" }, this.props.renderBlock(b)),
                React.createElement("button", { className: "pv-canvas-resize", "data-resize-id": b.id, "aria-label": `Resize ${b.title}`, title: "Drag to resize", onKeyDown: e => {
                        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key))
                            return;
                        e.preventDefault();
                        const next = { ...item, w: (0, desktopModel_1.clamp)(item.w + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0), 4, 12 - item.x), h: (0, desktopModel_1.clamp)(item.h + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0), 8, 40) };
                        this.props.onLayout(layout.map(i => i.i === item.i ? next : i));
                    } }, "\\"));
        }));
    }
}
function fixtureMode(notebook) { return notebook.preferredView === 'free' ? 'canvas' : notebook.preferredView === 'notebook' ? 'notebook' : notebook.exercise ? 'arena' : 'notebook'; }
class UiPreview extends React.Component {
    seed = (0, previewFixtures_1.makeNotebookFixture)();
    state = { documents: { [this.seed.id]: this.seed }, activeId: this.seed.id, mode: 'notebook', selected: 'revenue', dirty: false, notice: '', hints: false, notesEditing: null };
    counter = 0;
    componentDidMount() {
        try {
            const raw = localStorage.getItem(this.props.analytics ? 'datapass:ui-fixture-notebooks:m2' : previewFixtures_1.PREVIEW_STORAGE_KEY);
            if (raw) {
                const docs = (0, previewFixtures_1.readFixtureDocuments)(raw);
                this.setState({ documents: { ...this.state.documents, ...docs }, mode: fixtureMode(docs[this.seed.id] ?? this.seed), notice: 'Restored UI fixture notebooks from this browser. No execution evidence was loaded.' });
            }
        }
        catch {
            this.setState({ notice: 'Browser fixture storage could not be read. Fresh examples loaded; nothing was executed.' });
        }
        window.addEventListener('beforeunload', this.unload);
    }
    componentWillUnmount() { window.removeEventListener('beforeunload', this.unload); }
    unload = (e) => { if (this.state.dirty) {
        e.preventDefault();
        e.returnValue = '';
    } };
    notebook = () => this.state.documents[this.state.activeId];
    update = (notebook) => this.setState(s => ({ documents: { ...s.documents, [notebook.id]: notebook }, dirty: true }));
    changeSource = (id, source) => {
        const n = this.notebook(), b = n.blocks.find(b => b.id === id);
        if (!b)
            return;
        this.update({ ...n, blockState: { ...n.blockState, [(0, previewFixtures_1.fixtureKey)(b)]: source } });
    };
    open = (id) => {
        const doc = this.state.documents[id];
        if (!doc)
            return;
        this.setState({ activeId: id, selected: (0, desktopModel_1.semanticBlocks)(doc).find(b => b.kernel)?.id ?? doc.blocks[0]?.id ?? '', mode: fixtureMode(doc), hints: false });
    };
    openExercise = (index) => {
        const exercise = previewFixtures_1.PREVIEW_EXERCISES[index], fresh = (0, previewFixtures_1.makeExerciseFixture)(exercise);
        this.setState(s => ({ documents: { ...s.documents, [fresh.id]: s.documents[fresh.id] ?? fresh }, activeId: fresh.id, selected: 'answer', mode: 'arena', hints: false }));
    };
    add = (kernel, source) => {
        const n = this.notebook(), id = `ui-${Date.now()}-${++this.counter}`;
        const block = { id, title: kernel === 'markdown' ? 'New note' : `New ${kernel.toUpperCase()} cell`, type: kernel, ...(kernel === 'markdown' ? {} : { kernel }), role: kernel === 'markdown' ? 'note' : 'code', notebook: { source: 'ipynb', cellId: id, cellType: kernel === 'markdown' ? 'markdown' : 'code', originalIndex: n.blocks.length } };
        const next = { ...n, blocks: [...n.blocks, block], blockState: { ...n.blockState, [(0, previewFixtures_1.fixtureKey)(block)]: source ?? (kernel === 'markdown' ? '# Notes\n\nWrite your observations.' : kernel === 'sql' ? '-- Write your SQL here\n' : '# Write your code here\n') }, views: n.views.map(v => ({ ...v, blockIds: [...v.blockIds, id], layout: [...v.layout, { i: id, x: 0, y: Math.max(0, ...v.layout.map(i => i.y + i.h)) + 1, w: v.id === 'free' ? 6 : 12, h: 12 }] })) };
        this.update(next);
        this.setState({ selected: id, mode: 'notebook' });
        setTimeout(() => document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }), 80);
    };
    save = () => {
        try {
            (0, previewFixtures_1.readFixtureDocuments)(JSON.stringify(this.state.documents));
            localStorage.setItem(this.props.analytics ? 'datapass:ui-fixture-notebooks:m2' : previewFixtures_1.PREVIEW_STORAGE_KEY, JSON.stringify(this.state.documents));
            this.setState({ dirty: false, notice: 'UI fixture notebook sources saved in this browser. Export JSON for a portable backup.' });
        }
        catch {
            this.setState({ notice: 'Save failed: browser storage is unavailable or full. Your edits remain in memory. Export JSON now to keep a copy.' });
        }
    };
    renderBlock = (block) => {
        const n = this.notebook(), exercise = previewFixtures_1.PREVIEW_EXERCISES.find(e => e.id === n.exercise?.id);
        let content;
        if (block.role === 'problem' && exercise)
            content = React.createElement("div", { className: "lesson-pane" },
                React.createElement("h2", null, exercise.title),
                React.createElement("p", null, exercise.prompt),
                exercise.sections.map(s => React.createElement("section", { key: s.title },
                    React.createElement("h3", null, s.title),
                    React.createElement("p", null, s.body))),
                React.createElement("div", { className: "pv-problem-example" },
                    React.createElement("b", null, "Example"),
                    React.createElement("pre", null, exercise.language === 'sql' ? 'customer_id | orders | revenue\n101         | 1      | 125.50\n102         | 1      |  89.00' : 'Input:  [{order_id: 1}, {order_id: 1}, {order_id: 2}]\nOutput: [{order_id: 1}, {order_id: 2}]'),
                    React.createElement("small", null, "Illustrative example, not a check result.")),
                React.createElement("h3", null, "Keep in mind"),
                React.createElement("p", null, exercise.language === 'sql' ? 'Null amounts do not satisfy net_amount > 0. Return one row per customer.' : 'Rows are dictionaries. Preserve the first full row, not just the identifier.'));
        else if (block.role === 'exercise-help' && exercise)
            content = React.createElement("div", { className: "lesson-pane" },
                React.createElement("h3", null, "A nudge, not the answer"),
                React.createElement("p", null, "Try solving the problem before revealing the hint."),
                React.createElement("button", { className: "dp-button", onClick: () => this.setState({ hints: !this.state.hints }) }, this.state.hints ? 'Hide hint' : 'Reveal hint'),
                this.state.hints && React.createElement("p", { className: "pv-hint" }, exercise.hints[0]),
                React.createElement("hr", null),
                React.createElement("h3", null, "Run versus Submit"),
                React.createElement("p", null, "In the connected app, Run executes visible checks. Submit runs the configured grading checks and records an attempt. This fixture does neither."));
        else if (block.role === 'exercise-browser')
            content = React.createElement("div", { className: "lesson-pane" },
                React.createElement("h3", null, "UI practice fixtures"),
                previewFixtures_1.PREVIEW_EXERCISES.map((e, i) => React.createElement("button", { key: e.id, className: "pv-exercise-link", onClick: () => this.openExercise(i) },
                    React.createElement("b", null, e.title),
                    React.createElement("small", null,
                        e.language.toUpperCase(),
                        " / Easy / UI fixture only"))));
        else if (block.type === 'notebook-output')
            content = n.exercise ? React.createElement("div", { className: "pv-not-run" },
                React.createElement("span", { className: "dp-pill" }, "Not run"),
                React.createElement("h3", null, "Your result evidence will appear here"),
                React.createElement("p", null, "The editor and layout work without infrastructure. Running and grading require the local Datapass API. No result or attempt has been fabricated."),
                React.createElement("div", null,
                    React.createElement("span", null, "Visible checks"),
                    React.createElement("b", null, "Not executed")),
                React.createElement("div", null,
                    React.createElement("span", null, "Hidden checks"),
                    React.createElement("b", null, "Server-owned"))) : React.createElement("div", { className: "pv-table-wrap" },
                React.createElement("div", { className: "pv-example-label" },
                    React.createElement(NotebookDesktop_1.Icon, { name: "info", size: 14 }),
                    React.createElement("span", null, "Example output / not executed / does not change when you edit code")),
                React.createElement("table", { className: "pv-table" },
                    React.createElement("thead", null,
                        React.createElement("tr", null, Object.keys(previewFixtures_1.SAMPLE_ROWS[0]).map(k => React.createElement("th", { key: k },
                            k,
                            React.createElement("small", null, k === 'customer_name' ? 'VARCHAR' : k === 'revenue' ? 'DECIMAL' : 'INTEGER'))))),
                    React.createElement("tbody", null, previewFixtures_1.SAMPLE_ROWS.map((r, i) => React.createElement("tr", { key: i }, Object.values(r).map((v, j) => React.createElement("td", { key: j }, v)))))),
                React.createElement("div", { className: "pv-table-footer" },
                    previewFixtures_1.SAMPLE_ROWS.length,
                    " sample rows",
                    React.createElement("span", null, "Fixture data, not runtime evidence")));
        else if (block.type === 'markdown') {
            const source = (0, previewFixtures_1.fixtureSource)(n, block);
            content = this.state.notesEditing === block.id ? React.createElement("div", { className: "pv-note-edit" },
                React.createElement("textarea", { "aria-label": `Edit ${block.title}`, value: source, onChange: e => this.changeSource(block.id, e.target.value) }),
                React.createElement("button", { className: "dp-button", onClick: () => this.setState({ notesEditing: null }) }, "Preview text")) : React.createElement("div", { className: "pv-markdown", onDoubleClick: () => this.setState({ notesEditing: block.id }) },
                source.split('\n').filter(Boolean).map((line, i) => line.startsWith('# ') ? React.createElement("h2", { key: i }, line.slice(2)) : React.createElement("p", { key: i }, line)),
                React.createElement("button", { className: "pv-edit-note", onClick: () => this.setState({ notesEditing: block.id }) }, "Edit text"));
        }
        else
            content = React.createElement("div", null,
                React.createElement("div", { className: "pv-kernel" },
                    React.createElement("span", null,
                        React.createElement("span", { className: "pv-kernel-icon" }, block.kernel === 'sql' ? 'SQL' : 'Py'),
                        block.kernel === 'sql' ? 'SQL' : block.kernel === 'polars' ? 'Polars' : 'Python'),
                    React.createElement("small", null, "Editable / runtime disconnected")),
                React.createElement(PreviewEditor, { source: (0, previewFixtures_1.fixtureSource)(n, block), label: `Source: ${block.title}`, language: block.kernel ?? 'sql', onChange: source => this.changeSource(block.id, source) }),
                React.createElement("div", { className: "pv-cell-footer" },
                    React.createElement("span", null, "Tab inserts 4 spaces"),
                    React.createElement("span", null, "No execution in UI preview")));
        return React.createElement("section", { className: `notebook-block pv-block pv-block-${block.type}`, "data-block-id": block.id },
            React.createElement("header", { className: "block-header" },
                React.createElement("div", { className: "block-drag-handle" },
                    React.createElement(NotebookDesktop_1.Icon, { name: block.type === 'notebook-output' ? 'table' : block.type === 'markdown' ? 'notebook' : 'code', size: 15 }),
                    React.createElement("b", null, block.title)),
                React.createElement("div", { className: "block-actions" },
                    React.createElement("span", null, block.kernel?.toUpperCase() ?? (block.type === 'notebook-output' ? 'OUTPUT SHAPE' : 'TEXT')))),
            React.createElement("div", { className: "block-body" }, content));
    };
    render() {
        const n = this.notebook(), exercise = previewFixtures_1.PREVIEW_EXERCISES.find(e => e.id === n.exercise?.id);
        const analytics = (0, project_1.readProject)(n.blockState[project_1.LAB_KEY]);
        const desktop = React.createElement(NotebookDesktop_1.NotebookDesktop, { key: n.id, managed: this.props.analytics, workspaceId: "ui-fixture-workspace", workspaceTitle: "Retail analytics", notebook: n, mode: this.state.mode, assets: previewFixtures_1.PREVIEW_ASSETS, linkedNotebooks: Object.values(this.state.documents), exercise: exercise, selectedBlockId: this.state.selected, busy: false, dirty: this.state.dirty, runtimeLabel: "UI preview / disconnected", runtimeDetail: "Fixture catalog only. No Oracle, Spark, dbt or cloud service needed.", canRun: false, preview: true, renderBlock: this.renderBlock, canvas: React.createElement(FixtureCanvas, { notebook: n, renderBlock: this.renderBlock, onLayout: layout => this.update({ ...n, views: n.views.map(v => v.id === 'free' ? { ...v, layout } : v) }) }), onMode: mode => { this.update({ ...n, preferredView: mode === 'canvas' ? 'free' : mode === 'arena' ? 'leetcode' : 'notebook' }); this.setState({ mode }); }, onSelect: selected => this.setState({ selected }), onInspect: name => this.add('sql', (0, desktopModel_1.previewSql)(name)), onOpenNotebook: this.open, onAdd: this.add, onSave: this.save, onRunAll: () => { }, onExport: () => download(`${n.id}.json`, n), onResetExercise: exercise ? () => { this.update((0, previewFixtures_1.makeExerciseFixture)(exercise)); this.setState({ hints: false }); } : undefined });
        return React.createElement("div", { className: "pv-app" },
            React.createElement("header", { className: "pv-app-header" },
                React.createElement("div", { className: "pv-brand" },
                    React.createElement("span", { className: "pv-brand-mark" },
                        React.createElement("i", null),
                        React.createElement("i", null),
                        React.createElement("i", null),
                        React.createElement("i", null)),
                    React.createElement("b", null, "Datapass"),
                    React.createElement("span", null, "Studio"),
                    React.createElement("small", null, this.props.analytics ? 'ANALYTICS M2' : 'UI MILESTONE 1')),
                React.createElement("nav", { "aria-label": "Preview fixtures" },
                    React.createElement("button", { className: !n.exercise ? 'active' : '', onClick: () => this.open('m1-explore') },
                        React.createElement(NotebookDesktop_1.Icon, { name: "notebook", size: 16 }),
                        "Notebook"),
                    React.createElement("button", { className: n.exercise?.id === 'ui-revenue' ? 'active' : '', onClick: () => this.openExercise(0) },
                        React.createElement(NotebookDesktop_1.Icon, { name: "arena", size: 16 }),
                        "SQL arena"),
                    React.createElement("button", { className: n.exercise?.id === 'ui-deduplicate' ? 'active' : '', onClick: () => this.openExercise(1) }, "Python arena")),
                React.createElement("div", { className: "pv-avatar" }, "JP")),
            React.createElement("div", { className: "pv-preview-banner" },
                React.createElement(NotebookDesktop_1.Icon, { name: "info", size: 15 }),
                React.createElement("span", null,
                    React.createElement("b", null, "UI-only preview."),
                    " Edit notebooks, dbt sources, models and charts. Sample documents; no SQL/dbt/Python runner is connected in this preview."),
                React.createElement("details", null,
                    React.createElement("summary", null, "About"),
                    React.createElement("div", null, "Production uses the existing React 19 + Fluent UI app, API, CodeEditor, NotebookCanvas and exercise grader. This no-install harness uses a bundled React 18-era compatibility runtime, recovered from the supplied AtlasNote public build. Source export uses the existing RootNotebook JSON shape. No data is uploaded."))),
            this.state.notice && React.createElement("div", { className: "pv-notice", role: "status" },
                React.createElement("span", null, this.state.notice),
                React.createElement("button", { onClick: () => this.setState({ notice: '' }), "aria-label": "Dismiss preview notice" },
                    React.createElement(NotebookDesktop_1.Icon, { name: "close", size: 14 }))),
            React.createElement("div", { className: "pv-main" }, this.props.analytics ? React.createElement(AnalyticsWorkbench_1.AnalyticsWorkbench, { key: `analytics-${n.id}`, project: analytics.project, restoreError: analytics.error, ownerTitle: n.title, preview: true, onSave: this.save, notebookContent: desktop, onChange: project => {
                    const current = this.notebook();
                    if (current.id !== n.id) {
                        this.setState({ notice: 'Notebook changed; analytics edit was cancelled.' });
                        return;
                    }
                    this.update({ ...current, blockState: { ...current.blockState, [project_1.LAB_KEY]: project } });
                } }) : desktop));
    }
}
exports.UiPreview = UiPreview;

},
"analytics/AnalyticsWorkbench":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsWorkbench = AnalyticsWorkbench;
const React = require("react");
const project_1 = require("./project");
const DbtStudio_1 = require("./DbtStudio");
const ModelStudio_1 = require("./ModelStudio");
const ChartsStudio_1 = require("./ChartsStudio");
const RuntimeStudio_1 = require("./RuntimeStudio");
const controls_1 = require("./controls");
require("./analytics.css");
function AnalyticsWorkbench({ project, onChange, notebookContent, ownerTitle, onSave, busy = false, preview = false, restoreError }) {
    const [error, setError] = React.useState(''), [focus, setFocus] = React.useState(false), [palette, setPalette] = React.useState(false), [search, setSearch] = React.useState('');
    const [newTabPane, setNewTabPane] = React.useState(null);
    const latest = React.useRef(project);
    latest.current = project;
    const root = React.useRef(null), area = React.useRef(null);
    const session = project.session;
    const safe = (action) => { try {
        action();
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : String(e));
    } };
    const commit = (next) => {
        if (busy)
            throw new Error('Wait for the current operation before editing the analytics attachment.');
        if (restoreError)
            throw new Error('The saved analytics document could not be restored. Export the original notebook before replacing it.');
        if (latest.current !== project)
            throw new Error('The document changed while a file was being read. Import cancelled; current edits were retained.');
        const candidate = { ...next, revision: project.revision + 1 };
        if (new TextEncoder().encode(JSON.stringify(candidate)).length > 1_200_000)
            throw new Error('Analytics attachment exceeds 1.2 MB. Use smaller artifacts/row samples; the current design is retained. The whole notebook also has a backend size limit.');
        onChange(candidate);
    };
    const patchSession = (patch) => safe(() => commit({ ...project, session: { ...session, ...patch } }));
    const select = (layer, pane = session.activePane) => safe(() => { commit({ ...project, session: (0, project_1.openLayer)(session, layer, pane) }); setNewTabPane(null); setPalette(false); });
    React.useEffect(() => {
        const key = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                e.stopImmediatePropagation();
                setPalette(p => !p);
                setSearch('');
            }
            if (e.key === 'Escape') {
                setFocus(false);
                setPalette(false);
                setNewTabPane(null);
            }
        };
        window.addEventListener('keydown', key, true);
        return () => window.removeEventListener('keydown', key, true);
    }, []);
    const currentPane = session.panes.find(p => p.id === session.activePane) ?? session.panes[0];
    const currentLayer = currentPane.tabs.find(t => t.id === currentPane.active)?.layer;
    const visible = session.panes.filter(p => p.id !== session.collapsed);
    const notebookPanes = visible.filter(p => p.tabs.find(t => t.id === p.active)?.layer === 'notebook');
    const liveNotebookPane = (notebookPanes.find(p => p.id === session.activePane) ?? notebookPanes[0])?.id;
    const layerContent = (layer, pane) => {
        const props = { project, onChange: (next) => safe(() => commit(next)), onError: setError };
        switch (layer) {
            case 'notebook': return pane.id === liveNotebookPane ? React.createElement("div", { className: "an-shared-notebook" }, notebookContent) : React.createElement("div", { className: "an-empty" },
                React.createElement("h3", null, "Shared notebook reference"),
                React.createElement("p", null, "Only one live notebook editor mounts at a time. Focus this pane to transfer editing without copying source."),
                React.createElement("button", { onClick: () => patchSession({ activePane: pane.id }) }, "Edit notebook here"));
            case 'dbt': return React.createElement(DbtStudio_1.DbtStudio, { ...props });
            case 'lineage': return React.createElement(DbtStudio_1.LineageStudio, { ...props });
            case 'model': return React.createElement(ModelStudio_1.ModelStudio, { ...props });
            case 'scd': return React.createElement(ModelStudio_1.ScdStudio, { ...props });
            case 'charts': return React.createElement(ChartsStudio_1.ChartsStudio, { ...props });
            case 'connections': return React.createElement(RuntimeStudio_1.RuntimeStudio, null);
            case 'sparklab': return React.createElement(RuntimeStudio_1.GuidedSparkStudio, null);
        }
    };
    return React.createElement("div", { ref: root, className: `an-workbench ${focus ? 'an-focus' : ''}`, "data-theme": session.theme, "aria-label": "Analytics workbench" },
        !focus && React.createElement(React.Fragment, null,
            React.createElement("div", { className: "an-topline" },
                React.createElement("div", { className: "an-owner" },
                    React.createElement("span", { className: "an-logo" }, "D"),
                    React.createElement("div", null,
                        React.createElement("b", null, project.title),
                        React.createElement("small", null,
                            ownerTitle,
                            " / shared source")),
                    React.createElement("span", { className: "an-badge" }, "ANALYTICS M2")),
                React.createElement("button", { onClick: () => { setPalette(true); setSearch(''); } },
                    "Find a view ",
                    React.createElement("kbd", null, "Ctrl K"))),
            React.createElement("div", { className: "an-commandbar" },
                React.createElement("button", { className: session.explorerOpen ? 'selected' : '', "aria-label": "Toggle analytics explorer", "aria-pressed": session.explorerOpen, onClick: () => patchSession({ explorerOpen: !session.explorerOpen }) }, "Explorer"),
                React.createElement("button", { "aria-label": "Split right", onClick: () => safe(() => commit({ ...project, session: (0, project_1.splitSession)(session, 'horizontal') })) }, "Split right"),
                React.createElement("button", { "aria-label": "Split down", onClick: () => safe(() => commit({ ...project, session: (0, project_1.splitSession)(session, 'vertical') })) }, "Split down"),
                React.createElement("span", { className: "an-command-spacer" }),
                React.createElement("button", { onClick: onSave, disabled: busy }, "Save notebook + views"),
                React.createElement("button", { "aria-label": "Toggle analytics context", "aria-pressed": session.contextOpen, className: session.contextOpen ? 'selected' : '', onClick: () => patchSession({ contextOpen: !session.contextOpen }) }, "Context"),
                React.createElement("label", { className: "an-theme-label" },
                    "Theme",
                    React.createElement("select", { "aria-label": "Analytics theme", value: session.theme, onChange: e => patchSession({ theme: e.target.value }) },
                        React.createElement("option", { value: "fluent" }, "Fluent light"),
                        React.createElement("option", { value: "neutral" }, "Neutral"),
                        React.createElement("option", { value: "dark" }, "Dark slate"))),
                React.createElement("button", { onClick: () => setFocus(true) }, "Focus"),
                React.createElement("details", { className: "an-menu" },
                    React.createElement("summary", { "aria-label": "Analytics more actions" }, "More"),
                    React.createElement("div", null,
                        React.createElement("button", { onClick: () => (0, controls_1.downloadText)('datapass-analytics.json', JSON.stringify(project, null, 2), 'application/json') }, "Export analytics JSON"),
                        React.createElement(controls_1.FileImport, { label: "Import analytics JSON", onError: setError, onRead: text => safe(() => { const candidate = (0, project_1.importProject)(text); if (window.confirm('Replace this notebook\'s analytics design, sources and layout? The notebook code itself will not be replaced.'))
                                commit(candidate); }) }),
                        React.createElement("button", { onClick: () => safe(() => commit({ ...project, session: (0, project_1.singlePaneSession)(session) })) }, "Single pane (keep tabs)"),
                        React.createElement("button", { onClick: () => patchSession({ explorerOpen: false, contextOpen: false }) }, "Hide both sidebars"),
                        React.createElement("p", null, "Analytics JSON is not a complete notebook or data backup. Export the notebook separately."))))),
        focus && React.createElement("button", { className: "an-exit-focus", onClick: () => setFocus(false) }, "Exit focus / Esc"),
        (error || restoreError) && React.createElement("div", { className: "an-error", role: "alert" },
            React.createElement("span", null, error || restoreError),
            React.createElement("button", { onClick: () => setError('') }, "Dismiss"),
            restoreError && React.createElement("button", { onClick: () => { if (window.confirm('The invalid attachment remains in the original notebook until you replace it. Export that notebook first. Replace analytics with a fresh design?'))
                    onChange(project); } }, "Replace invalid analytics")),
        React.createElement("div", { className: "an-body" },
            session.explorerOpen && !focus && React.createElement("aside", { className: "an-navigation", "aria-label": "Analytics layers" },
                React.createElement("div", { className: "an-sidebar-title" },
                    React.createElement("b", null, "Workspace"),
                    React.createElement("button", { "aria-label": "Collapse analytics explorer", onClick: () => patchSession({ explorerOpen: false }) }, "x")),
                React.createElement("div", { className: "an-section-label" }, "TOOLS / SAME DOCUMENT"),
                project_1.LAYERS.map(l => React.createElement("button", { className: l.id === currentLayer ? 'selected' : '', key: l.id, onClick: () => select(l.id), title: l.description },
                    React.createElement("span", { className: `an-layer-symbol an-symbol-${l.id}` }, l.id === 'dbt' ? 'dbt' : l.id === 'scd' ? 'SCD' : l.id === 'charts' ? 'BI' : l.id === 'notebook' ? '{}' : l.id === 'lineage' ? '-o' : l.id === 'model' ? '*' : l.id === 'sparklab' ? 'S' : 'o'),
                    React.createElement("span", null, l.label))),
                React.createElement("div", { className: "an-sidebar-note" },
                    React.createElement("b", null, "One source, many views"),
                    React.createElement("p", null, "Tabs and panes do not clone notebook code, data, or run history."),
                    React.createElement("small", null, "dbt sources and designs are an attachment to this notebook in M2."))),
            React.createElement("div", { className: `an-panes ${session.direction}`, ref: area }, session.panes.map((pane, index) => {
                const tab = pane.tabs.find(t => t.id === pane.active);
                if (session.collapsed === pane.id)
                    return React.createElement("button", { key: pane.id, className: "an-collapsed-pane", "aria-label": `Restore pane ${pane.id.toUpperCase()}`, onClick: () => patchSession({ collapsed: null, activePane: pane.id }) },
                        React.createElement("span", null, pane.id.toUpperCase()),
                        React.createElement("span", null, "Restore"));
                return React.createElement(React.Fragment, { key: pane.id },
                    index === 1 && !session.collapsed && React.createElement("div", { role: "separator", "aria-label": "Resize workspace panes", "aria-orientation": session.direction === 'horizontal' ? 'vertical' : 'horizontal', "aria-valuemin": 25, "aria-valuemax": 75, "aria-valuenow": Math.round(session.ratio), tabIndex: 0, className: "an-splitter", onKeyDown: e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) {
                            e.preventDefault();
                            patchSession({ ratio: e.key === 'Home' ? 50 : Math.max(25, Math.min(75, session.ratio + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 2 : -2))) });
                        } }, onPointerDown: e => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.dataset.resizing = 'yes'; }, onPointerMove: e => { if (e.currentTarget.dataset.resizing !== 'yes' || !area.current)
                            return; const rect = area.current.getBoundingClientRect(); const value = session.direction === 'horizontal' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height; patchSession({ ratio: Math.max(25, Math.min(75, value * 100)) }); }, onPointerUp: e => { delete e.currentTarget.dataset.resizing; }, onPointerCancel: e => { delete e.currentTarget.dataset.resizing; }, onLostPointerCapture: e => { delete e.currentTarget.dataset.resizing; } }),
                    React.createElement("section", { className: `an-pane ${session.activePane === pane.id ? 'active' : ''}`, style: { flex: session.collapsed || session.panes.length === 1 ? '1 1 0' : `${index === 0 ? session.ratio : 100 - session.ratio} 1 0` }, "aria-label": `Pane ${pane.id.toUpperCase()}`, onFocusCapture: () => { if (session.activePane !== pane.id)
                            patchSession({ activePane: pane.id }); } },
                        !focus && React.createElement("div", { className: "an-tabs" },
                            React.createElement("div", { role: "tablist", "aria-label": `Pane ${pane.id.toUpperCase()} tabs` }, pane.tabs.map(t => React.createElement("div", { className: "an-tab-group", key: t.id },
                                React.createElement("button", { role: "tab", "aria-selected": t.id === pane.active, id: `an-tab-${t.id}`, "aria-controls": `an-panel-${pane.id}`, onClick: () => patchSession({ activePane: pane.id, panes: session.panes.map(p => p.id === pane.id ? { ...p, active: t.id } : p) }) }, t.layer === 'notebook' ? ownerTitle : t.title),
                                React.createElement("button", { "aria-label": `Close ${t.title} in pane ${pane.id.toUpperCase()}`, onClick: () => safe(() => commit({ ...project, session: (0, project_1.closeTab)(session, pane.id, t.id) })) }, "x")))),
                            React.createElement("button", { className: "an-add-tab", "aria-label": `New tab in pane ${pane.id.toUpperCase()}`, onClick: () => setNewTabPane(newTabPane === pane.id ? null : pane.id) }, "+"),
                            session.panes.length === 2 && React.createElement(React.Fragment, null,
                                React.createElement("button", { className: "an-small-action", disabled: !tab, "aria-label": `Move active tab from pane ${pane.id.toUpperCase()}`, title: "Move tab to other pane", onClick: () => safe(() => commit({ ...project, session: (0, project_1.moveTab)(session, pane.id, pane.active) })) }, "Move"),
                                React.createElement("button", { className: "an-small-action", "aria-label": `Collapse pane ${pane.id.toUpperCase()}`, onClick: () => patchSession({ collapsed: pane.id, activePane: pane.id === 'a' ? 'b' : 'a' }) }, "Hide"))),
                        newTabPane === pane.id && React.createElement("div", { className: "an-tab-picker", "aria-label": "Choose new view" }, project_1.LAYERS.map(l => React.createElement("button", { key: l.id, onClick: () => select(l.id, pane.id) },
                            React.createElement("b", null, l.label),
                            React.createElement("small", null, l.description)))),
                        React.createElement("div", { className: "an-pane-content", role: "tabpanel", id: `an-panel-${pane.id}`, "aria-labelledby": tab ? `an-tab-${tab.id}` : undefined }, tab ? layerContent(tab.layer, pane) : React.createElement("div", { className: "an-empty" },
                            React.createElement("span", { className: "an-empty-mark" }, "+"),
                            React.createElement("h3", null, "Your next view"),
                            React.createElement("p", null, "Open a notebook, dbt source, model or chart here. No data is copied."),
                            React.createElement("div", { className: "an-empty-tools" }, project_1.LAYERS.slice(0, 6).map(l => React.createElement("button", { key: l.id, onClick: () => select(l.id, pane.id) }, l.label)))))));
            })),
            session.contextOpen && !focus && React.createElement("aside", { className: "an-context", "aria-label": "Analytics context" },
                React.createElement("div", { className: "an-sidebar-title" },
                    React.createElement("b", null, "Context"),
                    React.createElement("button", { "aria-label": "Collapse analytics context", onClick: () => patchSession({ contextOpen: false }) }, "x")),
                React.createElement("span", { className: "an-badge" }, currentLayer === 'notebook' ? 'Notebook runtime below' : currentLayer === 'scd' ? 'Local teaching model' : 'No live execution'),
                React.createElement("h3", null, project_1.LAYERS.find(l => l.id === currentLayer)?.label ?? 'Empty pane'),
                React.createElement("p", null, project_1.LAYERS.find(l => l.id === currentLayer)?.description),
                React.createElement("dl", null,
                    React.createElement("dt", null, "Owner notebook"),
                    React.createElement("dd", null, ownerTitle),
                    React.createElement("dt", null, "Source files"),
                    React.createElement("dd", null, project.files.length),
                    React.createElement("dt", null, "Declared model tables"),
                    React.createElement("dd", null, project.model.tables.length),
                    React.createElement("dt", null, "dbt artifacts"),
                    React.createElement("dd", null, project.artifacts ? `${project.artifacts.nodes.length} imported nodes` : 'Not imported'),
                    React.createElement("dt", null, "Runner"),
                    React.createElement("dd", null, "Not connected to analytics layer")),
                React.createElement("p", null, "Show, hide and rearrange views without changing execution order. Schema relationships are designs; imported build evidence is historical."),
                React.createElement("button", { onClick: () => select('connections') }, "Runtime & setup"))),
        !focus && React.createElement("footer", { className: "an-status" },
            React.createElement("span", null,
                preview ? 'UI-only preview' : 'Notebook-attached analytics',
                " / no automatic cloud requests"),
            React.createElement("span", null,
                "Revision ",
                project.revision,
                " / ",
                session.panes.length,
                " pane",
                session.panes.length > 1 ? 's' : '',
                " / ",
                session.theme)),
        palette && React.createElement("div", { className: "an-modal-backdrop", onMouseDown: e => { if (e.target === e.currentTarget)
                setPalette(false); } },
            React.createElement("section", { className: "an-palette", role: "dialog", "aria-modal": "true", "aria-label": "Find workspace view", onKeyDown: e => { if (e.key === 'Tab') {
                    const controls = e.currentTarget.querySelectorAll('input,button');
                    const first = controls[0], last = controls[controls.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                    else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                } } },
                React.createElement("input", { autoFocus: true, "aria-label": "Search workspace views", placeholder: "Search views, or type a model filename...", value: search, onChange: e => setSearch(e.target.value) }),
                project_1.LAYERS.filter(l => `${l.label} ${l.description}`.toLowerCase().includes(search.toLowerCase())).map(l => React.createElement("button", { key: l.id, onClick: () => select(l.id) },
                    React.createElement("b", null, l.label),
                    React.createElement("small", null, l.description))),
                search.length > 1 && project.files.filter(f => f.path.toLowerCase().includes(search.toLowerCase())).slice(0, 8).map(f => React.createElement("button", { key: f.path, onClick: () => safe(() => { commit({ ...project, selectedFile: f.path, session: (0, project_1.openLayer)(session, 'dbt') }); setPalette(false); }) },
                    React.createElement("b", null, f.path),
                    React.createElement("small", null, "dbt source file"))),
                React.createElement("button", { onClick: () => setPalette(false) }, "Close / Esc"))));
}

},
"analytics/ChartsStudio":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartsStudio = ChartsStudio;
const React = require("react");
const charts_1 = require("./charts");
const controls_1 = require("./controls");
const fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
function ChartsStudio({ project, onChange, onError }) {
    const [tab, setTab] = React.useState('visual');
    const board = project.board;
    const set = (patch) => onChange({ ...project, board: { ...board, ...patch } });
    const safe = (f) => { try {
        f();
    }
    catch (e) {
        onError(String(e));
    } };
    let problem = '';
    let data = { points: [], total: 0, ignored: 0, stale: false, groups: 0 };
    try {
        data = (0, charts_1.aggregateBoard)(board);
    }
    catch (e) {
        problem = String(e);
    }
    const points = data.points;
    const lo = Math.min(0, ...points.map(p => p.value)), hi = Math.max(1, ...points.map(p => p.value)), range = hi - lo;
    const py = (value) => 250 - (value - lo) / range * 205, zero = py(0);
    const width = 690, pad = 60, plot = width - pad - 20;
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "BI / SQL TO BOARD", title: "Charts" },
            React.createElement("span", { className: "an-badge" }, board.snapshot.origin === 'sample' ? 'Sample result snapshot' : 'Imported result snapshot')),
        React.createElement("p", { className: "an-lead" },
            "Shape a board from result rows. Export dbt Charts YAML for the actual ",
            React.createElement("code", null, "dct"),
            " renderer; this visual preview is native Datapass."),
        React.createElement("div", { className: "an-actions" },
            React.createElement(controls_1.FileImport, { label: "Import result JSON", limit: 2_000_000, onError: onError, onRead: text => safe(() => { const snapshot = (0, charts_1.importRows)(text, board.query); set({ snapshot, x: snapshot.columns.includes(board.x) ? board.x : snapshot.columns[0] ?? '', y: snapshot.columns.includes(board.y) ? board.y : snapshot.columns.find(c => snapshot.rows.some(r => typeof r[c] === 'number')) ?? snapshot.columns[1] ?? '' }); }) }),
            React.createElement("button", { onClick: () => safe(() => (0, controls_1.downloadText)('revenue.yml', (0, charts_1.boardYaml)(board), 'application/yaml')) }, "Export dbt Charts YAML"),
            React.createElement("button", { onClick: () => (0, controls_1.downloadText)('chart-rows.json', JSON.stringify(board.snapshot.rows, null, 2), 'application/json') }, "Export result rows"),
            React.createElement("button", { onClick: () => { if (window.confirm('Replace this board with the sample board? Notebook source is unchanged.'))
                    onChange({ ...project, board: (0, charts_1.sampleBoard)() }); } }, "Reset sample board")),
        React.createElement("div", { className: "an-subtabs", role: "tablist", "aria-label": "Chart views" }, [['visual', 'Board'], ['sql', 'SQL & provenance'], ['yaml', 'dbt Charts YAML'], ['rows', 'Data snapshot']].map(([id, label]) => React.createElement("button", { role: "tab", "aria-selected": tab === id, key: id, onClick: () => setTab(id) }, label))),
        tab === 'visual' && React.createElement(React.Fragment, null,
            React.createElement("div", { className: "an-chart-controls" },
                React.createElement("label", null,
                    "Title",
                    React.createElement("input", { "aria-label": "Board title", value: board.title, maxLength: 120, onChange: e => set({ title: e.target.value }) })),
                React.createElement("label", null,
                    "Chart",
                    React.createElement("select", { "aria-label": "Chart type", value: board.chartType, onChange: e => set({ chartType: e.target.value }) },
                        React.createElement("option", { value: "bar" }, "Bar"),
                        React.createElement("option", { value: "line" }, "Line"),
                        React.createElement("option", { value: "kpi" }, "KPI"),
                        React.createElement("option", { value: "table" }, "Table"))),
                React.createElement("label", null,
                    "Group by",
                    React.createElement("select", { "aria-label": "Chart dimension", value: board.x, onChange: e => set({ x: e.target.value }) }, board.snapshot.columns.map(c => React.createElement("option", { key: c }, c)))),
                React.createElement("label", null,
                    "Measure",
                    React.createElement("select", { "aria-label": "Chart measure", disabled: board.aggregation === 'count', value: board.y, onChange: e => set({ y: e.target.value }) }, board.snapshot.columns.map(c => React.createElement("option", { key: c }, c)))),
                React.createElement("label", null,
                    "Aggregate",
                    React.createElement("select", { "aria-label": "Chart aggregation", value: board.aggregation, onChange: e => set({ aggregation: e.target.value }) },
                        React.createElement("option", { value: "sum" }, "Sum"),
                        React.createElement("option", { value: "mean" }, "Mean"),
                        React.createElement("option", { value: "count" }, "Row count")))),
            React.createElement("div", { className: "an-board" },
                React.createElement("div", { className: "an-board-title" },
                    React.createElement("div", null,
                        React.createElement("small", null, board.snapshot.origin === 'sample' ? 'TEACHING FIXTURE' : 'USER-SUPPLIED ROWS'),
                        React.createElement("h3", null, board.title)),
                    React.createElement("span", { className: "an-badge" },
                        board.snapshot.rows.length,
                        " input rows")),
                problem ? React.createElement("div", { role: "alert", className: "an-warning" }, problem) : data.stale ? React.createElement("div", { className: "an-empty" },
                    React.createElement("h3", null, "Query changed. This snapshot is stale."),
                    React.createElement("p", null, "No SQL has been executed. Import fresh result rows for the new query, or restore the exact snapshot query in SQL & provenance.")) : !points.length ? React.createElement("div", { className: "an-empty" }, "No compatible values. Choose a dimension and a numeric measure, or use Row count.") : board.chartType === 'kpi' ? React.createElement("div", { className: "an-kpi" },
                    React.createElement("b", null, fmt(data.total)),
                    React.createElement("span", null, board.aggregation === 'mean' ? 'Mean over all non-null numeric rows' : board.aggregation === 'count' ? 'Row count' : 'Sum over all numeric rows')) : board.chartType === 'table' ? React.createElement(controls_1.RowsTable, { label: "Aggregated chart data", columns: ['dimension', 'metric'], rows: points.map(p => ({ dimension: p.label, metric: p.value })) }) : React.createElement("svg", { className: "an-chart-svg", viewBox: `0 0 ${width} 305`, role: "img", "aria-label": `${board.title}, ${board.chartType} chart, ${data.groups} groups; data table is available below` },
                    [0, 1, 2, 3, 4].map(i => { const value = lo + range * i / 4; return React.createElement("g", { className: "an-chart-grid", key: i },
                        React.createElement("line", { x1: pad, y1: py(value), x2: width - 20, y2: py(value) }),
                        React.createElement("text", { x: pad - 8, y: py(value) + 4, textAnchor: "end" }, fmt(value))); }),
                    React.createElement("line", { className: "an-zero-line", x1: pad, x2: width - 20, y1: zero, y2: zero }),
                    board.chartType === 'line' && React.createElement("polyline", { className: "an-trend", points: points.map((p, i) => `${pad + (i + .5) * plot / points.length},${py(p.value)}`).join(' ') }),
                    points.map((p, i) => { const slot = plot / points.length, x = pad + (i + .5) * slot; return React.createElement("g", { key: i },
                        board.chartType === 'bar' ? React.createElement("rect", { className: "an-bar", x: x - slot * .3, width: Math.max(1, slot * .6), y: Math.min(py(p.value), zero), height: Math.max(1, Math.abs(py(p.value) - zero)), rx: "4" },
                            React.createElement("title", null,
                                p.label,
                                ": ",
                                fmt(p.value))) : React.createElement("circle", { className: "an-point", cx: x, cy: py(p.value), r: "4" },
                            React.createElement("title", null,
                                p.label,
                                ": ",
                                fmt(p.value))),
                        points.length <= 12 && React.createElement(React.Fragment, null,
                            React.createElement("text", { className: "an-chart-value", x: x, y: py(p.value) + (p.value >= 0 ? -10 : 16), textAnchor: "middle" }, fmt(p.value)),
                            React.createElement("text", { className: "an-chart-label", x: x, y: 280, textAnchor: "middle" }, p.label.length > 15 ? p.label.slice(0, 13) + '...' : p.label))); })),
                React.createElement("p", { className: "an-muted" },
                    data.ignored ? `${data.ignored} rows have non-numeric/null measures and were ignored. ` : '',
                    data.groups > 80 ? 'First 80 groups shown; KPI totals use all rows. ' : '',
                    "No live database query or dbt Charts rendering happened in this preview.")),
            React.createElement("details", null,
                React.createElement("summary", null, "Accessible aggregated data"),
                React.createElement(controls_1.RowsTable, { label: "Chart accessible data", columns: ['dimension', 'metric'], rows: data.stale ? [] : points.map(p => ({ dimension: p.label, metric: p.value })) }))),
        tab === 'sql' && React.createElement(React.Fragment, null,
            React.createElement("div", { className: "an-note" }, "Editing SQL invalidates the displayed result, but does not run a query. Connect a runner later or import JSON rows produced by your own query."),
            React.createElement(controls_1.SourceEditor, { label: "Board SQL query", source: board.query, onChange: query => { if (query.length <= 100_000)
                    set({ query });
                else
                    onError('Query exceeds 100 KB.'); } }),
            React.createElement("button", { onClick: () => set({ query: board.snapshot.query }) }, "Restore snapshot query"),
            React.createElement("div", { className: "an-card" },
                React.createElement("h3", null, "Snapshot provenance"),
                React.createElement("p", null,
                    "Origin: ",
                    board.snapshot.origin,
                    ". ",
                    board.snapshot.importedAt ? `Imported at ${board.snapshot.importedAt}.` : '',
                    " Import assigns your current SQL text as the snapshot label; Datapass cannot independently verify that those rows came from this query."),
                React.createElement("pre", null, board.snapshot.query))),
        tab === 'yaml' && React.createElement(React.Fragment, null,
            React.createElement("p", { className: "an-note" },
                "A dbt Charts board definition, not a compiled dashboard. Run ",
                React.createElement("code", null, "dct validate charts/revenue.yml"),
                " in the exported sample project. The real renderer and adapters are optional Python dependencies, not bundled into this UI."),
            React.createElement(controls_1.SourceEditor, { label: "dbt Charts YAML", source: (0, charts_1.boardYaml)(board), language: "yaml", readOnly: true, onChange: () => { } })),
        tab === 'rows' && React.createElement(controls_1.RowsTable, { label: "Chart input snapshot", columns: board.snapshot.columns, rows: board.snapshot.rows }));
}

},
"analytics/DbtStudio":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbtStudio = DbtStudio;
exports.LineageStudio = LineageStudio;
const React = require("react");
const dbt_1 = require("./dbt");
const validation_1 = require("./validation");
const project_1 = require("./project");
const controls_1 = require("./controls");
function DbtStudio({ project, onChange, onError }) {
    const [tab, setTab] = React.useState('source'), [newPath, setNewPath] = React.useState('models/marts/my_model.sql');
    const [search, setSearch] = React.useState('');
    const file = project.files.find(f => f.path === project.selectedFile) ?? project.files[0];
    const imported = project.artifacts?.nodes.find(n => n.path === file?.path);
    const results = project.artifacts?.results ?? [];
    const safe = (action) => { try {
        action();
    }
    catch (e) {
        onError(String(e));
    } };
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "TRANSFORM / ARTIFACT-FIRST", title: "dbt Studio" },
            React.createElement("span", { className: "an-badge" }, "Runner not connected")),
        React.createElement("p", { className: "an-lead" }, "Author SQL and YAML now. Import native dbt artifacts to inspect what was compiled and built elsewhere."),
        React.createElement("div", { className: "an-actions" },
            React.createElement(controls_1.FileImport, { label: "Import manifest.json", onError: onError, onRead: text => safe(() => onChange({ ...project, artifacts: (0, dbt_1.importManifest)(text) })) }),
            React.createElement(controls_1.FileImport, { label: "Import run_results.json", onError: onError, onRead: text => safe(() => { if (!project.artifacts)
                    throw new Error('Import the matching manifest first.'); onChange({ ...project, artifacts: (0, dbt_1.attachRunResults)(project.artifacts, text) }); }) }),
            React.createElement("button", { disabled: true, title: "Use the optional local CLI from the ZIP; no cloud runner is connected." }, "Run dbt build"),
            React.createElement("button", { onClick: () => (0, controls_1.downloadText)('datapass-dbt-source.json', JSON.stringify({ schemaVersion: 1, files: project.files }, null, 2), 'application/json') }, "Export project sources")),
        React.createElement("div", { className: "an-dbt-layout" },
            React.createElement("aside", { className: "an-files" },
                React.createElement("input", { "aria-label": "Filter dbt files", placeholder: "Find a model, test or seed...", value: search, onChange: e => setSearch(e.target.value) }),
                React.createElement("div", { className: "an-file-tree" }, project.files.filter(f => f.path.toLowerCase().includes(search.toLowerCase())).map(f => React.createElement("button", { key: f.path, className: f.path === file?.path ? 'selected' : '', onClick: () => { onChange({ ...project, selectedFile: f.path }); setTab('source'); } },
                    React.createElement("span", { className: "an-file-kind" }, f.path.endsWith('.sql') ? 'SQL' : f.path.endsWith('.csv') ? 'CSV' : 'YML'),
                    React.createElement("span", null,
                        f.path.split('/').pop(),
                        React.createElement("small", null, f.path.split('/').slice(0, -1).join('/') || 'project'))))),
                React.createElement("details", null,
                    React.createElement("summary", null, "Add source file"),
                    React.createElement("input", { "aria-label": "New dbt file path", value: newPath, onChange: e => setNewPath(e.target.value), maxLength: 220 }),
                    React.createElement("button", { onClick: () => safe(() => { const path = (0, validation_1.sourcePath)(newPath); if (project.files.some(f => f.path === path))
                            throw new Error('This path already exists.'); if (project.files.length >= 60)
                            throw new Error('Project file limit reached.'); onChange({ ...project, files: [...project.files, { path, source: path.endsWith('.sql') ? "select * from {{ ref('stg_orders') }}\n" : '' }], selectedFile: path }); }) }, "Create file"))),
            React.createElement("div", { className: "an-dbt-editor" },
                React.createElement("div", { className: "an-subtabs", role: "tablist", "aria-label": "dbt detail" },
                    React.createElement("button", { role: "tab", "aria-selected": tab === 'source', onClick: () => setTab('source') }, "Source"),
                    React.createElement("button", { role: "tab", "aria-selected": tab === 'compiled', onClick: () => setTab('compiled') }, "Compiled SQL"),
                    React.createElement("button", { role: "tab", "aria-selected": tab === 'results', onClick: () => setTab('results') },
                        "Build evidence ",
                        results.length ? `(${results.length})` : '')),
                tab === 'source' && file && React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "an-file-heading" },
                        React.createElement("code", null, file.path),
                        React.createElement("button", { onClick: () => (0, controls_1.downloadText)(file.path.split('/').pop(), file.source) }, "Download file")),
                    React.createElement(controls_1.SourceEditor, { source: file.source, label: "dbt source editor", language: file.path.endsWith('.sql') ? 'sql' : 'yaml', onChange: source => safe(() => onChange((0, project_1.updateFile)(project, file.path, source))) }),
                    React.createElement("div", { className: "an-note" }, "Saving a draft does not compile Jinja or run a model. Export the project sources to build them with the local CLI.")),
                tab === 'compiled' && (imported?.compiled ? React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "an-warning" }, "Historical compiled SQL from the imported manifest. It is not recompiled when you edit the draft."),
                    React.createElement(controls_1.SourceEditor, { label: "Imported compiled SQL", source: imported.compiled, onChange: () => { }, readOnly: true })) : React.createElement("div", { className: "an-empty" },
                    React.createElement("h3", null, "No compiled SQL for this file"),
                    React.createElement("p", null, "Import a manifest generated by a dbt invocation that includes compiled code. Parsing alone may not populate it."))),
                tab === 'results' && React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "an-note" }, project.artifacts ? `Imported project: ${project.artifacts.projectName || 'unnamed'} / generated ${project.artifacts.generatedAt || 'unknown'} / invocation ${project.artifacts.invocationId || 'unknown'}` : 'No artifact imported. No successful build is assumed.'),
                    React.createElement(controls_1.RowsTable, { label: "Imported dbt results", rows: results.map(r => ({ node: r.id, status: r.status, elapsed_seconds: r.seconds, failures: r.failures, message: r.message })) }),
                    React.createElement("p", { className: "an-muted" }, "Imported evidence is historical and user-supplied, not an authenticated execution by Datapass. Manifest and run-results must share a nonempty invocation ID.")))));
}
function GraphView({ graph }) {
    const [selected, setSelected] = React.useState(''), [direction, setDirection] = React.useState('all'), [zoom, setZoom] = React.useState(100);
    const levels = (0, dbt_1.graphLevels)(graph), slots = new Map();
    const positions = new Map(graph.nodes.map(n => { const level = levels.get(n.id) ?? 0, row = slots.get(level) ?? 0; slots.set(level, row + 1); return [n.id, { x: 30 + level * 250, y: 35 + row * 122 }]; }));
    const active = selected && graph.nodes.some(n => n.id === selected) ? selected : '';
    const visible = direction === 'all' || !active ? new Set(graph.nodes.map(n => n.id)) : (0, dbt_1.relatedNodes)(graph, active, direction);
    visible.add(active);
    const width = Math.max(780, ...[...positions.values()].map(p => p.x + 230)), height = Math.max(370, ...[...positions.values()].map(p => p.y + 130));
    const node = graph.nodes.find(n => n.id === active);
    return React.createElement(React.Fragment, null,
        React.createElement("div", { className: "an-actions" },
            React.createElement("label", null,
                "Impact ",
                React.createElement("select", { "aria-label": "Lineage direction", value: direction, onChange: e => setDirection(e.target.value) },
                    React.createElement("option", { value: "all" }, "All models"),
                    React.createElement("option", { value: "upstream" }, "Upstream of selected"),
                    React.createElement("option", { value: "downstream" }, "Downstream of selected"))),
            React.createElement("label", null,
                "Zoom ",
                React.createElement("input", { "aria-label": "Lineage zoom", type: "range", min: 50, max: 130, value: zoom, onChange: e => setZoom(Number(e.target.value)) })),
            React.createElement("small", null,
                graph.nodes.length,
                " nodes / ",
                graph.edges.length,
                " dependencies")),
        React.createElement("div", { className: "an-graph-scroll" },
            React.createElement("div", { className: "an-graph", style: { width: width * zoom / 100, height: height * zoom / 100 } },
                React.createElement("div", { style: { transform: `scale(${zoom / 100})`, transformOrigin: '0 0', width, height } },
                    React.createElement("svg", { width: width, height: height, "aria-hidden": "true" }, graph.edges.map(e => { const a = positions.get(e.from), b = positions.get(e.to); if (!a || !b)
                        return null; const shown = visible.has(e.from) && visible.has(e.to); return React.createElement("g", { key: e.id, className: shown ? '' : 'an-dim' },
                        React.createElement("path", { d: `M${a.x + 202},${a.y + 38} C${a.x + 225},${a.y + 38} ${b.x - 25},${b.y + 38} ${b.x - 6},${b.y + 38}` }),
                        React.createElement("path", { className: "an-arrow", d: `M${b.x - 12},${b.y + 34} L${b.x - 6},${b.y + 38} L${b.x - 12},${b.y + 42}` })); })),
                    graph.nodes.map(n => { const p = positions.get(n.id); return React.createElement("button", { key: n.id, className: `an-node ${n.kind} ${selected === n.id ? 'selected' : ''} ${visible.has(n.id) ? '' : 'an-dim'}`, style: { left: p.x, top: p.y }, onClick: () => setSelected(n.id) },
                        React.createElement("span", null, n.kind),
                        React.createElement("b", null, n.label),
                        React.createElement("small", null, n.detail || 'Dependency reference')); })))),
        node && React.createElement("div", { className: "an-selection" },
            React.createElement("b", null, node.label),
            React.createElement("code", null, node.id),
            React.createElement("span", null,
                graph.edges.filter(e => e.to === node.id).length,
                " direct inputs / ",
                graph.edges.filter(e => e.from === node.id).length,
                " direct dependents")));
}
function LineageStudio({ project }) {
    const [source, setSource] = React.useState('draft'), [tests, setTests] = React.useState(false);
    const graph = source === 'manifest' && project.artifacts ? (0, dbt_1.manifestGraph)(project.artifacts, tests) : (0, dbt_1.draftGraph)(project.files);
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "DEPENDENCIES / CHANGE IMPACT", title: "Lineage" },
            React.createElement("span", { className: "an-badge" }, graph.origin === 'imported-manifest' ? 'Imported manifest' : 'Draft references only')),
        React.createElement("p", { className: "an-lead" }, "Follow transformations from seeds to models. Select a model to explore its upstream inputs or downstream dependents."),
        React.createElement("div", { className: "an-actions" },
            React.createElement("button", { className: source === 'draft' ? 'selected' : '', onClick: () => setSource('draft') }, "Draft references"),
            React.createElement("button", { className: source === 'manifest' ? 'selected' : '', disabled: !project.artifacts, onClick: () => setSource('manifest') }, "Imported manifest"),
            source === 'manifest' && React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: tests, onChange: e => setTests(e.target.checked) }),
                " Include dbt tests")),
        React.createElement(GraphView, { graph: graph }),
        React.createElement("div", { className: "an-note" },
            graph.origin === 'draft-reference-scan' ? 'Conservative literal ref()/source() scan, not a dbt compiler or general SQL parser. Macro-generated dependencies may be missing. Import a manifest for dbt-resolved model dependencies.' : 'Model-level dependency graph from the imported dbt manifest. This is not automatic column-level SQL lineage.',
            " Authored column mappings live in Data model."),
        !!graph.warnings.length && React.createElement("details", { className: "an-warning" },
            React.createElement("summary", null,
                graph.warnings.length,
                " reference warnings"),
            graph.warnings.map((w, i) => React.createElement("p", { key: i }, w))));
}

},
"analytics/ModelStudio":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelStudio = ModelStudio;
exports.ScdStudio = ScdStudio;
const React = require("react");
const modeling_1 = require("./modeling");
const validation_1 = require("./validation");
const controls_1 = require("./controls");
function ModelStudio({ project, onChange, onError }) {
    const [selected, setSelected] = React.useState('sales'), [mode, setMode] = React.useState('diagram');
    const [newName, setNewName] = React.useState('dim_product'), [from, setFrom] = React.useState(JSON.stringify(['sales', 's-customer'])), [to, setTo] = React.useState(JSON.stringify(['customers', 'c-key']));
    const [cardinality, setCardinality] = React.useState('many-to-one'), [expression, setExpression] = React.useState('Join by business key');
    const drag = React.useRef(null);
    const model = project.model, table = model.tables.find(t => t.id === selected), checks = (0, modeling_1.modelChecks)(model);
    const safe = (action) => { try {
        action();
    }
    catch (e) {
        onError(String(e));
    } };
    const changeTable = (next) => onChange({ ...project, model: { ...model, tables: model.tables.map(t => t.id === next.id ? next : t) } });
    const endpoint = (pair) => { const [table, column] = JSON.parse(pair); return { table, column }; };
    const relation = () => { const a = endpoint(from), b = endpoint(to); return { fromTable: a.table, fromColumn: a.column, toTable: b.table, toColumn: b.column, cardinality }; };
    const options = model.tables.flatMap(t => t.columns.map(c => React.createElement("option", { key: JSON.stringify([t.id, c.id]), value: JSON.stringify([t.id, c.id]) },
        t.name,
        ".",
        c.name)));
    let ddl = '';
    try {
        ddl = (0, modeling_1.ddlPreview)(model);
    }
    catch (e) {
        ddl = `-- Correct the schema design before exporting: ${String(e)}`;
    }
    const label = (tableId, colId) => { const t = model.tables.find(t => t.id === tableId); return `${t?.name}.${t?.columns.find(c => c.id === colId)?.name}`; };
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "MODEL / SCHEMA DESIGN", title: "Facts, dimensions & keys" },
            React.createElement("span", { className: "an-badge" }, "Authored design")),
        React.createElement("p", { className: "an-lead" }, "Declare the grain, connect columns and reason about cardinality. A relationship here never alters a real database."),
        React.createElement("div", { className: "an-actions" },
            React.createElement("button", { className: mode === 'diagram' ? 'selected' : '', onClick: () => setMode('diagram') }, "Schema"),
            React.createElement("button", { className: mode === 'columns' ? 'selected' : '', onClick: () => setMode('columns') }, "Column mappings"),
            React.createElement("button", { className: mode === 'ddl' ? 'selected' : '', onClick: () => setMode('ddl') }, "DDL preview"),
            React.createElement("input", { "aria-label": "New table name", value: newName, maxLength: 60, onChange: e => setNewName(e.target.value) }),
            React.createElement("button", { onClick: () => safe(() => { if (model.tables.length >= 30)
                    throw new Error('Maximum 30 design tables.'); if (model.tables.some(t => t.name === newName))
                    throw new Error('Table name already exists.'); const t = (0, modeling_1.newTable)(newName); onChange({ ...project, model: { ...model, tables: [...model.tables, t] } }); setSelected(t.id); }) }, "Add table")),
        mode === 'diagram' && React.createElement("div", { className: "an-model-layout" },
            React.createElement("div", { className: "an-model-scroll" },
                React.createElement("div", { className: "an-model-board", style: { width: Math.max(1030, ...model.tables.map(t => t.x + 290)), height: Math.max(620, ...model.tables.map(t => t.y + 130 + t.columns.length * 30)) } },
                    React.createElement("svg", { width: "100%", height: "100%", "aria-hidden": "true" }, model.relationships.map(r => { const a = model.tables.find(t => t.id === r.fromTable), b = model.tables.find(t => t.id === r.toTable); if (!a || !b)
                        return null; const ay = a.y + 50 + a.columns.findIndex(c => c.id === r.fromColumn) * 30 + 16, by = b.y + 50 + b.columns.findIndex(c => c.id === r.toColumn) * 30 + 16; const right = a.x < b.x, x1 = a.x + (right ? 250 : 0), x2 = b.x + (right ? 0 : 250); return React.createElement("g", { key: r.id },
                        React.createElement("path", { d: `M ${x1} ${ay} C ${(x1 + x2) / 2} ${ay} ${(x1 + x2) / 2} ${by} ${x2} ${by}` }),
                        React.createElement("text", { x: (x1 + x2) / 2, y: (ay + by) / 2 - 8 }, r.cardinality === 'many-to-one' ? '* : 1' : r.cardinality === 'one-to-one' ? '1 : 1' : '* : *')); })),
                    model.tables.map(t => React.createElement("article", { key: t.id, className: `an-model-table ${t.role} ${selected === t.id ? 'selected' : ''}`, style: { left: t.x, top: t.y } },
                        React.createElement("button", { className: "an-model-handle", "aria-label": `Select or move ${t.name}`, onClick: () => setSelected(t.id), onPointerDown: e => { if (e.button !== 0)
                                return; setSelected(t.id); drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, startX: t.x, startY: t.y }; e.currentTarget.setPointerCapture(e.pointerId); }, onPointerMove: e => { const d = drag.current; if (!d || d.pointer !== e.pointerId)
                                return; changeTable({ ...t, x: Math.max(0, Math.min(2400, d.startX + e.clientX - d.x)), y: Math.max(0, Math.min(2400, d.startY + e.clientY - d.y)) }); }, onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; }, onLostPointerCapture: () => { drag.current = null; }, onKeyDown: e => { if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
                                return; e.preventDefault(); changeTable({ ...t, x: Math.max(0, Math.min(2400, t.x + (e.key === 'ArrowLeft' ? -20 : e.key === 'ArrowRight' ? 20 : 0))), y: Math.max(0, Math.min(2400, t.y + (e.key === 'ArrowUp' ? -20 : e.key === 'ArrowDown' ? 20 : 0))) }); } },
                            React.createElement("b", null, t.name),
                            React.createElement("small", null, t.role)),
                        t.columns.map(c => React.createElement("div", { className: "an-model-column", key: c.id },
                            React.createElement("span", { className: c.primary ? 'an-pk' : '' }, c.primary ? 'PK' : model.relationships.some(r => r.fromTable === t.id && r.fromColumn === c.id) ? 'FK' : ''),
                            React.createElement("b", null, c.name),
                            React.createElement("small", null, c.type))),
                        React.createElement("p", null, t.grain || 'Define the grain'))))),
            React.createElement("aside", { className: "an-model-properties" }, table ? React.createElement(React.Fragment, null,
                React.createElement("h3", null, "Table properties"),
                React.createElement("label", null,
                    "Name",
                    React.createElement("input", { "aria-label": "Selected table name", value: table.name, maxLength: 60, onChange: e => { if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.target.value))
                            changeTable({ ...table, name: e.target.value }); } })),
                React.createElement("label", null,
                    "Role",
                    React.createElement("select", { "aria-label": "Table role", value: table.role, onChange: e => changeTable({ ...table, role: e.target.value }) },
                        React.createElement("option", { value: "fact" }, "Fact"),
                        React.createElement("option", { value: "dimension" }, "Dimension"),
                        React.createElement("option", { value: "source" }, "Source"))),
                React.createElement("label", null,
                    "Grain",
                    React.createElement("textarea", { "aria-label": "Table grain", maxLength: 500, value: table.grain, onChange: e => changeTable({ ...table, grain: e.target.value }) })),
                React.createElement("h4", null, "Columns"),
                table.columns.map(c => React.createElement("div", { className: "an-column-edit", key: c.id },
                    React.createElement("input", { "aria-label": `Name of ${c.name}`, value: c.name, maxLength: 60, onChange: e => { if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.target.value))
                            changeTable({ ...table, columns: table.columns.map(x => x.id === c.id ? { ...c, name: e.target.value } : x) }); } }),
                    React.createElement("select", { "aria-label": `Type of ${c.name}`, value: c.type, onChange: e => changeTable({ ...table, columns: table.columns.map(x => x.id === c.id ? { ...c, type: e.target.value } : x) }) }, modeling_1.DATA_TYPES.map(t => React.createElement("option", { key: t }, t))),
                    React.createElement("label", null,
                        React.createElement("input", { type: "checkbox", checked: c.primary, onChange: e => changeTable({ ...table, columns: table.columns.map(x => x.id === c.id ? { ...c, primary: e.target.checked, nullable: e.target.checked ? false : c.nullable } : x) }) }),
                        " PK"),
                    React.createElement("label", null,
                        React.createElement("input", { type: "checkbox", checked: c.nullable, onChange: e => changeTable({ ...table, columns: table.columns.map(x => x.id === c.id ? { ...c, nullable: e.target.checked } : x) }) }),
                        " Nullable"))),
                React.createElement("button", { onClick: () => safe(() => { if (table.columns.length >= 60)
                        throw new Error('Maximum 60 columns per table.'); let i = table.columns.length + 1; while (table.columns.some(c => c.name === `column_${i}`))
                        i++; changeTable({ ...table, columns: [...table.columns, { id: (0, validation_1.freshId)('column'), name: `column_${i}`, type: 'VARCHAR', primary: false, nullable: true }] }); }) }, "Add column"),
                React.createElement("button", { className: "an-danger", onClick: () => { if (window.confirm(`Remove ${table.name} and its design relationships? No real data will be deleted.`)) {
                        onChange({ ...project, model: (0, modeling_1.removeTable)(model, table.id) });
                        setSelected('');
                    } } }, "Remove design table")) : React.createElement("p", null, "Select a table to edit columns and grain. Drag its title or use arrow keys to arrange it."))),
        mode === 'ddl' && React.createElement(React.Fragment, null,
            React.createElement("button", { onClick: () => safe(() => (0, controls_1.downloadText)('schema-design.sql', (0, modeling_1.ddlPreview)(model))) }, "Export DDL"),
            React.createElement(controls_1.SourceEditor, { label: "Schema DDL preview", source: ddl, language: "sql", readOnly: true, onChange: () => { } })),
        React.createElement("div", { className: "an-card" },
            React.createElement("h3", null, mode === 'columns' ? 'Authored column lineage' : 'Relationship designer'),
            React.createElement("div", { className: "an-actions" },
                React.createElement("label", null,
                    "From",
                    React.createElement("select", { "aria-label": "Relationship from", value: from, onChange: e => setFrom(e.target.value) }, options)),
                React.createElement("label", null,
                    "To",
                    React.createElement("select", { "aria-label": "Relationship to", value: to, onChange: e => setTo(e.target.value) }, options)),
                mode === 'columns' ? React.createElement("input", { "aria-label": "Column mapping expression", maxLength: 1000, value: expression, onChange: e => setExpression(e.target.value) }) : React.createElement("select", { "aria-label": "Cardinality", value: cardinality, onChange: e => setCardinality(e.target.value) },
                    React.createElement("option", { value: "many-to-one" }, "Many to one (* : 1)"),
                    React.createElement("option", { value: "one-to-one" }, "One to one (1 : 1)"),
                    React.createElement("option", { value: "many-to-many" }, "Many to many (* : *)")),
                React.createElement("button", { onClick: () => safe(() => { if (mode === 'columns') {
                        if (model.mappings.length >= 200)
                            throw new Error('Maximum 200 column mappings.');
                        const r = relation();
                        for (const [ti, ci] of [[r.fromTable, r.fromColumn], [r.toTable, r.toColumn]])
                            if (!model.tables.find(t => t.id === ti)?.columns.some(c => c.id === ci))
                                throw new Error('Select existing endpoints.');
                        onChange({ ...project, model: { ...model, mappings: [...model.mappings, { ...r, id: (0, validation_1.freshId)('mapping'), expression }] } });
                    }
                    else {
                        if (model.relationships.length >= 120)
                            throw new Error('Maximum 120 relationships.');
                        onChange({ ...project, model: (0, modeling_1.addRelationship)(model, relation()) });
                    } }) }, mode === 'columns' ? 'Add mapping' : 'Add relationship')),
            (mode === 'columns' ? model.mappings : model.relationships).map(r => React.createElement("div", { className: "an-relationship", key: r.id },
                React.createElement("code", null, label(r.fromTable, r.fromColumn)),
                React.createElement("span", null, "to"),
                React.createElement("code", null, label(r.toTable, r.toColumn)),
                React.createElement("small", null, 'expression' in r ? r.expression : r.cardinality),
                React.createElement("button", { "aria-label": `Remove ${r.id}`, onClick: () => onChange({ ...project, model: { ...model, ...(mode === 'columns' ? { mappings: model.mappings.filter(x => x.id !== r.id) } : { relationships: model.relationships.filter(x => x.id !== r.id) }) } }) }, "Remove"))),
            React.createElement("small", null, mode === 'columns' ? 'These mappings are authored explanations, not SQL-parser-derived column lineage. Expressions are text, never executed.' : 'Cardinality is a design declaration. Key uniqueness and referential integrity require data checks when a runtime is connected.')),
        React.createElement("details", { className: "an-card", open: checks.some(c => c.severity === 'error') },
            React.createElement("summary", null,
                "Design review / ",
                checks.length,
                " findings"),
            checks.length ? checks.map(c => React.createElement("p", { className: c.severity === 'error' ? 'an-error-text' : '', key: c.id },
                React.createElement("b", null, c.severity.toUpperCase()),
                " ",
                c.message)) : React.createElement("p", null, "No structural design warnings. This does not prove anything about actual table contents.")));
}
function ScdStudio({ project, onChange }) {
    const { type, step, answer } = project.scd;
    const [checked, setChecked] = React.useState(false), [asOf, setAsOf] = React.useState('2026-02-15');
    const rows = (0, modeling_1.replayScd)(modeling_1.CHANGE_EVENTS, type, step), result = (0, modeling_1.scdExerciseAnswer)(type, step), at = type === 2 ? (0, modeling_1.lookupAt)(rows, 101, asOf) : undefined;
    const update = (patch) => { setChecked(false); onChange({ ...project, scd: { ...project.scd, ...patch } }); };
    const columns = type === 2 ? ['customer_key', 'customer_id', 'name', 'city', 'valid_from', 'valid_to', 'is_current'] : type === 3 ? ['customer_key', 'customer_id', 'name', 'city', 'previous_city'] : ['customer_key', 'customer_id', 'name', 'city'];
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "DIMENSIONAL MODELING / GUIDED EXERCISE", title: "Slowly changing dimensions" },
            React.createElement("span", { className: "an-badge" }, "Deterministic teaching model")),
        React.createElement("p", { className: "an-lead" }, "The same customer moves from Geneva to Oslo to Trondheim. Compare what each dimension strategy retains."),
        React.createElement("div", { className: "an-scd-types" }, [1, 2, 3].map(t => React.createElement("button", { key: t, className: t === type ? 'selected' : '', onClick: () => update({ type: t }) },
            React.createElement("b", null,
                "Type ",
                t),
            React.createElement("span", null, t === 1 ? 'Overwrite the value' : t === 2 ? 'Add a historical version' : 'Keep the previous value')))),
        React.createElement("div", { className: "an-actions" },
            React.createElement("button", { disabled: step === 0, onClick: () => update({ step: step - 1 }) }, "Previous event"),
            React.createElement("input", { "aria-label": "SCD event step", type: "range", min: 0, max: modeling_1.CHANGE_EVENTS.length, value: step, onChange: e => update({ step: Number(e.target.value) }) }),
            React.createElement("b", null,
                step,
                " / ",
                modeling_1.CHANGE_EVENTS.length,
                " events"),
            React.createElement("button", { disabled: step === modeling_1.CHANGE_EVENTS.length, onClick: () => update({ step: step + 1 }) }, "Next event"),
            React.createElement("button", { onClick: () => update({ step: 0, answer: '' }) }, "Reset replay")),
        React.createElement("div", { className: "an-events" }, modeling_1.CHANGE_EVENTS.map((e, i) => React.createElement("button", { key: i, className: i < step ? 'applied' : '', onClick: () => update({ step: i + 1 }) },
            React.createElement("small", null, e.at),
            React.createElement("b", null, e.name),
            React.createElement("span", null, e.city),
            React.createElement("em", null, i === 3 ? 'Unchanged city' : i < 2 ? 'New customer' : 'City changed')))),
        React.createElement("div", { className: "an-card" },
            React.createElement("h3", null,
                "Dimension after event ",
                step),
            React.createElement(controls_1.RowsTable, { label: "SCD dimension rows", columns: columns, rows: rows.map(r => ({ ...r })) }),
            React.createElement("p", { className: "an-note" },
                result.explanation,
                type === 2 ? ' Validity uses [valid_from, valid_to): inclusive start, exclusive end. A new version gets a new surrogate key.' : '')),
        type === 2 && React.createElement("div", { className: "an-card" },
            React.createElement("h3", null, "Historical fact lookup"),
            React.createElement("label", null,
                "Customer 101 on ",
                React.createElement("input", { "aria-label": "SCD lookup date", type: "date", value: asOf, onChange: e => setAsOf(e.target.value) })),
            React.createElement("p", null, at ? `Fact joins to customer_key ${at.customer_key}, city ${at.city}.` : 'No matching dimension version in the events applied so far.')),
        React.createElement("div", { className: "an-card an-exercise" },
            React.createElement("h3", null, "Check your understanding"),
            React.createElement("p", null,
                "After these ",
                step,
                " events, how many dimension rows should Type ",
                type,
                " contain?"),
            React.createElement("div", { className: "an-actions" },
                React.createElement("input", { "aria-label": "SCD expected row count", inputMode: "numeric", value: answer, onChange: e => update({ answer: e.target.value.slice(0, 10) }) }),
                React.createElement("button", { onClick: () => setChecked(true) }, "Check reasoning")),
            checked && React.createElement("p", { role: "status", className: answer.trim() === result.expected ? 'an-success' : 'an-warning' },
                answer.trim() === result.expected ? 'Correct.' : `Not yet. Expected ${result.expected} rows.`,
                " ",
                result.explanation),
            React.createElement("small", null, "This local check grades only the row-count answer for the displayed fixture. It does not execute or grade SQL/PySpark code.")));
}

},
"analytics/RuntimeStudio":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeStudio = RuntimeStudio;
exports.GuidedSparkStudio = GuidedSparkStudio;
const React = require("react");
const guidedSpark_1 = require("./guidedSpark");
const controls_1 = require("./controls");
function RuntimeStudio() {
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "RUNTIME BOUNDARIES / NO VM REQUIRED", title: "Local first. Connect later." }),
        React.createElement("p", { className: "an-lead" }, "This analytics layer edits and visualizes documents. The existing notebook runtime remains separate; opening a layer does not start compute."),
        React.createElement("div", { className: "an-runtime-grid" }, [
            ['DuckDB SQL', 'Local engine', 'Use the existing trusted local Datapass service. No Oracle VM or scheduler is required.'],
            ['DuckLake', 'Optional table-storage profile', 'DuckDB compute plus catalog metadata and Parquet data. Keep DuckDB mode available when extensions are not installed.'],
            ['Python / pandas', 'Optional local environment', 'pandas is a Python library, not a separate remote cluster. Enable trusted local Python and install pandas explicitly. Never execute untrusted notebooks on your computer.'],
            ['Polars', 'Optional local library', 'Useful for DataFrame exercises, not a prerequisite. It can use the same Python environment and workspace data; no separate product shell is needed.'],
            ['dbt Core + dbt-duckdb', 'Optional local CLI', 'Build the exported sample project locally. Import its manifest and matching run-results here. No VM, Docker, GitLab or dbt Cloud account is necessary.'],
            ['dbt Charts / dct', 'Optional local CLI', 'Author boards here, export YAML, validate/render with dct. Native preview is not the upstream dct renderer.'],
            ['MotherDuck', 'Explicit optional remote connection', 'The free tier is quota-limited. Keep tokens in environment/profile configuration outside the browser. This UI does not establish or test a connection.'],
            ['Iceberg', 'Future interoperability lab', 'Not another mandatory catalog. Add explicit Iceberg read/write exercises only after tested extension and storage choices; do not silently convert DuckLake tables.'],
        ].map(([title, state, description]) => React.createElement("article", { className: "an-card", key: title },
            React.createElement("span", { className: "an-badge" }, state),
            React.createElement("h3", null, title),
            React.createElement("p", null, description)))),
        React.createElement("div", { className: "an-card" },
            React.createElement("h3", null, "The first real dbt loop"),
            React.createElement("pre", null,
                "Export source JSON from dbt Studio",
                '\n',
                "python tools/materialize_dbt.py --source exported.json --output my-dbt-project",
                '\n',
                "python -m pip install dbt-duckdb",
                '\n',
                "dbt build --project-dir my-dbt-project --profiles-dir my-dbt-project",
                '\n',
                "Import target/manifest.json + target/run_results.json"),
            React.createElement("p", null, "The included sample project already has models, tests and seed data. Run it only after reviewing the source. dbt project macros can execute code; local execution is not sandboxing.")),
        React.createElement("div", { className: "an-warning" },
            React.createElement("b", null, "Deferred:"),
            " Airflow/Prefect orchestration, VM deployment, Docker, public multi-user execution, cloud credentials, and direct remote job dispatch. A dbt dependency graph is not an Airflow scheduler."));
}
function GuidedSparkStudio() {
    const l = guidedSpark_1.GUIDED_SPARK_LESSON;
    return React.createElement("section", { className: "an-layer" },
        React.createElement(controls_1.Title, { eyebrow: "DEDICATED MODULE / CONTRACT PREPARATION", title: "Guided SparkLab" },
            React.createElement("span", { className: "an-badge" }, "Not connected")),
        React.createElement("p", { className: "an-lead" }, "A curated exercise defines supported operations, versioned fixture rows and expected results before any service is called. This is not a general PySpark kernel."),
        React.createElement("div", { className: "an-actions" },
            React.createElement(controls_1.JsonDownload, { name: "guided-spark-lesson.json", value: l }, "Export lesson contract"),
            React.createElement("button", { disabled: true, title: "No endpoint is configured or qualified in this milestone." }, "Run guided exercise")),
        React.createElement("div", { className: "an-card" },
            React.createElement("h3", null, l.title),
            React.createElement("p", null,
                "Allowed operations: ",
                l.allowedOperations.join(', '),
                ". Fixture: ",
                l.fixtureVersion,
                "."),
            React.createElement(controls_1.SourceEditor, { label: "Guided Spark starter example", source: l.starter, language: "python", readOnly: true, onChange: () => { } }),
            React.createElement(controls_1.RowsTable, { label: "Guided Spark lesson fixture", rows: l.rows.map(r => ({ ...r })) })),
        React.createElement("div", { className: "an-card" },
            React.createElement("h3", null, "Integration contract with fastapispark"),
            React.createElement("pre", null,
                "Lesson + fixture version + supported syntax",
                '\n',
                "  - compile source using POST /v1/spark/compile",
                '\n',
                "  - reject unsupported operations or compiler warnings",
                '\n',
                "  - validate against this lesson, server-side as well as client-side",
                '\n',
                "  - execute only the lesson fixture using POST /v1/spark/execute",
                '\n',
                "  - check all result rows, not only the displayed preview",
                '\n',
                "  - store the attempt separately from layout/source revisions"),
            React.createElement("p", null, l.truth),
            React.createElement("p", null, "Current helper code only validates a compile-response envelope and prepares a bounded request. It neither makes a network request nor certifies the service as safe for arbitrary input. Server-side argument validation, version negotiation, full-result grading, authentication and conformance tests remain integration gates.")));
}

},
"analytics/charts":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRows = importRows;
exports.aggregateBoard = aggregateBoard;
exports.boardYaml = boardYaml;
exports.sampleBoard = sampleBoard;
const validation_1 = require("./validation");
function importRows(text, query, now = new Date().toISOString()) {
    const raw = (0, validation_1.safeJson)(text, 2_000_000);
    const values = Array.isArray(raw) ? raw : (0, validation_1.record)(raw, 'result').rows;
    const rows = (0, validation_1.array)(values, 'result rows', 2000).map(value => {
        const row = (0, validation_1.record)(value, 'row');
        const entries = Object.entries(row);
        if (!entries.length || entries.length > 80)
            throw new Error('Rows must have 1-80 columns.');
        const next = Object.create(null);
        for (const [key, value] of entries) {
            (0, validation_1.string)(key, 'column name', 100);
            if (!(value === null || typeof value === 'string' && value.length <= 4000 || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)))
                throw new Error('Result cells must be bounded strings, finite numbers, booleans, or null.');
            next[key] = value;
        }
        return next;
    });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    (0, validation_1.unique)(columns, 'column name');
    if (rows.some(r => Object.keys(r).length !== columns.length || !columns.every(c => Object.hasOwn(r, c))))
        throw new Error('Every result row must have the same columns.');
    return { label: 'Imported result rows', rows, columns, query, importedAt: now, origin: 'imported' };
}
function aggregateBoard(board) {
    const { snapshot, x, y, aggregation } = board;
    if (!snapshot.columns.includes(x) || aggregation !== 'count' && !snapshot.columns.includes(y))
        return { points: [], ignored: snapshot.rows.length, stale: snapshot.query !== board.query, total: 0, groups: 0 };
    const groups = new Map();
    let ignored = 0, rawSum = 0, rawCount = 0;
    for (const row of snapshot.rows) {
        const dimension = row[x];
        const label = dimension == null ? '(null)' : String(dimension);
        // A null group, a string '(null)', and numbers/strings with the same text are distinct.
        const key = JSON.stringify([typeof dimension, dimension]);
        const value = aggregation === 'count' ? 1 : row[y];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            ignored++;
            continue;
        }
        rawSum += value;
        rawCount++;
        const group = groups.get(key) ?? { label, sum: 0, count: 0 };
        group.sum += value;
        group.count++;
        groups.set(key, group);
    }
    const points = [...groups.values()].sort((a, b) => a.label < b.label ? -1 : a.label > b.label ? 1 : 0).map(g => ({ label: g.label, value: aggregation === 'mean' ? g.sum / g.count : g.sum }));
    if (!Number.isFinite(rawSum) || points.some(p => !Number.isFinite(p.value)))
        throw new Error('Numeric overflow in imported chart data.');
    return { points: points.slice(0, 80), groups: points.length, ignored, stale: snapshot.query !== board.query, total: aggregation === 'mean' ? rawSum / (rawCount || 1) : rawSum };
}
const yaml = (s) => JSON.stringify(s); // JSON quoted strings are valid YAML scalars.
/** Exports the documented dbt Charts DSL. Rendering remains the external dct CLI's job. */
function boardYaml(board) {
    const query = `WITH board_source AS (\n${board.query.replace(/;\s*$/, '').split('\n').map(s => '  ' + s).join('\n')}\n)\nSELECT "${board.x.replaceAll('"', '""')}" AS dimension,\n       ${board.aggregation === 'count' ? 'COUNT(*)' : `${board.aggregation === 'mean' ? 'AVG' : 'SUM'}("${board.y.replaceAll('"', '""')}")`} AS metric\nFROM board_source\nGROUP BY 1\nORDER BY 1`;
    const chart = board.chartType === 'kpi' ? '    value: metric\n' : board.chartType === 'table' ? '' : '    x: dimension\n    y: metric\n';
    const kpiQuery = board.chartType === 'kpi' ? `SELECT ${board.aggregation === 'count' ? 'COUNT(*)' : `${board.aggregation === 'mean' ? 'AVG' : 'SUM'}("${board.y.replaceAll('"', '""')}")`} AS metric FROM (\n${board.query.replace(/;\s*$/, '')}\n) AS board_source` : query;
    return `# Generated by Datapass. Validate using dct validate, then render with dct.\n# Browser preview is NOT the dbt Charts renderer. No query ran during export.\ntitle: ${yaml(board.title)}\nsource: db\n\nqueries:\n  analysis: |\n${kpiQuery.split('\n').map(l => '    ' + l).join('\n')}\n\ncharts:\n  analysis_chart:\n    title: ${yaml(board.title)}\n    query: analysis\n    type: ${board.chartType}\n${chart}\nrows:\n  - analysis_chart\n`;
}
function sampleBoard() {
    const query = "SELECT order_month, customer_name, revenue\nFROM {{ ref('fct_sales') }}\nORDER BY order_month, customer_name";
    const rows = [
        { order_month: '2026-01', customer_name: 'Aster', revenue: 420 }, { order_month: '2026-01', customer_name: 'Birch', revenue: 275 },
        { order_month: '2026-02', customer_name: 'Aster', revenue: 560 }, { order_month: '2026-02', customer_name: 'Birch', revenue: 360 },
        { order_month: '2026-03', customer_name: 'Aster', revenue: 610 }, { order_month: '2026-03', customer_name: 'Birch', revenue: 480 },
        { order_month: '2026-04', customer_name: 'Aster', revenue: 720 }, { order_month: '2026-04', customer_name: 'Birch', revenue: 430 },
    ];
    return { title: 'Revenue over time', chartType: 'bar', x: 'order_month', y: 'revenue', aggregation: 'sum', query, snapshot: { label: 'Retail teaching fixture', origin: 'sample', columns: ['order_month', 'customer_name', 'revenue'], rows, query } };
}

},
"analytics/controls":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadText = downloadText;
exports.JsonDownload = JsonDownload;
exports.FileImport = FileImport;
exports.SourceEditor = SourceEditor;
exports.RowsTable = RowsTable;
exports.Title = Title;
const React = require("react");
const editorEdits_1 = require("../editorEdits");
function downloadText(name, text, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function JsonDownload({ name, value, children }) {
    return React.createElement("button", { onClick: () => downloadText(name, JSON.stringify(value, null, 2), 'application/json') }, children);
}
function FileImport({ label, accept = '.json', limit = 8_000_000, onRead, onError }) {
    const alive = React.useRef(true);
    React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    return React.createElement("label", { className: "an-file-button" },
        label,
        React.createElement("input", { type: "file", "aria-label": label, accept: accept, onChange: event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (!file)
                    return;
                if (file.size > limit) {
                    onError(`File exceeds the ${Math.round(limit / 1_000_000)} MB limit.`);
                    return;
                }
                file.text().then(text => { if (alive.current)
                    onRead(text, file.name); }).catch(error => { if (alive.current)
                    onError(String(error)); });
            } }));
}
function SourceEditor({ source, onChange, label, language = 'sql', readOnly = false }) {
    const [escapeTab, setEscapeTab] = React.useState(false);
    return React.createElement("div", { className: "an-source" },
        React.createElement("div", { className: "an-editor-caption" },
            React.createElement("span", null,
                language.toUpperCase(),
                " / ",
                readOnly ? 'READ ONLY' : 'DRAFT'),
            React.createElement("span", null,
                source.split('\n').length,
                " lines")),
        React.createElement("textarea", { spellCheck: false, "aria-label": label, value: source, readOnly: readOnly, onChange: e => onChange(e.target.value), onKeyDown: e => {
                if (e.nativeEvent.isComposing || readOnly)
                    return;
                if (e.key === 'Escape') {
                    setEscapeTab(true);
                    return;
                }
                const node = e.currentTarget;
                const edit = e.key === 'Tab' && !escapeTab ? (0, editorEdits_1.indentSelection)(source, node.selectionStart, node.selectionEnd, e.shiftKey)
                    : e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey ? (0, editorEdits_1.insertNewline)(source, node.selectionStart, node.selectionEnd, language)
                        : (e.ctrlKey || e.metaKey) && e.key === '/' ? (0, editorEdits_1.toggleLineComment)(source, node.selectionStart, node.selectionEnd, language) : null;
                if (edit) {
                    e.preventDefault();
                    onChange(edit.value);
                    requestAnimationFrame(() => node.setSelectionRange(edit.start, edit.end));
                }
            } }),
        React.createElement("small", null,
            readOnly ? 'Read-only view. No code executed in this session.' : escapeTab ? 'Tab moves focus. Click to enable indentation.' : 'Tab: indent / Shift+Tab: outdent / Esc: release focus / Ctrl+/: comment',
            !readOnly && escapeTab && React.createElement("button", { onClick: () => setEscapeTab(false) }, "Enable indentation")));
}
function RowsTable({ rows, columns, label }) {
    const keys = columns ?? Object.keys(rows[0] ?? {});
    return React.createElement("div", { className: "an-table-scroll" },
        React.createElement("table", { "aria-label": label },
            React.createElement("thead", null,
                React.createElement("tr", null, keys.map(k => React.createElement("th", { key: k }, k)))),
            React.createElement("tbody", null, rows.slice(0, 100).map((r, i) => React.createElement("tr", { key: i }, keys.map(k => React.createElement("td", { key: k }, r[k] === null ? React.createElement("span", { className: "an-muted" }, "NULL") : String(r[k] ?? ''))))))),
        !rows.length && React.createElement("p", null, "No rows in this snapshot."),
        rows.length > 100 && React.createElement("small", null,
            "Showing the first 100 of ",
            rows.length,
            " rows. Export retains all bounded rows."));
}
function Title({ eyebrow, title, children }) { return React.createElement("div", { className: "an-title" },
    React.createElement("div", null,
        React.createElement("small", null, eyebrow),
        React.createElement("h2", null, title)),
    children); }

},
"analytics/dbt":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importManifest = importManifest;
exports.attachRunResults = attachRunResults;
exports.manifestGraph = manifestGraph;
exports.draftGraph = draftGraph;
exports.cyclicNodes = cyclicNodes;
exports.graphLevels = graphLevels;
exports.relatedNodes = relatedNodes;
const validation_1 = require("./validation");
const SUPPORTED_MANIFESTS = new Set([9, 10, 11, 12]);
function schemaVersion(meta, artifact) {
    const url = (0, validation_1.string)(meta.dbt_schema_version, 'artifact schema', 240);
    const match = url.match(new RegExp(`^https://schemas\\.getdbt\\.com/dbt/${artifact}/v(\\d+)\\.json$`));
    if (!match)
        throw new Error(`This is not a dbt ${artifact} artifact.`);
    return Number(match[1]);
}
function importManifest(text) {
    const root = (0, validation_1.record)((0, validation_1.safeJson)(text), 'manifest'), meta = (0, validation_1.record)(root.metadata, 'manifest metadata');
    const schema = schemaVersion(meta, 'manifest');
    if (!SUPPORTED_MANIFESTS.has(schema))
        throw new Error(`Manifest v${schema} is not qualified. Supported: v9-v12. Existing project retained.`);
    const sources = root.sources == null ? {} : (0, validation_1.record)(root.sources, 'sources');
    const rawNodes = { ...(0, validation_1.record)(root.nodes, 'nodes') };
    for (const [id, value] of Object.entries(sources)) {
        if (Object.hasOwn(rawNodes, id))
            throw new Error('Duplicate source/node identity.');
        rawNodes[id] = value;
    }
    if (Object.keys(rawNodes).length > 400)
        throw new Error('This UI import is bounded to 400 nodes, including tests and sources.');
    const nodes = Object.entries(rawNodes).map(([key, value]) => {
        const n = (0, validation_1.record)(value, 'manifest node');
        const id = (0, validation_1.string)(n.unique_id, 'node identity', 500);
        if (id !== key)
            throw new Error('Manifest node key and unique_id do not match.');
        const dependencies = n.depends_on == null ? [] : (0, validation_1.array)((0, validation_1.record)(n.depends_on).nodes ?? [], 'dependencies', 400).map(d => (0, validation_1.string)(d, 'dependency', 500));
        (0, validation_1.unique)(dependencies, 'dependencies');
        const cols = n.columns == null ? {} : (0, validation_1.record)(n.columns, 'columns');
        if (Object.keys(cols).length > 250)
            throw new Error('Too many columns in one node.');
        const columns = Object.entries(cols).map(([name, value]) => { const c = (0, validation_1.record)(value); return { name: (0, validation_1.string)(c.name ?? name, 'column name', 200), type: (0, validation_1.optionalString)(c.data_type, 100), description: (0, validation_1.optionalString)(c.description) }; });
        const config = n.config == null ? {} : (0, validation_1.record)(n.config);
        return { id, name: (0, validation_1.string)(n.name, 'node name', 250), kind: (0, validation_1.string)(n.resource_type, 'resource type', 50), path: (0, validation_1.optionalString)(n.original_file_path, 500), description: (0, validation_1.optionalString)(n.description, 20_000), materialization: (0, validation_1.optionalString)(config.materialized, 80), dependencies, columns, source: (0, validation_1.optionalString)(n.raw_code ?? n.raw_sql, 100_000), compiled: (0, validation_1.optionalString)(n.compiled_code ?? n.compiled_sql, 100_000) };
    });
    const ids = new Set(nodes.map(n => n.id)), warnings = [];
    for (const n of nodes)
        for (const d of n.dependencies)
            if (!ids.has(d))
                warnings.push(`${n.name}: unresolved dependency ${d}.`);
    if (nodes.reduce((sum, n) => sum + n.dependencies.length, 0) > 3000)
        throw new Error('Too many lineage edges.');
    return { schema, projectName: (0, validation_1.optionalString)(meta.project_name, 200) || 'Imported project', generatedAt: (0, validation_1.optionalString)(meta.generated_at, 100), invocationId: (0, validation_1.optionalString)(meta.invocation_id, 100), nodes, results: [], warnings, provenance: 'imported-dbt-artifact' };
}
function attachRunResults(bundle, text) {
    const root = (0, validation_1.record)((0, validation_1.safeJson)(text), 'run results'), meta = (0, validation_1.record)(root.metadata, 'run metadata');
    const schema = schemaVersion(meta, 'run-results');
    if (![4, 5, 6].includes(schema))
        throw new Error(`Run-results v${schema} is not qualified (v4-v6 supported).`);
    const invocation = (0, validation_1.optionalString)(meta.invocation_id, 100);
    // Evidence cannot be silently applied to another manifest invocation.
    if (!invocation || !bundle.invocationId || invocation !== bundle.invocationId)
        throw new Error('Run results and manifest must have the same invocation_id. Import the matching manifest first.');
    const ids = new Set(bundle.nodes.map(n => n.id));
    const results = (0, validation_1.array)(root.results, 'results', 400).map(value => {
        const r = (0, validation_1.record)(value);
        const id = (0, validation_1.string)(r.unique_id, 'result identity', 500);
        if (!ids.has(id))
            throw new Error(`Result does not belong to this manifest: ${id}.`);
        return { id, status: (0, validation_1.string)(r.status, 'status', 100), seconds: r.execution_time == null ? null : (0, validation_1.finite)(r.execution_time, 'duration', 0, 1e9), message: (0, validation_1.optionalString)(r.message, 10_000), failures: r.failures == null ? null : (0, validation_1.finite)(r.failures, 'failure count', 0, 1e12) };
    });
    (0, validation_1.unique)(results.map(r => r.id), 'result identity');
    return { ...bundle, results, resultInvocationId: invocation, resultGeneratedAt: (0, validation_1.optionalString)(meta.generated_at, 100) };
}
function manifestGraph(bundle, includeTests = false) {
    const selected = bundle.nodes.filter(n => includeTests || !['test', 'unit_test'].includes(n.kind));
    const ids = new Set(selected.map(n => n.id));
    return { origin: 'imported-manifest', nodes: selected.map(n => ({ id: n.id, label: n.name, kind: n.kind, detail: n.materialization || n.kind })), edges: selected.flatMap(n => n.dependencies.filter(d => ids.has(d)).map(d => ({ id: `${d}->${n.id}`, from: d, to: n.id }))), warnings: bundle.warnings };
}
/** Conservative literal ref/source scanner, NOT Jinja compilation or general SQL lineage. */
function draftGraph(files) {
    const models = files.filter(f => /^(models|snapshots|seeds)\//.test(f.path) && /\.(sql|csv)$/.test(f.path));
    const nodes = models.map(f => ({ id: f.path, label: f.path.split('/').at(-1).replace(/\.(sql|csv)$/, ''), kind: f.path.startsWith('seeds/') ? 'seed' : f.path.startsWith('snapshots/') ? 'snapshot' : 'model', detail: f.path }));
    const byName = new Map();
    nodes.forEach(n => byName.set(n.label, [...(byName.get(n.label) ?? []), n.id]));
    const edges = [], warnings = new Set();
    for (const file of models) {
        const code = file.source.replace(/\{#[\s\S]*?#\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
        const calls = [...code.matchAll(/\{\{\s*(ref|source)\s*\(([^)]*)\)\s*\}\}/g)];
        if (/\{%/.test(code))
            warnings.add('Control-flow macros are not expanded. Import a dbt manifest for resolved lineage.');
        for (const match of calls) {
            const args = [...match[2].matchAll(/(['"])([^'"]+)\1/g)].map(m => m[2]);
            const literal = /^\s*(['"])[A-Za-z_][A-Za-z0-9_.-]*\1\s*(,\s*(['"])[A-Za-z_][A-Za-z0-9_.-]*\3\s*)?$/.test(match[2]);
            if (!literal) {
                warnings.add(`${file.path}: dynamic ${match[1]} is unresolved.`);
                continue;
            }
            let dependency = '';
            if (match[1] === 'source' && args.length === 2) {
                dependency = `source:${args[0]}.${args[1]}`;
                if (!nodes.some(n => n.id === dependency))
                    nodes.push({ id: dependency, label: args.join('.'), kind: 'source', detail: 'Literal source reference; definition not validated' });
            }
            else if (match[1] === 'ref' && args.length === 1) {
                const found = byName.get(args[0]) ?? [];
                if (found.length === 1)
                    dependency = found[0];
                else {
                    dependency = `unresolved:${args[0]}`;
                    if (!nodes.some(n => n.id === dependency))
                        nodes.push({ id: dependency, label: args[0], kind: 'unresolved', detail: 'Missing or ambiguous ref' });
                    warnings.add(`${file.path}: ${args[0]} is missing or ambiguous.`);
                }
            }
            else {
                warnings.add(`${file.path}: package/versioned reference requires dbt parse.`);
                continue;
            }
            const id = `${dependency}->${file.path}`;
            if (!edges.some(e => e.id === id))
                edges.push({ id, from: dependency, to: file.path });
        }
    }
    const graph = { origin: 'draft-reference-scan', nodes, edges, warnings: [...warnings] };
    if (cyclicNodes(graph).length)
        graph.warnings.push('Dependency cycle found. dbt must validate the project before execution.');
    return graph;
}
function cyclicNodes(graph) {
    const indegree = new Map(graph.nodes.map(n => [n.id, 0]));
    for (const e of graph.edges)
        if (indegree.has(e.to) && indegree.has(e.from))
            indegree.set(e.to, indegree.get(e.to) + 1);
    const ready = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
    while (ready.length) {
        const id = ready.shift();
        for (const e of graph.edges.filter(e => e.from === id)) {
            const degree = (indegree.get(e.to) ?? 1) - 1;
            indegree.set(e.to, degree);
            if (degree === 0)
                ready.push(e.to);
        }
    }
    return [...indegree].filter(([, d]) => d > 0).map(([id]) => id);
}
function graphLevels(graph) {
    const levels = new Map(graph.nodes.map(n => [n.id, 0]));
    if (cyclicNodes(graph).length) {
        graph.nodes.forEach((n, i) => levels.set(n.id, i % 3));
        return levels;
    }
    for (let i = 0; i < graph.nodes.length; i++) {
        let changed = false;
        for (const edge of graph.edges) {
            if (!levels.has(edge.from) || !levels.has(edge.to))
                continue;
            const next = levels.get(edge.from) + 1;
            if (next > levels.get(edge.to)) {
                levels.set(edge.to, next);
                changed = true;
            }
        }
        if (!changed)
            break;
    }
    return levels;
}
function relatedNodes(graph, selected, direction) {
    const found = new Set([selected]), todo = [selected];
    while (todo.length) {
        const id = todo.pop();
        for (const edge of graph.edges) {
            const next = direction === 'upstream' ? edge.to === id ? edge.from : null : edge.from === id ? edge.to : null;
            if (next && !found.has(next)) {
                found.add(next);
                todo.push(next);
            }
        }
    }
    return found;
}

},
"analytics/guidedSpark":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUIDED_SPARK_LESSON = void 0;
exports.validateCompiledLesson = validateCompiledLesson;
exports.prepareLessonRequest = prepareLessonRequest;
/** Protocol preparation only. No network, source execution, or grading is performed here. */
const validation_1 = require("./validation");
exports.GUIDED_SPARK_LESSON = {
    id: 'retail-filter-v1', version: '1.0.0', runtime: 'fastapispark-0.1.0', fixtureVersion: 'retail-v1',
    title: 'Filter valid orders, then select the business columns',
    sourceTable: 'orders', allowedOperations: ['filter', 'select', 'order_by', 'limit'],
    starter: 'df = spark.table("orders")\ndf = df.filter("net_amount > 0")\ndf = df.select("order_id", "customer_id", "net_amount")',
    rows: [{ order_id: 1, customer_id: 101, net_amount: 420 }, { order_id: 2, customer_id: 102, net_amount: 275 }, { order_id: 3, customer_id: 101, net_amount: -10 }],
    expectedColumns: ['order_id', 'customer_id', 'net_amount'],
    expectedRows: [{ order_id: 1, customer_id: 101, net_amount: 420 }, { order_id: 2, customer_id: 102, net_amount: 275 }],
    truth: 'DuckDB result semantics; distributed metrics are simulated. This lesson is not yet runtime-qualified.',
};
function validateCompiledLesson(value) {
    const v = (0, validation_1.record)(value, 'compile response');
    if (v.source_table !== exports.GUIDED_SPARK_LESSON.sourceTable)
        throw new Error('The compiled source is not this lesson fixture.');
    const operations = (0, validation_1.array)(v.operations, 'operations', 20).map(raw => { const operation = (0, validation_1.record)(raw); const op = (0, validation_1.string)(operation.op, 'operation', 40); if (!exports.GUIDED_SPARK_LESSON.allowedOperations.includes(op))
        throw new Error(`Operation ${op} is outside this lesson contract.`); return { op, args: (0, validation_1.record)(operation.args, 'operation args') }; });
    const warnings = (0, validation_1.array)(v.warnings ?? [], 'compiler warnings', 50).map(w => (0, validation_1.string)(w, 'warning', 2000));
    // A compiler that ignores unsupported statements must not silently pass a lesson.
    if (warnings.length)
        throw new Error('Compiler emitted warnings. This lesson requires a clean supported compile.');
    return { source_table: exports.GUIDED_SPARK_LESSON.sourceTable, operations };
}
function prepareLessonRequest(compiled, consent) {
    if (!consent)
        throw new Error('Explicit consent is required before preparing fixture data for a remote service.');
    const plan = validateCompiledLesson(compiled);
    return { ...plan, runtime_id: 'datapass-free', tables: [{ name: exports.GUIDED_SPARK_LESSON.sourceTable, rows: exports.GUIDED_SPARK_LESSON.rows }], collect_limit: 100, hints: {} };
}

},
"analytics/modeling":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_TYPES = exports.CHANGE_EVENTS = void 0;
exports.newTable = newTable;
exports.modelChecks = modelChecks;
exports.addRelationship = addRelationship;
exports.removeTable = removeTable;
exports.ddlPreview = ddlPreview;
exports.replayScd = replayScd;
exports.lookupAt = lookupAt;
exports.scdExerciseAnswer = scdExerciseAnswer;
const validation_1 = require("./validation");
function newTable(name, role = 'dimension') {
    (0, validation_1.identifier)(name, 'Table name');
    return { id: (0, validation_1.freshId)('table'), name, role, grain: '', x: 30, y: 40, columns: [{ id: (0, validation_1.freshId)('column'), name: `${name.replace(/^(dim_|fct_)/, '')}_key`, type: 'INTEGER', primary: true, nullable: false }] };
}
function modelChecks(model) {
    const checks = [];
    if (!model.tables.length)
        return [{ id: 'empty', severity: 'info', message: 'Add a fact and its dimensions to begin.' }];
    const duplicateNames = model.tables.map(t => t.name).filter((n, i, all) => all.indexOf(n) !== i);
    if (duplicateNames.length)
        checks.push({ id: 'names', severity: 'error', message: `Table names must be unique: ${duplicateNames.join(', ')}.` });
    for (const table of model.tables) {
        if (!table.grain.trim())
            checks.push({ id: `grain-${table.id}`, severity: 'warning', message: `${table.name}: describe what one row represents.` });
        const pk = table.columns.filter(c => c.primary);
        if (!pk.length)
            checks.push({ id: `pk-${table.id}`, severity: 'warning', message: `${table.name}: no primary key is marked.` });
        if (pk.some(c => c.nullable))
            checks.push({ id: `nullpk-${table.id}`, severity: 'error', message: `${table.name}: a primary key cannot be nullable.` });
        if (new Set(table.columns.map(c => c.name)).size !== table.columns.length)
            checks.push({ id: `colnames-${table.id}`, severity: 'error', message: `${table.name}: duplicate column names.` });
        if (table.role === 'dimension' && pk.length > 1)
            checks.push({ id: `composite-${table.id}`, severity: 'info', message: `${table.name}: composite key; single-column relationships cannot establish uniqueness alone.` });
    }
    for (const r of model.relationships) {
        const from = model.tables.find(t => t.id === r.fromTable), to = model.tables.find(t => t.id === r.toTable);
        const fc = from?.columns.find(c => c.id === r.fromColumn), tc = to?.columns.find(c => c.id === r.toColumn);
        if (!from || !to || !fc || !tc) {
            checks.push({ id: r.id, severity: 'error', message: 'Relationship has a missing table or column.' });
            continue;
        }
        if (r.fromTable === r.toTable)
            checks.push({ id: r.id + '-self', severity: 'warning', message: `${from.name}: self relationship; check the intended hierarchy.` });
        if (fc.type !== tc.type)
            checks.push({ id: r.id + '-type', severity: 'error', message: `${from.name}.${fc.name} and ${to.name}.${tc.name} have different types.` });
        if (r.cardinality !== 'many-to-many' && (!tc.primary || to.columns.filter(c => c.primary).length !== 1))
            checks.push({ id: r.id + '-target', severity: 'warning', message: `${to.name}.${tc.name}: the 'one' side is not a single-column declared primary key.` });
        if (r.cardinality === 'many-to-many')
            checks.push({ id: r.id + '-bridge', severity: 'warning', message: `${from.name} to ${to.name}: consider a bridge table and define its grain.` });
        if (r.cardinality === 'one-to-one' && (!fc.primary || from.columns.filter(c => c.primary).length !== 1))
            checks.push({ id: r.id + '-one', severity: 'warning', message: `${from.name}.${fc.name}: the first 'one' side has no single-column declared uniqueness.` });
    }
    return checks;
}
function addRelationship(model, relationship) {
    const from = model.tables.find(t => t.id === relationship.fromTable), to = model.tables.find(t => t.id === relationship.toTable);
    if (!from?.columns.some(c => c.id === relationship.fromColumn) || !to?.columns.some(c => c.id === relationship.toColumn))
        throw new Error('Choose existing columns on both sides.');
    if (model.relationships.some(r => r.fromTable === relationship.fromTable && r.fromColumn === relationship.fromColumn && r.toTable === relationship.toTable && r.toColumn === relationship.toColumn))
        throw new Error('This relationship already exists.');
    return { ...model, relationships: [...model.relationships, { id: (0, validation_1.freshId)('relation'), ...relationship }] };
}
function removeTable(model, id) {
    return { ...model, tables: model.tables.filter(t => t.id !== id), relationships: model.relationships.filter(r => r.fromTable !== id && r.toTable !== id), mappings: model.mappings.filter(r => r.fromTable !== id && r.toTable !== id) };
}
function ddlPreview(model) {
    const header = '-- Authored schema design. Not introspected; no tables have been created.\n-- Relationship cardinalities are declarations, not data-validated facts.\n';
    const statements = model.tables.map(t => {
        (0, validation_1.identifier)(t.name);
        const columns = t.columns.map(c => {
            if (!/^(INTEGER|BIGINT|DOUBLE|DECIMAL\(18,2\)|VARCHAR|DATE|TIMESTAMP|BOOLEAN)$/.test(c.type))
                throw new Error('Unsupported DDL type.');
            return `  ${(0, validation_1.quoteIdentifier)(c.name)} ${c.type}${c.nullable ? '' : ' NOT NULL'}`;
        });
        const keys = t.columns.filter(c => c.primary).map(c => (0, validation_1.quoteIdentifier)(c.name));
        if (keys.length)
            columns.push(`  PRIMARY KEY (${keys.join(', ')})`);
        return `-- Grain: ${t.grain.replace(/[\r\n]/g, ' ')}\nCREATE TABLE ${(0, validation_1.quoteIdentifier)(t.name)} (\n${columns.join(',\n')}\n);`;
    });
    const relationships = model.relationships.map(r => {
        const a = model.tables.find(t => t.id === r.fromTable), b = model.tables.find(t => t.id === r.toTable);
        const ac = a?.columns.find(c => c.id === r.fromColumn), bc = b?.columns.find(c => c.id === r.toColumn);
        return a && b && ac && bc ? `-- Relationship: ${(0, validation_1.quoteIdentifier)(a.name)}.${(0, validation_1.quoteIdentifier)(ac.name)} -> ${(0, validation_1.quoteIdentifier)(b.name)}.${(0, validation_1.quoteIdentifier)(bc.name)} (${r.cardinality}); validate keys before enforcing.` : '-- Unresolved relationship';
    });
    return header + statements.join('\n\n') + '\n\n' + relationships.join('\n') + '\n';
}
exports.CHANGE_EVENTS = [
    { customerId: 101, name: 'Aster', city: 'Geneva', at: '2026-01-01' },
    { customerId: 102, name: 'Birch', city: 'Bergen', at: '2026-01-01' },
    { customerId: 101, name: 'Aster', city: 'Oslo', at: '2026-02-10' },
    { customerId: 102, name: 'Birch', city: 'Bergen', at: '2026-02-11' },
    { customerId: 101, name: 'Aster', city: 'Trondheim', at: '2026-03-05' },
];
function replayScd(events, type, count = events.length) {
    if (![1, 2, 3].includes(type) || !Number.isInteger(count) || count < 0 || count > events.length)
        throw new Error('Invalid SCD replay selection.');
    const rows = [];
    let nextKey = 1;
    const last = new Map();
    for (const e of events.slice(0, count)) {
        if (!Number.isInteger(e.customerId) || !e.name || !e.city || !/^\d{4}-\d{2}-\d{2}$/.test(e.at) || !Number.isFinite(Date.parse(e.at)) || new Date(e.at).toISOString().slice(0, 10) !== e.at)
            throw new Error('Invalid change event.');
        if (last.has(e.customerId) && last.get(e.customerId) >= e.at)
            throw new Error('Changes per customer must have strictly increasing dates.');
        last.set(e.customerId, e.at);
        const current = rows.find(r => r.customer_id === e.customerId && r.is_current);
        if (!current)
            rows.push({ customer_key: nextKey++, customer_id: e.customerId, name: e.name, city: e.city, previous_city: null, valid_from: e.at, valid_to: null, is_current: true });
        else if (current.city !== e.city || current.name !== e.name) {
            if (type === 2) {
                current.valid_to = e.at;
                current.is_current = false;
                rows.push({ customer_key: nextKey++, customer_id: e.customerId, name: e.name, city: e.city, previous_city: null, valid_from: e.at, valid_to: null, is_current: true });
            }
            else {
                if (type === 3 && current.city !== e.city)
                    current.previous_city = current.city;
                current.city = e.city;
                current.name = e.name;
            }
        }
    }
    return rows;
}
function lookupAt(rows, customer, at) {
    return rows.find(r => r.customer_id === customer && r.valid_from <= at && (!r.valid_to || at < r.valid_to));
}
function scdExerciseAnswer(type, step) {
    const rows = replayScd(exports.CHANGE_EVENTS, type, step);
    return { expected: String(rows.length), explanation: type === 2 ? 'Type 2 adds a new version only when tracked attributes change. An unchanged city creates no version.' : `Type ${type} keeps one row per business key. ${type === 3 ? 'The previous_city column retains only the immediately previous city.' : 'Earlier city values are overwritten.'}` };
}
exports.DATA_TYPES = ['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL(18,2)', 'VARCHAR', 'DATE', 'TIMESTAMP', 'BOOLEAN'];

},
"analytics/project":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYERS = exports.LAB_KEY = void 0;
exports.defaultSession = defaultSession;
exports.starterFiles = starterFiles;
exports.starterModel = starterModel;
exports.newProject = newProject;
exports.openLayer = openLayer;
exports.splitSession = splitSession;
exports.closeTab = closeTab;
exports.moveTab = moveTab;
exports.validateSession = validateSession;
exports.validateModel = validateModel;
exports.validateProject = validateProject;
exports.importProject = importProject;
exports.readProject = readProject;
exports.updateFile = updateFile;
exports.singlePaneSession = singlePaneSession;
exports.preserveAnalyticsAttachment = preserveAnalyticsAttachment;
const validation_1 = require("./validation");
const charts_1 = require("./charts");
const modeling_1 = require("./modeling");
exports.LAB_KEY = 'datapass:analytics:v1';
exports.LAYERS = [
    { id: 'notebook', label: 'Notebook', description: 'Your existing SQL, Python and free-canvas editor' },
    { id: 'dbt', label: 'dbt Studio', description: 'Models, tests, YAML and artifact evidence' },
    { id: 'lineage', label: 'Lineage', description: 'Model dependencies and change impact' },
    { id: 'model', label: 'Data model', description: 'Fact/dimension schema, keys and column mappings' },
    { id: 'scd', label: 'SCD lab', description: 'Replay Type 1, 2 and 3 changes' },
    { id: 'charts', label: 'Charts', description: 'Result-based boards and dbt Charts YAML' },
    { id: 'sparklab', label: 'Guided SparkLab', description: 'Exercise-specific integration contract; disconnected' },
    { id: 'connections', label: 'Runtime & setup', description: 'Local and optional remote capabilities' },
];
function defaultSession() {
    return { panes: [{ id: 'a', tabs: [{ id: 'tab-notebook', layer: 'notebook', title: 'Revenue notebook' }, { id: 'tab-dbt', layer: 'dbt', title: 'dbt Studio' }], active: 'tab-notebook' }], activePane: 'a', direction: 'horizontal', ratio: 52, collapsed: null, explorerOpen: true, contextOpen: false, theme: 'fluent' };
}
function starterFiles() {
    return [
        { path: 'dbt_project.yml', source: `name: datapass_retail\nversion: '1.0.0'\nconfig-version: 2\nprofile: datapass_retail\nmodel-paths: [models]\nseed-paths: [seeds]\ntest-paths: [tests]\nmodels:\n  datapass_retail:\n    staging:\n      +materialized: view\n    marts:\n      +materialized: table\n` },
        { path: 'dbt_charts.yml', source: 'sources:\n  db:\n    type: dbt_profile\n    profile: datapass_retail\n    target: dev\n' },
        { path: 'models/staging/stg_orders.sql', source: `-- One row per order; invalid amounts do not contribute.\nselect\n    order_id,\n    customer_id,\n    order_month,\n    cast(net_amount as decimal(18,2)) as revenue\nfrom {{ ref('raw_orders') }}\nwhere net_amount > 0\n` },
        { path: 'models/marts/dim_customers.sql', source: `select\n    customer_id as customer_key,\n    customer_id,\n    customer_name,\n    city\nfrom {{ ref('raw_customers') }}\n` },
        { path: 'models/marts/fct_sales.sql', source: `-- Grain: one row per valid order.\nselect\n    o.order_id,\n    c.customer_key,\n    c.customer_name,\n    o.order_month,\n    o.revenue\nfrom {{ ref('stg_orders') }} as o\nleft join {{ ref('dim_customers') }} as c\n    on o.customer_id = c.customer_id\n` },
        { path: 'models/schema.yml', source: `version: 2\nmodels:\n  - name: stg_orders\n    description: One row per valid order.\n    columns:\n      - name: order_id\n        data_tests: [unique, not_null]\n  - name: dim_customers\n    columns:\n      - name: customer_key\n        data_tests: [unique, not_null]\n  - name: fct_sales\n    columns:\n      - name: order_id\n        data_tests: [unique, not_null]\n      - name: customer_key\n        data_tests:\n          - not_null\n          - relationships:\n              arguments:\n                to: ref('dim_customers')\n                field: customer_key\n` },
        { path: 'tests/assert_positive_revenue.sql', source: `-- dbt singular tests return failing rows. Zero rows means pass.\nselect *\nfrom {{ ref('fct_sales') }}\nwhere revenue <= 0 or revenue is null\n` },
        { path: 'seeds/raw_customers.csv', source: 'customer_id,customer_name,city\n101,Aster,Geneva\n102,Birch,Bergen\n' },
        { path: 'seeds/raw_orders.csv', source: 'order_id,customer_id,order_month,net_amount\n1,101,2026-01,420\n2,102,2026-01,275\n3,101,2026-02,560\n4,102,2026-02,360\n5,101,2026-03,610\n6,102,2026-03,480\n7,101,2026-04,720\n8,102,2026-04,430\n' },
    ];
}
function starterModel() {
    return { tables: [
            { id: 'customers', name: 'dim_customers', role: 'dimension', grain: 'One row per customer (Type 1).', x: 30, y: 80, columns: [
                    { id: 'c-key', name: 'customer_key', type: 'INTEGER', primary: true, nullable: false },
                    { id: 'c-id', name: 'customer_id', type: 'INTEGER', primary: false, nullable: false },
                    { id: 'c-name', name: 'customer_name', type: 'VARCHAR', primary: false, nullable: false },
                    { id: 'c-city', name: 'city', type: 'VARCHAR', primary: false, nullable: true },
                ] },
            { id: 'sales', name: 'fct_sales', role: 'fact', grain: 'One row per valid order.', x: 370, y: 190, columns: [
                    { id: 's-id', name: 'order_id', type: 'INTEGER', primary: true, nullable: false },
                    { id: 's-customer', name: 'customer_key', type: 'INTEGER', primary: false, nullable: false },
                    { id: 's-month', name: 'order_month', type: 'VARCHAR', primary: false, nullable: false },
                    { id: 's-revenue', name: 'revenue', type: 'DECIMAL(18,2)', primary: false, nullable: false },
                ] },
            { id: 'months', name: 'dim_month', role: 'dimension', grain: 'One row per calendar month.', x: 710, y: 60, columns: [
                    { id: 'm-key', name: 'order_month', type: 'VARCHAR', primary: true, nullable: false },
                    { id: 'm-year', name: 'year', type: 'INTEGER', primary: false, nullable: false },
                    { id: 'm-quarter', name: 'quarter', type: 'INTEGER', primary: false, nullable: false },
                ] },
        ], relationships: [
            { id: 'sales-customer', fromTable: 'sales', fromColumn: 's-customer', toTable: 'customers', toColumn: 'c-key', cardinality: 'many-to-one' },
            { id: 'sales-month', fromTable: 'sales', fromColumn: 's-month', toTable: 'months', toColumn: 'm-key', cardinality: 'many-to-one' },
        ], mappings: [{ id: 'map-customer', fromTable: 'customers', fromColumn: 'c-key', toTable: 'sales', toColumn: 's-customer', expression: 'Lookup using the customer business key' }] };
}
function newProject() { return { schemaVersion: 1, revision: 0, title: 'Retail analytics', files: starterFiles(), selectedFile: 'models/marts/fct_sales.sql', model: starterModel(), board: (0, charts_1.sampleBoard)(), session: defaultSession(), scd: { type: 2, step: 3, answer: '' } }; }
function openLayer(session, layer, paneId = session.activePane) {
    if (!exports.LAYERS.some(l => l.id === layer))
        throw new Error('Unknown layer.');
    if (!session.panes.some(p => p.id === paneId))
        throw new Error('Missing destination pane.');
    return { ...session, collapsed: session.collapsed === paneId ? null : session.collapsed, activePane: paneId, panes: session.panes.map(p => {
            if (p.id !== paneId)
                return p;
            const old = p.tabs.find(t => t.layer === layer);
            if (old)
                return { ...p, active: old.id };
            if (p.tabs.length >= 12)
                throw new Error('Close a tab before opening more.');
            const tab = { id: (0, validation_1.freshId)('tab'), layer, title: exports.LAYERS.find(l => l.id === layer).label };
            return { ...p, tabs: [...p.tabs, tab], active: tab.id };
        }) };
}
function splitSession(session, direction) {
    if (session.panes.length === 2)
        return { ...session, direction, collapsed: null };
    const pane = { id: 'b', tabs: [], active: '' };
    return { ...session, panes: [...session.panes, pane], direction, activePane: 'b', collapsed: null };
}
function closeTab(session, paneId, id) {
    return { ...session, panes: session.panes.map(p => { if (p.id !== paneId)
            return p; const index = p.tabs.findIndex(t => t.id === id); const tabs = p.tabs.filter(t => t.id !== id); return { ...p, tabs, active: p.active === id ? tabs[Math.max(0, index - 1)]?.id ?? '' : p.active }; }) };
}
function moveTab(session, from, id) {
    const origin = session.panes.find(p => p.id === from), tab = origin?.tabs.find(t => t.id === id);
    if (!tab || session.panes.length < 2)
        return session;
    const other = session.panes.find(p => p.id !== from);
    if (other.tabs.some(t => t.layer === tab.layer))
        throw new Error('That layer already has a tab in the other pane. Close it first.');
    const next = closeTab(session, from, id);
    return { ...next, collapsed: null, activePane: other.id, panes: next.panes.map(p => p.id === other.id ? { ...p, tabs: [...p.tabs, tab], active: id } : p) };
}
function validateSession(value) {
    const s = (0, validation_1.record)(value, 'session');
    const panes = (0, validation_1.array)(s.panes, 'panes', 2).map(v => {
        const p = (0, validation_1.record)(v);
        if (!['a', 'b'].includes(String(p.id)))
            throw new Error('Invalid pane id.');
        const tabs = (0, validation_1.array)(p.tabs, 'tabs', 12).map(v => { const t = (0, validation_1.record)(v); const layer = (0, validation_1.string)(t.layer, 'layer', 40); if (!exports.LAYERS.some(l => l.id === layer))
            throw new Error('Unknown layer.'); return { id: (0, validation_1.string)(t.id, 'tab id', 100), layer, title: (0, validation_1.string)(t.title, 'tab title', 150) }; });
        (0, validation_1.unique)(tabs.map(t => t.id), 'tab ID');
        (0, validation_1.unique)(tabs.map(t => t.layer), 'pane layer');
        const active = (0, validation_1.string)(p.active, 'active tab', 100);
        if (tabs.length ? !tabs.some(t => t.id === active) : active !== '')
            throw new Error('Missing active tab.');
        return { id: p.id, tabs, active };
    });
    if (!panes.length || panes[0].id !== 'a')
        throw new Error('Primary pane is required.');
    (0, validation_1.unique)(panes.map(p => p.id), 'pane identity');
    (0, validation_1.unique)(panes.flatMap(p => p.tabs.map(t => t.id)), 'tab identity');
    if (!panes.some(p => p.id === s.activePane))
        throw new Error('Invalid active pane.');
    if (!['horizontal', 'vertical'].includes(String(s.direction)) || !['fluent', 'neutral', 'dark'].includes(String(s.theme)))
        throw new Error('Invalid layout mode/theme.');
    if (s.collapsed !== null && (panes.length !== 2 || !panes.some(p => p.id === s.collapsed)))
        throw new Error('Invalid collapsed pane.');
    if (typeof s.explorerOpen !== 'boolean' || typeof s.contextOpen !== 'boolean')
        throw new Error('Invalid panel visibility.');
    return { panes, activePane: s.activePane, direction: s.direction, ratio: (0, validation_1.finite)(s.ratio, 'split ratio', 25, 75), collapsed: s.collapsed, explorerOpen: s.explorerOpen, contextOpen: s.contextOpen, theme: s.theme };
}
function validateModel(value) {
    const m = (0, validation_1.record)(value, 'model');
    const tables = (0, validation_1.array)(m.tables, 'model tables', 30).map(value => {
        const t = (0, validation_1.record)(value);
        const columns = (0, validation_1.array)(t.columns, 'columns', 60).map(value => {
            const c = (0, validation_1.record)(value);
            if (!modeling_1.DATA_TYPES.includes(String(c.type)) || typeof c.primary !== 'boolean' || typeof c.nullable !== 'boolean')
                throw new Error('Invalid column metadata.');
            return { id: (0, validation_1.string)(c.id, 'column id', 100), name: (0, validation_1.identifier)(c.name, 'Column name'), type: String(c.type), primary: c.primary, nullable: c.nullable };
        });
        (0, validation_1.unique)(columns.map(c => c.id), 'column ID');
        if (!['fact', 'dimension', 'source'].includes(String(t.role)))
            throw new Error('Invalid table role.');
        return { id: (0, validation_1.string)(t.id, 'table ID', 100), name: (0, validation_1.identifier)(t.name, 'Table name'), role: t.role, grain: (0, validation_1.string)(t.grain, 'grain', 500), columns, x: (0, validation_1.finite)(t.x, 'x', 0, 4000), y: (0, validation_1.finite)(t.y, 'y', 0, 4000) };
    });
    (0, validation_1.unique)(tables.map(t => t.id), 'table ID');
    function endpoints(value) { const r = (0, validation_1.record)(value); const fromTable = (0, validation_1.string)(r.fromTable, 'source table', 100), toTable = (0, validation_1.string)(r.toTable, 'target table', 100), fromColumn = (0, validation_1.string)(r.fromColumn, 'source column', 100), toColumn = (0, validation_1.string)(r.toColumn, 'target column', 100); if (!tables.find(t => t.id === fromTable)?.columns.some(c => c.id === fromColumn) || !tables.find(t => t.id === toTable)?.columns.some(c => c.id === toColumn))
        throw new Error('Dangling relationship or mapping.'); return { id: (0, validation_1.string)(r.id, 'edge ID', 100), fromTable, fromColumn, toTable, toColumn }; }
    const relationships = (0, validation_1.array)(m.relationships, 'relationships', 120).map(value => { const r = (0, validation_1.record)(value); if (!['many-to-one', 'one-to-one', 'many-to-many'].includes(String(r.cardinality)))
        throw new Error('Invalid cardinality.'); return { ...endpoints(r), cardinality: r.cardinality }; });
    const mappings = (0, validation_1.array)(m.mappings, 'column mappings', 200).map(value => ({ ...endpoints(value), expression: (0, validation_1.string)((0, validation_1.record)(value).expression, 'mapping expression', 2000) }));
    (0, validation_1.unique)(relationships.map(r => r.id), 'relationship ID');
    (0, validation_1.unique)(mappings.map(m => m.id), 'mapping ID');
    return { tables, relationships, mappings };
}
function validateArtifacts(value) {
    const b = (0, validation_1.record)(value, 'artifact bundle');
    if (b.provenance !== 'imported-dbt-artifact')
        throw new Error('Invalid artifact provenance.');
    const nodes = (0, validation_1.array)(b.nodes, 'artifact nodes', 400).map(v => { const n = (0, validation_1.record)(v); return { id: (0, validation_1.string)(n.id, 'id', 500), name: (0, validation_1.string)(n.name, 'name', 250), kind: (0, validation_1.string)(n.kind, 'kind', 50), path: (0, validation_1.string)(n.path, 'path', 500), description: (0, validation_1.string)(n.description, 'description', 20_000), materialization: (0, validation_1.string)(n.materialization, 'materialization', 80), dependencies: (0, validation_1.array)(n.dependencies, 'dependencies', 400).map(d => (0, validation_1.string)(d, 'dependency', 500)), columns: (0, validation_1.array)(n.columns, 'columns', 250).map(v => { const c = (0, validation_1.record)(v); return { name: (0, validation_1.string)(c.name, 'column', 200), type: (0, validation_1.string)(c.type, 'type', 100), description: (0, validation_1.string)(c.description, 'description') }; }), source: (0, validation_1.string)(n.source, 'source', 100_000), compiled: (0, validation_1.string)(n.compiled, 'compiled', 100_000) }; });
    (0, validation_1.unique)(nodes.map(n => n.id), 'node ID');
    const results = (0, validation_1.array)(b.results, 'artifact results', 400).map(v => { const r = (0, validation_1.record)(v); const id = (0, validation_1.string)(r.id, 'result id', 500); if (!nodes.some(n => n.id === id))
        throw new Error('Orphan run result.'); return { id, status: (0, validation_1.string)(r.status, 'status', 100), seconds: r.seconds === null ? null : (0, validation_1.finite)(r.seconds, 'duration', 0, 1e9), failures: r.failures === null ? null : (0, validation_1.finite)(r.failures, 'failures', 0, 1e12), message: (0, validation_1.string)(r.message, 'message', 10_000) }; });
    (0, validation_1.unique)(results.map(r => r.id), 'result ID');
    const invocationId = (0, validation_1.string)(b.invocationId, 'invocation', 100), resultInvocationId = (0, validation_1.optionalString)(b.resultInvocationId, 100);
    if (results.length && (!invocationId || invocationId !== resultInvocationId))
        throw new Error('Mismatched saved run evidence.');
    if (![9, 10, 11, 12].includes(Number(b.schema)) || nodes.reduce((n, a) => n + a.dependencies.length, 0) > 3000)
        throw new Error('Unsupported or excessive manifest metadata.');
    return { schema: Number(b.schema), projectName: (0, validation_1.string)(b.projectName, 'project', 200), generatedAt: (0, validation_1.string)(b.generatedAt, 'date', 100), invocationId, nodes, results, resultInvocationId, resultGeneratedAt: (0, validation_1.optionalString)(b.resultGeneratedAt, 100), warnings: (0, validation_1.array)(b.warnings, 'warnings', 3000).map(w => (0, validation_1.string)(w, 'warning', 1500)), provenance: 'imported-dbt-artifact' };
}
function validateProject(value) {
    const p = (0, validation_1.record)(value, 'analytics document');
    if (p.schemaVersion !== 1)
        throw new Error('Unsupported analytics document version.');
    const files = (0, validation_1.array)(p.files, 'project files', 60).map(v => { const f = (0, validation_1.record)(v); return { path: (0, validation_1.sourcePath)(f.path), source: (0, validation_1.string)(f.source, 'source', 100_000) }; });
    (0, validation_1.unique)(files.map(f => f.path.toLowerCase()), 'file path');
    if (!files.length || files.reduce((n, f) => n + f.source.length, 0) > 1_500_000)
        throw new Error('Project is empty or too large.');
    const selectedFile = (0, validation_1.string)(p.selectedFile, 'selected file', 220);
    if (!files.some(f => f.path === selectedFile))
        throw new Error('Selected file is missing.');
    const b = (0, validation_1.record)(p.board, 'board'), snapshotValue = (0, validation_1.record)(b.snapshot, 'snapshot');
    const query = (0, validation_1.string)(b.query, 'query', 100_000);
    const snapshot = (0, charts_1.importRows)(JSON.stringify(snapshotValue.rows), (0, validation_1.string)(snapshotValue.query, 'snapshot query', 100_000), (0, validation_1.optionalString)(snapshotValue.importedAt, 100));
    if (!['sample', 'imported'].includes(String(snapshotValue.origin)))
        throw new Error('Invalid snapshot origin.');
    snapshot.label = (0, validation_1.string)(snapshotValue.label, 'snapshot label', 200);
    snapshot.origin = snapshotValue.origin;
    if (!['bar', 'line', 'table', 'kpi'].includes(String(b.chartType)) || !['sum', 'mean', 'count'].includes(String(b.aggregation)))
        throw new Error('Invalid chart mode.');
    const board = { title: (0, validation_1.string)(b.title, 'board title', 200), query, chartType: b.chartType, x: (0, validation_1.string)(b.x, 'dimension', 100), y: (0, validation_1.string)(b.y, 'measure', 100), aggregation: b.aggregation, snapshot };
    const scd = (0, validation_1.record)(p.scd);
    if (![1, 2, 3].includes(Number(scd.type)))
        throw new Error('Invalid SCD type.');
    const step = (0, validation_1.finite)(scd.step, 'replay step', 0, 5);
    if (!Number.isInteger(step))
        throw new Error('Invalid replay step.');
    if (!Number.isSafeInteger(p.revision))
        throw new Error('Invalid revision.');
    return { schemaVersion: 1, revision: (0, validation_1.finite)(p.revision, 'revision', 0, Number.MAX_SAFE_INTEGER), title: (0, validation_1.string)(p.title, 'project title', 150), files, selectedFile, ...(p.artifacts ? { artifacts: validateArtifacts(p.artifacts) } : {}), model: validateModel(p.model), board, session: validateSession(p.session), scd: { type: Number(scd.type), step, answer: (0, validation_1.string)(scd.answer, 'answer', 100) } };
}
function importProject(text) { return validateProject((0, validation_1.safeJson)(text)); }
function readProject(value) {
    if (value === undefined)
        return { project: newProject(), error: '' };
    try {
        return { project: validateProject(value), error: '' };
    }
    catch (e) {
        return { project: newProject(), error: `Stored analytics document could not be opened: ${e instanceof Error ? e.message : String(e)}. The original value is retained; export the owner notebook before replacing it.` };
    }
}
function updateFile(project, path, source) {
    (0, validation_1.string)(source, 'file source', 100_000);
    if (!project.files.some(f => f.path === path))
        throw new Error('File not found.');
    return { ...project, revision: project.revision + 1, files: project.files.map(f => f.path === path ? { ...f, source } : f) };
}
/** Close only extra views. Source, files, model, board and run evidence are untouched. */
function singlePaneSession(session) {
    const active = session.panes.find(p => p.id === session.activePane);
    const selectedLayer = active?.tabs.find(t => t.id === active.active)?.layer;
    const tabs = [];
    for (const pane of session.panes)
        for (const tab of pane.tabs)
            if (!tabs.some(t => t.layer === tab.layer))
                tabs.push(tab);
    return { ...session, panes: [{ id: 'a', tabs, active: tabs.find(t => t.layer === selectedLayer)?.id ?? tabs[0]?.id ?? '' }], activePane: 'a', collapsed: null };
}
/** RootNotebook restore hook. The generic Mosaic importer intentionally strips
 * non-cell keys; retain this bounded namespaced attachment at the root adapter.
 * Invalid schema versions remain visible to readProject's recovery UI, never
 * silently replaced with a new empty design. Unsafe JSON fails the whole restore.
 */
function preserveAnalyticsAttachment(blockState) {
    if (!blockState || typeof blockState !== 'object' || Array.isArray(blockState) || !Object.hasOwn(blockState, exports.LAB_KEY))
        return {};
    const value = blockState[exports.LAB_KEY];
    return { [exports.LAB_KEY]: (0, validation_1.safeJson)(JSON.stringify(value), 1_200_000) };
}

},
"analytics/types":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"analytics/validation":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SOURCE = exports.MAX_JSON_BYTES = void 0;
exports.record = record;
exports.string = string;
exports.optionalString = optionalString;
exports.array = array;
exports.finite = finite;
exports.safeJson = safeJson;
exports.unique = unique;
exports.identifier = identifier;
exports.sourcePath = sourcePath;
exports.quoteIdentifier = quoteIdentifier;
exports.freshId = freshId;
exports.MAX_JSON_BYTES = 8_000_000;
exports.MAX_SOURCE = 100_000;
function record(value, label = 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`Expected ${label}.`);
    return value;
}
function string(value, label, max = 4000) {
    if (typeof value !== 'string' || value.length > max || value.includes('\0'))
        throw new Error(`Invalid ${label}.`);
    return value;
}
function optionalString(value, max = 4000) { return value == null ? '' : string(value, 'text', max); }
function array(value, label, max) {
    if (!Array.isArray(value) || value.length > max)
        throw new Error(`Invalid ${label}; limit ${max}.`);
    return value;
}
function finite(value, label, min = -1e15, max = 1e15) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
        throw new Error(`Invalid ${label}.`);
    return value;
}
/** No reviver or dynamic code. Bound traversal after JSON.parse; reject prototype keys everywhere. */
function safeJson(text, maxBytes = exports.MAX_JSON_BYTES) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes)
        throw new Error(`JSON exceeds ${Math.round(maxBytes / 1_000_000)} MB.`);
    const value = JSON.parse(text);
    const queue = [[value, 0]];
    let visited = 0;
    while (queue.length) {
        const [v, depth] = queue.pop();
        if (++visited > 150_000 || depth > 40)
            throw new Error('JSON structure is too large or deeply nested.');
        if (v && typeof v === 'object')
            for (const [key, child] of Object.entries(v)) {
                if (['__proto__', 'prototype', 'constructor'].includes(key))
                    throw new Error('Unsafe object key in import.');
                queue.push([child, depth + 1]);
            }
    }
    return value;
}
function unique(values, label) { if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}.`); }
function identifier(value, label = 'identifier') {
    const s = string(value, label, 100);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s))
        throw new Error(`${label} must be a simple SQL identifier.`);
    return s;
}
function sourcePath(value) {
    const path = string(value, 'project path', 220);
    if (!/^(models|tests|macros|snapshots|seeds|charts)\/[A-Za-z0-9_./-]+\.(sql|ya?ml|csv)$/.test(path) && !['dbt_project.yml', 'dbt_charts.yml'].includes(path))
        throw new Error('Use a relative dbt project path. Credentials and profiles are not imported into the browser.');
    if (path.split('/').some(p => p === '.' || p === '..' || !p || p.startsWith('.') || p.endsWith('.') || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p)))
        throw new Error('Unsafe project path.');
    return path;
}
function quoteIdentifier(s) { return `"${identifier(s).replaceAll('"', '""')}"`; }
function freshId(prefix) { return `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }

}},cache={};function load(id){if(cache[id])return cache[id].exports;if(!modules[id])throw Error('Missing preview module '+id);const m=cache[id]={exports:{}};function require(name){if(name==='react')return window.React;if(name.endsWith('.css'))return {};const parts=(id.split('/').slice(0,-1).join('/')+'/'+name).split('/'),clean=[];for(const p of parts){if(p==='..')clean.pop();else if(p&&p!=='.')clean.push(p);}return load(clean.join('/'));}modules[id](require,m,m.exports);return m.exports;}const UiPreview=load('UiPreview').UiPreview;ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(UiPreview,{analytics:true}));})();