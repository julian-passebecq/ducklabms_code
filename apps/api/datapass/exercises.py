"""Server-owned exercise registry and bounded result grading on the shared worker.

Only public definitions cross the API. These are internal demo fixtures, not
CodeDELeet content. SQL fixture CTEs do not mutate workspace catalog tables.
"""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import uuid
import sqlite3
from importlib.metadata import version

from .catalog import validate_sql
from .exercise_contracts import ExerciseDefinition

VALIDATOR_VERSION = 'rows-v1'


def _definition(id, title, prompt, starter, solution, topic):
    return dict(schema_version=1, id=id, version='1', title=title,
                difficulty='easy', topics=[topic], tags=['internal-demo'],
                origin='internal-demo', language='sql', runtime='shared-sql-v1',
                prompt=prompt, sections=[{'title':'Input schema', 'body':'input(value INTEGER), including duplicates and NULL.'}],
                starter_source=starter, fixtures=[{'id':id+'-fixtures','version':'1'}],
                visible_checks=[{'id':'example','description':'Public example input: 1, 2, 2, NULL.'}],
                hidden_check_refs=['hidden-values'], edge_check_refs=['empty-input'],
                hints=['Use an aggregate over input; consider duplicates and NULL.'],
                solution={'available':True,'reveal':'explicit'},
                explanation='Aggregate the actual input. A constant matching the example is not a general solution.',
                follow_ups=['How does the aggregate behave on empty input?', 'Which values contribute to the result?'],
                canonical_placement={'domain':'sql','topic':topic},
                related_associations=['sql/nulls','interview/aggregation'],
                recommendation={'rank':1,'reason':'Small contract demonstration'},
                validator_version=VALIDATOR_VERSION), solution


_SUM, _SUM_SOLUTION = _definition('demo-sum', 'Sum with duplicates and NULL',
    'Internal demo: return one row with column total containing the sum of input.value. Return 0 for empty/all-NULL input.',
    'SELECT 0 AS total FROM input LIMIT 1',
    'SELECT COALESCE(SUM(value), 0) AS total FROM input', 'aggregation')
_COUNT, _COUNT_SOLUTION = _definition('demo-count', 'Count non-null values',
    'Internal demo: return one row with column count_values counting non-NULL values, including duplicates.',
    'SELECT 0 AS count_values', 'SELECT COUNT(value) AS count_values FROM input', 'nulls')
REGISTRY = {
    'demo-sum': (_SUM, _SUM_SOLUTION, [dict(total=5)], [dict(total=16)], [dict(total=0)]),
    'demo-count': (_COUNT, _COUNT_SOLUTION, [dict(count_values=3)], [dict(count_values=4)], [dict(count_values=0)]),
}


def definition(id):
    return ExerciseDefinition.model_validate(deepcopy(REGISTRY[id][0])).model_dump(exclude_none=True)


def definitions():
    return [definition(id) for id in REGISTRY]


def solution(id):
    return {'exercise_id':id, 'exercise_version':REGISTRY[id][0]['version'], 'source':REGISTRY[id][1]}


def grade(engine, request):
    # Imported/request-authored expected results are never accepted.
    from .execution import compare_rows
    exercise, _, visible, hidden, edge = REGISTRY[request['exercise_id']]
    if request['exercise_version'] != exercise['version']:
        raise ValueError('Exercise version changed. Reopen the installed exercise before grading.')
    if request['language'] != exercise['language']:
        raise ValueError('This exercise requires its registered SQL kernel.')
    code = request['code']
    fixtures = [('example','visible','SELECT 1 AS value UNION ALL SELECT 2 UNION ALL SELECT 2 UNION ALL SELECT NULL',visible),
                ('hidden-values','hidden','SELECT -3 AS value UNION ALL SELECT 7 UNION ALL SELECT 7 UNION ALL SELECT 5 UNION ALL SELECT NULL',hidden),
                ('empty-input','edge','SELECT CAST(NULL AS INTEGER) AS value WHERE 1=0',edge)]
    if request['mode'] == 'run':
        fixtures = fixtures[:1]
    evidence, runs = [], []
    try:
        validate_sql(code, read_only=True)
        query = code.rstrip().rstrip(';')
    except ValueError:
        query = None
    for check_id, visibility, fixture, expected in fixtures:
        # A subquery enforces read-only execution, including WITH statements.
        compiled = f'WITH input AS ({fixture}) SELECT * FROM (\n{query}\n) AS submitted' if query else 'SELECT * FROM (INVALID SUBMISSION) AS submitted'
        run = engine.execute({**request, 'code':compiled, 'language':'sql', 'output_asset':None})
        run['source_hash'] = hashlib.sha256(code.encode()).hexdigest()
        run.pop('compiled_sql', None)
        result = run.get('result', {})
        fresh = all(engine.catalog.fresh(name) for name in run.get('input_versions',{}))
        passed = run['status']=='success' and fresh and not result.get('truncated',True) and compare_rows(result.get('rows',[]),expected)
        check = dict(id=check_id, visibility=visibility, passed=passed,
                     status='passed' if passed else 'failed', execution_id=run['id'],
                     message='Result matches.' if passed else 'Result differs or execution failed.',
                     execution_status=run['status'], elapsed_ms=run['elapsed_ms'],input_versions=run.get('input_versions',{}))
        if visibility == 'visible':
            check.update(actual=result.get('rows',[]),expected=expected)
            if run.get('error'):
                # DuckDB errors can echo the entire wrapped query. Only the
                # public fixture is eligible for detailed error disclosure.
                check['message'] = run['error']['message']
            runs.append(run)
        evidence.append(check)
    return dict(checks=evidence, runs=runs, status='passed' if all(c['passed'] for c in evidence) else 'failed',
                truth='real', runtime={'adapter':'shared-sql-v1','engine':engine.catalog.kind,'engine_version':sqlite3.sqlite_version if engine.catalog.kind=='sqlite' else version('duckdb'),'session_generation':engine.generation},
                elapsed_ms=round(sum(c['elapsed_ms'] for c in evidence),3))


def attempt(request, result):
    return dict(schema_version=1,id=uuid.uuid4().hex,created_at=datetime.now(timezone.utc).isoformat(),
                exercise_id=request['exercise_id'],exercise_version=request['exercise_version'],
                notebook_id=request['notebook_id'],cell_id=request['cell_id'],
                source=request['code'],source_hash=hashlib.sha256(request['code'].encode()).hexdigest(),
                source_revision=request['source_revision'],validator_version=VALIDATOR_VERSION,
                fixtures=definition(request['exercise_id'])['fixtures'],language=request['language'],
                **{key:result[key] for key in ('status','checks','truth','runtime','elapsed_ms')})
