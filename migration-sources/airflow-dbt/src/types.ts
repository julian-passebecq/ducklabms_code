export type LabMode = 'airflow' | 'dbt' | 'hybrid';
export type ThemeMode = 'light' | 'dark';
export type AirflowTaskState = 'idle' | 'queued' | 'running' | 'waiting' | 'retrying' | 'success' | 'failed' | 'upstream_failed' | 'skipped';
export type DbtNodeState = 'idle' | 'running' | 'success' | 'failed' | 'skipped';

export interface SampleDataset {
  id: string;
  label: string;
  description: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
}

export interface AirflowTaskDefinition {
  id: string;
  label: string;
  type: 'task' | 'sensor' | 'branch' | 'quality' | 'publish' | 'dbt';
  dependsOn: string[];
  retries: number;
  retryDelaySeconds?: number;
  durationSeconds: number;
  taskGroup?: string;
  description: string;
  xcomPush?: string;
  orchestrates?: string[];
  triggerRule?: 'all_success' | 'none_failed_min_one_success' | 'all_done';
  sensorPokeIntervalSeconds?: number;
}

export interface AirflowDefinition {
  dagId: string;
  schedule: string;
  catchup: boolean;
  startDate: string;
  code: string;
  tasks: AirflowTaskDefinition[];
}

export interface DbtModelDefinition {
  id: string;
  path: string;
  layer: 'staging' | 'intermediate' | 'marts';
  materialization: 'view' | 'table' | 'incremental' | 'ephemeral';
  description: string;
  sql: string;
  dependsOn: string[];
  contract?: string[];
}

export interface DbtTestDefinition {
  id: string;
  model: string;
  type: 'not_null' | 'unique' | 'relationships' | 'accepted_values' | 'singular';
  column?: string;
  target?: string;
  acceptedValues?: string[];
  description: string;
}


export interface DbtSnapshotDefinition {
  id: string;
  path: string;
  relation: string;
  uniqueKey: string;
  strategy: 'timestamp' | 'check';
  updatedAt?: string;
  checkCols?: string[];
  description: string;
  before: Array<Record<string, string | number | boolean | null>>;
  after: Array<Record<string, string | number | boolean | null>>;
}

export interface DbtSourceDefinition {
  id: string;
  schema: string;
  table: string;
  freshness?: string;
}

export interface DbtDefinition {
  projectName: string;
  profileTarget: string;
  models: DbtModelDefinition[];
  tests: DbtTestDefinition[];
  sources: DbtSourceDefinition[];
  seeds: string[];
  snapshots: DbtSnapshotDefinition[];
  macros: string[];
  projectYaml: string;
  modelsYaml: string;
}

export interface ScenarioDefinition {
  id: string;
  label: string;
  description: string;
  effect: 'normal' | 'transient' | 'permanent' | 'late_input' | 'sensor_timeout' | 'bad_quality' | 'branch';
  targetTask?: string;
  failedDbtTest?: string;
  branchTask?: string;
  branchSkip?: string[];
  sensorTimeoutPokes?: number;
}

export interface HybridLink {
  airflowTask: string;
  operation: 'run' | 'test';
  dbtModels: string[];
  explanation: string;
}

export interface MockProjectCheckpoint {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  referenceAnswer: string;
}

export interface MockProjectBrief {
  role: string;
  brief: string;
  requirements: string[];
  constraints: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  checkpoints: MockProjectCheckpoint[];
}

export interface CaseStudy {
  id: string;
  name: string;
  domain: string;
  description: string;
  businessProblem: string;
  architectureWhy: string;
  learningGoals: string[];
  datasets: SampleDataset[];
  airflow: AirflowDefinition;
  dbt: DbtDefinition;
  scenarios: ScenarioDefinition[];
  hybridLinks: HybridLink[];
  commonFailure: string;
  mockProject?: MockProjectBrief;
  isScratch?: boolean;
}

export interface AirflowTaskRuntime {
  state: AirflowTaskState;
  attempts: number;
  sensorPokes: number;
  xcomValue?: string;
  firstStartedAtSeconds?: number;
  completedAtSeconds?: number;
  nextEligibleAtSeconds?: number;
}

export interface AirflowLogEntry {
  step: number;
  taskId?: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

export interface AirflowRunState {
  runId: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  step: number;
  elapsedSeconds: number;
  tasks: Record<string, AirflowTaskRuntime>;
  logs: AirflowLogEntry[];
  startedAt?: string;
  completedAt?: string;
}

export interface DbtBuildState {
  status: 'idle' | 'running' | 'success' | 'failed' | 'skipped';
  modelStates: Record<string, DbtNodeState>;
  testStates: Record<string, DbtNodeState>;
  seedStates: Record<string, DbtNodeState>;
  snapshotStates: Record<string, DbtNodeState>;
  contractStates: Record<string, DbtNodeState>;
  compileErrors: Record<string, string[]>;
  logs: string[];
}
