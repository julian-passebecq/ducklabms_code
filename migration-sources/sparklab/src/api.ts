export type NotebookRunStage = {
  stage_id: number
  name: string
  operator: string
  tasks: Array<unknown>
  workers: number
  slots: number
  duration_s: number
  spill_gb: number
  max_task_s: number
  p50_task_s: number
  p95_task_s: number
  max_partition_mb: number
  skewed_tasks: number
  notes: string[]
}

export type NotebookGrade = {
  overall: number
  pass: boolean
  scores: {
    semantic: number
    engineering: number
    performance: number
    cost: number
  }
  checks: Record<string, boolean>
  anti_patterns: string[]
  feedback: string[]
}

export type SemanticExecution = {
  status: 'executed' | 'unsupported'
  engine_key: string
  engine: string
  dataset_scope: string
  case: string
  row_count: number
  columns: string[]
  rows: Array<Record<string, string | number | null>>
  preview_truncated: boolean
  verified: boolean | null
  query_sha256: string
  preview_sha256: string
  result_sha256: string | null
  verification_complete: boolean
  elapsed_ms: number
  message: string
}

export type NotebookRunResponse = {
  status: 'succeeded' | 'compiled'
  compile: {
    target: string
    sql: string
    training_plan: Record<string, unknown>
  }
  semantic_execution?: SemanticExecution | null
  simulation: null | {
    profile_id: string
    aqe_enabled: boolean
    total_duration_s: number
    core_hours: number
    worker_core_hours: number
    driver_core_hours: number
    task_core_hours: number
    cluster_utilization_pct: number
    memory_gb_hours: number
    driver_memory_gb_hours: number
    node_hours: number
    worker_node_hours: number
    shuffle_gb: number
    spill_gb: number
    truth_confidence: Record<string, number>
    plan_decision: Record<string, unknown>
    stages: NotebookRunStage[]
  }
  cost?: null | {
    sparklab?: { scc: number; estimated_eur: number | null }
    fabric_like?: { cu_hours: number | null; estimated_eur: number | null }
    databricks_like?: { dbu_equivalent: number | null; estimated_usd: number | null }
  }
  grade: NotebookGrade | null
  exercise?: null | { id: string; title: string; truth?: Record<string, unknown> }
  truth_boundary?: Record<string, string>
}

export type RuntimeHealth = {
  status: string
  runtime: string
  execution: string
  notebook_api?: string
}

const API_BASE = 'http://127.0.0.1:8000'

export async function getRuntimeHealth(signal?: AbortSignal): Promise<RuntimeHealth> {
  const response = await fetch(`${API_BASE}/health`, { signal })
  if (!response.ok) throw new Error(`Runtime health failed: ${response.status}`)
  return response.json() as Promise<RuntimeHealth>
}

function exerciseId(caseId: string, missionId: string): string {
  if (caseId === 'retail' && missionId === 'join') return 'retail_broadcast_join_03'
  if (caseId === 'retail' && missionId === 'skew') return 'retail_customer_skew_04'
  if (caseId === 'finance' && missionId === 'window') return 'finance_account_window_03'
  return `${caseId}_${missionId}`
}

export async function runPySparkNotebook(input: {
  code: string
  caseId: string
  missionId: string
  clusterProfile: string
  signal?: AbortSignal
}): Promise<NotebookRunResponse> {
  const response = await fetch(`${API_BASE}/notebook/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: input.signal,
    body: JSON.stringify({
      code: input.code,
      case: input.caseId,
      exercise_id: exerciseId(input.caseId, input.missionId),
      cluster_profile: input.clusterProfile,
      aqe_enabled: true,
      force_no_broadcast: false,
    }),
  })
  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // Preserve a useful control-plane error if the backend returns non-JSON.
  }
  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : `Notebook run failed: ${response.status}`
    throw new Error(detail)
  }
  return payload as NotebookRunResponse
}

export async function runSqlNotebook(input: {
  sql: string
  caseId: string
  signal?: AbortSignal
}): Promise<NotebookRunResponse> {
  const response = await fetch(`${API_BASE}/sql/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: input.signal,
    body: JSON.stringify({
      sql: input.sql,
      case: input.caseId,
      semantic_engine: 'auto',
      limit: 50,
    }),
  })
  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // Keep a useful control-plane error when a local backend returns non-JSON.
  }
  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : `SQL run failed: ${response.status}`
    throw new Error(detail)
  }
  return payload as NotebookRunResponse
}

export type RuntimeCapabilities = {
  runtime: string
  semantic_engines: Record<string, { available: boolean; label: string; role: string }>
  auto_selection: string
  full_case_dataset_connected: boolean
  distributed_runtime: { kind: string; real_spark_cluster: boolean }
}

export async function getRuntimeCapabilities(signal?: AbortSignal): Promise<RuntimeCapabilities> {
  const response = await fetch(`${API_BASE}/capabilities`, { signal })
  if (!response.ok) throw new Error(`Runtime capabilities failed: ${response.status}`)
  return response.json() as Promise<RuntimeCapabilities>
}
