"""Canonical v1 exercise wire schemas; exported through FastAPI OpenAPI."""
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class Contract(BaseModel):
    model_config = ConfigDict(extra='forbid')


class VersionRef(Contract):
    id: str
    version: str


class Section(Contract):
    title: str
    body: str


class VisibleCheck(Contract):
    id: str
    description: str


class SolutionMetadata(Contract):
    available: bool
    reveal: Literal['explicit']


class Placement(Contract):
    domain: str
    topic: str


class Recommendation(Contract):
    rank: int
    reason: str


class RowValidation(Contract):
    kind: Literal['rows'] = 'rows'
    ordered: Literal[False] = False
    duplicate_sensitive: Literal[True] = True
    relative_tolerance: float = 1e-9
    absolute_tolerance: float = 1e-8


class ExerciseDefinition(Contract):
    schema_version: Literal[1]
    id: str
    version: str
    title: str
    difficulty: Literal['easy','medium','hard']
    topics: list[str]
    tags: list[str]
    origin: Literal['internal-demo','authored','migrated']
    language: Literal['sql','sparklab','python','polars','dbt']
    runtime: str
    prompt: str
    sections: list[Section]
    starter_source: str
    fixtures: list[VersionRef]
    visible_checks: list[VisibleCheck]
    hidden_check_refs: list[str]
    edge_check_refs: list[str]
    hints: list[str]
    solution: SolutionMetadata
    explanation: str
    follow_ups: list[str]
    canonical_placement: Placement
    related_associations: list[str]
    recommendation: Recommendation | None = None
    validator_version: str
    validation: RowValidation = Field(default_factory=RowValidation)


class RuntimeIdentity(Contract):
    adapter: str
    engine: str
    engine_version: str
    session_generation: str


class ExerciseCheck(Contract):
    id: str
    visibility: Literal['visible','hidden','edge']
    passed: bool
    status: Literal['passed','failed']
    execution_id: str
    execution_status: str
    elapsed_ms: float
    message: str
    input_versions: dict[str,str | None]
    actual: list[dict[str,Any]] | None = None
    expected: list[dict[str,Any]] | None = None


class ExecutionError(Contract):
    type: str
    message: str


class ExerciseAttempt(Contract):
    schema_version: Literal[1]
    id: str
    created_at: str
    exercise_id: str
    exercise_version: str
    notebook_id: str
    cell_id: str
    source: str
    source_hash: str
    source_revision: int
    validator_version: str
    fixtures: list[VersionRef]
    language: Literal['sql','sparklab','python','polars','dbt']
    status: Literal['passed','failed','error']
    checks: list[ExerciseCheck]
    truth: Literal['real','semantic-emulation','simulated','unsupported']
    runtime: RuntimeIdentity
    elapsed_ms: float
    error: ExecutionError | None = None


class ExerciseResult(Contract):
    status: Literal['passed','failed','error']
    checks: list[ExerciseCheck]
    runs: list[dict[str,Any]]
    attempt: ExerciseAttempt | None = None
    workspace_revision: int
    truth: Literal['real','semantic-emulation','simulated','unsupported']
    runtime: RuntimeIdentity
    elapsed_ms: float
    error: ExecutionError | None = None
