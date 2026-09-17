import { Button } from '@fluentui/react-components';
import { useState } from 'react';
import type { PipelineNode, PipelineRun, PipelineRunActivity, RunStatus } from '../types/app';
import { ActivityDiagnostics } from './ActivityDiagnostics';

function statusClass(status: RunStatus) {
  return status.toLowerCase().replaceAll(' ', '-');
}

function liveActivity(node: PipelineNode): PipelineRunActivity {
  return {
    nodeId: node.id,
    name: node.name,
    type: node.type,
    status: node.status,
    durationMs: 0,
    startOffsetMs: 0,
    attempts: 1,
    input: JSON.stringify(node.config, null, 2),
    output: node.status === 'In progress' ? 'Activity is running…' : node.status === 'Queued' ? 'Waiting for dependencies…' : node.status === 'Skipped' ? 'Dependency condition not met.' : '',
    metrics: {},
    secureInput: Boolean(node.config.secureInput),
    secureOutput: Boolean(node.config.secureOutput),
  };
}

export function RunOutput({ run, nodes, debugging, open, onClose }: { run: PipelineRun | null; nodes: PipelineNode[]; debugging: boolean; open: boolean; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!open) return null;
  const live = debugging ? nodes.map(liveActivity) : null;
  const activities = live ?? run?.activities ?? [];
  const title = debugging ? 'Debug run in progress' : run ? `${run.id} · ${run.status}` : 'No debug run yet';
  const selected = activities.find((activity) => activity.nodeId === selectedId) ?? null;
  return (
    <section className="run-output">
      <div className="run-output-header">
        <div><strong>Output</strong><span>{title}</span></div>
        <button className="icon-button" onClick={onClose}>×</button>
      </div>
      {activities.length ? (
        <>
          <div className="run-table-wrap">
            <table className="run-table">
              <thead><tr><th>Activity</th><th>Type</th><th>Status</th><th>Attempts</th><th>Duration</th><th>Output</th><th /></tr></thead>
              <tbody>{activities.map((a) => <tr key={a.nodeId}><td>{a.name}</td><td>{a.type}</td><td><span className={`status-pill ${statusClass(a.status)}`}>{a.status}</span></td><td>{a.attempts ?? 1}</td><td>{a.durationMs ? `${(a.durationMs / 1000).toFixed(1)}s` : '—'}</td><td>{a.secureOutput ? '🔒 Secure output' : a.output || '—'}</td><td><Button size="small" appearance="subtle" onClick={() => setSelectedId(selectedId === a.nodeId ? null : a.nodeId)}>{selectedId === a.nodeId ? 'Hide' : 'Details'}</Button></td></tr>)}</tbody>
            </table>
          </div>
          {selected && <ActivityDiagnostics activity={selected} />}
        </>
      ) : <div className="empty-pane">Run Debug to see activity-level outputs.</div>}
    </section>
  );
}
