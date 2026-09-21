import json
from types import SimpleNamespace
import pytest
from apps.api.datapass import exercises
from apps.api.datapass.exercise_contracts import ExerciseResult, ExerciseAttempt


def request(code=None, mode='submit'):
    return dict(exercise_id='retail-pipeline-design', exercise_version='1', language='python',
                code=code or exercises.solution('retail-pipeline-design')['source'], mode=mode,
                notebook_id='arena', cell_id='answer', source_revision=1)


def test_design_grades_without_python_or_execution_and_preserves_attempt_contract():
    # No execute/catalog/capabilities method exists on this engine deliberately.
    engine = SimpleNamespace(generation='design')
    req = request()
    result = exercises.grade(engine, req)
    assert result['status'] == 'passed' and result['truth'] == 'design-only'
    assert result['runs'] == []
    assert 'actual' not in result['checks'][1] and 'expected' not in result['checks'][1]
    ExerciseResult.model_validate({**result, 'workspace_revision': 1})
    ExerciseAttempt.model_validate(exercises.attempt(req, result))
    # Aliases, order and arbitrary task bodies do not change orchestration design.
    code = req['code'].replace('extract =', 'load =').replace('extract >>', 'load >>')
    code = code.replace('SELECT 1 AS value', "not executed")
    assert exercises.grade(engine, request(code))['status'] == 'passed'


@pytest.mark.parametrize('replace', [
    ('extract >> check >> publish', 'extract >> publish'),
    ('extract >> check >> publish', 'publish >> check >> extract'),
    ('retries=2', 'retries=1'),
    ('quality(', 'sql('),
    ('extract >> check >> publish', 'extract >> check >> publish >> extract'),
    ('pipeline("retail_quality")', 'import os'),
])
def test_wrong_dependencies_policies_and_unsafe_syntax_fail(replace):
    req = request()
    req['code'] = req['code'].replace(*replace)
    assert exercises.grade(SimpleNamespace(generation='design'), req)['status'] == 'failed'


def test_run_is_visible_only_submit_checks_hidden_graph():
    code = exercises.definition('retail-pipeline-design')['starter_source']
    engine = SimpleNamespace(generation='design')
    visible = exercises.grade(engine, request(code, 'run'))
    assert visible['status'] == 'passed' and len(visible['checks']) == 1
    assert exercises.grade(engine, request(code))['status'] == 'failed'
    assert 'expected' not in json.dumps(exercises.definition('retail-pipeline-design'))
