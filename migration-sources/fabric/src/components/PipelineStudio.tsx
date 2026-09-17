import { Button } from '@fluentui/react-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityType, CaseStudy, DataWorkspace, Experience, NotebookDocument, PageKey, PipelineEdge, PipelineNode, PipelineParameter, PipelineRun, PipelineVariable, RunStatus, TutorialProgress, TutorialStep } from '../types/app';
import { ActivityPalette } from './ActivityPalette';
import { PipelineCanvas } from './PipelineCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { RunOutput } from './RunOutput';
import { ScheduleDialog, type PipelineSchedule } from './ScheduleDialog';
import { applyTriggerParameterValues, triggerSummary } from '../lib/triggers';
import { PipelineSettingsDialog } from './PipelineSettingsDialog';
import { DebugParametersDialog } from './DebugParametersDialog';
import { TutorialPanel } from './TutorialPanel';
import { applyVariableActivities, buildDebugPlan, createRun, makeNode, validatePipeline, validateTutorialStep } from '../lib/pipeline';
import { executePipelineLearningData } from '../lib/dataRuntime';
import { createWorkspaceCheckpoint, restoreWorkspaceCheckpoint } from '../lib/workspaceInsights';
import { recordTutorialValidation } from '../lib/tutorialLearning';

type Snapshot = { nodes: PipelineNode[]; edges: PipelineEdge[] };
type ContextMenuState = { nodeId: string; x: number; y: number } | null;

export function PipelineStudio({ experience, caseStudy, nodes, edges, runs, parameters, variables, stepIndex, tutorialProgress, workspace, notebook, onNodes, onEdges, onRuns, onParameters, onVariables, onStepIndex, onTutorialProgress, onWorkspace, onNotebook, onNavigate, onReveal, onReset }: {
  experience: Experience;
  caseStudy: CaseStudy;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  runs: PipelineRun[];
  parameters: PipelineParameter[];
  variables: PipelineVariable[];
  stepIndex: number;
  tutorialProgress: TutorialProgress;
  workspace: DataWorkspace;
  notebook: NotebookDocument;
  onNodes: (nodes: PipelineNode[]) => void;
  onEdges: (edges: PipelineEdge[]) => void;
  onRuns: (runs: PipelineRun[]) => void;
  onParameters: (parameters: PipelineParameter[]) => void;
  onVariables: (variables: PipelineVariable[]) => void;
  onStepIndex: (i: number) => void;
  onTutorialProgress: (progress: TutorialProgress) => void;
  onWorkspace: (workspace: DataWorkspace) => void;
  onNotebook: (notebook: NotebookDocument) => void;
  onNavigate: (page: PageKey) => void;
  onReveal: (step: TutorialStep) => void;
  onReset: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ ok: boolean; message: string } | null>(null);
  const [pipelineValidation, setPipelineValidation] = useState<string[] | null>(null);
  const [runOpen, setRunOpen] = useState(true);
  const [debugging, setDebugging] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(experience === 'fabric');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
  const [debugParametersOpen, setDebugParametersOpen] = useState(false);
  const [schedule, setSchedule] = useState<PipelineSchedule>({ enabled: false, kind: experience === 'fabric' ? 'Fixed schedule' : 'Schedule', frequency: 'Daily', interval: 1, startDate: new Date().toISOString().slice(0, 10), endDate: '2099-01-01', time: '08:00', timeZone: 'Europe/Oslo', eventSource: '', eventType: '', subjectFilter: '', parametersJson: '{}', failureNotifications: '' });
  const historyRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const timersRef = useRef<number[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const selectedEdge = useMemo(() => edges.find((edge) => edge.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);
  const latestRunCheckpoint = useMemo(() => (workspace.checkpoints ?? []).find((checkpoint) => checkpoint.label.startsWith('Before ')) ?? null, [workspace.checkpoints]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => { if (experience !== 'fabric') setTutorialOpen(false); }, [experience]);

  const commit = (nextNodes: PipelineNode[], nextEdges: PipelineEdge[]) => {
    historyRef.current.push({ nodes, edges });
    if (historyRef.current.length > 60) historyRef.current.shift();
    futureRef.current = [];
    onNodes(nextNodes);
    onEdges(nextEdges);
    setHistoryVersion((v) => v + 1);
  };

  const addNode = (type: ActivityType, x?: number, y?: number) => {
    const made = makeNode(type, nodes.length);
    const n = type === 'invokePipeline' && experience === 'azure' ? { ...made, config: { ...made.config, invokeSource: 'Azure Data Factory' } } : made;
    const placed = x === undefined || y === undefined ? n : { ...n, x, y };
    commit([...nodes, placed], edges);
    setSelectedEdgeId(null);
    setSelectedId(placed.id);
  };

  const duplicateNode = (id: string) => {
    const source = nodes.find((node) => node.id === id);
    if (!source) return;
    const duplicate: PipelineNode = { ...source, id: `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: `${source.name}_Copy`, x: source.x + 40, y: source.y + 40, status: 'Not run', config: { ...source.config } };
    commit([...nodes, duplicate], edges);
    setSelectedEdgeId(null);
    setSelectedId(duplicate.id);
    setContextMenu(null);
  };

  const connect = (from: string, to: string) => {
    if (from === to || edges.some((e) => e.from === from && e.to === to)) return;
    const edge = { id: `edge-${from}-${to}-${Date.now()}`, from, to, condition: 'Succeeded' as const };
    commit(nodes, [...edges, edge]);
    setSelectedId(null);
    setSelectedEdgeId(edge.id);
  };

  const deleteNodes = (ids: string[]) => {
    const set = new Set(ids);
    commit(nodes.filter((n) => !set.has(n.id)), edges.filter((e) => !set.has(e.from) && !set.has(e.to)));
    if (selectedId && set.has(selectedId)) setSelectedId(null);
    setContextMenu(null);
  };

  const deleteEdges = (ids: string[]) => {
    const set = new Set(ids);
    commit(nodes, edges.filter((edge) => !set.has(edge.id)));
    if (selectedEdgeId && set.has(selectedEdgeId)) setSelectedEdgeId(null);
  };

  const undo = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    futureRef.current.push({ nodes, edges });
    onNodes(previous.nodes);
    onEdges(previous.edges);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setHistoryVersion((v) => v + 1);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({ nodes, edges });
    onNodes(next.nodes);
    onEdges(next.edges);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setHistoryVersion((v) => v + 1);
  };

  const debug = (runtimeParameters: PipelineParameter[] = parameters, trigger = 'Debug') => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    const problems = validatePipeline(nodes, edges, parameters, variables);
    setPipelineValidation(problems);
    setRunOpen(true);
    setContextMenu(null);
    if (problems.length) return;

    const plan = buildDebugPlan(nodes, edges);
    const statusByNode = new Map<string, RunStatus>();
    plan.forEach((step) => statusByNode.set(step.nodeId, step.finalStatus));
    let snapshot = nodes.map((node) => ({ ...node, status: 'Queued' as RunStatus }));
    onNodes(snapshot);
    setDebugging(true);

    let offset = 180;
    plan.forEach((step) => {
      if (step.finalStatus === 'Skipped') {
        snapshot = snapshot.map((node) => node.id === step.nodeId ? { ...node, status: 'Skipped' } : node);
        const skippedSnapshot = snapshot;
        timersRef.current.push(window.setTimeout(() => onNodes(skippedSnapshot), offset));
        offset += 180;
        return;
      }
      snapshot = snapshot.map((node) => node.id === step.nodeId ? { ...node, status: 'In progress' } : node);
      const runningSnapshot = snapshot;
      timersRef.current.push(window.setTimeout(() => onNodes(runningSnapshot), offset));
      offset += 360;
      snapshot = snapshot.map((node) => node.id === step.nodeId ? { ...node, status: step.finalStatus } : node);
      const finalSnapshot = snapshot;
      timersRef.current.push(window.setTimeout(() => onNodes(finalSnapshot), offset));
      offset += 180;
    });

    timersRef.current.push(window.setTimeout(() => {
      const orderedNodes = plan.map((step) => nodes.find((node) => node.id === step.nodeId)).filter((node): node is PipelineNode => Boolean(node));
      const checkpointedWorkspace = createWorkspaceCheckpoint(workspace, `Before ${trigger} run`);
      const dataExecution = executePipelineLearningData(checkpointedWorkspace, notebook, orderedNodes, statusByNode, edges);
      onWorkspace(dataExecution.workspace);
      onNotebook(dataExecution.notebook);
      const effectiveStatus = dataExecution.statusByNode;
      onNodes(nodes.map((node) => ({ ...node, status: effectiveStatus.get(node.id) ?? node.status })));
      const run = createRun(caseStudy, experience, nodes, effectiveStatus, runtimeParameters, variables, edges, trigger, dataExecution.runtimeErrors);
      if (dataExecution.messages.length) {
        const notebookActivity = run.activities.find((activity) => activity.type === 'notebook' && activity.status === 'Succeeded');
        if (notebookActivity) notebookActivity.output = `${notebookActivity.output}\n\nLearning data runtime:\n${dataExecution.messages.join('\n')}`;
      }
      onVariables(applyVariableActivities(nodes, effectiveStatus, runtimeParameters, variables));
      onRuns([run, ...runs].slice(0, 20));
      setDebugging(false);
    }, offset + 60));
  };

  const resetStatuses = () => {
    commit(nodes.map((node) => ({ ...node, status: 'Not run' })), edges);
    setContextMenu(null);
  };

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void historyVersion;

  const gridTemplateColumns = experience === 'fabric'
    ? `${paletteOpen ? '190px' : '0px'} minmax(520px, 1fr) ${propertiesOpen ? '280px' : '0px'} ${tutorialOpen ? '315px' : '0px'}`
    : `${paletteOpen ? '190px' : '0px'} minmax(520px, 1fr) ${propertiesOpen ? '280px' : '0px'}`;

  return (
    <div className="pipeline-page fluent-pipeline-page" onClick={() => contextMenu && setContextMenu(null)}>
      <div className="pipeline-commandbar fluent-commandbar">
        <div className="command-group">
          <Button appearance="subtle" size="small" onClick={undo} disabled={!canUndo}>↶ Undo</Button>
          <Button appearance="subtle" size="small" onClick={redo} disabled={!canRedo}>↷ Redo</Button>
          <span className="command-separator" />
          <Button appearance="subtle" size="small" onClick={() => setPipelineValidation(validatePipeline(nodes, edges, parameters, variables))}>✓ Validate</Button>
          <Button appearance="primary" size="small" onClick={() => parameters.length ? setDebugParametersOpen(true) : debug()} disabled={debugging}>{debugging ? 'Running…' : '▶ Debug'}</Button>
          <Button appearance="subtle" size="small" onClick={() => setSavedAt(new Date().toLocaleTimeString())}>{savedAt ? `✓ Saved ${savedAt}` : '▣ Save'}</Button>
          <Button appearance={schedule.enabled ? 'secondary' : 'subtle'} size="small" onClick={() => setScheduleOpen(true)}>◷ {schedule.enabled ? schedule.kind : experience === 'fabric' ? 'Schedule / Trigger' : 'Trigger'}</Button>
          <Button appearance={(parameters.length || variables.length) ? 'secondary' : 'subtle'} size="small" onClick={() => setPipelineSettingsOpen(true)}>ƒx Parameters</Button>
          <Button appearance="subtle" size="small" onClick={() => setRunOpen((v) => !v)}>▤ Output</Button>
          {runs[0]?.status === 'Failed' && latestRunCheckpoint && <Button appearance="secondary" size="small" onClick={() => onWorkspace(restoreWorkspaceCheckpoint(workspace, latestRunCheckpoint.id))}>↺ Restore pre-run data</Button>}
          <span className="command-separator" />
          <Button appearance={paletteOpen ? 'secondary' : 'subtle'} size="small" onClick={() => setPaletteOpen((v) => !v)}>Activities</Button>
          <Button appearance={propertiesOpen ? 'secondary' : 'subtle'} size="small" onClick={() => setPropertiesOpen((v) => !v)}>Properties</Button>
          {experience === 'fabric' && <Button appearance={tutorialOpen ? 'secondary' : 'subtle'} size="small" onClick={() => setTutorialOpen((v) => !v)}>Tutorial</Button>}
        </div>
        <div className="command-context"><span>{experience === 'fabric' ? 'Fabric pipeline' : 'ADF pipeline'}</span><strong>PL_{caseStudy.id.replaceAll('-', '_')}</strong></div>
      </div>
      {pipelineValidation && (
        <div className={`pipeline-validation-banner ${pipelineValidation.length ? 'has-errors' : 'valid'}`}>
          {pipelineValidation.length ? <><strong>Validation found {pipelineValidation.length} issue{pipelineValidation.length > 1 ? 's' : ''}</strong><span>{pipelineValidation.slice(0, 3).join(' · ')}</span></> : <><strong>Pipeline valid</strong><span>No structural problems found. You can run Debug.</span></>}
          <button onClick={() => setPipelineValidation(null)}>×</button>
        </div>
      )}
      <div className="pipeline-workbench v4-pipeline-workbench" style={{ gridTemplateColumns }}>
        {paletteOpen && <ActivityPalette experience={experience} onAdd={(type) => addNode(type)} />}
        <main className="canvas-column">
          <PipelineCanvas
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            selectedEdgeId={selectedEdgeId}
            onSelect={(id) => { setSelectedId(id); if (id) setSelectedEdgeId(null); }}
            onEdgeSelect={(id) => { setSelectedEdgeId(id); if (id) setSelectedId(null); }}
            onMove={(id, x, y) => commit(nodes.map((n) => n.id === id ? { ...n, x, y } : n), edges)}
            onConnect={connect}
            onDeleteNodes={deleteNodes}
            onDeleteEdges={deleteEdges}
            onDropAdd={(type, x, y) => addNode(type, x, y)}
            onNodeContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
          />
          <RunOutput run={runs[0] ?? null} nodes={nodes} debugging={debugging} open={runOpen} onClose={() => setRunOpen(false)} />
        </main>
        {propertiesOpen && <PropertiesPanel
          experience={experience}
          node={selected}
          edge={selectedEdge}
          nodes={nodes}
          parameters={parameters}
          variables={variables}
          onChange={(changed) => commit(nodes.map((n) => n.id === changed.id ? changed : n), edges)}
          onEdgeChange={(changed) => commit(nodes, edges.map((edge) => edge.id === changed.id ? changed : edge))}
          onDelete={(id) => deleteNodes([id])}
          onDeleteEdge={(id) => deleteEdges([id])}
          onOpenNotebook={() => onNavigate('notebook')}
          onOpenDataflow={() => onNavigate('dataflow')}
          onOpenSql={() => onNavigate('sql')}
        />}
        {experience === 'fabric' && tutorialOpen && (
          <TutorialPanel
            caseStudy={caseStudy}
            workspace={workspace}
            stepIndex={stepIndex}
            progress={tutorialProgress}
            validation={validation}
            runs={runs}
            onValidate={() => {
              const result = validateTutorialStep(caseStudy.steps[stepIndex], nodes, edges, runs);
              setValidation(result);
              onTutorialProgress(recordTutorialValidation(tutorialProgress, caseStudy.steps[stepIndex].id, result));
            }}
            onProgress={onTutorialProgress}
            onNext={() => { setValidation(null); onStepIndex(Math.min(caseStudy.steps.length - 1, stepIndex + 1)); }}
            onPrev={() => { setValidation(null); onStepIndex(Math.max(0, stepIndex - 1)); }}
            onReveal={onReveal}
            onReset={onReset}
            onNavigate={onNavigate}
            onRecovery={() => onNavigate('recovery')}
          />
        )}
      </div>
      {contextMenu && <div className="pipeline-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
        <button onClick={() => duplicateNode(contextMenu.nodeId)}>Duplicate activity</button>
        <button onClick={() => { setSelectedId(contextMenu.nodeId); setSelectedEdgeId(null); setPropertiesOpen(true); setContextMenu(null); }}>Open properties</button>
        <button onClick={resetStatuses}>Reset run status</button>
        <button className="danger" onClick={() => deleteNodes([contextMenu.nodeId])}>Delete activity</button>
      </div>}
      <ScheduleDialog open={scheduleOpen} experience={experience} parameters={parameters} schedule={schedule} onChange={setSchedule} onTest={(definition) => { setSchedule(definition); setScheduleOpen(false); debug(applyTriggerParameterValues(definition, parameters), triggerSummary(definition)); }} onClose={() => setScheduleOpen(false)} />
      <PipelineSettingsDialog open={pipelineSettingsOpen} parameters={parameters} variables={variables} onParameters={onParameters} onVariables={onVariables} onClose={() => setPipelineSettingsOpen(false)} />
      <DebugParametersDialog open={debugParametersOpen} parameters={parameters} onRun={(runtime) => { setDebugParametersOpen(false); debug(runtime); }} onClose={() => setDebugParametersOpen(false)} />
    </div>
  );
}
