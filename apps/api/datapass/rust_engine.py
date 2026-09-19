"""Optional Rust/DataFusion engine adapter.

This is deliberately not the root execution path yet. It is an opt-in spike that
uses a versioned JSON protocol over stdin/stdout so the same Rust binary can later
be called from Tauri without preserving HTTP as a hot-path requirement.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
from typing import Any

PROTOCOL_VERSION = 1


def _binary_path() -> Path | None:
    configured = os.environ.get('DATAPASS_RUST_ENGINE_BIN')
    if configured:
        return Path(configured).expanduser().resolve()
    return None


def _invoke(request: dict[str, Any], *, timeout: float) -> dict[str, Any]:
    binary = _binary_path()
    if binary is None:
        raise RuntimeError('Rust/DataFusion engine is not enabled. Set DATAPASS_RUST_ENGINE_BIN to the built datapass-engine binary.')
    if not binary.is_file():
        raise RuntimeError(f'Configured Rust/DataFusion engine does not exist: {binary}')
    try:
        completed = subprocess.run(
            [str(binary)],
            input=json.dumps(request),
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(f'Rust/DataFusion engine failed to start: {error}') from error
    stdout = completed.stdout.strip()
    if not stdout:
        detail = completed.stderr.strip() or f'exit code {completed.returncode}'
        raise RuntimeError(f'Rust/DataFusion engine returned no protocol response ({detail}).')
    try:
        envelope = json.loads(stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError('Rust/DataFusion engine returned invalid JSON.') from error
    if envelope.get('protocol_version') != PROTOCOL_VERSION:
        raise RuntimeError('Rust/DataFusion protocol version mismatch.')
    if not envelope.get('ok'):
        raise ValueError(envelope.get('error') or 'Rust/DataFusion request failed.')
    payload = envelope.get('payload')
    if not isinstance(payload, dict):
        raise RuntimeError('Rust/DataFusion engine returned an invalid payload.')
    return payload


def status() -> dict[str, Any]:
    binary = _binary_path()
    if binary is None:
        return {
            'available': False,
            'activation': 'experimental_opt_in',
            'default_runtime_changed': False,
            'reason': 'DATAPASS_RUST_ENGINE_BIN is not configured.',
        }
    try:
        return {'available': True, **_invoke({'kind': 'probe'}, timeout=5.0)}
    except (RuntimeError, ValueError) as error:
        return {
            'available': False,
            'activation': 'experimental_opt_in',
            'default_runtime_changed': False,
            'reason': str(error),
        }


def workspace_query(workspace_data: Path, request: dict[str, Any]) -> dict[str, Any]:
    root = workspace_data.resolve()
    sources = []
    for source in request.get('sources', []):
        relative = Path(source['path'])
        if relative.is_absolute():
            raise ValueError('Rust engine Parquet source paths must be workspace-relative.')
        candidate = (root / relative).resolve()
        try:
            candidate.relative_to(root)
        except ValueError as error:
            raise ValueError('Rust engine Parquet source escapes the workspace data directory.') from error
        if not candidate.exists():
            raise ValueError(f'Rust engine Parquet source does not exist: {source["path"]}')
        sources.append({'name': source['name'], 'path': str(candidate)})
    payload = {
        'kind': 'query',
        'sql': request['sql'],
        'sources': sources,
        'max_rows': request.get('max_rows', 200),
        'target_partitions': request.get('target_partitions', 4),
    }
    return _invoke(payload, timeout=30.0)
