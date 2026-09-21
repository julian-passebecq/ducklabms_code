"""Turn a Datapass dbt source export into a NEW local folder. Never runs dbt.

Review the generated files before running them: dbt macros/project hooks are code.
Python 3.10+ standard library only. Existing files and credentials are never read.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import tempfile

MAX_SOURCE_BYTES = 8_000_000
PATH_RE = re.compile(r'^(models|tests|macros|snapshots|seeds|charts)/[A-Za-z0-9_./-]+\.(sql|ya?ml|csv)$')
RESERVED = {'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1, 10)), *(f'LPT{i}' for i in range(1, 10))}

def unique_pairs(pairs):
    out = {}
    for key, value in pairs:
        if key in out or key in {'__proto__', 'constructor', 'prototype'}:
            raise ValueError('Duplicate or unsafe JSON object key')
        out[key] = value
    return out

def validate_sources(text: str) -> list[tuple[str, str]]:
    if len(text.encode('utf-8')) > MAX_SOURCE_BYTES:
        raise ValueError('Source export exceeds 8 MB')
    document = json.loads(text, object_pairs_hook=unique_pairs)
    if not isinstance(document, dict) or document.get('schemaVersion') != 1:
        raise ValueError('Expected Datapass source export schemaVersion 1')
    files = document.get('files')
    if not isinstance(files, list) or not 1 <= len(files) <= 60:
        raise ValueError('Expected 1-60 source files')
    output: list[tuple[str, str]] = []
    seen: set[str] = set()
    for item in files:
        if not isinstance(item, dict) or not isinstance(item.get('path'), str) or not isinstance(item.get('source'), str):
            raise ValueError('Invalid source file')
        name, source = item['path'], item['source']
        if len(name) > 220 or not (PATH_RE.fullmatch(name) or name in {'dbt_project.yml', 'dbt_charts.yml'}):
            raise ValueError('Only relative, non-credential dbt source paths are accepted')
        if any(not p or p in {'.', '..'} or p.startswith('.') or p.endswith(('.', ' ')) or p.split('.')[0].upper() in RESERVED for p in name.split('/')):
            raise ValueError('Unsafe or reserved project path')
        if name.casefold() in seen:
            raise ValueError('Duplicate source path')
        if '\0' in source or len(source) > 100_000:
            raise ValueError('Source is too large or contains a null byte')
        seen.add(name.casefold())
        output.append((name, source))
    for name in seen:
        if any('/'.join(name.split('/')[:i]) in seen for i in range(1, len(name.split('/')))):
            raise ValueError('File/directory prefix conflict')
    if 'dbt_project.yml' not in seen:
        raise ValueError('dbt_project.yml is required')
    if sum(len(s) for _, s in output) > 1_500_000:
        raise ValueError('Source document exceeds 1.5 million characters')
    return output

def materialize(source: Path, output: Path) -> Path:
    if not source.is_file() or source.stat().st_size > MAX_SOURCE_BYTES:
        raise ValueError('Missing or oversized source export')
    files = validate_sources(source.read_text(encoding='utf-8'))
    # Do not resolve away an output symlink before checking it.
    output = output.expanduser().absolute()
    if output.exists() or output.is_symlink():
        raise ValueError('Output already exists; choose a new folder')
    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.datapass-dbt-', dir=output.parent))
    try:
        for name, text in files:
            target = stage.joinpath(*PurePosixPath(name).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding='utf-8', newline='\n')
        (stage / 'data').mkdir(exist_ok=True)
        # Absolute destination avoids accidentally opening another current-directory database.
        db_path = (output / 'data/datapass.duckdb').as_posix()
        profile = ('datapass_retail:\n  target: dev\n  outputs:\n    dev:\n      type: duckdb\n'
                   f'      path: {json.dumps(db_path)}\n      schema: main\n      threads: 1\n')
        (stage / 'profiles.yml').write_text(profile, encoding='utf-8')
        (stage / '.gitignore').write_text('data/\ntarget/\nlogs/\nprofiles.yml\n.env\n', encoding='utf-8')
        (stage / 'DATAPASS_LOCAL_README.md').write_text(
            '# Local dbt project\n\nReview SQL, macros and project hooks before running. No code was run by the exporter.\n'
            'This is an isolated teaching project, not an automatic clone of the Datapass workspace catalog.\n\n'
            'Install dbt-duckdb in your chosen virtual environment, then:\n\n'
            '```sh\ndbt build --project-dir . --profiles-dir . --profile datapass_retail\n```\n\n'
            'Import `target/manifest.json` and `target/run_results.json` from the SAME invocation into Datapass. '
            'A later `dbt docs generate` can replace the manifest invocation ID; capture matching artifacts first.\n', encoding='utf-8')
        if output.exists() or output.is_symlink():
            raise ValueError('Output appeared during generation; refusing to replace it')
        stage.rename(output)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return output

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        folder = materialize(args.source, args.output)
    except (OSError, ValueError, RecursionError) as error:
        parser.exit(2, f'Not created: {error}\n')
    print(f'Created {folder}. No dependencies installed, no SQL executed, no network calls made.')
    return 0
if __name__ == '__main__':
    raise SystemExit(main())
