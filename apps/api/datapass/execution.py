"""Shared execution engine. Instantiated inside a disposable kernel process."""
from __future__ import annotations

import ast
from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path
import time
from typing import Any
import uuid

from .catalog import Catalog, json_value, references
from .content import ROOT, compile_dbt, get_case, topological_steps
from services.sparklab.safe_parser import SafeSparkParser, SparkLabSyntaxError
from services.sparklab.sparklab import SparkSession
from services.sparklab.runtime import load_cluster_profiles, simulate_retail_job
from services.sparklab.cost import price_job
from services.sparklab.grader import grade_retail

SPARK_HOME = ROOT / 'services' / 'sparklab'


class BoundedText(io.StringIO):
    def write(self, value):
        remaining = 32_000 - self.tell()
        if remaining > 0:
            super().write(value[:remaining])
        return len(value)


def compare_rows(actual: list[dict], expected: list[dict]) -> bool:
    """Order independent, exact columns and cardinality, tolerance for numbers."""
    if len(actual) != len(expected):
        return False
    pending = list(expected)
    for row in actual:
        match = None
        for index, candidate in enumerate(pending):
            if set(row) != set(candidate):
                continue
            valid = True
            for key, value in row.items():
                other = candidate[key]
                if isinstance(value, (int, float)) and isinstance(other, (int, float)):
                    valid &= math.isclose(value, other, rel_tol=1e-9, abs_tol=1e-8)
                else:
                    valid &= value == other
            if valid:
                match = index
                break
        if match is None:
            return False
        pending.pop(match)
    return not pending


class Engine:
    def __init__(self, directory: Path, mode='auto', trusted_python=False):
        self.catalog = Catalog(directory, mode)
        self.trusted_python = trusted_python
        self.generation = uuid.uuid4().hex
        self.sequence = 0
        self.parsers: dict[str, SafeSparkParser] = {}
        self.python_namespaces: dict[str, dict] = {}
        self.directory = directory

    def capabilities(self):
        return {
            'storage': self.catalog.kind,
            'storage_truth': 'real local data; SQLite compatibility mode' if self.catalog.kind == 'sqlite' else 'real local data',
            'ducklake_active': self.catalog.kind == 'ducklake',
            'motherduck': {'enabled': False, 'reason': 'Optional future remote catalog adapter; no credentials required.'},
            'kernels': [
                {'id':'sql','available':True,'truth':'real SQL execution'},
                {'id':'sparklab','available':True,'truth':'supported AST compiled to local SQL; distributed compute simulated'},
                {'id':'python','available':self.trusted_python,'truth':'trusted local CPython worker; not a security sandbox'},
                {'id':'polars','available':self.trusted_python and importlib.util.find_spec('polars') is not None,'truth':'real Polars when installed; no substitute'},
                {'id':'dbt','available':True,'truth':'literal ref/source teaching adapter; SQL executes; not dbt Core'},
            ],
            'session_generation': self.generation,
            'distributed_spark': False,
        }

    def parser(self, notebook_id: str):
        if notebook_id not in self.parsers:
            profile = json.loads((SPARK_HOME / 'profiles.json').read_text())['retail']
            self.parsers[notebook_id] = SafeSparkParser(SparkSession(profile))
        return self.parsers[notebook_id]

    def check(self, spec: dict | None) -> dict:
        if not spec:
            return {'status': 'not_configured', 'passed': None, 'message': 'No automatic acceptance check is defined for this step.'}
        try:
            result = self.catalog.query(spec['sql'])
            inputs = references(spec['sql'])
            fresh = all(self.catalog.fresh(asset) for asset in inputs)
            passed = not result['truncated'] and fresh and compare_rows(result['rows'], spec['expected'])
            return {'status': 'passed' if passed else 'failed', 'passed': passed, 'fresh': fresh, 'actual': result['rows'], 'expected': spec['expected'], 'message': 'Actual rows match and their inputs are fresh.' if passed else 'Rows differ, an input is stale, or the result is truncated.'}
        except Exception as error:
            return {'status':'failed','passed':False,'message':str(error)}

    def _python(self, request: dict) -> tuple[dict, str, list[str]]:
        if not self.trusted_python:
            raise ValueError('Python is disabled. Start with --trusted-local-python only for code you trust. The worker is not a security sandbox.')
        if request['language'] == 'polars' and importlib.util.find_spec('polars') is None:
            raise ValueError('Polars is not installed. Install requirements-engines.txt. No simulated Polars output was returned.')
        notebook_id = request['notebook_id']
        env = self.python_namespaces.setdefault(notebook_id, {'__name__':'__datapass_notebook__'})
        output = BoundedText()
        shown: list[Any] = []
        dependencies: set[str] = set()
        def query(sql):
            dependencies.update(references(sql))
            result = self.catalog.query(sql)
            if result['truncated']:
                raise ValueError('query() would truncate input. Use SQL aggregation or a registered bounded fixture instead.')
            return result['rows']
        def normalize(value):
            if hasattr(value, 'to_dicts'):
                return value.to_dicts()
            if hasattr(value, 'to_dict'):
                return value.to_dict(orient='records')
            if isinstance(value, list) and all(isinstance(r, dict) for r in value):
                return value
            if isinstance(value, dict):
                return [value]
            return [{'value': json_value(value)}]
        def display(value):
            shown.append(normalize(value))
        def publish(name, value):
            return self.catalog.publish_rows(name, normalize(value), request['cell_id'], sorted(dependencies))
        env.update(query=query, display=display, publish=publish)
        tree = ast.parse(request['code'], mode='exec')
        # This is deliberate trusted code execution inside the worker, never the API process.
        with redirect_stdout(output), redirect_stderr(output):
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                final = tree.body.pop()
                exec(compile(tree, '<notebook>', 'exec'), env, env)
                value = eval(compile(ast.Expression(final.value), '<notebook>', 'eval'), env, env)
                if value is not None:
                    display(value)
            else:
                exec(compile(tree, '<notebook>', 'exec'), env, env)
        rows = shown[-1] if shown else []
        if request.get('output_asset'):
            result = self.catalog.publish_rows(request['output_asset'], rows, request['cell_id'], sorted(dependencies))
        else:
            result = {'columns':list(rows[0]) if rows else [], 'rows':json_value(rows[:200]),'truncated':len(rows)>200,'total_rows':len(rows)}
        return result, output.getvalue(), sorted(dependencies)

    def simulate(self, request: dict, parsed, result: dict):
        pack_id = request.get('truth_pack')
        if not pack_id:
            return None
        if pack_id != 'retail_broadcast_join_03':
            raise ValueError('This root currently connects only the retail broadcast truth pack. Other uploaded packs are retained for migration.')
        pack = json.loads((SPARK_HOME / 'exercises' / f'{pack_id}.json').read_text())
        # Compare the full physical input fixture before attaching the virtual-scale scenario.
        try:
            from services.semantic.executor import _execute_sqlite
            # Immutable shipped fixtures, not mutable workspace source tables.
            expected_orders = _execute_sqlite('SELECT * FROM silver.orders ORDER BY order_id', 'retail', 200)[2]
            expected_segments = _execute_sqlite('SELECT * FROM silver.dim_customer_segment ORDER BY segment_id', 'retail', 200)[2]
            orders = self.catalog.query('SELECT * FROM silver.orders ORDER BY order_id')
            segments = self.catalog.query('SELECT * FROM silver.dim_customer_segment ORDER BY segment_id')
            input_match = (not orders['truncated'] and not segments['truncated'] and
                           orders['rows'] == expected_orders and segments['rows'] == expected_segments)
        except Exception:
            input_match = False
        if not input_match:
            return {'status':'unavailable','reason':'The workspace does not match the bounded reference fixture; modeled cluster metrics were withheld.'}
        profiles = load_cluster_profiles(str(SPARK_HOME / 'cluster_profiles.json'))
        profile_id = request.get('profile', 'generic_8x8')
        if profile_id not in profiles:
            raise ValueError('Unknown virtual cluster profile.')
        profile = profiles[profile_id]
        broadcast = any(op.kind == 'join' and bool(op.detail.get('broadcast')) for op in parsed.dataframe.ops)
        job = simulate_retail_job(pack, profile, request.get('aqe', True), broadcast=broadcast)
        metrics = job.as_dict()
        # The inherited confidence percentages were authored model inputs, not validation evidence.
        metrics.pop('truth_confidence', None)
        for stage in metrics['stages']:
            stage['task_count'] = len(stage['tasks'])
            stage['tasks'] = stage['tasks'][:12]
            stage['task_preview_only'] = stage['task_count'] > 12
        correct = not result['truncated'] and compare_rows(result['rows'], pack['fixture_truth']['rows'])
        return {
            'status':'modeled','truth':'scenario-grounded simulation; not real Spark or measured performance',
            'physical_fixture_rows':12,'virtual_fact_rows':pack['statistics']['fact_rows'],
            'profile_id':profile_id,'metrics':metrics,
            'cost':price_job(job, profile),
            'grade':grade_retail(request['code'],parsed.dataframe,job.as_dict(),pack,semantic_verified=correct),
        }

    def execute(self, request: dict):
        start = time.perf_counter()
        self.sequence += 1
        run = {
            'id':uuid.uuid4().hex, 'cell_id':request['cell_id'], 'notebook_id':request['notebook_id'],
            'source_hash':hashlib.sha256(request['code'].encode()).hexdigest(),
            'session_generation':self.generation, 'sequence':self.sequence,
            'created_at':datetime.now(timezone.utc).isoformat(),
            'engine':self.catalog.kind,'language':request['language'],
            'status':'error','stdout':'','output_asset':request.get('output_asset'),
            'simulation':None,'check':None,
        }
        try:
            language = request['language']
            compiled_sql = None
            parsed = None
            python_inputs = []
            if language in {'sql', 'dbt'}:
                compiled_sql = request['code']
                if language == 'dbt':
                    compiled_sql = compile_dbt(compiled_sql, get_case(request['case_id']))
            elif language == 'sparklab':
                # A rejected cell cannot partially overwrite earlier Spark symbols.
                candidate = deepcopy(self.parser(request['notebook_id']))
                parsed = candidate.parse(request['code'])
                compiled_sql = parsed.dataframe.sql
            elif language in {'python', 'polars'}:
                result, run['stdout'], python_inputs = self._python(request)
            else:
                raise ValueError('Unsupported kernel. Markdown is not executable.')
            if compiled_sql is not None:
                if request.get('output_asset'):
                    result = self.catalog.materialize(request['output_asset'], compiled_sql, request['cell_id'])
                elif language in {'sparklab','dbt'}:
                    result = self.catalog.query(compiled_sql)
                else:
                    result = self.catalog.execute(compiled_sql, request['cell_id'])
                run['compiled_sql'] = compiled_sql
            if parsed is not None:
                self.parsers[request['notebook_id']] = candidate
                run['training_plan'] = parsed.dataframe.explain_training()
                run['simulation'] = self.simulate(request, parsed, result)
            run.update(status='success', result=result)
            if request.get('check'):
                run['check'] = self.check(request['check'])
                if not request.get('output_asset'):
                    output_matches = not result['truncated'] and compare_rows(result['rows'], request['check']['expected'])
                    if not output_matches:
                        run['check'].update(status='failed',passed=False,message='This cell output differs from the expected result, even if a prior catalog asset is correct.')
            run['input_versions'] = {asset:self.catalog.versions.get(asset,{}).get('version') for asset in sorted(set(references(compiled_sql or '')+python_inputs))}
            run['catalog'] = self.catalog.listing()
        except Exception as error:
            run['error'] = {'type':type(error).__name__, 'message':str(error)}
        run['elapsed_ms'] = round((time.perf_counter() - start) * 1000, 3)
        return run

    def workflow(self, request: dict):
        case = get_case(request['case_id'])
        ordered = topological_steps(case['steps'])
        runs, failed = [], set()
        overrides = request.get('overrides', {})
        unknown = set(overrides) - {step['id'] for step in ordered}
        if unknown:
            raise ValueError('Unknown workflow override: '+', '.join(sorted(unknown)))
        for step in ordered:
            if any(parent in failed for parent in step['depends_on']):
                failed.add(step['id'])
                runs.append({'cell_id':step['id'],'status':'skipped','reason':'An upstream task failed.'})
                continue
            run_request = {
                'case_id':case['id'],'notebook_id':request['notebook_id'],'cell_id':step['id'],
                'code':overrides.get(step['id'], step['code']), 'language':step['language'],
                'output_asset':step.get('output_asset'),'check':step.get('check'),
                'truth_pack':step.get('truth_pack'),'profile':request.get('profile','generic_8x8'),'aqe':request.get('aqe',True),
            }
            run = self.execute(run_request)
            runs.append(run)
            if run['status'] == 'error' or (run.get('check') and run['check']['passed'] is False):
                failed.add(step['id'])
        return {'status':'failed' if failed else 'success','runs':runs,'catalog':self.catalog.listing(), 'scheduler_truth':'portable dependency runner, not Airflow or Data Factory'}

    def handle(self, request: dict):
        op = request['op']
        if op == 'capabilities':
            return self.capabilities()
        if op == 'catalog':
            return self.catalog.listing()
        if op == 'execute':
            return self.execute(request)
        if op == 'workflow':
            return self.workflow(request)
        if op == 'check':
            case = get_case(request['case_id'])
            return {step['id']:self.check(step.get('check')) for step in case['steps']}
        if op == 'reset_namespace':
            key = request['notebook_id']
            self.parsers.pop(key, None)
            self.python_namespaces.pop(key, None)
            self.generation = uuid.uuid4().hex
            return {'session_generation':self.generation,'message':'Variables reset; persisted tables retained.'}
        raise ValueError('Unknown kernel command.')
