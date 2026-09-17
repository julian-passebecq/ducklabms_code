"""Versioned workspace documents; browser storage is not the source of truth."""
from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import threading
import uuid
from .content import get_case
from .atomic import replace_file

ID = re.compile(r'^[a-f0-9]{32}$')


class RevisionConflict(ValueError):
    pass


class Documents:
    def __init__(self, root: Path):
        self.root = root
        root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()

    def folder(self, id: str) -> Path:
        if not ID.fullmatch(id):
            raise ValueError('Invalid workspace ID.')
        return self.root / id

    def get(self, id: str):
        with self.lock:
            return json.loads((self.folder(id) / 'workspace.json').read_text())

    def all(self):
        rows = []
        with self.lock:
            for file in self.root.glob('*/workspace.json'):
                doc = json.loads(file.read_text())
                rows.append({k: doc[k] for k in ('id', 'title', 'case_id', 'revision', 'updated_at')})
        return sorted(rows, key=lambda d: d['updated_at'], reverse=True)

    def _write(self, doc):
        path = self.folder(doc['id']) / 'workspace.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix('.tmp')
        temp.write_text(json.dumps(doc, indent=2))
        replace_file(temp, path)
        return doc

    def create(self, case_id: str):
        case = get_case(case_id)
        doc = {'schema_version': 1, 'id': uuid.uuid4().hex, 'case_id': case_id,
               'title': case['title'], 'revision': 0, 'updated_at': datetime.now(timezone.utc).isoformat(),
               'notebook': None, 'evidence': {}, 'runs': []}
        with self.lock:
            return self._write(doc)

    def save_notebook(self, id: str, revision: int, notebook: dict):
        if len(json.dumps(notebook)) > 2_000_000:
            raise ValueError('Notebook exceeds the 2 MB document limit.')
        with self.lock:
            doc = self.get(id)
            if doc['revision'] != revision:
                raise RevisionConflict('The workspace changed. Reload before saving; your edits were not overwritten.')
            doc['notebook'] = notebook
            doc['revision'] += 1
            doc['updated_at'] = datetime.now(timezone.utc).isoformat()
            return self._write(doc)

    def record(self, id: str, event: dict, step_id: str | None):
        with self.lock:
            doc = self.get(id)
            # Bounded persisted history. Output previews are already bounded by the kernel.
            doc['runs'] = (doc['runs'] + [event])[-50:]
            if step_id:
                doc['evidence'][step_id] = event
            doc['revision'] += 1
            doc['updated_at'] = datetime.now(timezone.utc).isoformat()
            self._write(doc)
            return doc['revision']
