import { caseStudies } from '../data/caseStudies';
import type { CaseStudy, Experience } from '../types/app';

export function CaseStudyHome({ active, experience, onSelect, onOpenPipeline }: {
  active: CaseStudy;
  experience: Experience;
  onSelect: (id: string) => void;
  onOpenPipeline: () => void;
}) {
  return (
    <div className="home-page">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Interactive data engineering simulator</div>
          <h1>{experience === 'fabric' ? 'Microsoft Fabric Data Factory learning studio' : 'Azure Data Factory sandbox'}</h1>
          <p>
            {experience === 'fabric'
              ? 'Build pipelines the same way you would reason about them in Fabric: add activities, configure sources and sinks, wire dependencies, validate, debug, inspect data, and compare your work with a guided solution.'
              : 'Practice the classic Azure Data Factory authoring model with pipelines, activities, linked services, datasets, triggers, integration runtimes and monitoring. The three guided labs are currently optimized for Fabric, while this ADF experience is a free sandbox.'}
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onOpenPipeline}>Open pipeline canvas</button>
            <span className="quiet-badge">Local simulation · no Azure resources created</span>
          </div>
        </div>
        <div className="architecture-mini">
          <div className="arch-chip">Sources</div><span>→</span><div className="arch-chip">Orchestration</div><span>→</span><div className="arch-chip">Transform</div><span>→</span><div className="arch-chip">Serve</div>
        </div>
      </section>

      <div className="section-title-row">
        <div>
          <h2>Guided Fabric case studies</h2>
          <p>Three different engineering patterns: batch lakehouse, streaming operations, and metadata-driven incremental ingestion.</p>
        </div>
      </div>

      <div className="case-grid">
        {caseStudies.map((c) => (
          <article key={c.id} className={`case-card ${c.id === active.id ? 'selected' : ''}`}>
            <div className="case-card-top">
              <span className="case-number">0{caseStudies.indexOf(c) + 1}</span>
              <span className={`difficulty ${c.difficulty.toLowerCase()}`}>{c.difficulty}</span>
            </div>
            <h3>{c.title}</h3>
            <p>{c.subtitle}</p>
            <div className="case-meta"><span>{c.industry}</span><span>{c.duration}</span></div>
            <div className="tool-tags">{c.tools.slice(0, 5).map((t) => <span key={t}>{t}</span>)}</div>
            <button className={c.id === active.id ? 'primary-button' : 'secondary-button'} onClick={() => onSelect(c.id)}>
              {c.id === active.id ? 'Selected lab' : 'Select lab'}
            </button>
          </article>
        ))}
      </div>

      <section className="selected-blueprint">
        <div className="blueprint-copy">
          <span className="eyebrow">Selected lab blueprint</span>
          <h2>{active.title}</h2>
          <p><strong>Scenario.</strong> {active.scenario}</p>
          <p><strong>Purpose.</strong> {active.purpose}</p>
          <h3>What you will understand</h3>
          <ul>{active.learningGoals.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        <div className="architecture-flow">
          <span className="eyebrow">End-to-end data path</span>
          {active.architecture.map((a, i) => <div className="architecture-step" key={`${a.from}-${a.to}-${i}`}><div><strong>{a.from}</strong><span>{a.label}</span></div><b>→</b><div><strong>{a.to}</strong><span>{i === active.architecture.length - 1 ? 'Serving / consumer' : 'Next engineering layer'}</span></div></div>)}
        </div>
      </section>

      <section className="concept-strip">
        <div><strong>Movement</strong><span>Copy / CDC / Eventstream</span></div>
        <div><strong>Storage</strong><span>Lakehouse / Parquet / Warehouse</span></div>
        <div><strong>Transformation</strong><span>Notebook / Dataflow / SQL</span></div>
        <div><strong>Orchestration</strong><span>Dependencies / loops / conditions</span></div>
        <div><strong>Operations</strong><span>Validation / debug / monitor</span></div>
      </section>
    </div>
  );
}
