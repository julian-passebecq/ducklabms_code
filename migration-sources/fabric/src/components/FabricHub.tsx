import { fabricModules } from '../data/curriculum';
import { caseStudies } from '../data/caseStudies';
import type { CaseStudy, PageKey } from '../types/app';

const modulePages: Record<string, PageKey> = {
  'fabric-lakehouse': 'lakehouse', 'fabric-spark': 'notebook', 'fabric-tool-choice': 'toolchoice', 'fabric-practice': 'practice', 'fabric-challenge': 'challenge', 'fabric-production': 'production', 'fabric-dbt': 'dbt',
  'fabric-data-factory': 'pipeline', 'fabric-dataflow': 'dataflow', 'fabric-warehouse': 'sql', 'fabric-realtime': 'realtime',
  'fabric-runtime': 'runtime', 'fabric-airflow': 'airflow', 'fabric-recovery': 'recovery', 'fabric-governance': 'governance', 'fabric-ops': 'monitor'
};

export function FabricHub({ active, onSelectCase, onNavigate }: {
  active: CaseStudy;
  onSelectCase: (id: string) => void;
  onNavigate: (page: PageKey) => void;
}) {
  return <div className="learning-hub-page">
    <section className="hub-hero fabric-hub-hero">
      <div>
        <span className="eyebrow">Microsoft Fabric · data engineering workstation</span>
        <h1>Learn the whole data path, not isolated tools</h1>
        <p>Move data, persist it in OneLake, transform it with SQL/dbt/Python or simulated Spark, orchestrate it with Pipelines or Airflow, and operate production-style runs. Lightweight data execution is local and deterministic.</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => onNavigate('case-study')}>Open selected case study</button><button className="secondary-button" onClick={() => onNavigate('pipeline')}>Open pipeline build</button><button className="secondary-button" onClick={() => onNavigate('lakehouse')}>Explore Fabric workspace</button></div>
      </div>
      <div className="platform-flow-map">
        <div><span>01</span><strong>Ingest</strong><small>Pipeline · Copy Job · Dataflow · Eventstream</small></div>
        <b>→</b><div><span>02</span><strong>Store</strong><small>OneLake · Lakehouse · Warehouse · Eventhouse</small></div>
        <b>→</b><div><span>03</span><strong>Transform</strong><small>SQL · dbt · Python · Spark when scale justifies it</small></div>
        <b>→</b><div><span>04</span><strong>Orchestrate + operate</strong><small>Pipeline · Airflow · Monitor · Lineage · CI/CD</small></div>
      </div>
    </section>

    <section className="hub-section">
      <div className="section-title-row"><div><span className="eyebrow">Fabric capability map</span><h2>{fabricModules.length} learning workbenches</h2><p>Mapped from the Microsoft Learn Fabric labs you uploaded, plus current Fabric documentation.</p></div></div>
      <div className="module-grid">
        {fabricModules.map((m, i) => <article className="module-card" key={m.id}>
          <div className="module-card-head"><span className="module-index">{String(i + 1).padStart(2, '0')}</span><span className={`level-tag ${m.level.toLowerCase()}`}>{m.level}</span></div>
          <h3>{m.title}</h3><p>{m.summary}</p>
          <div className="module-concepts">{m.concepts.slice(0, 6).map(c => <span key={c}>{c}</span>)}</div>
          <button className="secondary-button" onClick={() => onNavigate(modulePages[m.id])}>Open workbench</button>
        </article>)}
      </div>
    </section>

    <section className="hub-section">
      <div className="section-title-row"><div><span className="eyebrow">Extended Fabric platform</span><h2>Additional data-engineering surfaces</h2><p>These capabilities are represented inside the workbenches so the product map stays current.</p></div></div>
      <div className="extended-feature-grid">
        <button onClick={() => onNavigate('lakehouse')}><strong>Mirroring</strong><span>Near-real-time replication into OneLake without scheduled ETL.</span></button>
        <button onClick={() => onNavigate('runtime')}><strong>Materialized Lake Views</strong><span>Declarative bronze → silver → gold dependencies with managed refresh.</span></button>
        <button onClick={() => onNavigate('sql')}><strong>SQL Database + Warehouse</strong><span>Operational SQL database concepts beside analytical Warehouse/T-SQL.</span></button>
        <button onClick={() => onNavigate('lakehouse')}><strong>API for GraphQL</strong><span>Expose keyed Lakehouse/Warehouse/SQL data to applications.</span></button>
        <button onClick={() => onNavigate('governance')}><strong>OneLake Catalog + Purview</strong><span>Discovery, endorsement, security, lineage and impact analysis.</span></button>
        <button onClick={() => onNavigate('realtime')}><strong>Real-Time hub + Activator</strong><span>Streaming sources, Fabric/Azure events, routing and actions.</span></button>
        <button onClick={() => onNavigate('toolchoice')}><strong>Engineering decision lab</strong><span>Practice when to use SQL, dbt, Python, Spark, Pipeline or Airflow—and when not to.</span></button>
        <button onClick={() => onNavigate('production')}><strong>Production workflow</strong><span>Walk one case through item selection, runtime boundaries, orchestration, serving, monitoring and recovery.</span></button>
        <button onClick={() => onNavigate('challenge')}><strong>End-to-end challenge</strong><span>Prove data, dbt, pipeline, monitor and recovery evidence across one mission.</span></button>
        <button onClick={() => onNavigate('airflow')}><strong>Apache Airflow Job</strong><span>Code-first Python DAG orchestration across Fabric items.</span></button>
        <button onClick={() => onNavigate('recovery')}><strong>Reliability & recovery</strong><span>Inject bad data, fail quality/dbt checks, restore checkpoints, and prove safe reruns.</span></button>
      </div>
    </section>

    <section className="hub-section">
      <div className="section-title-row"><div><span className="eyebrow">Guided end-to-end labs</span><h2>{caseStudies.length} production-shaped case studies</h2><p>Each case now includes a business brief, source estate, service levels, contracts, Fabric/Databricks implementation tracks, acceptance evidence, and an incident/recovery story.</p></div></div>
      <div className="case-grid">
        {caseStudies.map((c, i) => <article key={c.id} className={`case-card ${c.id === active.id ? 'selected' : ''}`}>
          <div className="case-card-top"><span className="case-number">0{i + 1}</span><span className={`difficulty ${c.difficulty.toLowerCase()}`}>{c.difficulty}</span></div>
          <h3>{c.title}</h3><p>{c.subtitle}</p><div className="case-meta"><span>{c.industry}</span><span>{c.duration}</span></div>
          <div className="tool-tags">{c.tools.slice(0, 7).map(t => <span key={t}>{t}</span>)}</div>
          <div className="case-card-actions"><button className={c.id === active.id ? 'primary-button' : 'secondary-button'} onClick={() => onSelectCase(c.id)}>{c.id === active.id ? 'Selected' : 'Select case'}</button>{c.id === active.id && <button className="secondary-button" onClick={() => onNavigate('case-study')}>Open brief</button>}</div>
        </article>)}
      </div>
    </section>

    <section className="selected-blueprint">
      <div className="blueprint-copy"><span className="eyebrow">Selected lab</span><h2>{active.title}</h2><p><strong>Scenario.</strong> {active.scenario}</p><p><strong>Purpose.</strong> {active.purpose}</p>{active.engineeringDecision && <div className="case-decision-summary"><strong>Engineering choice</strong><span>{active.engineeringDecision.preferred}</span><small><b>Avoid:</b> {active.engineeringDecision.avoid}</small></div>}<h3>Learning goals</h3><ul>{active.learningGoals.map(g => <li key={g}>{g}</li>)}</ul></div>
      <div className="architecture-flow"><span className="eyebrow">Engineering flow</span>{active.architecture.map((a, i) => <div className="architecture-step" key={`${a.from}-${i}`}><div><strong>{a.from}</strong><span>{a.label}</span></div><b>→</b><div><strong>{a.to}</strong><span>{i === active.architecture.length - 1 ? 'Serving / operational result' : 'Next layer'}</span></div></div>)}</div>
    </section>
  </div>;
}
