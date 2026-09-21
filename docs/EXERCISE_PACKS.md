# Exercise packs and bounded grading

The shared server registry discovers `content/exercise-packs/*/manifest.json` at process startup. Restart the API/workers after installing or changing packs. A pack has three files:

- `manifest.json`: schema version 1, unique ID/version, title, enabled flag, provenance.
- `exercises.json`: public `ExerciseDefinition` array, including canonical placement, related associations, recommendations, capabilities, constraints, public schema/sample context and source provenance.
- `grading.server.json`: map from exercise ID to reference solution and visible/hidden/edge fixtures. Never import this file into web code or serve the content directory as static files.

One active version per exercise ID is supported. Duplicate pack IDs or exercise IDs (including a different version of the same ID) fail registration. Registration validates a complete candidate before changing the registry. Disabled packs remain discoverable at `GET /api/exercise-packs`; their exercises and solutions are unavailable. Existing notebooks can still save their drafts when a pack is disabled or removed.

Each private fixture declares `id`, `visibility`, `input_rows`, and `expected`. References must agree exactly with the public definition. Input and output rows are rectangular finite JSON scalars, bounded to 200 rows. This pass supports one fixture input relation, named `input` in SQL/SparkLab and `input_rows` in Python/Polars. Public `data_context[0].columns` supplies its schema; `sample_rows` must contain only intentionally public examples. No hidden samples are inferred into this field.

The installed `internal-demo` pack v2 contains five tiny exercises: the retained SQL sum/count exercises, plus Python, Polars and SparkLab duplicate/null projection. These are not CodeDELeet content. Their validator is `rows-v2`.

## Runtime and validation

Grading calls the existing Engine inside the serialized workspace worker. SQL and SparkLab use a server-owned CTE without replacing catalog tables. Python/Polars receive copied rows in fresh temporary notebook namespaces, removed after every check. They use the existing trusted-local opt-in and installed package checks. `display(rows, columns=['value'])` preserves an explicit schema for an empty Python result; Polars frame columns are preserved automatically. SparkLab parses only its existing bounded AST subset; its result truth is semantic-emulation. No full PySpark, dbt or Airflow grading is implied.

Validation supports ordered/unordered duplicate-sensitive rows, optional deduplication, exact column order (`exact_schema`), required columns, extra-column rejection, row count, NULL equality/rejection, finite nonnegative numeric tolerances, and aggregate comparisons (`sum`, non-null `count`, `min`, `max`). Exact schema currently means column names/order, not engine SQL type identity. Aggregates replace per-row equality while other declared checks still apply. NULLs do not contribute to aggregates. The optional `python-function-solve` source contract verifies an actual top-level function AST node; it does not require or prove a particular algorithm. No keyword scoring is used.

Run executes only visible fixtures. Submit executes all fixtures and persists the shared ExerciseAttempt, including the installed validator/fixture versions and runtime truth. Only visible raw executions enter generic run history; hidden/edge checks expose status, execution identity and timing, with no rows, SQL, input versions or error detail. Trusted Python remains local privileged code, not a secure examination sandbox.

`GET /api/workspaces/{id}/practice/progress` aggregates all durable attempts for currently installed exercise versions. It returns latest/best status, solved state, count, timestamp and topic/difficulty totals independently of the latest-200 detailed history window.

## CodeDELeet adapter

`scripts/migrate-codedeleet.py SOURCE DESTINATION --id PACK_ID --version VERSION` converts explicit JSON exports into a disabled pack and a migration report. Destination must not already exist. Supported records are `exercises`/`workstations` with explicitly verified variants, authored prompts/starters/solutions and normalized fixture rows/outputs. The adapter maps legacy IDs, domain/lab/taxonomy, placement, related practice, recommendations, hints, explanation, follow-ups, constraints, context and provenance. It validates output through the real registry.

This is a bounded adapter, not an assertion that arbitrary raw V3.2 archives match its input schema. Unverified variants are skipped; unsupported runtimes/truths are reported; old notebook/dbt/graph/guided-step/relation-test structures are reported as warnings rather than executed or guessed. Only metadata/content is converted, never shell/editor/runtime state. The repository contains the audit but no actual CodeDELeet packs; no corpus import is claimed.
