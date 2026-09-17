from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "src" / "App.tsx").read_text()
CSS = (ROOT / "src" / "styles.css").read_text()
STANDALONE = (ROOT / "standalone.html").read_text()
API = (ROOT / "src" / "api.ts").read_text()
BACKEND = (ROOT / "services" / "api" / "main.py").read_text()
EXERCISES = ROOT / "services" / "sparklab" / "exercises"


def test_runtime_choices_are_present():
    for runtime in ["PySpark Training", "SQL (DuckDB)", "Polars", "MotherDuck SQL"]:
        assert runtime in APP
        assert runtime in STANDALONE


def test_fabric_like_workbench_regions_are_present():
    for token in ["app-header", "ribbon-wrap", "global-rail", "explorer-panel", "notebook-canvas", "diagnostic-panel"]:
        assert token in APP
        assert token in CSS
        assert token in STANDALONE


def test_truth_boundary_is_explicit():
    assert "REAL: parser + bounded semantics" in APP
    assert "SIMULATED: distributed Spark" in APP
    assert "No executed result rows shown" in APP
    assert "EXECUTED BOUNDED RESULT" in APP
    assert "full case-study dataset" in APP


def test_live_notebook_contract_is_present():
    assert "/notebook/run" in API
    assert "signal" in API
    assert "Result" in APP
    assert "Plan" in APP
    assert "Grade" in APP
    assert "Compare" in APP
    assert "Truth-pack grade" in APP
    assert "stopRun" in APP


def test_mission_specific_truth_packs_are_wired():
    assert "retail_broadcast_join_03" in API
    assert "retail_customer_skew_04" in API
    assert "finance_account_window_03" in API
    assert (EXERCISES / "retail_broadcast_join_03.json").exists()
    assert (EXERCISES / "retail_customer_skew_04.json").exists()
    assert (EXERCISES / "finance_account_window_03.json").exists()
    assert "_simulate_pack" in BACKEND


def test_all_case_lakehouses_are_available():
    for lake in ["ducklake_mobility", "ducklake_retail", "ducklake_energy", "ducklake_finance"]:
        assert lake in STANDALONE


def test_runtime_cluster_profiles_are_present():
    for profile in ["Fabric-like F64", "Databricks-like Jobs", "Local 8x8"]:
        assert profile in APP
        assert profile in STANDALONE


def test_v012_release_marker():
    assert "V0.12" in APP


def test_result_truth_styles_exist():
    for token in [".code-cell.preview", ".result-banner.preview", ".result-banner.verified", ".result-banner.mismatch", ".expected-output", ".result-withheld", ".grade-feedback"]:
        assert token in CSS


def test_standalone_live_api_is_truthful():
    assert "http://127.0.0.1:8000/notebook/run" in STANDALONE
    assert "http://127.0.0.1:8000/sql/run" in STANDALONE
    assert "REFERENCE FALLBACK" in STANDALONE
    assert "semantic_execution" in STANDALONE
    assert "EXECUTED BOUNDED RESULT" in STANDALONE
    assert "No executed result rows shown" in STANDALONE
    assert "activeController" in STANDALONE
    assert "grade?.pass" in STANDALONE
    assert "SUCCEEDED</em>" not in STANDALONE


def test_bounded_semantic_execution_contract_is_present():
    assert "semantic_execution" in API
    assert "SQLite reference fixture" in BACKEND
    assert "fixture_truth" in (EXERCISES / "retail_broadcast_join_03.json").read_text()
    assert "fixture_result_match" in (ROOT / "services" / "sparklab" / "grader.py").read_text()


def test_training_plan_and_truth_pack_share_catalog_statistics_assumption():
    profiles = (ROOT / "services" / "sparklab" / "profiles.json").read_text()
    sparklab = (ROOT / "services" / "sparklab" / "sparklab.py").read_text()
    assert '"catalog_statistics_available": false' in profiles
    assert "catalog size statistics are unavailable" in sparklab


def test_v012_semantic_provenance_is_visible():
    for token in ["query_sha256", "preview_sha256", "result_sha256", "verification_complete", "elapsed_ms"]:
        assert token in API
        assert token in APP
        assert token in STANDALONE


def test_v012_capabilities_contract_is_exposed():
    assert "/capabilities" in API
    semantic = (ROOT / "services" / "semantic" / "executor.py").read_text()
    assert "semantic_engines" in semantic
    assert "auto_selection" in semantic


def test_finance_window_calibration_is_visible():
    grader = (ROOT / "services" / "sparklab" / "grader.py").read_text()
    runtime = (ROOT / "services" / "sparklab" / "runtime.py").read_text()
    assert "grade_finance" in grader
    assert "simulate_finance_window_job" in runtime
    assert "finance_account_window_03" in STANDALONE
    assert "Window.unboundedPreceding" in APP


def test_v012_sql_runtime_contract_is_live_and_bounded():
    assert "/sql/run" in API
    assert "runSqlNotebook" in API
    assert "bounded SQL execution" in APP
    assert "SQLite oracle fallback" in APP
