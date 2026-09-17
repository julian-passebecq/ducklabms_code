import { useMemo, useState } from 'react';
import type { CaseStudy, DataWorkspace } from '../types/app';
import { assessReliability, incidentDefinition, injectReliabilityIncident, repairReliabilityIncident, runReliabilityDbt } from '../lib/reliability';
import { createWorkspaceCheckpoint, restoreWorkspaceCheckpoint } from '../lib/workspaceInsights';

const toolOptions = ['Use Spark everywhere', 'Restore/correct state + rerun only the affected path', 'Ignore the failure and refresh Gold', 'Full-refresh every table'];

export function RecoveryStudio({ caseStudy, workspace, onWorkspace }: { caseStudy: CaseStudy; workspace: DataWorkspace; onWorkspace: (workspace: DataWorkspace) => void }) {
  const incident = incidentDefinition(caseStudy.id);
  const assessment = useMemo(() => assessReliability(workspace), [workspace]);
  const [dbtLog, setDbtLog] = useState<string[]>([]);
  const [dbtSummary, setDbtSummary] = useState<{ passed: number; failed: number } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [message, setMessage] = useState('');
  const [incidentInjected, setIncidentInjected] = useState(false);
  const [repairApplied, setRepairApplied] = useState(false);
  const [restored, setRestored] = useState(false);
  const latestSafeCheckpoint = workspace.checkpoints.find((checkpoint) => checkpoint.label === 'Pre-incident safe point') ?? workspace.checkpoints[0];
  const quarantinedRows = workspace.tables.filter((table) => table.schema === 'quarantine').reduce((sum, table) => sum + table.rows.length, 0);

  const inject = () => {
    onWorkspace(injectReliabilityIncident(workspace));
    setIncidentInjected(true);
    setDbtLog([]); setDbtSummary(null); setSelectedPlan(''); setRepairApplied(false); setRestored(false);
    setMessage('Incident injected. Run the checks before changing the data.');
  };

  const repair = () => {
    onWorkspace(repairReliabilityIncident(workspace));
    setRepairApplied(true);
    setMessage('Targeted repair applied. Re-run quality and dbt checks to prove recovery.');
  };

  const runDbt = () => {
    const result = runReliabilityDbt(workspace);
    onWorkspace(result.workspace);
    setDbtLog(result.log);
    setDbtSummary({ passed: result.passed, failed: result.failed });
    setMessage(result.failed ? 'dbt detected a failing model/test path. Inspect the log before promotion.' : 'dbt build/tests are clean for the current workspace state.');
  };

  const makeCheckpoint = () => {
    onWorkspace(createWorkspaceCheckpoint(workspace, 'Manual recovery point'));
    setMessage(`Checkpoint created at snapshot ${workspace.snapshot}.`);
  };

  const restore = () => {
    if (!latestSafeCheckpoint) return;
    onWorkspace(restoreWorkspaceCheckpoint(workspace, latestSafeCheckpoint.id));
    setDbtLog([]); setDbtSummary(null); setRestored(true);
    setMessage(`Restored ${latestSafeCheckpoint.label}. Re-run checks before resuming the pipeline.`);
  };

  const planCorrect = selectedPlan === 'Restore/correct state + rerun only the affected path';
  const recoveryProven = incidentInjected && assessment.failed === 0 && (!incident.supportsDbt || dbtSummary?.failed === 0);
  const postmortem = [
    { step: 'Detection', done: incidentInjected, detail: incidentInjected ? `${assessment.failed} active rule failure(s) remain.` : 'Inject the deterministic incident and observe the failing contract.' },
    { step: 'Containment', done: incidentInjected && (quarantinedRows > 0 || restored), detail: restored ? 'Workspace restored to a safe checkpoint.' : quarantinedRows ? `${quarantinedRows} rejected row(s) isolated in quarantine.` : 'Quarantine invalid records or restore the safe checkpoint.' },
    { step: 'Correction', done: repairApplied || restored, detail: repairApplied ? 'Targeted repair applied to the affected state.' : restored ? 'Known-good state restored.' : 'Correct only the affected data/state; avoid an unnecessary full refresh.' },
    { step: 'Verification', done: recoveryProven, detail: recoveryProven ? 'Data-contract checks and required dbt evidence are clean.' : 'Re-run the quality gate and dbt tests where applicable.' },
    { step: 'Prevention', done: recoveryProven && planCorrect, detail: planCorrect ? 'Recovery scope chosen correctly: rerun only the affected downstream path.' : 'Choose the smallest safe rerun scope and record the prevention decision.' },
  ];

  return <div className="studio-page recovery-studio">
    <div className="studio-toolbar">
      <div><span className="eyebrow">Reliability & recovery lab</span><strong>{caseStudy.title}</strong><span>Inject a realistic production fault, diagnose it, recover safely, and prove the rerun.</span></div>
      <div className="command-group"><button className="secondary-button" onClick={makeCheckpoint}>Create checkpoint</button><button className="primary-button" onClick={inject}>Inject incident</button></div>
    </div>

    <div className="recovery-kpis">
      <div><span>Workspace snapshot</span><strong>{workspace.snapshot}</strong></div>
      <div><span>Reliability state</span><strong className={`reliability-state ${assessment.status.toLowerCase()}`}>{assessment.status}</strong></div>
      <div><span>Rules passed</span><strong>{assessment.passed}/{assessment.rules.length}</strong></div>
      <div><span>Critical failures</span><strong>{assessment.criticalFailed}</strong></div>
      <div><span>Safe checkpoints</span><strong>{workspace.checkpoints.length}</strong></div>
      <div><span>Quarantined rows</span><strong>{quarantinedRows}</strong></div>
    </div>

    {recoveryProven && <div className="recovery-proof-banner"><div><strong>Recovery evidence is clean</strong><span>Data-contract checks pass{incident.supportsDbt ? ' and the latest dbt evidence has no errors' : ''}. The affected path is safe to resume.</span></div><span>✓ PROVEN</span></div>}

    <div className="recovery-layout">
      <main className="recovery-main">
        <section className="surface-card incident-card">
          <div className="surface-card-title"><div><span className="eyebrow">Incident scenario</span><strong>{incident.title}</strong></div><span className="status-pill failed">FAULT DRILL</span></div>
          <p>{incident.symptom}</p>
          <div className="incident-impact"><strong>Potential production impact</strong><p>{incident.productionImpact}</p></div>
          <div className="review-row"><span>Affected object</span><strong>{incident.injectedObject}</strong></div>
          <div className="review-row"><span>Preferred recovery</span><strong>{incident.preferredRecovery}</strong></div>
        </section>

        <section className="surface-card reliability-rules">
          <div className="surface-card-title"><div><strong>Data contract / quality checks</strong><span>These checks are deterministic learning rules, not Fabric service metrics.</span></div></div>
          <table className="manage-table"><thead><tr><th>Rule</th><th>Object</th><th>Severity</th><th>Observed</th><th>Status</th></tr></thead><tbody>{assessment.rules.map((item) => <tr key={item.id} className={item.passed ? '' : 'failed-row'}><td><strong>{item.title}</strong><small>{item.hint}</small></td><td><code>{item.table}</code></td><td>{item.severity}</td><td>{item.observed}</td><td><span className={`status-pill ${item.passed ? 'succeeded' : 'failed'}`}>{item.passed ? 'PASS' : 'FAIL'}</span></td></tr>)}</tbody></table>
        </section>

        <section className="surface-card recovery-actions-card">
          <div className="surface-card-title"><div><strong>Recovery actions</strong><span>Use the smallest safe recovery scope; do not default to a full refresh or Spark rewrite.</span></div></div>
          <div className="recovery-action-grid">
            <button onClick={repair}><strong>1 · Apply targeted repair</strong><span>Deduplicate/quarantine invalid rows and fix poisoned state.</span></button>
            <button onClick={restore} disabled={!latestSafeCheckpoint}><strong>2 · Restore checkpoint</strong><span>Roll the learning workspace back to the last safe table snapshot.</span></button>
            <button onClick={runDbt} disabled={!incident.supportsDbt}><strong>3 · Run dbt build/tests</strong><span>{incident.supportsDbt ? 'Materialize and prove model tests before promotion.' : 'Not the primary repair path for this raw-stream incident.'}</span></button>
          </div>
          {message && <div className="validation-message ok"><strong>Lab status</strong><span>{message}</span></div>}
        </section>

        {incident.supportsDbt && <section className="surface-card dbt-incident-output">
          <div className="surface-card-title"><div><strong>dbt recovery evidence</strong><span>Build/test output against the current workspace state.</span></div>{dbtSummary && <span className={`status-pill ${dbtSummary.failed ? 'failed' : 'succeeded'}`}>PASS={dbtSummary.passed} ERROR={dbtSummary.failed}</span>}</div>
          <div className="dbt-log">{dbtLog.length ? dbtLog.map((line, index) => <pre key={index}>{line}</pre>) : <div className="choice-placeholder">Run dbt after fault injection or repair to see whether the transformation contract is safe to promote.</div>}</div>
        </section>}
      </main>

      <aside className="recovery-side">
        <section className="surface-card"><div className="pane-title">Architecture decision</div><p><strong>Wrong instinct</strong></p><p>{incident.wrongTool}</p><div className="learning-box"><strong>Why not?</strong><p>{incident.whyNotWrongTool}</p></div></section>
        <section className="surface-card"><div className="pane-title">Choose the recovery strategy</div><div className="recovery-choice-list">{toolOptions.map((option) => <button key={option} className={selectedPlan === option ? 'active' : ''} onClick={() => setSelectedPlan(option)}>{option}</button>)}</div>{selectedPlan && <div className={`validation-message ${planCorrect ? 'ok' : 'error'}`}><strong>{planCorrect ? 'Good recovery scope' : 'Reconsider the scope'}</strong><span>{planCorrect ? 'Repair or restore the smallest affected state, prove quality, then rerun only the downstream path that needs recomputation.' : 'This choice either ignores correctness or increases compute/recovery scope without fixing the root cause.'}</span></div>}</section>
        <section className="surface-card postmortem-card"><div className="pane-title">Incident postmortem</div><p>Close the loop from detection to prevention before resuming production.</p><div className="postmortem-steps">{postmortem.map((item, index) => <div key={item.step} className={item.done ? 'done' : ''}><span>{item.done ? '✓' : index + 1}</span><div><strong>{item.step}</strong><small>{item.detail}</small></div></div>)}</div></section>
        <section className="surface-card"><div className="pane-title">Recent recovery evidence</div><div className="workspace-history">{workspace.history.slice(0, 10).map((item) => <div key={item.id}><span>{item.action}</span><strong>{item.object}</strong><small>#{item.snapshot} · {item.details}</small></div>)}</div></section>
      </aside>
    </div>
  </div>;
}
