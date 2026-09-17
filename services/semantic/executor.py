"""Bounded semantic execution for SparkLab truth packs.

The bounded semantic engine is a correctness oracle, not a scale benchmark.
`auto` prefers DuckDB when the optional dependency is available and otherwise
uses Python's built-in SQLite.  Every response carries provenance so the UI can
say exactly what executed and over which scope.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import sqlite3
import time
from typing import Any, Literal

ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT / "fixtures"
SemanticEngineKey = Literal["auto", "duckdb", "sqlite"]
MAX_VERIFICATION_ROWS = 10_000


class SemanticEngineUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class SemanticExecution:
    status: str
    engine_key: str
    engine: str
    dataset_scope: str
    case: str
    row_count: int
    columns: list[str]
    rows: list[dict[str, Any]]
    preview_truncated: bool
    verified: bool | None
    query_sha256: str
    preview_sha256: str
    result_sha256: str | None
    verification_complete: bool
    elapsed_ms: float
    message: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def capabilities() -> dict[str, Any]:
    duckdb_available = importlib.util.find_spec("duckdb") is not None
    return {
        "semantic_engines": {
            "sqlite": {"available": True, "label": "SQLite reference fixture", "role": "dependency-free correctness oracle"},
            "duckdb": {"available": duckdb_available, "label": "DuckDB reference fixture", "role": "preferred bounded analytical engine"},
        },
        "auto_selection": "duckdb" if duckdb_available else "sqlite",
        "full_case_dataset_connected": False,
    }


def _safe_read_query(sql: str) -> str:
    stripped = sql.strip().rstrip(";")
    if not stripped:
        raise ValueError("Compiled SQL is empty")
    if ";" in stripped:
        raise ValueError("Semantic fixture execution accepts exactly one read-only SQL statement")
    lowered = stripped.lstrip().lower()
    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise ValueError("Semantic fixture execution accepts read-only SELECT/CTE SQL")
    forbidden = (" insert ", " update ", " delete ", " drop ", " alter ", " attach ", " detach ", " pragma ")
    normalized = " " + " ".join(lowered.split()) + " "
    if any(token in normalized for token in forbidden):
        raise ValueError("Semantic fixture execution is read-only")
    return stripped


def _normalize_value(value: Any) -> Any:
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return str(value)
        return round(value, 8)
    return value


def _normalize_rows(columns: list[str], rows: list[tuple[Any, ...]]) -> list[dict[str, Any]]:
    out = [{column: _normalize_value(value) for column, value in zip(columns, row)} for row in rows]
    return sorted(out, key=lambda row: tuple(repr(row.get(c)) for c in columns))


def _hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _preview_hash(columns: list[str], rows: list[dict[str, Any]]) -> str:
    payload = json.dumps({"columns": columns, "rows": rows}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return _hash_text(payload)


def _result_hash(columns: list[str], rows: list[dict[str, Any]]) -> str:
    """Order-insensitive fingerprint for a bounded semantic result.

    Column order and SQL output row order should not change semantic truth-pack
    verification, so both are canonicalized before hashing.
    """
    canonical_columns = sorted(str(c) for c in columns)
    canonical_rows = sorted(
        [{c: row.get(c) for c in canonical_columns} for row in rows],
        key=lambda row: tuple(repr(row.get(c)) for c in canonical_columns),
    )
    payload = json.dumps({"columns": canonical_columns, "rows": canonical_rows}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return _hash_text(payload)


def _fixture_sql(case: str, engine_key: str) -> str:
    path = FIXTURES / f"{case}.sql"
    if not path.exists():
        raise KeyError(f"No bounded semantic fixture for case: {case}")
    sql = path.read_text(encoding="utf-8")
    if engine_key == "duckdb":
        sql = sql.replace("ATTACH DATABASE ':memory:' AS silver;", "CREATE SCHEMA silver;")
    return sql


def _execute_sqlite(query: str, case: str, limit: int) -> tuple[int, list[str], list[dict[str, Any]], str | None, bool]:
    connection = sqlite3.connect(":memory:")
    try:
        connection.executescript(_fixture_sql(case, "sqlite"))
        connection.execute("PRAGMA query_only = ON")
        count_row = connection.execute(f"SELECT COUNT(*) FROM ({query}) AS __sparklab_count").fetchone()
        row_count = int(count_row[0] if count_row else 0)
        verification_complete = row_count <= MAX_VERIFICATION_ROWS
        fetch_limit = row_count if verification_complete else limit
        cursor = connection.execute(f"SELECT * FROM ({query}) AS __sparklab_result LIMIT ?", (max(fetch_limit, 1),))
        columns = [str(col[0]) for col in cursor.description or []]
        all_rows = _normalize_rows(columns, cursor.fetchall())
        preview = all_rows[:limit]
        full_hash = _result_hash(columns, all_rows) if verification_complete else None
        return row_count, columns, preview, full_hash, verification_complete
    finally:
        connection.close()


def _execute_duckdb(query: str, case: str, limit: int) -> tuple[int, list[str], list[dict[str, Any]], str | None, bool]:
    if importlib.util.find_spec("duckdb") is None:
        raise SemanticEngineUnavailable("DuckDB semantic engine requested but the duckdb Python package is not installed")
    import duckdb  # type: ignore

    connection = duckdb.connect(":memory:")
    try:
        connection.execute(_fixture_sql(case, "duckdb"))
        row_count = int(connection.execute(f"SELECT COUNT(*) FROM ({query}) AS __sparklab_count").fetchone()[0])
        verification_complete = row_count <= MAX_VERIFICATION_ROWS
        fetch_limit = row_count if verification_complete else limit
        cursor = connection.execute(f"SELECT * FROM ({query}) AS __sparklab_result LIMIT {int(max(fetch_limit, 1))}")
        columns = [str(col[0]) for col in cursor.description or []]
        all_rows = _normalize_rows(columns, cursor.fetchall())
        preview = all_rows[:limit]
        full_hash = _result_hash(columns, all_rows) if verification_complete else None
        return row_count, columns, preview, full_hash, verification_complete
    finally:
        connection.close()


def execute_reference_sql(sql: str, case: str, *, limit: int = 50, engine: SemanticEngineKey = "auto") -> SemanticExecution:
    """Execute relational SQL over the bounded truth fixture with provenance."""
    query = _safe_read_query(sql)
    if limit < 1 or limit > 500:
        raise ValueError("limit must be between 1 and 500")
    if engine not in {"auto", "duckdb", "sqlite"}:
        raise ValueError("semantic engine must be one of: auto, duckdb, sqlite")

    selected = capabilities()["auto_selection"] if engine == "auto" else engine
    started = time.perf_counter()
    if selected == "duckdb":
        row_count, columns, rows, result_sha256, verification_complete = _execute_duckdb(query, case, limit)
        label = "DuckDB reference fixture"
    else:
        row_count, columns, rows, result_sha256, verification_complete = _execute_sqlite(query, case, limit)
        label = "SQLite reference fixture"
    elapsed_ms = round((time.perf_counter() - started) * 1000, 3)
    truncated = row_count > len(rows)
    return SemanticExecution(
        status="executed",
        engine_key=selected,
        engine=label,
        dataset_scope=f"bounded {case} truth fixture",
        case=case,
        row_count=row_count,
        columns=columns,
        rows=rows,
        preview_truncated=truncated,
        verified=None,
        query_sha256=_hash_text(" ".join(query.split())),
        preview_sha256=_preview_hash(columns, rows),
        result_sha256=result_sha256,
        verification_complete=verification_complete,
        elapsed_ms=elapsed_ms,
        message="Real SQL execution over a deterministic bounded fixture; not the full DuckLake/MotherDuck dataset.",
    )


def expected_fixture(pack: dict[str, Any]) -> tuple[list[str], list[dict[str, Any]]] | None:
    fixture = pack.get("fixture_truth")
    if not isinstance(fixture, dict):
        return None
    columns = fixture.get("columns")
    rows = fixture.get("rows")
    if not isinstance(columns, list) or not isinstance(rows, list):
        return None
    normalized = sorted(
        [{str(k): _normalize_value(v) for k, v in row.items()} for row in rows],
        key=lambda row: tuple(repr(row.get(c)) for c in columns),
    )
    return [str(c) for c in columns], normalized


def verify_against_truth(execution: SemanticExecution, pack: dict[str, Any]) -> SemanticExecution:
    expected = expected_fixture(pack)
    if expected is None:
        return SemanticExecution(**{**execution.as_dict(), "verified": None})
    if not execution.verification_complete or not execution.result_sha256:
        return SemanticExecution(**{
            **execution.as_dict(),
            "verified": None,
            "message": f"Truth-pack verification withheld because the bounded result exceeds the {MAX_VERIFICATION_ROWS}-row verification ceiling.",
        })
    expected_columns, expected_rows = expected
    actual_columns = execution.columns
    expected_sha = _result_hash(expected_columns, expected_rows)
    verified = (
        set(actual_columns) == set(expected_columns)
        and len(actual_columns) == len(set(actual_columns))
        and execution.row_count == len(expected_rows)
        and execution.result_sha256 == expected_sha
    )
    message = (
        "Bounded fixture result matches the truth-pack schema and rows."
        if verified
        else "Bounded fixture result does not match the truth-pack schema/rows."
    )
    return SemanticExecution(**{**execution.as_dict(), "verified": verified, "message": message})
