"""Native V1 release gate. No mocks and no SQLite fallback. Exit 2 = BLOCKED.

Usage: python scripts/v1-local-smoke.py --storage ducklake --output qa/native.json
Install requirements-dbt.txt first. Extension installation is explicit opt-in.
All data/projects are disposable fixtures in a temporary workspace.
"""
from __future__ import annotations
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import traceback
import subprocess

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--storage', choices=['duckdb', 'ducklake'], default='ducklake')
    parser.add_argument('--install-extensions', action='store_true')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--charts', action='store_true', help='Also validate/render all exported chart types using installed dct.')
    args = parser.parse_args()
    report = {'gate': 'real-local-dbt-shared-catalog', 'storage': args.storage,
              'status': 'BLOCKED', 'versions': {}, 'checks': []}
    code = 2
    try:
        for package in ('duckdb', 'dbt-core', 'dbt-duckdb', 'polars', 'pandas'):
            try:
                report['versions'][package] = importlib.metadata.version(package)
            except importlib.metadata.PackageNotFoundError:
                report['versions'][package] = None
        missing = [k for k, v in report['versions'].items() if v is None]
        if missing:
            report['reason'] = 'Missing declared native dependencies: ' + ', '.join(missing)
            return code
        os.environ['DATAPASS_INSTALL_DUCKLAKE'] = '1' if args.install_extensions else '0'
        from apps.api.datapass.documents import Documents
        from apps.api.datapass.kernels import KernelManager
        from apps.api.datapass.local_jobs import LocalJobs, TERMINAL, CapabilityUnavailable
        from apps.api.datapass.dbt_runner import DbtRunner
        from apps.api.datapass import exercises
        with tempfile.TemporaryDirectory(prefix='datapass-v1-native-') as folder:
            docs = Documents(Path(folder))
            manager = KernelManager(args.storage, trusted=True, timeout=45)
            jobs = LocalJobs(docs, manager, timeout=180)
            try:
                w = docs.create(None, 'Native V1 proof')
                files = [
                    {'path': 'dbt_project.yml', 'source': "name: datapass_smoke\nversion: '1.0'\nconfig-version: 2\nprofile: datapass_local\nmodel-paths: [models]\nseed-paths: [seeds]\ntest-paths: [tests]\n"},
                    {'path': 'seeds/smoke_seed.csv', 'source': 'id,value\n1,10\n2,20\n'},
                    {'path': 'models/smoke_model.sql', 'source': "{{ config(materialized='table') }}\nselect id, value * 2 as doubled from {{ ref('smoke_seed') }}"},
                    {'path': 'tests/assert_smoke.sql', 'source': "select * from {{ ref('smoke_model') }} where doubled <> id * 20"},
                ]
                resource = dict(schema_version=1, kind='dbt-project', id='native-dbt', title='Native proof', revision=0, files=files)
                wb = dict(schema_version=1, resources=[resource], views=[], panes=[dict(id='pane', view_ids=[], active_view_id=None, weight=1)], active_pane_id='pane', persona='neutral', direction='horizontal')
                w = docs.save_workbench(w['id'], w['revision'], wb)
                runner = DbtRunner(docs, manager, trusted=True)
                job = jobs.submit(w['id'], resource['id'], w['revision'], 0, 'dbt', 'build', lambda ctx, res, ws: runner.run(ctx, res, ws, action='build'))
                deadline = time.monotonic() + 190
                while time.monotonic() < deadline:
                    record = jobs.get(w['id'], job['id'])
                    if record['status'] in TERMINAL and record['finished_at']:
                        break
                    time.sleep(.1)
                else:
                    raise AssertionError('Native dbt gate exceeded its deadline.')
                report['job'] = record
                if record['status'] == 'unavailable':
                    report['reason'] = record.get('error', 'Native runtime is unavailable.')
                    return code
                assert record['status'] == 'success', record.get('error')
                assert record['truth'] == 'real_local'
                assert record['result']['runtime']['storage'] == args.storage
                manifest = jobs.read_artifact(w['id'], job['id'], 'manifest')
                results = jobs.read_artifact(w['id'], job['id'], 'run_results')
                assert manifest['metadata']['invocation_id'] == results['metadata']['invocation_id'] == record['result']['invocation_id']
                model = manifest['nodes']['model.datapass_smoke.smoke_model']
                assert model.get('compiled_code') and 'seed.datapass_smoke.smoke_seed' in model['depends_on']['nodes']
                assert all(r['status'] in ('success', 'pass') for r in results['results'])
                report['checks'].append('Real dbt seed/model/test build, matching artifacts, compiled SQL and lineage')
                query = {'op': 'read_query', 'query': 'SELECT * FROM warehouse.smoke_model ORDER BY id'}
                value = manager.call(w['id'], docs.folder(w['id']) / 'data', query)
                assert value['result']['rows'] == [{'id': 1, 'doubled': 20}, {'id': 2, 'doubled': 40}]
                manager.restart(w['id'])
                assert manager.call(w['id'], docs.folder(w['id']) / 'data', query)['result'] == value['result']
                report['checks'].append('dbt output visible through shared notebook catalog after kernel restart')
                if args.charts:
                    manager.restart(w['id'])  # Release the shared database before the external reader.
                    base = jobs.folder(w['id']) / job['id'] / 'dbt'
                    source = base / 'source'
                    (source / 'dbt_charts.yml').write_text(json.dumps({'sources': {'db': {
                        'type': 'dbt_profile', 'profile': 'datapass_local', 'target': 'local',
                        'profiles_dir': str(base / 'profiles')}}}), encoding='utf-8')
                    exported = json.loads(subprocess.check_output(['node', str(ROOT/'scripts/charts-interop-fixtures.cjs')], cwd=ROOT, text=True))
                    executable = Path(sys.executable).with_name('dct.exe' if os.name == 'nt' else 'dct')
                    report['charts'] = []
                    report['versions']['dbt-charts'] = importlib.metadata.version('dbt-charts')
                    for kind, yaml in exported.items():
                        board = source / f'{kind}.yml'
                        board.write_text(yaml, encoding='utf-8')
                        output = args.output.resolve().parent / f'dct-{args.storage}-{kind}.html' if args.output else source/f'{kind}.html'
                        for command in ([str(executable), 'validate', str(board)],
                                        [str(executable), 'render', str(board), '--format', 'html', '--output', str(output), '--no-cache']):
                            invocation = subprocess.run(command, cwd=source, capture_output=True, text=True, timeout=90,
                                                        env={**os.environ, 'PYTHONUTF8':'1', 'DBT_PROFILES_DIR':str(base/'profiles')})
                            report['charts'].append({'command':command,'exit_code':invocation.returncode,
                                                     'stdout':invocation.stdout,'stderr':invocation.stderr})
                            assert invocation.returncode == 0, invocation.stderr
                        assert output.is_file() and output.stat().st_size > 1000
                    report['checks'].append('Official dct validated and rendered exported bar/line/KPI/table YAML against real dbt output')
                # Grade the native variants through the production engine, not a stand-in.
                from apps.api.datapass.execution import Engine
                engine = Engine(Path(folder) / 'arena', mode=args.storage, trusted_python=True)
                try:
                    for lang in ('sql', 'python', 'polars', 'dbt', 'sparklab'):
                        eid = 'retail-valid-orders-' + lang
                        result = exercises.grade(engine, dict(exercise_id=eid, exercise_version='1', language=lang, code=exercises.solution(eid)['source'], mode='submit', notebook_id='native-arena', cell_id='answer', source_revision=1))
                        assert result['status'] == 'passed', (lang, result)
                    report['checks'].append('Shared Arena fixtures: DuckDB, pandas, native Polars, bounded dbt/Spark semantics')
                finally:
                    engine.catalog.close()
                if args.storage == 'ducklake':
                    files = list((docs.folder(w['id']) / 'data' / 'lake-files').rglob('*.parquet'))
                    assert files, 'DuckLake must persist real Parquet data, not only a label.'
                    report['checks'].append('Canonical DuckLake persisted Parquet files')
                report['status'] = 'PASS'
                code = 0
            finally:
                jobs.close()
                manager.close()
    except Exception as error:
        report.update(status='FAIL', reason=str(error), traceback=traceback.format_exc())
        code = 1
    finally:
        encoded = json.dumps(report, indent=2, default=str)
        print(encoded)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(encoded + '\n', encoding='utf-8')
    return code


if __name__ == '__main__':
    raise SystemExit(main())
