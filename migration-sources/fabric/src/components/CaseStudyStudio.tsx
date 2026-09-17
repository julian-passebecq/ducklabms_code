import { useEffect, useMemo, useState } from 'react';
import type { CaseStudy, DataWorkspace, PageKey } from '../types/app';
import { caseStudyAcceptanceScore, evaluateCaseStudyAcceptance } from '../lib/caseStudyEvidence';
import { productionCompletedStages, productionLifecycleEvidence, productionPlan, type ProductionPlatform, type ProductionStageId } from '../lib/productionWorkflow';

type CaseTab = 'brief' | 'requirements' | 'implementation' | 'acceptance' | 'incident';

export function CaseStudyStudio({ caseStudy, workspace, platform, onNavigate }: {
  caseStudy: CaseStudy;
  workspace: DataWorkspace;
  platform: ProductionPlatform;
  onNavigate: (page: PageKey) => void;
}) {
  const [tab, setTab] = useState<CaseTab>('brief');
  const [track, setTrack] = useState<ProductionPlatform>(platform);
  const brief = caseStudy.brief;
  const acceptance = useMemo(() => evaluateCaseStudyAcceptance(caseStudy, workspace), [caseStudy, workspace]);
  const score = useMemo(() => caseStudyAcceptanceScore(caseStudy, workspace), [caseStudy, workspace]);
  const plan = useMemo(() => productionPlan(caseStudy, track), [caseStudy, track]);
  const completed = useMemo(() => productionCompletedStages(workspace, caseStudy, track), [workspace, caseStudy, track]);
  const lifecycle = useMemo(() => productionLifecycleEvidence(workspace, caseStudy, track), [workspace, caseStudy, track]);
  const staleStages = lifecycle.filter((item) => item.status === 'stale');
  useEffect(() => setTrack(platform), [platform, caseStudy.id]);

  if (!brief) return <div className="studio-page"><div className="warning-box"><strong>Case brief unavailable</strong><span>This legacy case has not been migrated to the current production case-study contract.</span></div></div>;

  const openStage = (stage: ProductionStageId) => onNavigate(stagePage(track, caseStudy.id, stage));

  return <div className="studio-page case-study-studio">
    <div className="page-heading studio-heading case-study-heading">
      <div>
        <span className="eyebrow">Production case study · {caseStudy.industry}</span>
        <h1>{caseStudy.title}</h1>
        <p>{brief.businessProblem}</p>
      </div>
      <div className="case-study-score">
        <span>Acceptance evidence</span>
        <strong>{score.passed}/{score.total}</strong>
        <small>{score.percent}% · workspace snapshot {workspace.snapshot}</small>
      </div>
    </div>

    <div className="case-study-commandbar">
      <div className="case-study-tabs">
        {(['brief', 'requirements', 'implementation', 'acceptance', 'incident'] as CaseTab[]).map((item) =>
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{tabLabel(item)}</button>)}
      </div>
      <div className="case-study-track-switch">
        <button className={track === 'fabric' ? 'active' : ''} onClick={() => setTrack('fabric')}>Microsoft Fabric</button>
        <button className={track === 'databricks' ? 'active' : ''} onClick={() => setTrack('databricks')}>Azure Databricks</button>
      </div>
    </div>

    {tab === 'brief' && <div className="case-study-grid">
      <section className="surface-card case-brief-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Business brief</span><h2>Problem, people, outcome</h2></div><span className={`difficulty ${caseStudy.difficulty.toLowerCase()}`}>{caseStudy.difficulty}</span></div>
        <p>{caseStudy.scenario}</p>
        <div className="case-study-meta-grid">
          <div><span>Purpose</span><strong>{caseStudy.purpose}</strong></div>
          <div><span>Duration</span><strong>{caseStudy.duration}</strong></div>
          <div><span>Production scale</span><strong>{caseStudy.engineeringDecision?.productionScale}</strong></div>
          <div><span>Learning sample</span><strong>{caseStudy.engineeringDecision?.learningSample}</strong></div>
        </div>
      </section>

      <section className="surface-card">
        <div className="pane-title">Stakeholders</div>
        <div className="case-chip-list">{brief.stakeholders.map((item) => <span key={item}>{item}</span>)}</div>
      </section>

      <section className="surface-card">
        <div className="pane-title">Engineering decision</div>
        <div className="case-decision-box"><span>Prefer</span><strong>{caseStudy.engineeringDecision?.preferred}</strong></div>
        <div className="case-decision-box warning"><span>Avoid</span><strong>{caseStudy.engineeringDecision?.avoid}</strong></div>
      </section>

      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Source estate</span><h2>What arrives in production</h2></div></div>
        <div className="case-source-grid">{brief.sourceSystems.map((source) => <article key={source.name}>
          <strong>{source.name}</strong><span>{source.kind}</span>
          <dl><div><dt>Cadence</dt><dd>{source.cadence}</dd></div><div><dt>Production</dt><dd>{source.productionScale}</dd></div><div><dt>Simulator</dt><dd>{source.simulatorSample}</dd></div></dl>
        </article>)}</div>
      </section>

      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Architecture</span><h2>Business data path</h2></div></div>
        <div className="case-architecture-flow">{caseStudy.architecture.map((item, index) => <div key={`${item.from}-${item.to}-${index}`} className="case-architecture-row"><div><strong>{item.from}</strong></div><div className="case-architecture-edge"><span>{item.label}</span><b>→</b></div><div><strong>{item.to}</strong></div></div>)}</div>
      </section>
    </div>}

    {tab === 'requirements' && <div className="case-study-grid">
      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Non-functional requirements</span><h2>What “production ready” means for this case</h2></div></div>
        <div className="case-sla-grid">
          <Sla title="Freshness" value={brief.serviceLevels.freshness} />
          <Sla title="Recovery" value={brief.serviceLevels.recovery} />
          <Sla title="Quality" value={brief.serviceLevels.quality} />
          <Sla title="Cost / simplicity" value={brief.serviceLevels.cost} />
        </div>
      </section>
      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Data contracts</span><h2>Ownership and promotion rules</h2></div></div>
        <div className="case-contract-list">{brief.dataContracts.map((contract) => <article key={contract.object}>
          <div><strong>{contract.object}</strong><span>{contract.owner}</span></div>
          <ul>{contract.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </article>)}</div>
      </section>
      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Learning goals</span><h2>What you should be able to explain afterward</h2></div></div>
        <div className="case-goal-grid">{caseStudy.learningGoals.map((goal, index) => <div key={goal}><span>{String(index + 1).padStart(2, '0')}</span><strong>{goal}</strong></div>)}</div>
      </section>
    </div>}

    {tab === 'implementation' && <div className="case-study-grid">
      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Implementation track</span><h2>{track === 'fabric' ? 'Microsoft Fabric' : 'Azure Databricks'}</h2><p>{plan.decision}</p></div><span className={`status-pill ${staleStages.length ? 'warning' : completed.length === plan.stages.length ? 'success' : ''}`}>{completed.length}/{plan.stages.length} fresh{staleStages.length ? ` · ${staleStages.length} stale` : ''}</span></div>
        <div className="case-implementation-track">{plan.stages.map((stage, index) => {
          const stageEvidence = lifecycle.find((item) => item.stage === stage.id);
          const status = stageEvidence?.status ?? 'missing';
          return <article key={stage.id} className={status === 'fresh' ? 'complete' : status === 'stale' ? 'stale' : ''}>
            <div className="case-stage-number">{status === 'fresh' ? '✓' : status === 'stale' ? '!' : String(index + 1).padStart(2, '0')}</div>
            <div className="case-stage-body"><span>{stage.tool}</span><strong>{stage.title}</strong><p>{stage.productionBehavior}</p><small>Evidence: {stage.evidence}</small>{status === 'stale' && <small className="stale-reason">Stale: {stageEvidence?.reason}</small>}</div>
            <button className="secondary-button" onClick={() => openStage(stage.id)}>Open</button>
          </article>;
        })}</div>
      </section>
      <section className="surface-card">
        <div className="pane-title">Why this track?</div>
        <p>{plan.decision}</p>
        <div className="warning-box"><strong>Do not over-engineer</strong><span>{plan.avoid}</span></div>
      </section>
      <section className="surface-card">
        <div className="pane-title">Execution boundary</div>
        <p><strong>Real locally:</strong> representative SQL/Python/dbt transformations, tables, lineage, checks and run evidence.</p>
        <p><strong>Simulated:</strong> cloud infrastructure, Spark clusters, billing/capacity and managed-service execution.</p>
      </section>
    </div>}

    {tab === 'acceptance' && <div className="case-study-grid">
      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Definition of done</span><h2>Acceptance criteria backed by live evidence</h2></div><strong>{score.percent}%</strong></div>
        <div className="case-acceptance-list">{acceptance.map((item) => <article key={item.id} className={item.passed ? 'pass' : item.status === 'stale' ? 'stale' : ''}>
          <span>{item.passed ? '✓' : item.status === 'stale' ? '!' : '○'}</span><div><strong>{item.title}</strong><p>{item.description}</p><small>{item.detail}</small></div>
        </article>)}</div>
        {acceptance.some((item) => item.status === 'stale') && <div className="warning-box"><strong>Downstream evidence is stale</strong><span>An upstream object was refreshed after one or more curated/serving outputs. Reprocess from the earliest stale stage before treating this case as production-ready.</span></div>}
        <div className="card-actions"><button className="primary-button" onClick={() => onNavigate(track === 'fabric' ? 'production' : 'dbx-production')}>Run production workflow</button><button className="secondary-button" onClick={() => onNavigate(track === 'fabric' ? 'governance' : 'dbx-catalog')}>Inspect catalog / lineage</button></div>
      </section>
      <section className="surface-card span-2">
        <div className="surface-card-title"><div><span className="eyebrow">Latest evidence</span><h2>Workspace state</h2></div></div>
        <div className="case-evidence-strip"><div><span>Snapshot</span><strong>{workspace.snapshot}</strong></div><div><span>Tables</span><strong>{workspace.tables.length}</strong></div><div><span>Lineage</span><strong>{workspace.lineage.length}</strong></div><div><span>Checkpoints</span><strong>{workspace.checkpoints.length}</strong></div></div>
      </section>
    </div>}

    {tab === 'incident' && <div className="case-study-grid">
      <section className="surface-card span-2 incident-brief">
        <div className="surface-card-title"><div><span className="eyebrow">Operational incident</span><h2>{brief.incident.title}</h2></div></div>
        <IncidentStep n="1" title="Symptom" text={brief.incident.symptom} />
        <IncidentStep n="2" title="Root cause" text={brief.incident.rootCause} />
        <IncidentStep n="3" title="Containment" text={brief.incident.containment} />
        <IncidentStep n="4" title="Recovery" text={brief.incident.recovery} />
        <IncidentStep n="5" title="Prevention" text={brief.incident.prevention} />
        <div className="card-actions"><button className="primary-button" onClick={() => onNavigate('recovery')}>Open reliability & recovery lab</button><button className="secondary-button" onClick={() => onNavigate(track === 'fabric' ? 'monitor' : 'dbx-jobs')}>Inspect operational surface</button></div>
      </section>
      <section className="surface-card">
        <div className="pane-title">Interview reasoning</div>
        <p>Be able to explain the failure boundary, what data may already have changed, what can safely be preserved, and the smallest idempotent rerun scope.</p>
      </section>
      <section className="surface-card">
        <div className="pane-title">Production question</div>
        <p>Which signal should page an engineer, which should quarantine data silently, and which should block downstream publication?</p>
      </section>
    </div>}
  </div>;
}

function tabLabel(tab: CaseTab) {
  return ({ brief: 'Case brief', requirements: 'Requirements', implementation: 'Implementation', acceptance: 'Acceptance', incident: 'Incident' } as Record<CaseTab, string>)[tab];
}

function Sla({ title, value }: { title: string; value: string }) {
  return <div><span>{title}</span><strong>{value}</strong></div>;
}

function IncidentStep({ n, title, text }: { n: string; title: string; text: string }) {
  return <div className="incident-step"><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function stagePage(platform: ProductionPlatform, caseId: string, stage: ProductionStageId): PageKey {
  if (platform === 'fabric') {
    const pages: Record<ProductionStageId, PageKey> = {
      design: 'toolchoice', govern: 'governance', ingest: 'copyjob', transform: caseId === 'turbine-realtime' ? 'notebook' : 'dbt', orchestrate: 'pipeline', serve: 'sql', operate: 'monitor',
    };
    return pages[stage];
  }
  const pages: Record<ProductionStageId, PageKey> = {
    design: 'dbx-compute', govern: 'dbx-catalog', ingest: 'dbx-streaming', transform: 'dbx-pipelines', orchestrate: 'dbx-jobs', serve: 'dbx-sql', operate: 'dbx-monitor',
  };
  return pages[stage];
}
