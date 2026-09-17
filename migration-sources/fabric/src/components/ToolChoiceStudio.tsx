import { useMemo, useState } from 'react';
import type { CaseStudy, PageKey } from '../types/app';

type Tool = 'SQL' | 'dbt' | 'Python/pandas' | 'Spark' | 'Fabric Pipeline' | 'Airflow';

type Scenario = {
  id: string;
  title: string;
  workload: string;
  signals: string[];
  best: Tool[];
  acceptable: Tool[];
  avoid: Tool[];
  reason: string;
  antiPattern: string;
  route: PageKey;
};

const scenarios: Scenario[] = [
  {
    id: 'warehouse-model',
    title: 'Warehouse star-schema transformation',
    workload: '300k–5M relational rows. Build staging models, dimensions, a fact table, tests and repeatable documentation.',
    signals: ['SQL-centric logic', 'maintained model DAG', 'tests + lineage matter', 'no distributed-scale requirement'],
    best: ['dbt', 'SQL'], acceptable: ['Fabric Pipeline'], avoid: ['Spark'],
    reason: 'Use SQL for the transformations and dbt when those SQL models need dependencies, tests, modularity and a maintained analytics-engineering project. A pipeline can orchestrate the dbt job, but it should not duplicate the transformation logic.',
    antiPattern: 'Starting Spark only because the work is called data engineering adds session/compute complexity without solving a scale problem.',
    route: 'dbt',
  },
  {
    id: 'one-off-sql',
    title: 'One-off aggregation and validation',
    workload: 'A few hundred thousand rows already live in a Warehouse. You need a grouped KPI query and a quick data-quality check.',
    signals: ['set-based operation', 'small scope', 'already in SQL engine', 'no project DAG required'],
    best: ['SQL'], acceptable: ['dbt'], avoid: ['Spark', 'Python/pandas'],
    reason: 'A direct SQL query is the simplest tool. dbt becomes useful if this transformation graduates into a maintained reusable model.',
    antiPattern: 'Creating a notebook, Spark session or dbt project for a tiny one-off query makes the workflow harder to operate.',
    route: 'sql',
  },
  {
    id: 'custom-python',
    title: 'Custom Python enrichment',
    workload: '50k–500k rows need a specialized Python library or domain-specific function that is awkward in SQL.',
    signals: ['custom Python logic', 'moderate data', 'interactive development', 'no distributed compute need'],
    best: ['Python/pandas'], acceptable: ['SQL'], avoid: ['Spark'],
    reason: 'Use a Python notebook when the custom library or function is the real requirement. Keep the data local/lightweight when the volume is modest.',
    antiPattern: 'PySpark syntax does not make a small Python workload more scalable in a useful way; it mainly adds distributed-runtime overhead.',
    route: 'notebook',
  },
  {
    id: 'large-lakehouse',
    title: 'Multi-terabyte Bronze → Silver lakehouse transformation',
    workload: 'Several TB of Parquet/Delta files, many partitions, wide joins and large aggregations must be processed repeatedly.',
    signals: ['distributed scale', 'many files/partitions', 'shuffle-heavy joins', 'lakehouse transformation'],
    best: ['Spark'], acceptable: ['SQL'], avoid: ['Python/pandas'],
    reason: 'This is where Spark becomes justified: distributed scans, joins, partition-aware processing and large-scale lakehouse writes. In this app we simulate the Spark runtime while executing representative rows locally.',
    antiPattern: 'Using pandas on the production-scale workload would be constrained by a single process. Conversely, using Spark on our tiny learning sample would not prove anything about production scale.',
    route: 'runtime',
  },
  {
    id: 'fabric-orchestration',
    title: 'Fabric-native visual orchestration',
    workload: 'Copy data, run a Notebook, execute dbt build, validate output and route failures. The team operates mainly inside Fabric.',
    signals: ['Fabric-native items', 'visual authoring useful', 'parameters + dependencies', 'central run history'],
    best: ['Fabric Pipeline'], acceptable: ['Airflow'], avoid: ['Spark'],
    reason: 'Use a Fabric Pipeline to orchestrate Fabric-native activities. Spark or dbt may be tasks inside the pipeline, but neither is the orchestration layer.',
    antiPattern: 'Do not bury orchestration inside a transformation notebook or use Spark merely to sequence unrelated jobs.',
    route: 'pipeline',
  },
  {
    id: 'code-first-orchestration',
    title: 'Code-first DAG across reusable jobs',
    workload: 'The platform team wants Python DAGs, reusable operators, code-reviewed orchestration and explicit dependencies across Fabric jobs.',
    signals: ['Python DAG ownership', 'code-first workflow', 'reusable orchestration patterns', 'cross-item control'],
    best: ['Airflow'], acceptable: ['Fabric Pipeline'], avoid: ['dbt', 'Spark'],
    reason: 'Airflow owns workflow orchestration here. dbt still owns dependencies between transformation models, and Spark remains a compute choice for individual large-scale tasks.',
    antiPattern: 'Using dbt as a general workflow scheduler or using Spark code to coordinate unrelated services mixes transformation and orchestration responsibilities.',
    route: 'airflow',
  },
  {
    id: 'standalone-dbt',
    title: 'Independent nightly dbt transformation job',
    workload: 'All source tables are ready by midnight. A dbt project builds staging and marts nightly with no other upstream or downstream Fabric activities.',
    signals: ['independent schedule', 'SQL transformation project', 'dbt tests', 'no wider workflow'],
    best: ['dbt'], acceptable: ['Fabric Pipeline', 'Airflow'], avoid: ['Spark'],
    reason: 'Run or schedule the dbt job directly when it is independent. Add Pipeline or Airflow only when a wider workflow needs to coordinate ingestion, notifications or downstream work.',
    antiPattern: 'Adding an orchestration layer around a single independent dbt job creates operational surface area without adding dependency value.',
    route: 'dbt',
  },
];

const tools: Tool[] = ['SQL', 'dbt', 'Python/pandas', 'Spark', 'Fabric Pipeline', 'Airflow'];

export function ToolChoiceStudio({ caseStudy, onNavigate }: { caseStudy: CaseStudy; onNavigate: (page: PageKey) => void }) {
  const initial = caseStudy.id === 'turbine-realtime' ? 'large-lakehouse' : caseStudy.id === 'erp-incremental' ? 'warehouse-model' : 'fabric-orchestration';
  const [scenarioId, setScenarioId] = useState(initial);
  const [choice, setChoice] = useState<Tool | null>(null);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const verdict = useMemo(() => {
    if (!choice) return null;
    if (scenario.best.includes(choice)) return { label: 'Strong fit', className: 'good', text: scenario.reason };
    if (scenario.acceptable.includes(choice)) return { label: 'Possible with context', className: 'partial', text: `${choice} can work, but it is not the simplest primary choice for this scenario. ${scenario.reason}` };
    return { label: 'Usually avoid', className: 'bad', text: `${choice} adds complexity or solves a different problem here. ${scenario.antiPattern}` };
  }, [choice, scenario]);

  return <div className="studio-page tool-choice-studio">
    <div className="page-heading studio-heading"><div><span className="eyebrow">Engineering judgment lab</span><h1>Choose SQL, dbt, Python, Spark, Pipeline or Airflow</h1><p>The objective is not to memorize products. Practice choosing the smallest tool that matches the transformation, scale and orchestration problem.</p></div><button className="secondary-button" onClick={() => { setChoice(null); setScenarioId(initial); }}>Reset lab</button></div>
    <div className="choice-summary-strip"><div><strong>Transformation</strong><span>SQL · dbt · Python · Spark</span></div><div><strong>Orchestration</strong><span>Fabric Pipeline · Airflow</span></div><div><strong>Rule</strong><span>Do not use distributed compute or orchestration layers without a problem that requires them.</span></div></div>
    <div className="tool-choice-layout">
      <aside className="choice-scenario-list surface-card"><div className="pane-title">Scenarios</div>{scenarios.map((item) => <button className={item.id === scenario.id ? 'active' : ''} key={item.id} onClick={() => { setScenarioId(item.id); setChoice(null); }}><strong>{item.title}</strong><span>{item.workload}</span></button>)}</aside>
      <main className="choice-main surface-card"><span className="eyebrow">Decision prompt</span><h2>{scenario.title}</h2><p className="choice-workload">{scenario.workload}</p><div className="choice-signals">{scenario.signals.map((signal) => <span key={signal}>{signal}</span>)}</div><h3>What would you choose first?</h3><div className="tool-choice-buttons">{tools.map((tool) => <button className={choice === tool ? 'selected' : ''} key={tool} onClick={() => setChoice(tool)}>{tool}</button>)}</div>{verdict ? <div className={`choice-verdict ${verdict.className}`}><div><strong>{verdict.label}</strong><span>Your choice: {choice}</span></div><p>{verdict.text}</p><div className="anti-pattern"><strong>Anti-pattern to remember</strong><span>{scenario.antiPattern}</span></div></div> : <div className="choice-placeholder">Choose a tool to reveal the reasoning.</div>}<div className="choice-actions"><button className="primary-button" onClick={() => onNavigate(scenario.route)}>Open relevant workbench</button></div></main>
      <aside className="choice-principles surface-card"><div className="pane-title">Decision heuristics</div><section><strong>SQL first</strong><p>Use set-based SQL when the data is already in a relational engine and the transformation is naturally relational.</p></section><section><strong>dbt for transformation engineering</strong><p>Use dbt when SQL models need <code>ref()</code>, tests, modular structure, lineage and repeatable build semantics.</p></section><section><strong>Python for custom logic</strong><p>Use pandas-style Python when a specialized library or custom function is the reason for leaving SQL and the dataset is manageable locally.</p></section><section><strong>Spark for distributed scale</strong><p>Use Spark when partitions, many files, large joins, streaming or distributed scale actually matter. Our app simulates those production semantics.</p></section><section><strong>Pipeline vs Airflow</strong><p>Pipeline is Fabric-native and visual. Airflow is code-first DAG orchestration. Neither replaces dbt model logic or Spark compute.</p></section></aside>
    </div>
  </div>;
}
