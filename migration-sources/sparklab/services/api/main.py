from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.semantic.executor import SemanticEngineUnavailable, capabilities as semantic_capabilities, execute_reference_sql, verify_against_truth
from services.sparklab.cost import price_job
from services.sparklab.grader import grade_finance, grade_retail
from services.sparklab.runtime import (
    load_cluster_profiles,
    simulate_finance_window_job,
    simulate_retail_job,
    simulate_retail_skew_job,
    simulate_workspace,
)
from services.sparklab.safe_parser import ParseResult, SafeSparkParser, SparkLabSyntaxError
from services.sparklab.sparklab import DataFrame, SparkSession

ROOT = Path(__file__).resolve().parents[1]
SPARKLAB = ROOT / "sparklab"
PROFILES_PATH = SPARKLAB / "cluster_profiles.json"
CASE_PROFILES = SPARKLAB / "profiles.json"
EXERCISE_DIR = SPARKLAB / "exercises"

app = FastAPI(title="SparkLab Virtual Runtime", version="0.12.0")
app.add_middleware(
    CORSMiddleware,
    # "null" lets the dependency-free standalone HTML connect when opened as
    # file:// during local training. This API is a local developer service, not a
    # public multi-tenant execution endpoint.
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "null"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class CompileRequest(BaseModel):
    code: str = Field(min_length=1, max_length=20000)
    case: str = "retail"


class SimulateRequest(CompileRequest):
    exercise_id: str = "retail_broadcast_join_03"
    cluster_profile: str = "fabric_f64_like"
    aqe_enabled: bool = True
    force_no_broadcast: bool = False
    sparklab_eur_per_scc: float = Field(default=0.10, ge=0, le=100)
    fabric_eur_per_cu_hour: float | None = Field(default=None, ge=0)
    databricks_usd_per_dbu: float | None = Field(default=None, ge=0)
    semantic_engine: str = Field(default="auto", pattern="^(auto|duckdb|sqlite)$")


class SqlRunRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=20000)
    case: str = "retail"
    semantic_engine: str = Field(default="auto", pattern="^(auto|duckdb|sqlite)$")
    limit: int = Field(default=50, ge=1, le=500)


def _exercise_path(exercise_id: str) -> Path:
    safe = exercise_id.replace("/", "").replace("\\", "")
    return EXERCISE_DIR / f"{safe}.json"


def _exercise(exercise_id: str, *, required: bool = True) -> dict[str, Any] | None:
    path = _exercise_path(exercise_id)
    if not path.exists():
        if required:
            raise HTTPException(status_code=404, detail=f"No calibrated truth pack: {exercise_id}")
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _compile_parsed(code: str, case: str) -> tuple[dict[str, Any], ParseResult]:
    try:
        spark = SparkSession.from_profile(CASE_PROFILES, case)
        parsed = SafeSparkParser(spark).parse(code)
        return (
            {
                "target": parsed.target_name,
                "sql": parsed.dataframe.sql,
                "training_plan": parsed.dataframe.explain_training(),
            },
            parsed,
        )
    except (SparkLabSyntaxError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _compile(code: str, case: str) -> dict[str, Any]:
    return _compile_parsed(code, case)[0]


def _has_explicit_broadcast(dataframe: DataFrame) -> bool:
    return any(op.kind == "join" and bool(op.detail.get("broadcast")) for op in dataframe.ops)


def _pack_matches_case(pack: dict[str, Any], case: str) -> bool:
    declared = pack.get("case")
    if declared:
        return str(declared) == case
    # Backward-compatible fallback for the old Retail alias pack.
    return str(pack.get("id", "")).startswith(f"{case}_")


def _simulate_pack(
    req: SimulateRequest,
    pack: dict[str, Any],
    parsed: ParseResult,
):
    profiles = load_cluster_profiles(str(PROFILES_PATH))
    if req.cluster_profile not in profiles:
        raise HTTPException(status_code=404, detail="Unknown cluster profile")
    profile = profiles[req.cluster_profile]
    kind = pack.get("simulation")
    if kind == "retail_join":
        explicit_broadcast = _has_explicit_broadcast(parsed.dataframe)
        broadcast = False if req.force_no_broadcast else explicit_broadcast
        job = simulate_retail_job(pack, profile, req.aqe_enabled, broadcast=broadcast)
    elif kind == "retail_skew":
        job = simulate_retail_skew_job(pack, profile, req.aqe_enabled)
    elif kind == "finance_window":
        job = simulate_finance_window_job(pack, profile, parsed.dataframe, req.aqe_enabled)
    else:
        raise HTTPException(status_code=422, detail=f"Unsupported calibrated simulation kind: {kind}")
    return profile, job


def _grade_for_pack(
    req: SimulateRequest,
    parsed: ParseResult,
    job: Any,
    pack: dict[str, Any],
    semantic_verified: bool | None,
) -> dict[str, Any]:
    case = str(pack.get("case", req.case))
    if case == "retail":
        return grade_retail(req.code, parsed.dataframe, job.as_dict(), pack, semantic_verified=semantic_verified)
    if case == "finance":
        return grade_finance(req.code, parsed.dataframe, job.as_dict(), pack, semantic_verified=semantic_verified)
    raise HTTPException(status_code=422, detail=f"No calibrated grader for case: {case}")


def _semantic_execution(compiled: dict[str, Any], pack: dict[str, Any] | None, case: str, engine: str = "auto") -> dict[str, Any] | None:
    if pack is None or not pack.get("fixture_truth"):
        return None
    try:
        fixture = str(pack.get("fixture_truth", {}).get("fixture", case))
        executed = execute_reference_sql(str(compiled["sql"]), fixture, engine=engine)
        return verify_against_truth(executed, pack).as_dict()
    except (KeyError, ValueError, sqlite3.Error, SemanticEngineUnavailable) as exc:
        selected = semantic_capabilities().get("auto_selection", "sqlite") if engine == "auto" else engine
        label = "DuckDB reference fixture" if selected == "duckdb" else "SQLite reference fixture"
        return {
            "status": "unsupported",
            "engine_key": selected,
            "engine": label,
            "dataset_scope": f"bounded {case} truth fixture",
            "case": case,
            "row_count": 0,
            "columns": [],
            "rows": [],
            "preview_truncated": False,
            "verified": False,
            "query_sha256": "",
            "preview_sha256": "",
            "result_sha256": None,
            "verification_complete": False,
            "elapsed_ms": 0.0,
            "message": f"Bounded semantic execution unavailable: {exc}",
        }


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "runtime": "SparkLab V0.12",
        "execution": "safe AST + pluggable bounded semantic fixture + virtual cluster",
        "notebook_api": "ready",
    }


@app.get("/capabilities")
def capabilities() -> dict[str, Any]:
    return {
        "runtime": "SparkLab V0.12",
        **semantic_capabilities(),
        "distributed_runtime": {
            "kind": "dataset-grounded simulation",
            "real_spark_cluster": False,
        },
    }


@app.get("/profiles")
def profiles() -> dict[str, Any]:
    loaded = load_cluster_profiles(str(PROFILES_PATH))
    return {key: {**value.__dict__, "max_cores": value.max_cores} for key, value in loaded.items()}


@app.get("/exercises")
def exercises() -> list[dict[str, Any]]:
    packs: list[dict[str, Any]] = []
    for path in sorted(EXERCISE_DIR.glob("*.json")):
        # The old combined ID remains as a compatibility alias but is hidden
        # from the primary exercise catalog.
        if path.stem == "retail_broadcast_skew":
            continue
        pack = json.loads(path.read_text(encoding="utf-8"))
        packs.append({
            "id": pack["id"],
            "title": pack["title"],
            "objective": pack.get("objective", ""),
            "simulation": pack.get("simulation"),
        })
    return packs


@app.post("/compile")
def compile_code(req: CompileRequest) -> dict[str, Any]:
    return _compile(req.code, req.case)


@app.post("/sql/run")
def sql_run(req: SqlRunRequest) -> dict[str, Any]:
    """Execute one read-only SQL statement against the bounded case fixture.

    This endpoint powers the SQL notebook runtime. It is intentionally separate
    from the Spark simulator: the result is real bounded SQL execution, while no
    distributed Spark metrics or vendor-cost claims are produced. `auto` prefers
    DuckDB when installed and otherwise falls back to SQLite with provenance.
    """
    try:
        executed = execute_reference_sql(req.sql, req.case, limit=req.limit, engine=req.semantic_engine)
    except (KeyError, ValueError, sqlite3.Error, SemanticEngineUnavailable) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "status": "succeeded",
        "compile": {
            "target": "sql_result",
            "sql": req.sql,
            "training_plan": {
                "runtime": "bounded SQL semantic engine",
                "distributed_simulation": False,
            },
        },
        "semantic_execution": executed.as_dict(),
        "simulation": None,
        "cost": None,
        "grade": None,
        "exercise": None,
        "truth_boundary": {
            "semantic": "real bounded read-only SQL execution",
            "distributed": "not modeled for SQL runtime",
            "cost": "not modeled",
        },
    }


@app.post("/simulate")
def simulate(req: SimulateRequest) -> dict[str, Any]:
    compiled, parsed = _compile_parsed(req.code, req.case)
    pack = _exercise(req.exercise_id, required=True)
    assert pack is not None
    if not _pack_matches_case(pack, req.case):
        raise HTTPException(status_code=422, detail="This truth pack is not calibrated for the selected case")
    profile, job = _simulate_pack(req, pack, parsed)
    costs = price_job(
        job,
        profile,
        req.sparklab_eur_per_scc,
        req.fabric_eur_per_cu_hour,
        req.databricks_usd_per_dbu,
    )
    semantic = _semantic_execution(compiled, pack, req.case, req.semantic_engine)
    return {
        "compile": compiled,
        "semantic_execution": semantic,
        "exercise": {"id": pack["id"], "title": pack["title"], "truth": pack["truth"]},
        "cluster": {**profile.__dict__, "max_cores": profile.max_cores},
        "job": job.as_dict(),
        "cost": costs,
        "truth_boundary": {
            "real": ["PySpark subset parsing", "relational plan semantics", "bounded reference-fixture execution", "case statistics / truth pack"],
            "simulated": ["executors", "task durations", "network shuffle", "autoscaling", "spill", "wall-clock", "cloud-equivalent usage"],
            "not_claimed": ["exact Fabric runtime", "exact Databricks runtime", "JVM GC telemetry", "vendor invoice"],
        },
    }


@app.post("/grade")
def grade(req: SimulateRequest) -> dict[str, Any]:
    compiled, parsed = _compile_parsed(req.code, req.case)
    pack = _exercise(req.exercise_id, required=True)
    assert pack is not None
    if not _pack_matches_case(pack, req.case):
        raise HTTPException(status_code=422, detail="This truth pack is not calibrated for the selected case")
    profile, job = _simulate_pack(req, pack, parsed)
    semantic = _semantic_execution(compiled, pack, req.case, req.semantic_engine)
    semantic_verified = semantic.get("verified") if semantic else None
    grade_result = _grade_for_pack(req, parsed, job, pack, semantic_verified)
    return {"compile": compiled, "semantic_execution": semantic, "simulation": job.as_dict(), "grade": grade_result}


@app.post("/notebook/run")
def notebook_run(req: SimulateRequest) -> dict[str, Any]:
    """Notebook-oriented execution contract with explicit calibration state."""
    compiled, parsed = _compile_parsed(req.code, req.case)
    pack = _exercise(req.exercise_id, required=False)
    if pack is None:
        return {
            "status": "compiled",
            "compile": compiled,
            "semantic_execution": None,
            "simulation": None,
            "cost": None,
            "grade": None,
            "exercise": None,
            "truth_boundary": {
                "semantic": "safe parser + relational plan",
                "distributed": "no calibrated truth pack for this mission",
                "cost": "not modeled",
            },
        }

    if not _pack_matches_case(pack, req.case):
        return {
            "status": "compiled",
            "compile": compiled,
            "semantic_execution": None,
            "simulation": None,
            "cost": None,
            "grade": None,
            "exercise": {"id": pack["id"], "title": pack["title"]},
            "truth_boundary": {
                "semantic": "safe parser + relational plan",
                "distributed": "truth pack does not match selected case",
                "cost": "not modeled",
            },
        }

    profile, job = _simulate_pack(req, pack, parsed)
    costs = price_job(
        job,
        profile,
        req.sparklab_eur_per_scc,
        req.fabric_eur_per_cu_hour,
        req.databricks_usd_per_dbu,
    )
    semantic = _semantic_execution(compiled, pack, req.case, req.semantic_engine)
    semantic_verified = semantic.get("verified") if semantic else None
    grade_result = _grade_for_pack(req, parsed, job, pack, semantic_verified)
    return {
        "status": "succeeded",
        "compile": compiled,
        "semantic_execution": semantic,
        "simulation": job.as_dict(),
        "cost": costs,
        "grade": grade_result,
        "exercise": {"id": pack["id"], "title": pack["title"], "truth": pack["truth"]},
        "truth_boundary": {
            "semantic": "safe parser + real bounded reference-fixture execution",
            "distributed": "dataset-grounded virtual Spark",
            "cost": "training/vendor-equivalent usage estimate",
        },
    }


@app.get("/workspace/simulate")
def workspace_simulation(capacity_cores: int = 128) -> dict[str, Any]:
    if capacity_cores < 1 or capacity_cores > 10000:
        raise HTTPException(status_code=422, detail="capacity_cores must be between 1 and 10000")
    return simulate_workspace(capacity_cores)
