export type Experience = 'fabric' | 'azure';
export type AzureProduct = 'adf' | 'databricks';

export type PageKey =
  | 'home'
  | 'case-study'
  | 'pipeline'
  | 'dataflow'
  | 'dbt'
  | 'airflow'
  | 'toolchoice'
  | 'practice'
  | 'challenge'
  | 'production'
  | 'recovery'
  | 'notebook'
  | 'sql'
  | 'data'
  | 'monitor'
  | 'manage'
  | 'lakehouse'
  | 'runtime'
  | 'realtime'
  | 'governance'
  | 'deployment'
  | 'copyjob'
  | 'dbx-home'
  | 'dbx-production'
  | 'dbx-notebook'
  | 'dbx-catalog'
  | 'dbx-compute'
  | 'dbx-pipelines'
  | 'dbx-jobs'
  | 'dbx-sql'
  | 'dbx-streaming'
  | 'dbx-monitor'
  | 'dbx-adf-integration'
  | 'powerbi-placeholder';

export type RunStatus = 'Not run' | 'Queued' | 'In progress' | 'Succeeded' | 'Failed' | 'Skipped';

export type ActivityType =
  | 'copy'
  | 'copyJob'
  | 'notebook'
  | 'storedProcedure'
  | 'dataflow'
  | 'dbt'
  | 'lookup'
  | 'foreach'
  | 'if'
  | 'script'
  | 'invokePipeline'
  | 'web'
  | 'delete'
  | 'wait'
  | 'setVariable'
  | 'appendVariable'
  | 'until'
  | 'eventstream'
  | 'kql'
  | 'databricks';

export interface PipelineNode {
  id: string;
  type: ActivityType;
  name: string;
  x: number;
  y: number;
  status: RunStatus;
  config: Record<string, string | number | boolean>;
}

export interface PipelineEdge {
  id: string;
  from: string;
  to: string;
  condition: 'Succeeded' | 'Failed' | 'Completed' | 'Skipped';
}

export type PipelineValueType = 'String' | 'Int' | 'Bool' | 'Array';

export interface PipelineParameter {
  id: string;
  name: string;
  type: PipelineValueType;
  defaultValue: string;
}

export interface PipelineVariable {
  id: string;
  name: string;
  type: PipelineValueType;
  defaultValue: string;
  currentValue: string;
}

export type TutorialMode = 'Guided' | 'Challenge';

export interface TutorialStepProgress {
  stepId: string;
  attempts: number;
  failedAttempts: number;
  hintLevel: 0 | 1 | 2 | 3;
  solutionRevealed: boolean;
  solutionApplied: boolean;
  validated: boolean;
  bestScore: number;
  lastMessage: string;
  lastAttemptAt: string;
}

export interface TutorialProgress {
  caseStudyId: string;
  mode: TutorialMode;
  startedAt: string;
  updatedAt: string;
  steps: Record<string, TutorialStepProgress>;
}

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  why: string;
  concept: string;
  expected: string;
  validateKey: string;
  hint: string;
  solutionText: string;
  apply: {
    addNode?: Partial<PipelineNode> & Pick<PipelineNode, 'type' | 'name'>;
    updateNodeType?: ActivityType;
    updateConfig?: Record<string, string | number | boolean>;
    connectTypes?: [ActivityType, ActivityType];
    page?: PageKey;
  };
}

export interface FakeTable {
  schema: string;
  name: string;
  layer: 'source' | 'bronze' | 'silver' | 'gold' | 'warehouse' | 'stream';
  primaryKey?: string;
  foreignKeys?: string[];
  columns: { name: string; type: string; description: string }[];
  rows: Record<string, string | number | boolean | null>[];
}

export interface NotebookCell {
  id: string;
  language: 'python' | 'sql' | 'markdown';
  source: string;
  output?: string;
}

export interface WorkspaceTable extends FakeTable {
  version: number;
  updatedAt: string;
  runtimeSource: string;
}

export interface WorkspaceEvent {
  id: string;
  timestamp: string;
  action: 'seed' | 'create' | 'update' | 'delete' | 'query' | 'pipeline' | 'checkpoint' | 'restore';
  object: string;
  details: string;
  snapshot: number;
}

export interface WorkspaceLineageEdge {
  id: string;
  from: string;
  to: string;
  operation: string;
  actor: string;
  snapshot: number;
  timestamp: string;
}

export interface WorkspaceCheckpoint {
  id: string;
  label: string;
  createdAt: string;
  snapshot: number;
  tables: WorkspaceTable[];
}

export interface DataWorkspace {
  caseStudyId: string;
  snapshot: number;
  tables: WorkspaceTable[];
  history: WorkspaceEvent[];
  lineage: WorkspaceLineageEdge[];
  checkpoints: WorkspaceCheckpoint[];
}

export interface NotebookDocument {
  id: string;
  name: string;
  cells: NotebookCell[];
  updatedAt: string;
}


export interface CaseStudySourceSystem {
  name: string;
  kind: string;
  cadence: string;
  productionScale: string;
  simulatorSample: string;
}

export interface CaseStudyDataContract {
  object: string;
  owner: string;
  rules: string[];
}

export interface CaseStudyAcceptanceCriterion {
  id: string;
  title: string;
  description: string;
  evidence: {
    kind: 'table' | 'lineage' | 'checkpoint' | 'audit';
    objects?: string[];
    actorIncludes?: string;
    minRows?: number;
  };
}

export interface CaseStudyBrief {
  businessProblem: string;
  stakeholders: string[];
  sourceSystems: CaseStudySourceSystem[];
  serviceLevels: { freshness: string; recovery: string; quality: string; cost: string };
  dataContracts: CaseStudyDataContract[];
  acceptanceCriteria: CaseStudyAcceptanceCriterion[];
  incident: {
    title: string;
    symptom: string;
    rootCause: string;
    containment: string;
    recovery: string;
    prevention: string;
  };
}

export interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  industry: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  purpose: string;
  scenario: string;
  learningGoals: string[];
  tools: string[];
  architecture: { from: string; to: string; label: string }[];
  engineeringDecision?: {
    productionScale: string;
    learningSample: string;
    preferred: string;
    avoid: string;
    rationale: string;
  };
  tables: FakeTable[];
  notebook: NotebookCell[];
  storedProcedure: string;
  storedProcedureName: string;
  steps: TutorialStep[];
  brief?: CaseStudyBrief;
}

export interface PipelineRunDependency {
  nodeId: string;
  condition: PipelineEdge['condition'];
}

export interface PipelineRunActivity {
  nodeId: string;
  name: string;
  type: ActivityType;
  status: RunStatus;
  durationMs: number;
  startOffsetMs: number;
  attempts: number;
  input: string;
  output: string;
  error?: string;
  metrics: Record<string, string | number>;
  secureInput: boolean;
  secureOutput: boolean;
  dependencies?: PipelineRunDependency[];
  rerunDisposition?: 'Executed' | 'Preserved';
}

export interface PipelineRun {
  id: string;
  caseStudyId: string;
  experience: Experience;
  startedAt: string;
  durationMs: number;
  status: RunStatus;
  trigger: string;
  parentRunId?: string;
  rerunMode?: 'Full retry' | 'From failed activity' | 'From selected activity';
  rerunFromNodeId?: string;
  parameterValues?: Record<string, string>;
  variableValues?: Record<string, string>;
  activities: PipelineRunActivity[];
}

export interface WorkspaceItem {
  id: string;
  type:
    | 'Pipeline'
    | 'Notebook'
    | 'Dataflow Gen2'
    | 'Lakehouse'
    | 'Warehouse'
    | 'Eventstream'
    | 'Eventhouse'
    | 'KQL database'
    | 'SQL database'
    | 'Spark job definition'
    | 'Environment'
    | 'Copy job'
    | 'Activator'
    | 'dbt Job'
    | 'Apache Airflow job';
  name: string;
  owner: string;
  updated: string;
}

export interface LearningModule {
  id: string;
  title: string;
  product: 'Fabric' | 'Azure Data Factory' | 'Azure Databricks';
  level: 'Foundation' | 'Core' | 'Advanced';
  summary: string;
  concepts: string[];
  actions: string[];
  sourceRefs: string[];
}
