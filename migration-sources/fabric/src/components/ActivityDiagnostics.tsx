import type { PipelineRunActivity } from '../types/app';

function bytes(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function metricLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

export function ActivityDiagnostics({ activity }: { activity: PipelineRunActivity }) {
  const metrics = Object.entries(activity.metrics ?? {});
  const copyMetrics = activity.type === 'copy';
  return <div className="activity-diagnostics">
    <div className="diagnostics-summary-grid">
      <div><span>Status</span><strong>{activity.status}</strong></div>
      <div><span>Execution</span><strong>{activity.rerunDisposition ?? 'Executed'}</strong></div>
      <div><span>Attempts</span><strong>{activity.attempts ?? 1}</strong></div>
      <div><span>Start offset</span><strong>{((activity.startOffsetMs ?? 0) / 1000).toFixed(2)}s</strong></div>
      <div><span>Duration</span><strong>{activity.rerunDisposition === 'Preserved' ? 'preserved' : `${(activity.durationMs / 1000).toFixed(2)}s`}</strong></div>
    </div>

    {activity.dependencies?.length ? <div className="diagnostic-metrics"><strong>Dependencies</strong><div className="diagnostic-metric-grid">{activity.dependencies.map((dependency) => <div key={`${dependency.nodeId}-${dependency.condition}`}><span>{dependency.nodeId}</span><strong>{dependency.condition}</strong></div>)}</div></div> : null}

    {copyMetrics && <div className="copy-diagnostics">
      <div className="copy-diag-heading"><strong>Copy performance</strong><span>Mock values mirror the kinds of counters shown by Fabric/ADF monitoring.</span></div>
      <div className="copy-diag-cards">
        <div><span>Rows</span><strong>{String(activity.metrics.rowsRead ?? 0)} → {String(activity.metrics.rowsWritten ?? 0)}</strong></div>
        <div><span>Data</span><strong>{bytes(activity.metrics.dataReadBytes)} → {bytes(activity.metrics.dataWrittenBytes)}</strong></div>
        <div><span>Throughput</span><strong>{String(activity.metrics.throughputMBps ?? 0)} MB/s</strong></div>
        <div><span>Parallel copies</span><strong>{String(activity.metrics.parallelCopies ?? 1)}</strong></div>
      </div>
      <div className="copy-diag-timeline"><span style={{ width: `${Math.max(8, Math.min(35, Number(activity.metrics.queueMs ?? 0) / Math.max(activity.durationMs, 1) * 100))}%` }}>Queue</span><span className="transfer">Transfer</span></div>
    </div>}

    {metrics.length > 0 && <div className="diagnostic-metrics"><strong>Metrics</strong><div className="diagnostic-metric-grid">{metrics.map(([key, value]) => <div key={key}><span>{metricLabel(key)}</span><strong>{String(value)}</strong></div>)}</div></div>}

    <div className="diagnostics-io-grid">
      <section><strong>Input</strong><pre>{activity.secureInput ? 'Secure input is hidden from monitoring.' : activity.input || '—'}</pre></section>
      <section><strong>Output</strong><pre>{activity.secureOutput ? 'Secure output is hidden from monitoring.' : activity.output || '—'}</pre></section>
    </div>
    {activity.error && <section className="diagnostic-error"><strong>Error</strong><pre>{activity.secureOutput ? 'Secure output policy hides detailed failure output.' : activity.error}</pre></section>}
  </div>;
}
