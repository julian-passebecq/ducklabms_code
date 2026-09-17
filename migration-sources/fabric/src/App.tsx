import { useEffect, useMemo, useState } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { AppShell } from './components/AppShell';
import { AzureHub } from './components/AzureHub';
import { AirflowStudio } from './components/AirflowStudio';
import { AzureMappingDataFlowStudio } from './components/AzureMappingDataFlowStudio';
import { DataEngineDialog } from './components/DataEngineDialog';
import { DataExplorer } from './components/DataExplorer';
import { DataflowStudio } from './components/DataflowStudio';
import { DbtStudio } from './components/DbtStudio';
import { FabricCopyJobStudio } from './components/FabricCopyJobStudio';
import { FabricDeploymentStudio } from './components/FabricDeploymentStudio';
import { FabricGovernanceStudio } from './components/FabricGovernanceStudio';
import { FabricHub } from './components/FabricHub';
import { FabricLakehouseStudio } from './components/FabricLakehouseStudio';
import { FabricRealTimeStudio } from './components/FabricRealTimeStudio';
import { FabricRuntimeStudio } from './components/FabricRuntimeStudio';
import { ManageView } from './components/ManageView';
import { MonitorView } from './components/MonitorView';
import { NotebookStudio } from './components/NotebookStudio';
import { PipelineStudio } from './components/PipelineStudio';
import { SolutionModal } from './components/SolutionModal';
import { SqlStudio } from './components/SqlStudio';
import { ToolChoiceStudio } from './components/ToolChoiceStudio';
import { RecoveryStudio } from './components/RecoveryStudio';
import { PracticeStudio } from './components/PracticeStudio';
import { ChallengeStudio } from './components/ChallengeStudio';
import { CaseStudyStudio } from './components/CaseStudyStudio';
import { ProductionWorkflowStudio } from './components/ProductionWorkflowStudio';
import {
  AdfDatabricksIntegrationStudio,
  DatabricksComputeStudio,
  DatabricksHome,
  DatabricksMonitorStudio,
  DatabricksNotebookStudio,
  DatabricksSqlStudio,
  DatabricksStreamingStudio,
  LakeflowJobsStudio,
  LakeflowPipelinesStudio,
  UnityCatalogStudio
} from './components/DatabricksStudios';
import { caseStudies, getCaseStudy } from './data/caseStudies';
import { applyStepSolution } from './lib/pipeline';
import { createTutorialProgress, normalizeTutorialProgress, recordSolutionApplied, recordSolutionReveal } from './lib/tutorialLearning';
import { seedNotebook, seedWorkspace } from './lib/dataRuntime';
import { createFabricRetryRun, type FabricRetryMode } from './lib/operationsRuntime';
import { clearLab, loadLab, saveLab } from './lib/storage';
import type { AzureProduct, DataWorkspace, Experience, NotebookDocument, PageKey, PipelineEdge, PipelineNode, PipelineParameter, PipelineRun, PipelineVariable, TutorialProgress, TutorialStep } from './types/app';
import { azureLearningTheme, fabricLearningTheme } from './design-system/themes';
import './styles.css';

export default function App() {
  const [experience, setExperience] = useState<Experience>('fabric');
  const [azureProduct, setAzureProduct] = useState<AzureProduct>('adf');
  const [page, setPage] = useState<PageKey>('home');
  const [caseStudyId, setCaseStudyId] = useState(caseStudies[0].id);
  const caseStudy = useMemo(() => getCaseStudy(caseStudyId), [caseStudyId]);
  const [nodes, setNodes] = useState<PipelineNode[]>([]);
  const [edges, setEdges] = useState<PipelineEdge[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [parameters, setParameters] = useState<PipelineParameter[]>([{ id: 'param-batch-date', name: 'batch_date', type: 'String', defaultValue: '2026-09-16' }]);
  const [variables, setVariables] = useState<PipelineVariable[]>([{ id: 'var-run-mode', name: 'run_mode', type: 'String', defaultValue: 'incremental', currentValue: 'incremental' }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [workspace, setWorkspace] = useState<DataWorkspace>(() => seedWorkspace(caseStudy));
  const [notebook, setNotebook] = useState<NotebookDocument>(() => seedNotebook(caseStudy));
  const [solution, setSolution] = useState<TutorialStep | null>(null);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>(() => createTutorialProgress(caseStudy));
  const [engineOpen, setEngineOpen] = useState(false);
  const [engineMode, setEngineMode] = useState<'Local workspace' | 'MotherDuck'>('Local workspace');
  const [hydratedKey, setHydratedKey] = useState('');

  const labKey = `${experience}:${caseStudyId}`;

  useEffect(() => {
    const saved = loadLab(caseStudyId, experience, caseStudy);
    setNodes(saved?.nodes ?? []);
    setEdges(saved?.edges ?? []);
    setRuns(saved?.runs ?? []);
    setParameters(saved?.parameters ?? [{ id: 'param-batch-date', name: 'batch_date', type: 'String', defaultValue: '2026-09-16' }]);
    setVariables(saved?.variables ?? [{ id: 'var-run-mode', name: 'run_mode', type: 'String', defaultValue: 'incremental', currentValue: 'incremental' }]);
    setStepIndex(saved?.stepIndex ?? 0);
    setWorkspace(saved?.workspace?.caseStudyId === caseStudyId ? saved.workspace : seedWorkspace(caseStudy));
    setNotebook(saved?.notebook ?? seedNotebook(caseStudy));
    setTutorialProgress(normalizeTutorialProgress(saved?.tutorialProgress, caseStudy));
    setHydratedKey(labKey);
  }, [labKey, caseStudyId, experience]);

  useEffect(() => {
    if (hydratedKey !== labKey) return;
    saveLab(caseStudyId, experience, { nodes, edges, runs, parameters, variables, stepIndex, workspace, notebook, tutorialProgress });
  }, [nodes, edges, runs, parameters, variables, stepIndex, workspace, notebook, tutorialProgress, caseStudyId, experience, labKey, hydratedKey]);

  const selectCase = (id: string) => { setCaseStudyId(id); setPage(experience === 'fabric' ? 'home' : azureProduct === 'databricks' ? 'dbx-home' : 'home'); };
  const reset = () => { clearLab(caseStudyId, experience); setNodes([]); setEdges([]); setRuns([]); setParameters([{ id: 'param-batch-date', name: 'batch_date', type: 'String', defaultValue: '2026-09-16' }]); setVariables([{ id: 'var-run-mode', name: 'run_mode', type: 'String', defaultValue: 'incremental', currentValue: 'incremental' }]); setStepIndex(0); setWorkspace(seedWorkspace(caseStudy)); setNotebook(seedNotebook(caseStudy)); setTutorialProgress(createTutorialProgress(caseStudy)); setSolution(null); };
  const revealSolution = (step: TutorialStep) => { setTutorialProgress((progress) => recordSolutionReveal(progress, step.id)); setSolution(step); };
  const applySolution = (step: TutorialStep) => { const result = applyStepSolution(step, nodes, edges); setNodes(result.nodes); setEdges(result.edges); setTutorialProgress((progress) => recordSolutionApplied(progress, step.id)); if (step.apply.page) setPage(step.apply.page); setSolution(null); };
  const changeExperience = (next: Experience) => { setExperience(next); setPage(next === 'fabric' ? 'home' : azureProduct === 'databricks' ? 'dbx-home' : 'home'); };
  const changeAzureProduct = (next: AzureProduct) => { setAzureProduct(next); setPage(next === 'databricks' ? 'dbx-home' : 'home'); };

  let content: React.ReactNode;
  switch (page) {
    case 'home':
      content = experience === 'fabric'
        ? <FabricHub active={caseStudy} onSelectCase={selectCase} onNavigate={setPage} />
        : <AzureHub product={azureProduct} onProduct={changeAzureProduct} onNavigate={setPage} />;
      break;
    case 'case-study': content = <CaseStudyStudio caseStudy={caseStudy} workspace={workspace} platform={experience === 'fabric' ? 'fabric' : 'databricks'} onNavigate={setPage} />; break;
    case 'pipeline':
      content = <PipelineStudio experience={experience} caseStudy={caseStudy} nodes={nodes} edges={edges} runs={runs} parameters={parameters} variables={variables} stepIndex={stepIndex} tutorialProgress={tutorialProgress} workspace={workspace} notebook={notebook} onNodes={setNodes} onEdges={setEdges} onRuns={setRuns} onParameters={setParameters} onVariables={setVariables} onStepIndex={setStepIndex} onTutorialProgress={setTutorialProgress} onWorkspace={setWorkspace} onNotebook={setNotebook} onNavigate={setPage} onReveal={revealSolution} onReset={reset} />;
      break;
    case 'dataflow':
      content = experience === 'fabric' ? <DataflowStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} /> : <AzureMappingDataFlowStudio caseStudy={caseStudy} />;
      break;
    case 'dbt': content = <DbtStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'airflow': content = <AirflowStudio caseStudy={caseStudy} workspace={workspace} notebook={notebook} pipelineNodes={nodes} onWorkspace={setWorkspace} onNotebook={setNotebook} />; break;
    case 'toolchoice': content = <ToolChoiceStudio caseStudy={caseStudy} onNavigate={setPage} />; break;
    case 'practice': content = <PracticeStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} onNavigate={setPage} />; break;
    case 'challenge': content = <ChallengeStudio caseStudy={caseStudy} workspace={workspace} nodes={nodes} edges={edges} runs={runs} onWorkspace={setWorkspace} onNavigate={setPage} />; break;
    case 'production': content = <ProductionWorkflowStudio platform="fabric" caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} onNavigate={setPage} />; break;
    case 'recovery': content = <RecoveryStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'notebook': content = <NotebookStudio caseStudy={caseStudy} workspace={workspace} notebook={notebook} onWorkspace={setWorkspace} onNotebook={setNotebook} />; break;
    case 'sql': content = <SqlStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'data': content = <DataExplorer caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} engineMode={engineMode} catalogLabel={experience === 'fabric' ? 'OneLake / training catalog' : 'ADF datasets / training data'} />; break;
    case 'monitor': content = <MonitorView runs={runs} onNavigate={(target) => setPage(target)} onRetry={(run, mode: FabricRetryMode, activityNodeId) => setRuns((current) => [createFabricRetryRun(run, mode, activityNodeId), ...current].slice(0, 20))} />; break;
    case 'manage': content = <ManageView experience={experience} />; break;
    case 'lakehouse': content = <FabricLakehouseStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'runtime': content = <FabricRuntimeStudio caseStudy={caseStudy} />; break;
    case 'realtime': content = <FabricRealTimeStudio caseStudy={caseStudy} />; break;
    case 'governance': content = <FabricGovernanceStudio caseStudy={caseStudy} workspace={workspace} />; break;
    case 'deployment': content = <FabricDeploymentStudio />; break;
    case 'copyjob': content = <FabricCopyJobStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'dbx-home': content = <DatabricksHome onNavigate={setPage} />; break;
    case 'dbx-production': content = <ProductionWorkflowStudio platform="databricks" caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} onNavigate={setPage} />; break;
    case 'dbx-notebook': content = <DatabricksNotebookStudio caseStudy={caseStudy} workspace={workspace} notebook={notebook} onWorkspace={setWorkspace} onNotebook={setNotebook} />; break;
    case 'dbx-catalog': content = <UnityCatalogStudio caseStudy={caseStudy} workspace={workspace} />; break;
    case 'dbx-compute': content = <DatabricksComputeStudio />; break;
    case 'dbx-streaming': content = <DatabricksStreamingStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'dbx-pipelines': content = <LakeflowPipelinesStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'dbx-jobs': content = <LakeflowJobsStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'dbx-sql': content = <DatabricksSqlStudio caseStudy={caseStudy} workspace={workspace} onWorkspace={setWorkspace} />; break;
    case 'dbx-monitor': content = <DatabricksMonitorStudio />; break;
    case 'dbx-adf-integration': content = <AdfDatabricksIntegrationStudio />; break;
    case 'powerbi-placeholder': content = <div className="unsupported-page"><strong>Power BI is reserved for the next pass.</strong><span>The architecture already leaves a serving/semantic-model layer after Fabric Warehouse/Lakehouse and Databricks SQL so Power BI can be added without restructuring the data-engineering workbenches.</span></div>; break;
    default: content = null;
  }

  return <FluentProvider theme={experience === 'fabric' ? fabricLearningTheme : azureLearningTheme} className="fluent-app-root">
    <AppShell experience={experience} azureProduct={azureProduct} page={page} caseStudy={caseStudy} engineMode={engineMode} onExperience={changeExperience} onAzureProduct={changeAzureProduct} onPage={setPage} onEngine={() => setEngineOpen(true)}>{content}</AppShell>
    <SolutionModal step={solution} onClose={() => setSolution(null)} onApply={applySolution} />
    <DataEngineDialog open={engineOpen} onClose={() => setEngineOpen(false)} mode={engineMode} onMode={setEngineMode} />
  </FluentProvider>;
}
