# Codex task — SparkLab Runtime Pass 1

Repository: https://github.com/julian-passebecq/ducklabms_code
Working branch: `codex/sparklab-runtime-pass-1`
Base: `integration/notebook-interview-pass-2`

This is a **coding pass**, not a QA pass.

## Read first

1. `AGENTS.md`
2. `docs/agents/03_SPARKLAB_KERNEL.md`
3. `docs/NOTEBOOK_RUNTIME_CONTRACT.md`
4. `docs/MODULE_CONTRACT.md`
5. `docs/SOURCE_AUDIT.md`
6. `docs/VERIFICATION.md`
7. inspect `services/sparklab`
8. inspect `migration-sources/sparklab` only for stronger existing behavior/fixtures/tests
9. inspect the shared runtime/profile controls already used by `apps/web` and `apps/api/datapass/execution.py`

Do not redesign the application architecture. Keep the single React shell, FastAPI control plane, shared workspace/catalog/notebook/runtime model.

## Coding-budget rule

Maximize implementation.

- Do **not** run the full Python, browser, startup, DuckLake, integration or release suites.
- Run only a minimal targeted parser/runtime test or typecheck if a concrete coding step requires it.
- Do not repeatedly rerun tests after small edits.
- Mark broad verification `DEFERRED TO EXTERNAL QA`.
- Do not use a Medium/higher-cost agent without explicit user confirmation.
- If one area becomes blocked, continue with another bounded implementation area.

## Main objective

Make SparkLab a much more realistic **free Spark learning/runtime simulator** for data-engineering practice while keeping truth boundaries explicit:

```text
user PySpark-like source
        ↓
safe supported semantic parser
        ↓
real local result over shared catalog
        ↓
logical/physical teaching plan
        ↓
deterministic virtual cluster execution
        ↓
stages / tasks / shuffle / skew / spill / AQE / cost model
```

The result rows are real local semantics where supported.
The cluster/stage/cost layer is simulated and must never be presented as a real Spark cluster or real vendor invoice.

## A. Expand and formalize supported Spark semantics

Improve the published SparkLab subset and diagnostics.

Prioritize support for common data-engineering interview/project operations where the existing safe parser architecture can support them truthfully:

- `spark.table`
- `select`
- `selectExpr` only if safely bounded; otherwise explicitly reject
- `filter` / `where`
- `withColumn`
- `drop`
- `alias`
- `join` with common join types
- `groupBy(...).agg(...)`
- `orderBy` / `sort`
- `limit`
- `distinct`
- `dropDuplicates`
- common aggregate functions
- `col`, `lit`, `coalesce`, simple `when/otherwise` if the compiler can support them safely
- common null predicates
- basic cast/alias expressions
- bounded window functions where existing architecture can support them correctly
- lazy transformations versus actions

Preserve/reinforce:
- Python `and` / `or` on Spark Columns must be rejected;
- no arbitrary Python execution in SparkLab;
- no unsupported syntax silently returning prerecorded answers;
- errors should explain the supported alternative when possible.

Create or update a concise machine-readable/support-table source used by both backend capability reporting and UI help where practical.

## B. Add an explicit Spark runtime/profile contract

Create shared versioned runtime-profile data for SparkLab, separate from vendor branding.

A profile should be able to describe at least:

- profile ID/name;
- driver cores/memory;
- executor count;
- executor cores/memory;
- total virtual cores;
- default partition target;
- shuffle partition target;
- broadcast threshold;
- AQE on/off/default;
- virtual worker startup overhead;
- virtual IO/network throughput assumptions;
- Datapass-credit rate or other clearly fictional internal price;
- optional descriptive tags such as small/balanced/large.

Keep existing profiles compatible where possible.

The same profile must be selectable from the shared notebook/runtime strip.

Changing profile **must never change result rows**. It may only change simulated execution/physical-plan/cost evidence.

## C. Improve notebook runtime selection UX

Improve the shared notebook runtime selector so SparkLab feels closer to a Fabric/Databricks notebook runtime selector without creating a second notebook implementation.

Useful UI:

- kernel;
- SparkLab runtime/profile;
- AQE toggle;
- compact profile summary;
- truth badge: “local semantic result + simulated distributed execution”;
- estimated virtual workers/cores/memory;
- optional “runtime details” popover/panel.

Do not claim the virtual profiles are actual Microsoft Fabric capacities or Databricks node types.

If you add familiar “Fabric-inspired” or “Databricks-inspired” presentation labels, clearly state they are teaching skins/profiles, not vendor parity.

## D. Build a stronger deterministic physical simulator

Keep semantic execution and simulation separate.

Extend the simulator so a supported SparkLab run can produce realistic teaching evidence such as:

- job;
- stages;
- stage dependencies;
- task counts;
- input/output rows;
- input/output bytes estimates;
- partition counts;
- shuffle read/write;
- broadcast exchanges;
- sort;
- aggregation;
- skew indicators;
- spill indicators;
- task duration distribution;
- scheduler/startup overhead;
- executor utilization;
- straggler indication;
- AQE coalescing/split effects where applicable;
- cache/reuse labels only if actually modeled.

The simulator should be deterministic for the same:
- source/logical plan;
- fixture statistics;
- runtime profile;
- AQE setting.

Do not use random output that makes exercises unreproducible.

## E. Add a Spark UI-style evidence surface

Inside the existing Datapass shell, add a bounded SparkLab run-inspection surface.

Useful panes/tabs:

- Result
- Logical plan
- Physical teaching plan
- Jobs
- Stages
- Tasks preview
- Shuffle / skew
- Cost / runtime estimate
- Truth / assumptions

Do not create a separate standalone Spark UI app.

The UI should clearly distinguish:

```text
REAL LOCAL RESULT
SIMULATED DISTRIBUTED METRICS
ASSUMED INPUT STATISTICS
UNAVAILABLE / UNSUPPORTED
```

Use Fluent UI 2 and existing module/surface registration.

## F. Add one additional end-to-end truth pack

The current root connects only one physical-model truth pack.

Add **one additional strong SparkLab truth pack** that exercises a different realistic DE pattern, preferably one of:

- skewed join + AQE;
- window + partition/order semantics;
- groupBy aggregation with shuffle;
- duplicate/null-sensitive join;
- broadcast-vs-shuffle join comparison.

The pack should contain:

- immutable bounded semantic fixture;
- expected result rows;
- authored logical/physical assumptions;
- statistics used by simulation;
- at least one correct solution;
- at least two incorrect-but-plausible counterexamples;
- a profile comparison scenario;
- an AQE comparison where relevant.

Use shared catalog input and existing case/exercise infrastructure where practical.

Do not fabricate “real cluster benchmark calibration” unless actual benchmark data is present. Label assumptions as assumptions.

## G. Add deterministic Datapass Credits pricing

The user wants a totally free fake Spark runtime with its own pricing model.

Implement a fictional internal cost model such as **Datapass Credits** based on the virtual profile and simulated execution.

Requirements:

- deterministic;
- documented formula;
- clearly fictional;
- independent from result correctness;
- no implication of actual Fabric/Databricks billing;
- explain major cost contributors;
- allow profile comparison;
- show “what changed and why” when switching profiles/AQE.

If existing cost code already provides the right seam, extend it rather than replacing it.

## H. Improve plan explanation for learning

Add structured explanations that connect source operations to Spark concepts:

- transformation vs action;
- narrow vs wide dependency;
- shuffle boundary;
- partitioning;
- broadcast;
- aggregation;
- window;
- sort;
- skew;
- AQE;
- spill;
- stage/task relationship.

Prefer structured plan nodes/data over giant generated prose strings.

This should be reusable by notebook explanations and Interview Practice later.

## I. Preserve Interview Practice compatibility

SparkLab exercises from the new shared exercise-pack system must continue to work.

Where practical:
- let a SparkLab exercise attach simulated plan/stage evidence to a successful semantic run;
- keep hidden grading expectations server-side;
- record truth as `semantic-emulation`;
- do not let changing virtual profile make a semantically wrong solution pass;
- do not let the physical simulator substitute for result correctness.

Do not create a SparkLab-only exercise store.

## J. Optional PySpark oracle tooling, not a blocking dependency

Add a bounded developer/oracle script or fixture format that can compare selected SparkLab semantics to real PySpark **when PySpark is available externally**.

Do not install or require a full Spark distribution during this coding pass.

Useful oracle coverage targets:
- null comparison;
- duplicate-sensitive joins;
- aggregate types;
- ordering;
- groupBy;
- windows;
- duplicate column names.

If real PySpark is unavailable, implement the oracle harness/fixture format and mark execution `DEFERRED TO EXTERNAL QA`.

## Out of scope

Do not:
- install/run Kubernetes;
- create Docker-based distributed Spark;
- create a real multi-node cluster;
- create another API/service/app;
- claim full PySpark compatibility;
- claim real Fabric/Databricks prices;
- implement unrelated Power BI/Airflow/dbt work;
- run broad QA;
- call the result v0.2 automatically.

## Minimal checks only

During coding, use only what is needed to continue safely, such as:
- a focused Spark parser/runtime test file;
- one deterministic simulator test;
- one typecheck after UI contract changes.

No full browser/regression suite.

## Completion handoff

Commit implementation to `codex/sparklab-runtime-pass-1`.

Report:

- Spark syntax/semantics added;
- runtime-profile contract changes;
- simulator/physical metrics implemented;
- UI surfaces added;
- truth pack added;
- cost model changes;
- Interview integration changes;
- exact files changed;
- minimal checks actually run;
- broad checks deferred;
- unsupported semantics that remain;
- whether the branch is ready for coordinator review.

Do not stop at a plan. Implement the pass.
