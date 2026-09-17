import { defaultDbtProject, executePythonLearning, executeWorkspaceSql, findWorkspaceTable, runDbtCommand, type DbtCommand } from './dataRuntime';
import type { DataWorkspace, PageKey } from '../types/app';

export type PracticeDifficulty = 'Easy' | 'Medium' | 'Challenge';
export type PracticeKind = 'decision' | 'sql' | 'python' | 'dbt';
export type PracticeTool = 'SQL' | 'dbt' | 'Python/pandas' | 'Spark' | 'Fabric Pipeline' | 'Airflow';

export interface PracticeExercise {
  id: string;
  caseStudyId: 'all' | 'retail-medallion' | 'turbine-realtime' | 'erp-incremental';
  title: string;
  difficulty: PracticeDifficulty;
  kind: PracticeKind;
  concept: string;
  objective: string;
  prompt: string;
  starter: string;
  hint: string;
  solution: string;
  expectedEvidence: string;
  route: PageKey;
  expectedTool?: PracticeTool;
  targetTable?: string;
  requiredColumns?: string[];
  minRows?: number;
  expectedDbtCommand?: DbtCommand;
  repeatRuns?: number;
  stableTable?: string;
}

export interface PracticeExerciseProgress {
  exerciseId: string;
  attempts: number;
  failedAttempts: number;
  hintsUsed: number;
  solutionRevealed: boolean;
  completed: boolean;
  bestScore: number;
  lastMessage: string;
  lastEvidence: string;
}

export interface PracticeProgress {
  caseStudyId: string;
  startedAt: string;
  updatedAt: string;
  exercises: Record<string, PracticeExerciseProgress>;
}

export interface PracticeRunResult {
  workspace: DataWorkspace;
  ok: boolean;
  message: string;
  evidence: string;
  output: string;
}

const now = () => new Date().toISOString();
const tools: PracticeTool[] = ['SQL', 'dbt', 'Python/pandas', 'Spark', 'Fabric Pipeline', 'Airflow'];
export const practiceTools = tools;

export const practiceExercises: PracticeExercise[] = [
  {
    id: 'decision-relational-small', caseStudyId: 'all', difficulty: 'Easy', kind: 'decision', title: 'Do not start Spark for a normal aggregation', concept: 'Smallest sufficient tool',
    objective: 'Choose the simplest primary transformation tool for a relational workload already in a SQL engine.',
    prompt: '300k warehouse rows need a grouped KPI and a validation query. There is no distributed-scale requirement. What do you choose first?',
    starter: '', hint: 'The data is already in a relational engine and the work is set-based.', solution: 'SQL', expectedTool: 'SQL', expectedEvidence: 'You identify SQL as the primary tool and reject unnecessary distributed-compute overhead.', route: 'sql',
  },
  {
    id: 'decision-dbt-project', caseStudyId: 'all', difficulty: 'Medium', kind: 'decision', title: 'Choose dbt for maintained SQL transformations', concept: 'Transformation engineering',
    objective: 'Separate SQL transformation project concerns from distributed compute and orchestration.',
    prompt: 'You have staging, intermediate, fact and dimension SQL models. They need ref() dependencies, tests, lineage and repeatable builds. What is the primary tool?',
    starter: '', hint: 'The requirement is not scale. It is model structure, tests and dependency management.', solution: 'dbt', expectedTool: 'dbt', expectedEvidence: 'You choose dbt for maintained SQL model DAGs rather than Spark or Airflow.', route: 'dbt',
  },
  {
    id: 'decision-fabric-pipeline', caseStudyId: 'all', difficulty: 'Medium', kind: 'decision', title: 'Visual Fabric orchestration', concept: 'Pipeline vs transformation runtime',
    objective: 'Recognize when Fabric Pipeline should own orchestration.',
    prompt: 'Copy a source, run a Notebook, execute dbt build, branch on failure and inspect everything in Fabric Monitor. The team prefers visual Fabric-native operations. What owns the workflow?',
    starter: '', hint: 'Notebook/dbt perform work; another layer should sequence them.', solution: 'Fabric Pipeline', expectedTool: 'Fabric Pipeline', expectedEvidence: 'You choose Fabric Pipeline as the orchestration layer rather than Spark/dbt.', route: 'pipeline',
  },
  {
    id: 'decision-airflow-code', caseStudyId: 'all', difficulty: 'Challenge', kind: 'decision', title: 'Code-first orchestration', concept: 'Pipeline vs Airflow',
    objective: 'Recognize when Python DAG ownership justifies Airflow.',
    prompt: 'A platform team wants code-reviewed Python DAGs, reusable operators and explicit orchestration across several Fabric jobs. What owns the DAG?',
    starter: '', hint: 'The requirement is code-first workflow orchestration, not transformation.', solution: 'Airflow', expectedTool: 'Airflow', expectedEvidence: 'You select Airflow for code-first DAG orchestration and keep dbt/Spark as task-level tools.', route: 'airflow',
  },
  {
    id: 'dbt-compile-no-mutation', caseStudyId: 'all', difficulty: 'Challenge', kind: 'dbt', title: 'Inspect dbt compilation without changing data', concept: 'dbt command semantics',
    objective: 'Use the dbt command that compiles model SQL without materializing models.',
    prompt: 'Enter the dbt command that should compile selected models while leaving the shared workspace snapshot unchanged.',
    starter: 'dbt compile', hint: 'You want rendered SQL, not model execution.', solution: 'dbt compile', expectedDbtCommand: 'dbt compile', expectedEvidence: 'Compiled SQL is produced and the workspace snapshot does not change.', route: 'dbt',
  },
  {
    id: 'retail-sql-units', caseStudyId: 'retail-medallion', difficulty: 'Easy', kind: 'sql', title: 'Aggregate retail units with SQL', concept: 'Set-based aggregation',
    objective: 'Create an aggregate table without using Spark or Python.',
    prompt: 'Create practice.customer_units from raw.sales_csv with one row per customer_id and SUM(qty) AS units.',
    starter: 'CREATE TABLE practice.customer_units AS\nSELECT customer_id, SUM(qty) AS units\nFROM raw.sales_csv\nGROUP BY customer_id;', hint: 'Use CTAS + GROUP BY. No notebook is needed.', solution: 'CREATE TABLE practice.customer_units AS SELECT customer_id, SUM(qty) AS units FROM raw.sales_csv GROUP BY customer_id;', expectedEvidence: 'practice.customer_units exists with customer_id and units.', targetTable: 'practice.customer_units', requiredColumns: ['customer_id', 'units'], minRows: 1, route: 'sql',
  },
  {
    id: 'retail-python-clean', caseStudyId: 'retail-medallion', difficulty: 'Medium', kind: 'python', title: 'Clean retail rows with the notebook API', concept: 'Small-data Python transformation',
    objective: 'Use pandas-style notebook operations only where code adds value.',
    prompt: 'Read raw.sales_csv, remove duplicate sale_id rows, keep qty > 0, and write practice.retail_clean.',
    starter: 'df = table("raw.sales_csv")\ndf = df.drop_duplicates(["sale_id"])\ndf = df.filter("qty > 0")\nwrite_table("practice.retail_clean", df)\ndisplay(df)', hint: 'Use table(), drop_duplicates(), filter(), then write_table().', solution: 'df = table("raw.sales_csv")\ndf = df.drop_duplicates(["sale_id"])\ndf = df.filter("qty > 0")\nwrite_table("practice.retail_clean", df)', expectedEvidence: 'practice.retail_clean exists and contains a unique sale_id set with positive quantities.', targetTable: 'practice.retail_clean', requiredColumns: ['sale_id', 'qty'], minRows: 1, route: 'notebook',
  },
  {
    id: 'retail-dbt-build', caseStudyId: 'retail-medallion', difficulty: 'Challenge', kind: 'dbt', title: 'Build and test the retail dbt project', concept: 'dbt build',
    objective: 'Materialize the model DAG and run its tests.',
    prompt: 'Run the dbt command that both materializes the project models and executes configured tests.',
    starter: 'dbt build', hint: 'dbt run materializes; one command also runs tests.', solution: 'dbt build', expectedDbtCommand: 'dbt build', expectedEvidence: 'dbt models materialize, tests pass, and lineage is emitted.', route: 'dbt',
  },
  {
    id: 'turbine-sql-avg', caseStudyId: 'turbine-realtime', difficulty: 'Easy', kind: 'sql', title: 'Aggregate turbine temperature with SQL', concept: 'SQL before Spark when scale is small',
    objective: 'Solve a representative learning sample with SQL even though the production story may justify Spark.',
    prompt: 'Create practice.turbine_temperature with AVG(gearbox_temp_c) AS avg_temp grouped by turbine_id.',
    starter: 'CREATE TABLE practice.turbine_temperature AS\nSELECT turbine_id, AVG(gearbox_temp_c) AS avg_temp\nFROM iot.turbine_events\nGROUP BY turbine_id;', hint: 'The learning sample is tiny. Use SQL for the local aggregate.', solution: 'CREATE TABLE practice.turbine_temperature AS SELECT turbine_id, AVG(gearbox_temp_c) AS avg_temp FROM iot.turbine_events GROUP BY turbine_id;', expectedEvidence: 'practice.turbine_temperature contains one aggregate row per turbine.', targetTable: 'practice.turbine_temperature', requiredColumns: ['turbine_id', 'avg_temp'], minRows: 1, route: 'sql',
  },
  {
    id: 'turbine-python-features', caseStudyId: 'turbine-realtime', difficulty: 'Medium', kind: 'python', title: 'Engineer representative telemetry features', concept: 'Python sample vs production Spark',
    objective: 'Execute a small representative feature-engineering sample locally while understanding why production may use Spark.',
    prompt: 'Read iot.turbine_events, copy it, calculate temperature_delta from gearbox_temp_c - 65, then write practice.turbine_features.',
    starter: 'events = table("iot.turbine_events")\nfeatures = events.copy()\nfeatures["temperature_delta"] = features["gearbox_temp_c"] - 65\nwrite_table("practice.turbine_features", features)\ndisplay(features)', hint: 'This local sample needs no cluster; the production workload can still use PySpark.', solution: 'events = table("iot.turbine_events")\nfeatures = events.copy()\nfeatures["temperature_delta"] = features["gearbox_temp_c"] - 65\nwrite_table("practice.turbine_features", features)', expectedEvidence: 'practice.turbine_features exists with temperature_delta.', targetTable: 'practice.turbine_features', requiredColumns: ['turbine_id', 'temperature_delta'], minRows: 1, route: 'notebook',
  },
  {
    id: 'turbine-spark-decision', caseStudyId: 'turbine-realtime', difficulty: 'Challenge', kind: 'decision', title: 'When Spark is actually justified', concept: 'Distributed compute threshold',
    objective: 'Choose Spark because of production-scale characteristics, not because the code is data engineering.',
    prompt: 'Production receives several TB/day of partitioned telemetry with large joins and repeated Bronze→Silver transformations. Which compute choice is justified for that production transform?',
    starter: '', hint: 'The production problem includes partitions, many files and distributed-scale joins.', solution: 'Spark', expectedTool: 'Spark', expectedEvidence: 'You choose Spark for production distributed scale while keeping the local learning sample lightweight.', route: 'runtime',
  },
  {
    id: 'erp-sql-changes', caseStudyId: 'erp-incremental', difficulty: 'Easy', kind: 'sql', title: 'Materialize changed ERP orders', concept: 'Incremental predicate',
    objective: 'Use the watermark boundary in a relational query before reaching for distributed compute.',
    prompt: "Create practice.erp_changed_orders from erp.sales_order where modified_at >= '2026-09-16'.",
    starter: "CREATE TABLE practice.erp_changed_orders AS\nSELECT * FROM erp.sales_order\nWHERE modified_at >= '2026-09-16';", hint: 'This is a relational incremental predicate; CTAS is enough.', solution: "CREATE TABLE practice.erp_changed_orders AS SELECT * FROM erp.sales_order WHERE modified_at >= '2026-09-16';", expectedEvidence: 'practice.erp_changed_orders exists and contains the incremental change set.', targetTable: 'practice.erp_changed_orders', requiredColumns: ['order_id', 'modified_at'], minRows: 1, route: 'sql',
  },
  {
    id: 'erp-dbt-build', caseStudyId: 'erp-incremental', difficulty: 'Medium', kind: 'dbt', title: 'Build the ERP incremental dbt models', concept: 'Incremental dbt model + tests',
    objective: 'Use dbt for SQL-first incremental transformation and quality gates.',
    prompt: 'Run the command that materializes the ERP dbt project and executes its tests.',
    starter: 'dbt build', hint: 'You need both execution and tests.', solution: 'dbt build', expectedDbtCommand: 'dbt build', expectedEvidence: 'The customer-change staging/gold models materialize and dbt tests pass.', route: 'dbt',
  },
  {
    id: 'erp-no-spark', caseStudyId: 'erp-incremental', difficulty: 'Challenge', kind: 'decision', title: 'Do not solve metadata-driven CDC with Spark by default', concept: 'State/idempotency vs compute scale',
    objective: 'Identify the primary transformation project tool for relational incremental models.',
    prompt: 'ERP CDC volume is moderate. The hard requirements are incremental model state, SQL transformations, tests and dimensional consistency. Which primary transformation tool fits best?',
    starter: '', hint: 'The problem is maintainable SQL transformation state, not distributed compute.', solution: 'dbt', expectedTool: 'dbt', expectedEvidence: 'You choose dbt and explain that Spark does not solve watermark/idempotency/model-test concerns.', route: 'dbt',
  },
  {
    id: 'retail-sql-join', caseStudyId: 'retail-medallion', difficulty: 'Medium', kind: 'sql', title: 'Join raw and Silver retail data', concept: 'Relational joins',
    objective: 'Use SQL JOIN when the task is relational instead of reaching for Python or Spark.',
    prompt: 'Create practice.retail_joined by joining raw.sales_csv r to silver.sales_clean s on sale_id. Select r.sale_id, r.customer_id and s.net_sales.',
    starter: 'CREATE TABLE practice.retail_joined AS\nSELECT r.sale_id, r.customer_id, s.net_sales\nFROM raw.sales_csv r\nINNER JOIN silver.sales_clean s ON r.sale_id = s.sale_id;', hint: 'Use an INNER JOIN on the shared sale_id business key.', solution: 'CREATE TABLE practice.retail_joined AS SELECT r.sale_id, r.customer_id, s.net_sales FROM raw.sales_csv r INNER JOIN silver.sales_clean s ON r.sale_id = s.sale_id;', expectedEvidence: 'practice.retail_joined exists with sale_id, customer_id and net_sales.', targetTable: 'practice.retail_joined', requiredColumns: ['sale_id', 'customer_id', 'net_sales'], minRows: 1, route: 'sql',
  },
  {
    id: 'turbine-sql-join', caseStudyId: 'turbine-realtime', difficulty: 'Medium', kind: 'sql', title: 'Join telemetry to engineered risk', concept: 'Join operational and feature tables',
    objective: 'Combine raw telemetry context with engineered risk using SQL.',
    prompt: 'Create practice.turbine_risk_join by joining iot.turbine_events e to silver.turbine_features f on event_id. Select event_id, turbine_id and risk_score.',
    starter: 'CREATE TABLE practice.turbine_risk_join AS\nSELECT e.event_id, e.turbine_id, f.risk_score\nFROM iot.turbine_events e\nINNER JOIN silver.turbine_features f ON e.event_id = f.event_id;', hint: 'The feature table already contains risk_score; join on event_id.', solution: 'CREATE TABLE practice.turbine_risk_join AS SELECT e.event_id, e.turbine_id, f.risk_score FROM iot.turbine_events e INNER JOIN silver.turbine_features f ON e.event_id = f.event_id;', expectedEvidence: 'practice.turbine_risk_join contains event context and risk_score.', targetTable: 'practice.turbine_risk_join', requiredColumns: ['event_id', 'turbine_id', 'risk_score'], minRows: 1, route: 'sql',
  },
  {
    id: 'erp-sql-left-join', caseStudyId: 'erp-incremental', difficulty: 'Medium', kind: 'sql', title: 'Left join customers to orders', concept: 'Preserve unmatched dimension candidates',
    objective: 'Use LEFT JOIN to preserve customers even when no order row exists.',
    prompt: 'Create practice.customer_orders from erp.customer c LEFT JOIN erp.sales_order o ON customer_id. Select c.customer_id, c.customer_name, o.order_id and o.amount.',
    starter: 'CREATE TABLE practice.customer_orders AS\nSELECT c.customer_id, c.customer_name, o.order_id, o.amount\nFROM erp.customer c\nLEFT JOIN erp.sales_order o ON c.customer_id = o.customer_id;', hint: 'LEFT JOIN keeps C305 even if there is no matching order.', solution: 'CREATE TABLE practice.customer_orders AS SELECT c.customer_id, c.customer_name, o.order_id, o.amount FROM erp.customer c LEFT JOIN erp.sales_order o ON c.customer_id = o.customer_id;', expectedEvidence: 'practice.customer_orders exists with customer and optional order attributes.', targetTable: 'practice.customer_orders', requiredColumns: ['customer_id', 'customer_name', 'order_id', 'amount'], minRows: 3, route: 'sql',
  },
  {
    id: 'erp-dbt-idempotent', caseStudyId: 'erp-incremental', difficulty: 'Challenge', kind: 'dbt', title: 'Prove incremental dbt rerun is idempotent', concept: 'Incremental rerun safety',
    objective: 'Run the same incremental dbt build twice and prove the unique-key model does not duplicate rows.',
    prompt: 'Use the dbt command that materializes and tests models. The practice engine will execute it twice and compare staging.customer_changes row counts.',
    starter: 'dbt build', hint: 'You need materialization plus tests, and the incremental model has a unique key.', solution: 'dbt build', expectedDbtCommand: 'dbt build', repeatRuns: 2, stableTable: 'staging.customer_changes', expectedEvidence: 'Two dbt builds complete with the same staging.customer_changes row count.', route: 'dbt',
  },

];

export function exercisesForCase(caseStudyId: string): PracticeExercise[] {
  return practiceExercises.filter((exercise) => exercise.caseStudyId === 'all' || exercise.caseStudyId === caseStudyId);
}

export function emptyPracticeExerciseProgress(exerciseId: string): PracticeExerciseProgress {
  return { exerciseId, attempts: 0, failedAttempts: 0, hintsUsed: 0, solutionRevealed: false, completed: false, bestScore: 0, lastMessage: '', lastEvidence: '' };
}

export function createPracticeProgress(caseStudyId: string): PracticeProgress {
  const exercises = exercisesForCase(caseStudyId);
  return { caseStudyId, startedAt: now(), updatedAt: now(), exercises: Object.fromEntries(exercises.map((exercise) => [exercise.id, emptyPracticeExerciseProgress(exercise.id)])) };
}

export function normalizePracticeProgress(progress: PracticeProgress | undefined, caseStudyId: string): PracticeProgress {
  const seeded = createPracticeProgress(caseStudyId);
  if (!progress || progress.caseStudyId !== caseStudyId) return seeded;
  seeded.startedAt = progress.startedAt || seeded.startedAt;
  seeded.updatedAt = progress.updatedAt || seeded.updatedAt;
  for (const exercise of exercisesForCase(caseStudyId)) {
    const source = progress.exercises?.[exercise.id];
    if (!source) continue;
    seeded.exercises[exercise.id] = {
      ...emptyPracticeExerciseProgress(exercise.id), ...source, exerciseId: exercise.id,
      attempts: Math.max(0, Number(source.attempts ?? 0)), failedAttempts: Math.max(0, Number(source.failedAttempts ?? 0)),
      hintsUsed: Math.min(3, Math.max(0, Number(source.hintsUsed ?? 0))), bestScore: Math.min(100, Math.max(0, Number(source.bestScore ?? 0))),
      completed: Boolean(source.completed), solutionRevealed: Boolean(source.solutionRevealed),
    };
  }
  return seeded;
}

export function practiceExerciseScore(progress: PracticeExerciseProgress, difficulty: PracticeDifficulty): number {
  const difficultyBonus = difficulty === 'Challenge' ? 5 : difficulty === 'Medium' ? 2 : 0;
  const failedPenalty = progress.failedAttempts * (difficulty === 'Challenge' ? 12 : 8);
  const hintPenalty = progress.hintsUsed * (difficulty === 'Challenge' ? 8 : 5);
  const solutionPenalty = progress.solutionRevealed ? 25 : 0;
  return Math.max(0, Math.min(100, 100 + difficultyBonus - failedPenalty - hintPenalty - solutionPenalty));
}

export function revealPracticeHint(progress: PracticeProgress, exerciseId: string): PracticeProgress {
  const current = progress.exercises[exerciseId] ?? emptyPracticeExerciseProgress(exerciseId);
  return { ...progress, updatedAt: now(), exercises: { ...progress.exercises, [exerciseId]: { ...current, hintsUsed: Math.min(3, current.hintsUsed + 1) } } };
}

export function revealPracticeSolution(progress: PracticeProgress, exerciseId: string): PracticeProgress {
  const current = progress.exercises[exerciseId] ?? emptyPracticeExerciseProgress(exerciseId);
  return { ...progress, updatedAt: now(), exercises: { ...progress.exercises, [exerciseId]: { ...current, solutionRevealed: true } } };
}

export function recordPracticeAttempt(progress: PracticeProgress, exercise: PracticeExercise, result: PracticeRunResult): PracticeProgress {
  const current = progress.exercises[exercise.id] ?? emptyPracticeExerciseProgress(exercise.id);
  const updated: PracticeExerciseProgress = {
    ...current,
    attempts: current.attempts + 1,
    failedAttempts: current.failedAttempts + (result.ok ? 0 : 1),
    completed: current.completed || result.ok,
    lastMessage: result.message,
    lastEvidence: result.evidence,
  };
  if (result.ok) updated.bestScore = Math.max(current.bestScore, practiceExerciseScore(updated, exercise.difficulty));
  return { ...progress, updatedAt: now(), exercises: { ...progress.exercises, [exercise.id]: updated } };
}

export function resetPracticeExercise(progress: PracticeProgress, exerciseId: string): PracticeProgress {
  return { ...progress, updatedAt: now(), exercises: { ...progress.exercises, [exerciseId]: emptyPracticeExerciseProgress(exerciseId) } };
}

export function practiceSummary(progress: PracticeProgress, caseStudyId: string) {
  const exercises = exercisesForCase(caseStudyId);
  const states = exercises.map((exercise) => progress.exercises[exercise.id] ?? emptyPracticeExerciseProgress(exercise.id));
  const completed = states.filter((state) => state.completed).length;
  const scores = states.filter((state) => state.completed).map((state) => state.bestScore);
  return {
    completed, total: exercises.length, completionPercent: exercises.length ? Math.round(completed / exercises.length * 100) : 0,
    masteryScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    attempts: states.reduce((sum, state) => sum + state.attempts, 0), hintsUsed: states.reduce((sum, state) => sum + state.hintsUsed, 0),
  };
}

function validateTarget(workspace: DataWorkspace, exercise: PracticeExercise): { ok: boolean; evidence: string } {
  if (!exercise.targetTable) return { ok: true, evidence: exercise.expectedEvidence };
  const table = findWorkspaceTable(workspace, exercise.targetTable);
  if (!table) return { ok: false, evidence: `${exercise.targetTable} was not created.` };
  const required = exercise.requiredColumns ?? [];
  const missing = required.filter((column) => !table.columns.some((item) => item.name === column));
  if (missing.length) return { ok: false, evidence: `${exercise.targetTable} is missing: ${missing.join(', ')}` };
  if (table.rows.length < (exercise.minRows ?? 0)) return { ok: false, evidence: `${exercise.targetTable} has ${table.rows.length} rows; expected at least ${exercise.minRows}.` };
  return { ok: true, evidence: `${exercise.targetTable}: ${table.rows.length} rows · ${required.length ? `columns ${required.join(', ')}` : 'expected table present'} · snapshot ${workspace.snapshot}` };
}

export function runPracticeExercise(exercise: PracticeExercise, workspace: DataWorkspace, submission: string): PracticeRunResult {
  try {
    if (exercise.kind === 'decision') {
      const choice = submission.trim() as PracticeTool;
      const ok = choice === exercise.expectedTool;
      return { workspace, ok, message: ok ? `Correct choice: ${choice}.` : `${choice || 'No tool'} is not the best primary choice for this scenario.`, evidence: ok ? exercise.expectedEvidence : `Expected primary tool: ${exercise.expectedTool}.`, output: ok ? exercise.expectedEvidence : exercise.hint };
    }
    if (exercise.kind === 'sql') {
      const result = executeWorkspaceSql(workspace, submission, { actor: `Practice · ${exercise.title}`, operation: 'practice SQL' });
      const validated = validateTarget(result.workspace, exercise);
      return { workspace: result.workspace, ok: validated.ok, message: validated.ok ? 'SQL exercise passed.' : 'SQL ran but the required evidence is incomplete.', evidence: validated.evidence, output: result.output };
    }
    if (exercise.kind === 'python') {
      const result = executePythonLearning(workspace, submission);
      const validated = validateTarget(result.workspace, exercise);
      return { workspace: result.workspace, ok: validated.ok, message: validated.ok ? 'Python exercise passed.' : 'Python ran but the required evidence is incomplete.', evidence: validated.evidence, output: result.output };
    }
    const command = submission.trim() as DbtCommand;
    const allowed: DbtCommand[] = ['dbt build', 'dbt run', 'dbt compile', 'dbt test'];
    if (!allowed.includes(command)) return { workspace, ok: false, message: 'Use one of: dbt build, dbt run, dbt compile, dbt test.', evidence: 'No dbt command executed.', output: '' };
    const beforeSnapshot = workspace.snapshot;
    const repeatRuns = Math.max(1, exercise.repeatRuns ?? 1);
    let nextWorkspace = workspace; let totalPassed = 0; let totalFailed = 0; const log: string[] = []; const stableCounts: number[] = [];
    for (let index = 0; index < repeatRuns; index += 1) {
      const result = runDbtCommand(nextWorkspace, defaultDbtProject(nextWorkspace), { command });
      nextWorkspace = result.workspace; totalPassed += result.passed; totalFailed += result.failed; log.push(`--- run ${index + 1}/${repeatRuns} ---`, ...result.log);
      if (exercise.stableTable) stableCounts.push(findWorkspaceTable(nextWorkspace, exercise.stableTable)?.rows.length ?? -1);
    }
    const expectedCommandOk = !exercise.expectedDbtCommand || command === exercise.expectedDbtCommand;
    const compileMutationOk = command !== 'dbt compile' || nextWorkspace.snapshot === beforeSnapshot;
    const stableOk = !exercise.stableTable || stableCounts.length < 2 || stableCounts.every((count) => count >= 0 && count === stableCounts[0]);
    const ok = expectedCommandOk && compileMutationOk && stableOk && totalFailed === 0;
    const evidence = command === 'dbt compile'
      ? `Compiled with PASS=${totalPassed} ERROR=${totalFailed}; snapshot ${beforeSnapshot} → ${nextWorkspace.snapshot}.`
      : exercise.stableTable
        ? `${command} ×${repeatRuns}: PASS=${totalPassed} ERROR=${totalFailed}; ${exercise.stableTable} row counts ${stableCounts.join(' → ')}; snapshot ${beforeSnapshot} → ${nextWorkspace.snapshot}.`
        : `${command}: PASS=${totalPassed} ERROR=${totalFailed}; snapshot ${beforeSnapshot} → ${nextWorkspace.snapshot}; lineage ${nextWorkspace.lineage.length}.`;
    return { workspace: nextWorkspace, ok, message: ok ? 'dbt exercise passed.' : !stableOk ? `Rerun changed ${exercise.stableTable} row count; investigate idempotency.` : expectedCommandOk ? 'dbt command ran but did not satisfy the evidence gate.' : `Use ${exercise.expectedDbtCommand} for this objective.`, evidence, output: log.join('\n') };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Practice execution failed.';
    return { workspace, ok: false, message, evidence: 'No passing evidence produced.', output: `ERROR: ${message}` };
  }
}

export function practiceReport(progress: PracticeProgress, caseStudyId: string) {
  const exercises = exercisesForCase(caseStudyId);
  return {
    caseStudyId, generatedAt: now(), summary: practiceSummary(progress, caseStudyId),
    exercises: exercises.map((exercise) => ({
      id: exercise.id, title: exercise.title, difficulty: exercise.difficulty, kind: exercise.kind, concept: exercise.concept,
      ...progress.exercises[exercise.id],
    })),
  };
}

const storageKey = (caseStudyId: string) => `fabric-de-practice:${caseStudyId}`;
export function loadPracticeProgress(caseStudyId: string): PracticeProgress {
  try { return normalizePracticeProgress(JSON.parse(localStorage.getItem(storageKey(caseStudyId)) || 'null') as PracticeProgress | undefined, caseStudyId); }
  catch { return createPracticeProgress(caseStudyId); }
}
export function savePracticeProgress(progress: PracticeProgress): void {
  try { localStorage.setItem(storageKey(progress.caseStudyId), JSON.stringify(progress)); } catch { /* best effort */ }
}
export function clearPracticeProgress(caseStudyId: string): PracticeProgress {
  try { localStorage.removeItem(storageKey(caseStudyId)); } catch { /* best effort */ }
  return createPracticeProgress(caseStudyId);
}
