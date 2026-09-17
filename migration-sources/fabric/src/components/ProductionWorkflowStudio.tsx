import { useEffect, useMemo, useState } from 'react';
import type { CaseStudy, DataWorkspace, PageKey } from '../types/app';
import { productionCompletedStages, productionLifecycleEvidence, productionPlan, runDatabricksProductionStage, runFabricProductionStage, type ProductionPlatform, type ProductionStageId } from '../lib/productionWorkflow';

export function ProductionWorkflowStudio({ platform, caseStudy, workspace, onWorkspace, onNavigate }: {
  platform: ProductionPlatform;
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  onWorkspace: (workspace: DataWorkspace) => void;
  onNavigate: (page: PageKey) => void;
}) {
  const plan = useMemo(() => productionPlan(caseStudy, platform), [caseStudy, platform]);
  const [selected, setSelected] = useState<ProductionStageId>('design');
  const completed = useMemo(() => productionCompletedStages(workspace, caseStudy, platform), [workspace, caseStudy, platform]);
  const lifecycle = useMemo(() => productionLifecycleEvidence(workspace, caseStudy, platform), [workspace, caseStudy, platform]);
  const staleStages = lifecycle.filter((item) => item.status === 'stale');
  const [message, setMessage] = useState('Select a stage and run the representative learning action.');
  const [showProductionCode, setShowProductionCode] = useState(true);
  const stage = plan.stages.find((item) => item.id === selected) ?? plan.stages[0];
  const stageIndex = plan.stages.findIndex((item) => item.id === stage.id);
  const priorStage = stageIndex > 0 ? plan.stages[stageIndex - 1] : undefined;
  const priorEvidence = priorStage ? lifecycle.find((item) => item.stage === priorStage.id) : undefined;
  const prerequisiteMet = !priorStage || priorEvidence?.status === 'fresh';
  const currentEvidence = lifecycle.find((item) => item.stage === stage.id);
  useEffect(() => { setSelected('design'); setMessage('Select a stage and run the representative learning action.'); }, [caseStudy.id, platform]);

  const runStage = () => {
    const result = platform === 'fabric'
      ? runFabricProductionStage(workspace, caseStudy, selected)
      : runDatabricksProductionStage(workspace, caseStudy, selected);
    onWorkspace(result.workspace);
    setMessage(`${stage.title}: ${result.message}${result.touchedTables.length ? ` · ${result.touchedTables.join(', ')}` : ''}`);
  };

  const surfaceForStage = (id: ProductionStageId): PageKey => {
    if (platform === 'fabric') {
      const map: Record<ProductionStageId, PageKey> = { design: 'toolchoice', govern: 'runtime', ingest: 'copyjob', transform: caseStudy.id === 'turbine-realtime' ? 'notebook' : 'dbt', orchestrate: 'pipeline', serve: 'sql', operate: 'monitor' };
      return map[id];
    }
    const map: Record<ProductionStageId, PageKey> = { design: 'dbx-compute', govern: 'dbx-catalog', ingest: 'dbx-streaming', transform: 'dbx-pipelines', orchestrate: 'dbx-jobs', serve: 'dbx-sql', operate: 'dbx-monitor' };
    return map[id];
  };

  return <div className={`studio-page production-workflow ${platform}`}>
    <div className="page-heading studio-heading production-heading">
      <div><span className="eyebrow">{platform === 'fabric' ? 'Microsoft Fabric' : 'Azure Databricks'} · production-shaped case study</span><h1>{plan.title}</h1><p>{plan.productionScale}</p></div>
      <div className="production-heading-actions"><span className={`status-pill ${staleStages.length ? 'warning' : completed.length === plan.stages.length ? 'success' : ''}`}>{completed.length}/{plan.stages.length} fresh{staleStages.length ? ` · ${staleStages.length} stale` : ''}</span><button className="secondary-button" onClick={() => setShowProductionCode((value) => !value)}>{showProductionCode ? 'Hide' : 'Show'} production view</button></div>
    </div>

    <div className="production-decision-strip">
      <div><span>Preferred pattern</span><strong>{plan.decision}</strong></div>
      <div><span>Avoid</span><strong>{plan.avoid}</strong></div>
      <div><span>Learning boundary</span><strong>Data effects are real locally; cloud compute, Spark clusters, managed services and billing are simulated.</strong></div>
    </div>

    <div className="production-layout">
      <aside className="production-stage-rail">
        <div className="pane-title">Production lifecycle</div>
        {plan.stages.map((item, index) => <button key={item.id} className={selected === item.id ? 'active' : ''} onClick={() => setSelected(item.id)}>
          <span className="stage-number">{lifecycle.find((e) => e.stage === item.id)?.status === 'fresh' ? '✓' : lifecycle.find((e) => e.stage === item.id)?.status === 'stale' ? '!' : String(index + 1).padStart(2, '0')}</span>
          <span><strong>{item.title}</strong><small>{item.tool}</small></span>
        </button>)}
      </aside>

      <main className="production-stage-main">
        <section className="surface-card production-stage-card">
          <div className="surface-card-title"><div><span className="eyebrow">Stage · {stage.id}</span><h2>{stage.title}</h2></div><span className={`status-pill ${currentEvidence?.status === 'fresh' ? 'success' : currentEvidence?.status === 'stale' ? 'warning' : ''}`}>{currentEvidence?.status === 'fresh' ? 'Fresh evidence' : currentEvidence?.status === 'stale' ? 'Stale evidence' : 'Not run'}</span></div>
          <div className="production-two-column">
            <div><h3>What a real engineer does</h3><p>{stage.productionBehavior}</p></div>
            <div><h3>What this simulator executes</h3><p>{stage.learningBehavior}</p></div>
          </div>
          <div className="evidence-contract"><span>Expected evidence</span><strong>{stage.evidence}</strong></div>
          {showProductionCode && <ProductionDetail platform={platform} caseStudy={caseStudy} stage={stage.id} />}
          {currentEvidence?.status === 'stale' && <div className="warning-box"><strong>Evidence is stale</strong><span>{currentEvidence.reason} Re-run this stage after its upstream dependencies are fresh.</span></div>}
          {!prerequisiteMet && <div className="warning-box"><strong>Recommended production sequence</strong><span>{priorEvidence?.status === 'stale' ? `Refresh “${priorStage?.title}” first; its evidence is stale.` : `Complete “${priorStage?.title}” first so this stage has the upstream context it expects.`}</span></div>}
          <div className="card-actions"><button className="primary-button" disabled={!prerequisiteMet} onClick={runStage}>▶ Run representative stage</button><button className="secondary-button" onClick={() => onNavigate(surfaceForStage(stage.id))}>Open real workbench</button></div>
          <div className="run-success-box"><strong>{message}</strong><span>Workspace snapshot {workspace.snapshot} · {workspace.tables.length} tables · {workspace.lineage.length} lineage edges · {workspace.checkpoints.length} checkpoints</span></div>
        </section>

        <section className="surface-card production-evidence-card"><div className="surface-card-title"><div><span className="eyebrow">Live evidence</span><strong>Shared workspace</strong></div></div>
          <div className="production-evidence-grid">
            <div><span>Latest tables</span>{workspace.tables.slice(-6).reverse().map((table) => <button key={`${table.schema}.${table.name}`} onClick={() => onNavigate(platform === 'fabric' ? 'lakehouse' : 'dbx-catalog')}><strong>{table.schema}.{table.name}</strong><small>{table.rows.length} rows · v{table.version} · {table.runtimeSource}</small></button>)}</div>
            <div><span>Latest lineage</span>{workspace.lineage.slice(0, 6).map((edge) => <div className="production-lineage-row" key={edge.id}><code>{edge.from}</code><b>→</b><code>{edge.to}</code><small>{edge.actor}</small></div>)}</div>
          </div>
        </section>
      </main>

      <aside className="learning-side-panel standalone production-learning-panel">
        <div className="pane-title">Real-life usage rules</div>
        {platform === 'fabric' ? <>
          <Rule title="Copy Job" text="Prefer it when the job is simply data movement; use a Copy activity when movement is one step in a broader pipeline." />
          <Rule title="SQL / dbt first" text="For relational transformations and dimensional models, start with SQL/dbt. Add Notebook code only when code adds value." />
          <Rule title="Spark intentionally" text="Use Notebook/Spark Job Definition for genuinely distributed lakehouse work, not because the product supports Spark." />
          <Rule title="Environment" text="Use Workspace default unless a team needs reusable Spark runtime, libraries, resources, or compute configuration." />
          <Rule title="Pipeline vs Airflow" text="Use Fabric Pipeline for visual Fabric-native orchestration; Airflow when Python DAG ownership and code-first orchestration are deliberate requirements." />
        </> : <>
          <Rule title="Unity Catalog first" text="Govern catalog/schema/table/volume access centrally. Use external volumes for landing zones and managed tables for curated assets where appropriate." />
          <Rule title="Serverless by default" text="Use serverless notebook/jobs compute when available; use SQL Warehouse for SQL-only serving and query workloads." />
          <Rule title="Auto Loader" text="Persist checkpoint/schema state and pick an explicit schema-evolution strategy. Do not silently accept uncontrolled drift." />
          <Rule title="Lakeflow pipelines" text="Prefer declarative streaming tables/materialized views/expectations for incremental pipelines instead of hand-orchestrating every Spark step." />
          <Rule title="Lakeflow Jobs" text="Own schedules/triggers, task dependencies, retries, notifications, and repair runs at the workflow layer." />
        </>}
      </aside>
    </div>
  </div>;
}

function ProductionDetail({ platform, caseStudy, stage }: { platform: ProductionPlatform; caseStudy: CaseStudy; stage: ProductionStageId }) {
  if (platform === 'fabric') {
    if (stage === 'govern') return <div className="production-config-panel"><h3>Fabric runtime configuration</h3><div className="config-kv"><span>Workspace default</span><code>Use unless Spark-specific dependencies are required</code><span>Environment</span><code>ENV_DataEngineering · publish before shared use</code><span>Lakehouse</span><code>LH_{caseStudy.id.replaceAll('-', '_')}</code><span>Spark Job Definition</span><code>main file + reference files + args + retry policy + snapshot</code></div></div>;
    if (stage === 'ingest') return <pre className="production-code">{caseStudy.id === 'erp-incremental' ? `Copy Job\nMode: Incremental\nWatermark: modified_at\nSource: ERP SQL\nDestination: Lakehouse staging\nRun: scheduled / pipeline activity` : `Copy Job / Copy activity\nSource: landing files\nDestination: Lakehouse Bronze\nPattern: batch append\nTransformations: none during landing`}</pre>;
    if (stage === 'transform' && caseStudy.id === 'turbine-realtime') return <pre className="production-code">{`# Production-shaped PySpark example (simulated here)\ndf = spark.table("bronze.turbine_events")\nfeatures = (df\n  .dropDuplicates(["event_id"])\n  .withColumn("temperature_delta", F.col("gearbox_temp_c") - 65))\nfeatures.write.mode("append").saveAsTable("silver.turbine_features")`}</pre>;
    if (stage === 'transform') return <pre className="production-code">{`-- Prefer SQL/dbt when the work is relational\nselect *\nfrom {{ ref('stg_source') }}\nwhere business_key is not null\n\n# Use lightweight Python only for custom logic that SQL/dbt does not express cleanly.`}</pre>;
    if (stage === 'orchestrate') return <pre className="production-code">{`Pipeline\n  Copy / Copy Job\n    ↓ Succeeded\n  Notebook or dbt Job\n    ↓ Succeeded\n  Warehouse / stored procedure\n    ├─ Failed → containment / notification\n    └─ Succeeded → publish`}</pre>;
    if (stage === 'serve') return <pre className="production-code">{`SELECT TOP 100 *\nFROM gold_or_warehouse_serving_table\nORDER BY 1 DESC;\n\n-- Validate row counts, uniqueness, null contracts, and freshness before promotion.`}</pre>;
    if (stage === 'operate') return <pre className="production-code">{`Monitor\n- run kind / trigger\n- activity duration + retries\n- secure input/output\n- rows / throughput for Copy\n- root cause + skipped downstream work\n\nRecovery\n- checkpoint before risky rerun\n- fix smallest failing path\n- prove idempotent rerun`}</pre>;
    return <pre className="production-code">{`Movement → Transformation → Orchestration → Serving → Operations\n\nDo not select Spark, Airflow, or custom code until the requirement actually needs them.`}</pre>;
  }

  if (stage === 'govern') return <pre className="production-code">{`training (catalog)\n├── landing (schema)\n│   └── /Volumes/training/landing/raw    # external volume pattern\n├── bronze (schema)\n│   └── managed Delta tables\n├── silver (schema)\n│   └── managed Delta tables\n└── gold (schema)\n    └── governed serving tables\n\nGRANT USE CATALOG / USE SCHEMA + SELECT / READ VOLUME deliberately.`}</pre>;
  if (stage === 'ingest') return <pre className="production-code">{`(spark.readStream\n  .format("cloudFiles")\n  .option("cloudFiles.format", "json")\n  .option("cloudFiles.schemaEvolutionMode", "addNewColumns")\n  .option("rescuedDataColumn", "_rescued_data")\n  .load("/Volumes/training/landing/raw"))\n\ncheckpoint: /Volumes/training/checkpoints/${caseStudy.id}`}</pre>;
  if (stage === 'transform') return <pre className="production-code">{caseStudy.id === 'erp-incremental' ? `Lakeflow pipelines\nAUTO CDC → SCD Type 2 managed table\nsequence_by = modified_at\nkeys = customer_id\nexpectation: customer_id IS NOT NULL` : `Lakeflow pipelines\nbronze streaming table\n  ↓ expectation: key IS NOT NULL (drop invalid)\nsilver streaming/materialized table\n  ↓ aggregate / join\ngold materialized view\n\nTriggered mode for batch-like refresh; continuous only when latency needs it.`}</pre>;
  if (stage === 'orchestrate') return <pre className="production-code">{`Lakeflow Job\n  ingest task\n    ↓\n  pipeline / notebook / dbt task\n    ↓\n  SQL quality task\n\nCompute: serverless jobs\nTrigger: schedule | table update | file arrival | continuous\nFailure: retry → repair failed/skipped tasks → notify`}</pre>;
  if (stage === 'serve') return <pre className="production-code">{`Serverless SQL Warehouse\nSELECT *\nFROM training.gold.serving_table\nLIMIT 100;\n\nUse Query Profile for SQL performance. Do not attach Spark compute just to run SQL-only serving queries.`}</pre>;
  if (stage === 'operate') return <pre className="production-code">{`Operations\n- Lakeflow Jobs run timeline + trigger type\n- repair failed/skipped tasks\n- pipeline expectations + event log\n- Unity Catalog lineage\n- SQL query profile\n- Spark UI only when the workload actually uses Spark\n- schema drift / _rescued_data review`}</pre>;
  return <pre className="production-code">{`Storage: Unity Catalog governed\nInteractive: serverless notebook compute\nSQL: serverless SQL Warehouse\nWorkflows: serverless jobs compute\nDeclarative data pipelines: Lakeflow\nDistributed Spark: only when scale/operations justify it`}</pre>;
}

function Rule({ title, text }: { title: string; text: string }) {
  return <div className="concept-card"><strong>{title}</strong><span>{text}</span></div>;
}
