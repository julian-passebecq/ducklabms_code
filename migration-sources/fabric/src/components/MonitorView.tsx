import { Button, Dropdown, Input, Option } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import type { PipelineRun, PipelineRunActivity, RunStatus } from '../types/app';
import type { FabricRetryMode } from '../lib/operationsRuntime';
import { ActivityDiagnostics } from './ActivityDiagnostics';

function statusClass(status: RunStatus) {
  return status.toLowerCase().replaceAll(' ', '-');
}

function activityDisplayStatus(activity: PipelineRunActivity) {
  return activity.rerunDisposition === 'Preserved' ? 'Preserved' : activity.status;
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function RunGantt({ run }: { run: PipelineRun }) {
  const total = Math.max(run.durationMs, 1);
  return <div className="gantt-run">
    <div className="gantt-run-title"><strong>{run.id}</strong><span className={`status-pill ${statusClass(run.status)}`}>{run.status}</span><span>{(run.durationMs / 1000).toFixed(1)}s</span><span>{run.trigger}</span></div>
    <div className="gantt-scale"><span>0s</span><span>{(total / 2000).toFixed(1)}s</span><span>{(total / 1000).toFixed(1)}s</span></div>
    <div className="gantt-rows">{run.activities.map((activity) => {
      const left = ((activity.startOffsetMs ?? 0) / total) * 100;
      const preserved = activity.rerunDisposition === 'Preserved';
      const width = preserved || activity.status === 'Skipped' ? 2 : Math.max((activity.durationMs / total) * 100, 4);
      const display = activityDisplayStatus(activity);
      return <div className="gantt-row" key={activity.nodeId}><span className="gantt-activity-name">{activity.name}</span><div className="gantt-track"><div className={`gantt-bar ${preserved ? 'preserved' : statusClass(activity.status)}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} title={`${activity.name} · ${display} · ${preserved ? 'not re-executed' : `${(activity.durationMs / 1000).toFixed(1)}s`} · starts ${((activity.startOffsetMs ?? 0) / 1000).toFixed(1)}s`}><b>{preserved ? 'preserved' : activity.durationMs ? `${(activity.durationMs / 1000).toFixed(1)}s` : 'skip'}</b></div></div></div>;
    })}</div>
  </div>;
}

export function MonitorView({ runs, onNavigate, onRetry }: { runs: PipelineRun[]; onNavigate?: (page: 'pipeline' | 'recovery') => void; onRetry?: (run: PipelineRun, mode: FabricRetryMode, activityNodeId?: string) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | 'Succeeded' | 'Failed'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<{ runId: string; nodeId: string } | null>(null);
  const [view, setView] = useState<'List' | 'Gantt' | 'Triggers'>('List');

  const filtered = useMemo(() => runs.filter((run) => {
    const matchesQuery = !query.trim() || `${run.id} ${run.caseStudyId} ${run.trigger}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === 'All' || run.status === status;
    return matchesQuery && matchesStatus;
  }), [runs, query, status]);


  const triggerGroups = useMemo(() => {
    const groups = new Map<string, PipelineRun[]>();
    filtered.filter((run) => run.trigger !== 'Debug').forEach((run) => groups.set(run.trigger, [...(groups.get(run.trigger) ?? []), run]));
    return [...groups.entries()].map(([name, triggerRuns]) => ({
      name,
      runs: triggerRuns,
      last: triggerRuns[0],
      succeeded: triggerRuns.filter((run) => run.status === 'Succeeded').length,
      failed: triggerRuns.filter((run) => run.status === 'Failed').length,
      averageDuration: Math.round(triggerRuns.reduce((sum, run) => sum + run.durationMs, 0) / Math.max(triggerRuns.length, 1)),
    }));
  }, [filtered]);

  const exportCsv = () => {
    const rows = [['run_id', 'case_study', 'experience', 'status', 'started_at', 'duration_ms', 'trigger']];
    filtered.forEach((run) => rows.push([run.id, run.caseStudyId, run.experience, run.status, run.startedAt, String(run.durationMs), run.trigger]));
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pipeline-runs.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const failureInsight = (run: PipelineRun) => {
    const failed = run.activities.find((activity) => activity.status === 'Failed');
    const skipped = run.activities.filter((activity) => activity.status === 'Skipped').length;
    if (!failed) return null;
    return <div className="monitor-failure-insight"><div><span className="eyebrow">Failure analysis</span><strong>{failed.name} failed after {failed.attempts || 1} attempt{(failed.attempts || 1) === 1 ? '' : 's'}</strong><p>{failed.error || failed.output || 'Inspect activity diagnostics for the root cause.'}</p></div><div className="failure-impact"><span>Downstream skipped</span><strong>{skipped}</strong><span>Recovery pattern</span><strong>Fix root cause → validate → restore/checkpoint if partial data mutated → rerun affected path</strong></div><div className="command-group">{onNavigate && <><Button appearance="secondary" size="small" onClick={() => onNavigate('pipeline')}>Open pipeline</Button><Button appearance="primary" size="small" onClick={() => onNavigate('recovery')}>Open recovery lab</Button></>}</div></div>;
  };

  const diagnosticsFor = (run: PipelineRun, activity: PipelineRunActivity) => {
    const open = selectedActivity?.runId === run.id && selectedActivity.nodeId === activity.nodeId;
    const preserved = activity.rerunDisposition === 'Preserved';
    return <><tr key={activity.nodeId}><td>{activity.name}</td><td>{activity.type}</td><td><span className={`status-pill ${preserved ? 'preserved' : statusClass(activity.status)}`}>{activityDisplayStatus(activity)}</span></td><td>{activity.attempts ?? 1}</td><td>{preserved ? 'Preserved' : activity.durationMs ? `${(activity.durationMs / 1000).toFixed(1)}s` : '—'}</td><td>{activity.secureOutput ? '🔒 Secure output' : activity.output}</td><td><div className="command-group"><Button appearance="subtle" size="small" onClick={() => setSelectedActivity(open ? null : { runId: run.id, nodeId: activity.nodeId })}>{open ? 'Hide' : 'Inspect'}</Button>{onRetry && <Button appearance="subtle" size="small" onClick={() => onRetry(run, 'From selected activity', activity.nodeId)}>Rerun from here</Button>}</div></td></tr>{open && <tr className="diagnostics-table-row"><td colSpan={7}><ActivityDiagnostics activity={activity} /></td></tr>}</>;
  };

  return (
    <div className="monitor-page">
      <div className="page-heading"><div><span className="eyebrow">Monitoring hub</span><h1>Pipeline runs</h1><p>Inspect status, trigger type, retries, secure activity output, copy diagnostics and dependency-aware Gantt timing.</p></div><div className="command-group"><Button appearance="secondary" onClick={() => { setQuery(''); setStatus('All'); }}>Refresh</Button><Button appearance="secondary" onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button></div></div>
      <div className="monitor-toolbar-row"><div className="monitor-filters"><Input placeholder="Filter by pipeline or run id" value={query} onChange={(_, data) => setQuery(data.value)} /><Dropdown value={status === 'All' ? 'All statuses' : status} selectedOptions={[status]} onOptionSelect={(_, data) => setStatus(data.optionValue as typeof status)}><Option value="All">All statuses</Option><Option value="Succeeded">Succeeded</Option><Option value="Failed">Failed</Option></Dropdown><div className="monitor-count">{filtered.length} run{filtered.length === 1 ? '' : 's'}</div></div><div className="monitor-view-toggle"><Button appearance={view === 'List' ? 'primary' : 'subtle'} size="small" onClick={() => setView('List')}>List</Button><Button appearance={view === 'Gantt' ? 'primary' : 'subtle'} size="small" onClick={() => setView('Gantt')}>Gantt</Button><Button appearance={view === 'Triggers' ? 'primary' : 'subtle'} size="small" onClick={() => setView('Triggers')}>Trigger history</Button></div></div>
      {filtered.length ? view === 'Triggers' ? <div className="trigger-history-grid">{triggerGroups.length ? triggerGroups.map((group) => <article className="trigger-history-card" key={group.name}><div className="trigger-history-heading"><div><span className="eyebrow">Trigger</span><strong>{group.name}</strong></div><span className={`status-pill ${statusClass(group.last.status)}`}>{group.last.status}</span></div><div className="trigger-history-stats"><div><span>Runs</span><strong>{group.runs.length}</strong></div><div><span>Succeeded</span><strong>{group.succeeded}</strong></div><div><span>Failed</span><strong>{group.failed}</strong></div><div><span>Avg duration</span><strong>{(group.averageDuration / 1000).toFixed(1)}s</strong></div></div><div className="trigger-history-last"><span>Last run</span><strong>{new Date(group.last.startedAt).toLocaleString()}</strong><code>{group.last.id}</code></div></article>) : <div className="empty-state-card"><strong>No triggered runs yet</strong><span>Use Test trigger from a pipeline schedule/event definition; Debug-only runs are excluded from this view.</span></div>}</div> : view === 'Gantt' ? <div className="monitor-gantt-list">{filtered.map((run) => <RunGantt key={run.id} run={run} />)}</div> : <div className="monitor-list">{filtered.map((r) => {
        const expanded = expandedId === r.id;
        return <article className={`monitor-run-card ${expanded ? 'expanded' : ''}`} key={r.id}>
          <div className="run-summary"><span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span><strong>{r.id}</strong><span>{new Date(r.startedAt).toLocaleString()}</span><span>{(r.durationMs / 1000).toFixed(1)}s</span><span>{r.trigger}</span>{r.parentRunId && <span className="monitor-parent-run">↳ {r.rerunMode} · parent {r.parentRunId}</span>}<Button size="small" appearance="subtle" onClick={() => setExpandedId(expanded ? null : r.id)}>{expanded ? 'Hide details' : 'View details'}</Button></div>
          <div className="run-activity-strip">{r.activities.map((a) => <div key={a.nodeId}><span className={`activity-dot ${a.rerunDisposition === 'Preserved' ? 'preserved' : statusClass(a.status)}`} /><strong>{a.name}</strong><span>{a.rerunDisposition === 'Preserved' ? 'preserved' : (a.attempts ?? 1) > 1 ? `${a.attempts} attempts` : a.durationMs ? `${(a.durationMs / 1000).toFixed(1)}s` : '—'}</span></div>)}</div>
          {expanded && <div className="monitor-run-details">{failureInsight(r)}{((r.parameterValues && Object.keys(r.parameterValues).length) || (r.variableValues && Object.keys(r.variableValues).length)) ? <div className="monitor-runtime-context"><div><span className="eyebrow">Runtime context</span><strong>Parameter + variable snapshot</strong><p>Reruns reuse the original runtime context unless the platform explicitly starts a new run with different parameters.</p></div><div className="runtime-context-grid">{Object.entries(r.parameterValues ?? {}).map(([key, value]) => <div key={`p-${key}`}><span>parameter · {key}</span><strong>{String(value)}</strong></div>)}{Object.entries(r.variableValues ?? {}).map(([key, value]) => <div key={`v-${key}`}><span>variable · {key}</span><strong>{String(value)}</strong></div>)}</div></div> : null}{onRetry && <div className="monitor-retry-actions"><div><span className="eyebrow">Manage run</span><strong>Retry or rerun a scoped activity path</strong><p>Full retry executes the whole representative run. Rerun-from-failure preserves successful upstream activity evidence and reruns the failed/downstream path.</p></div><div className="command-group"><Button appearance="secondary" size="small" onClick={() => onRetry(r, 'Full retry')}>Retry full run</Button>{r.status === 'Failed' && <Button appearance="primary" size="small" onClick={() => onRetry(r, 'From failed activity')}>Rerun from failed activity</Button>}</div></div>}<table className="run-table"><thead><tr><th>Activity</th><th>Type</th><th>Status</th><th>Attempts</th><th>Duration</th><th>Output</th><th /></tr></thead><tbody>{r.activities.map((a) => diagnosticsFor(r, a))}</tbody></table></div>}
        </article>;
      })}</div> : <div className="empty-state-card"><strong>No matching runs</strong><span>Run Debug from a pipeline, or change the filters above.</span></div>}
    </div>
  );
}
