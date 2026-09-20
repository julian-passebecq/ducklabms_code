"""One catalog per workspace, owned by its kernel worker.

DuckDB is the local analytical engine. DuckLake is the canonical lakehouse
profile when explicitly selected: the official DuckDB extension owns the
format, SQLite owns new-workspace metadata and Parquet owns table data.
SQLite compatibility mode remains an explicit dependency fallback.

This is a LOCAL learning service, not an untrusted multi-tenant SQL service.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import sqlite3
from typing import Any
import uuid
from .atomic import replace_file
from .lakehouse import attach_ducklake

LAYERS = ('source', 'bronze', 'silver', 'gold', 'warehouse', 'features', 'metrics')
IDENT = re.compile(r'^[A-Za-z][A-Za-z0-9_]{0,62}$')
ASSET = re.compile(r'^(source|bronze|silver|gold|warehouse|features|metrics)\.([A-Za-z][A-Za-z0-9_]{0,62})$')
MAX_ROWS = 200


def asset_name(name: str) -> str:
    if not ASSET.fullmatch(name):
        raise ValueError('Use a registered layer and simple table name, for example gold.revenue.')
    return name


def json_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {str(k): json_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_value(v) for v in value]
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value)


def sql_tokens(sql: str) -> str:
    """Remove literals/comments before checking command tokens, not a SQL parser."""
    return re.sub(r"'(?:''|[^'])*'|--[^\n]*|/\*[\s\S]*?\*/", ' ', sql)


def statements(sql: str) -> list[str]:
    # sqlite's lexer recognizes quoted semicolons. It does not execute SQL.
    out, current = [], ''
    for char in sql:
        current += char
        if char == ';' and sqlite3.complete_statement(current):
            if sql_tokens(current).strip(' ;\n\t'):
                out.append(current.strip())
            current = ''
    if sql_tokens(current).strip(' ;\n\t'):
        out.append(current.strip())
    if not out or len(out) > 20:
        raise ValueError('Submit between 1 and 20 SQL statements.')
    return out


def validate_sql(sql: str, *, read_only: bool = False) -> list[str]:
    if len(sql) > 40_000:
        raise ValueError('SQL exceeds the 40,000-character limit.')
    result = statements(sql)
    if read_only and len(result) != 1:
        raise ValueError('A materialized output must be one SELECT or WITH query.')
    for statement in result:
        clean = sql_tokens(statement).strip()
        first = re.match(r'[A-Za-z]+', clean)
        first = first.group().upper() if first else ''
        allowed = {'SELECT', 'WITH'} if read_only else {'SELECT', 'WITH', 'CREATE', 'INSERT', 'UPDATE', 'DELETE', 'DROP'}
        if first not in allowed:
            raise ValueError(f'{first or "This statement"} is outside the local SQL teaching contract.')
        # External I/O is intentionally not exposed through arbitrary SQL.
        if re.search(r'\b(ATTACH|DETACH|INSTALL|LOAD|COPY|EXPORT|IMPORT|SECRET|PRAGMA|CALL|VACUUM|CHECKPOINT|TRUNCATE)\b', clean, re.I):
            raise ValueError('External I/O, extension loading and configuration commands are not allowed in cells.')
        if re.search(r'\b(read_[A-Za-z0-9_]*|sqlite_scan|postgres_scan|httpfs|load_extension|writefile|readfile)\s*\(', clean, re.I):
            raise ValueError('Use the workspace catalog, not filesystem or network table functions.')
        if re.search(r'\b(_datapass|sqlite_master|sqlite_schema)\b', clean, re.I):
            raise ValueError('Internal catalog metadata is not a learning asset.')
        if first == 'CREATE' and not re.match(r'CREATE\s+(OR\s+REPLACE\s+)?(TABLE|VIEW)\b', clean, re.I):
            raise ValueError('Only CREATE TABLE or CREATE VIEW is supported in SQL cells.')
    return result


def references(sql: str) -> list[str]:
    return sorted(set(m.group(1) for m in re.finditer(r'\b(?:FROM|JOIN)\s+((?:source|bronze|silver|gold|warehouse|features|metrics)\.[A-Za-z][A-Za-z0-9_]*)', sql_tokens(sql), re.I)))


class Catalog:
    def __init__(self, directory: Path, mode: str = 'auto'):
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)
        has_duckdb = importlib.util.find_spec('duckdb') is not None
        if mode not in {'auto', 'duckdb', 'ducklake', 'sqlite'}:
            raise ValueError('Unknown storage mode.')
        if mode in {'duckdb', 'ducklake'} and not has_duckdb:
            raise RuntimeError('DuckDB is not installed. Install requirements-engines.txt; no silent storage substitution was made.')
        self.kind = ('duckdb' if has_duckdb else 'sqlite') if mode == 'auto' else mode
        self.metadata_path = directory / 'asset-lineage.json'
        try:
            self.versions = json.loads(self.metadata_path.read_text())
        except FileNotFoundError:
            self.versions = {}
        self.guard = False
        self.lakehouse = None
        if self.kind == 'sqlite':
            self.db = sqlite3.connect(directory / 'workspace.sqlite3')
            self.db.enable_load_extension(False)
            for layer in LAYERS:
                self.db.execute(f'ATTACH DATABASE ? AS {layer}', (str(directory / f'{layer}.sqlite3'),))
            self.db.set_authorizer(self._authorize)
        else:
            import duckdb
            self.db = duckdb.connect(str(directory / 'workspace.duckdb'))
            self.db.execute("SET threads=2")
            self.db.execute("SET memory_limit='512MB'")
            if self.kind == 'ducklake':
                self.lakehouse = attach_ducklake(self.db, directory)
            for layer in LAYERS:
                self.db.execute(f'CREATE SCHEMA IF NOT EXISTS {layer}')
            # After controlled initialization, notebook SQL cannot read arbitrary files.
            self.db.execute('SET enable_external_access=false')
        self._seed()

    def _authorize(self, action, arg1, arg2, db_name, source):
        if not self.guard:
            return sqlite3.SQLITE_OK
        blocked = {sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH, sqlite3.SQLITE_PRAGMA}
        if action in blocked:
            return sqlite3.SQLITE_DENY
        if action == sqlite3.SQLITE_FUNCTION and str(arg2).lower() in {'load_extension', 'readfile', 'writefile'}:
            return sqlite3.SQLITE_DENY
        if action in {sqlite3.SQLITE_READ, sqlite3.SQLITE_UPDATE, sqlite3.SQLITE_INSERT, sqlite3.SQLITE_DELETE} and db_name not in LAYERS:
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK

    def _save_versions(self):
        tmp = self.metadata_path.with_suffix('.tmp')
        tmp.write_text(json.dumps(self.versions, indent=2))
        replace_file(tmp, self.metadata_path)

    def _touch(self, name: str, dependencies: list[str], producer: str):
        self.versions[name] = {
            'version': uuid.uuid4().hex,
            'producer': producer,
            'inputs': {key: self.versions.get(key, {}).get('version') for key in dependencies if key != name},
        }
        self._save_versions()

    def _seed(self):
        if self.exists('source.orders'):
            return
        self.db.execute('CREATE TABLE source.orders (order_id VARCHAR, customer_id VARCHAR, segment_id INTEGER, net_amount DOUBLE, loaded_at VARCHAR)')
        rows = [
            ('O-001','C001',1,100.0),('O-002','C001',1,50.0),('O-003','C002',2,200.0),
            ('O-004','C003',2,-10.0),('O-005','CORPORATE_ACCOUNT_01',3,1000.0),
            ('O-006','CORPORATE_ACCOUNT_01',3,1500.0),('O-007','CORPORATE_ACCOUNT_01',3,2000.0),
            ('O-008','C002',2,25.0),('O-009','C004',1,0.0),('O-010','C005',2,75.0),
            ('O-011','C005',2,25.0),('O-012','C006',4,10.0),
        ]
        self.db.executemany('INSERT INTO source.orders VALUES (?,?,?,?,?)', [(*r, f'2026-09-17T01:{i:02d}:00') for i, r in enumerate(rows)])
        self.db.execute('CREATE TABLE source.dim_customer_segment (segment_id INTEGER, segment_name VARCHAR)')
        self.db.executemany('INSERT INTO source.dim_customer_segment VALUES (?,?)', [(1,'Consumer'),(2,'Small Business'),(3,'Corporate'),(4,'Public Sector')])
        self.db.execute('CREATE TABLE source.turbine_readings (sample_id INTEGER, turbine_id VARCHAR, wind_speed DOUBLE, actual_power DOUBLE)')
        self.db.executemany('INSERT INTO source.turbine_readings VALUES (?,?,?,?)', [(i, 'T-01', float(i+3), float(2*(i+3)+4)) for i in range(1,19)])
        if self.kind == 'sqlite':
            self.db.commit()
        for asset in ('source.orders', 'source.dim_customer_segment', 'source.turbine_readings'):
            self._touch(asset, [], 'deterministic seed v1')

    def exists(self, name: str) -> bool:
        layer, table = asset_name(name).split('.')
        if self.kind == 'sqlite':
            return bool(self.db.execute(f"SELECT name FROM {layer}.sqlite_master WHERE type IN ('table','view') AND name=?", (table,)).fetchone())
        return bool(self.db.execute('SELECT table_name FROM information_schema.tables WHERE table_catalog=current_database() AND table_schema=? AND table_name=?', [layer, table]).fetchone())

    def fresh(self, name: str, seen: set[str] | None = None) -> bool:
        seen = set() if seen is None else set(seen)
        if name in seen or not self.exists(name) or name not in self.versions:
            return False
        seen.add(name)
        for dependency, version in self.versions[name]['inputs'].items():
            if self.versions.get(dependency, {}).get('version') != version or not self.fresh(dependency, seen):
                return False
        return True

    def listing(self):
        items = []
        for layer in LAYERS:
            if self.kind == 'sqlite':
                names = self.db.execute(f"SELECT name FROM {layer}.sqlite_master WHERE type IN ('table','view') ORDER BY name").fetchall()
            else:
                names = self.db.execute('SELECT table_name FROM information_schema.tables WHERE table_catalog=current_database() AND table_schema=? ORDER BY table_name', [layer]).fetchall()
            for (name,) in names:
                if not IDENT.fullmatch(name):
                    continue
                full = f'{layer}.{name}'
                count = self.db.execute(f'SELECT COUNT(*) FROM {full}').fetchone()[0]
                items.append({'name': full, 'layer': layer, 'row_count': count, 'fresh': self.fresh(full), **self.versions.get(full, {})})
        return items

    def runtime_contract(self) -> dict:
        if self.kind == 'ducklake' and self.lakehouse is not None:
            return self.lakehouse.contract()
        if self.kind == 'duckdb':
            version = str(self.db.execute('SELECT version()').fetchone()[0])
            extension = self.db.execute(
                "SELECT installed, extension_version FROM duckdb_extensions() WHERE extension_name='ducklake'"
            ).fetchone()
            return {
                'schema_version': 1,
                'active': False,
                'table_format': 'ducklake',
                'compute_engine': 'duckdb',
                'metadata_backend': None,
                'metadata_file': None,
                'data_format': 'parquet',
                'data_directory': None,
                'data_inlining_row_limit': 0,
                'truth': 'real local DuckDB compatibility mode; DuckLake is not attached',
                'duckdb_version': version,
                'ducklake_extension_installed': bool(extension and extension[0]),
                'ducklake_extension_version': str(extension[1]) if extension and extension[1] is not None else None,
                'legacy_metadata': False,
            }
        return {
            'schema_version': 1,
            'active': False,
            'table_format': 'ducklake',
            'compute_engine': 'sqlite',
            'metadata_backend': None,
            'metadata_file': None,
            'data_format': None,
            'data_directory': None,
            'data_inlining_row_limit': 0,
            'truth': 'SQLite compatibility fallback; DuckLake and DuckDB are unavailable',
            'duckdb_version': None,
            'ducklake_extension_installed': False,
            'ducklake_extension_version': None,
            'legacy_metadata': False,
        }

    def _result(self, cursor) -> dict:
        if cursor.description is None:
            return {'columns': [], 'rows': [], 'total_rows': 0, 'truncated': False}
        columns = [x[0] for x in cursor.description]
        if len(columns) != len(set(columns)):
            raise ValueError('Duplicate result columns are ambiguous. Give joined columns unique aliases.')
        values = cursor.fetchmany(MAX_ROWS + 1)
        truncated = len(values) > MAX_ROWS
        return {'columns': columns, 'rows': [dict(zip(columns, map(json_value, row))) for row in values[:MAX_ROWS]], 'total_rows': None if truncated else len(values), 'truncated': truncated}

    def query(self, sql: str) -> dict:
        parts = validate_sql(sql, read_only=True)
        self.guard = True
        try:
            return self._result(self.db.execute(parts[0]))
        finally:
            self.guard = False

    def execute(self, sql: str, producer: str) -> dict:
        parts = validate_sql(sql)
        touched = []
        self.db.execute('BEGIN TRANSACTION')
        self.guard = True
        try:
            result = {}
            for statement in parts:
                result = self._result(self.db.execute(statement))
                for match in re.finditer(r'\b(?:TABLE(?:\s+IF\s+(?:NOT\s+)?EXISTS)?|VIEW(?:\s+IF\s+(?:NOT\s+)?EXISTS)?|INTO|UPDATE|DELETE\s+FROM)\s+((?:source|bronze|silver|gold|warehouse|features|metrics)\.[A-Za-z][A-Za-z0-9_]*)', sql_tokens(statement), re.I):
                    touched.append(match.group(1))
            self.db.execute('COMMIT')
        except BaseException:
            self.db.execute('ROLLBACK')
            raise
        finally:
            self.guard = False
        for name in dict.fromkeys(touched):
            self._touch(name, references(sql), producer)
        return result

    def materialize(self, name: str, sql: str, producer: str) -> dict:
        name = asset_name(name)
        if name.startswith('source.'):
            raise ValueError('Source fixtures are immutable through Publish. Use a different layer.')
        statement = validate_sql(sql, read_only=True)[0].rstrip(';')
        if name in references(sql):
            raise ValueError('Publishing cannot replace the table it reads. Use a different output asset.')
        # Both engines preserve the old table when a replacement query fails.
        self.db.execute('BEGIN TRANSACTION')
        try:
            self.db.execute(f'DROP TABLE IF EXISTS {name}')
            self.guard = True
            self.db.execute(f'CREATE TABLE {name} AS {statement}')
            self.guard = False
            self.db.execute('COMMIT')
        except BaseException:
            self.guard = False
            self.db.execute('ROLLBACK')
            raise
        self._touch(name, references(sql), producer)
        return self.query(f'SELECT * FROM {name}')

    def publish_rows(self, name: str, rows: list[dict], producer: str, dependencies: list[str]) -> dict:
        name = asset_name(name)
        if name.startswith('source.'):
            raise ValueError('Publish cannot replace a source fixture.')
        if name in dependencies:
            raise ValueError('Publishing cannot replace the table it reads. Use a different output asset.')
        if not rows or len(rows) > 10_000:
            raise ValueError('Publishing Python results requires 1..10,000 rows.')
        cols = list(rows[0])
        if not cols or not all(IDENT.fullmatch(c) for c in cols):
            raise ValueError('Published columns must have simple unique identifiers.')
        if any(set(row) != set(cols) for row in rows):
            raise ValueError('Every published row must have the same columns.')
        types = []
        for col in cols:
            values = [r[col] for r in rows if r[col] is not None]
            if values and all(isinstance(v, (int, bool)) for v in values):
                types.append('BIGINT')
            elif values and all(isinstance(v, (int, float)) for v in values):
                types.append('DOUBLE')
            else:
                types.append('VARCHAR')
        self.db.execute('BEGIN TRANSACTION')
        try:
            self.db.execute(f'DROP TABLE IF EXISTS {name}')
            schema = ', '.join(f'"{col}" {typ}' for col, typ in zip(cols, types))
            self.db.execute(f'CREATE TABLE {name} ({schema})')
            normalized = [tuple(json_value(row[col]) for col in cols) for row in rows]
            self.db.executemany(f'INSERT INTO {name} VALUES ({",".join("?" for _ in cols)})', normalized)
            self.db.execute('COMMIT')
        except BaseException:
            self.db.execute('ROLLBACK')
            raise
        self._touch(name, dependencies, producer)
        return self.query(f'SELECT * FROM {name}')

    def fingerprint(self, name: str) -> str:
        result = self.query(f'SELECT * FROM {asset_name(name)}')
        return hashlib.sha256(json.dumps(result['rows'], sort_keys=True, separators=(',', ':')).encode()).hexdigest()

    def close(self):
        self.db.close()
