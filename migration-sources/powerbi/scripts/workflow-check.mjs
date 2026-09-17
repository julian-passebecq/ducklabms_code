import { caseStudies } from '../src/data/curriculum.js';
import { advancedCaseStudies } from '../src/data/advancedCurriculum.js';
import { normalizeWorkspace } from '../src/utils/workspaceState.js';
import { checkWorkspaceTask } from '../src/utils/workspaceChecks.js';
import {
  addRelationshipToWorkspace,
  addSourceToWorkspace,
  appendQueryTransform,
  markQueriesApplied,
  performanceContextSignature,
  updateAllRelationships,
  releaseReadiness,
} from '../src/utils/simulatorLogic.js';

let failed = false;
const pass = msg => console.log(`PASS: ${msg}`);
const fail = msg => { console.error(`FAIL: ${msg}`); failed = true; };

function perform(workspace, check, index) {
  let w = workspace;
  switch (check.type) {
    case 'source':
      return addSourceToWorkspace(w, check.value);
    case 'sources':
      for (const source of check.value) w = addSourceToWorkspace(w, source);
      return w;
    case 'transformCount': {
      if (!w.sources.length) w = addSourceToWorkspace(w, 'SQL Server');
      const query = w.sources[0];
      while ((w.transforms || []).length < check.value) {
        w = appendQueryTransform(w, query, `Workflow step ${(w.transforms || []).length + 1}`);
      }
      return w;
    }
    case 'queryApplied':
      return markQueriesApplied(w, `10:${String(index).padStart(2, '0')}`);
    case 'relationships':
      while ((w.relationships || []).length < check.value) {
        w = addRelationshipToWorkspace(w, `Dim${w.relationships.length + 1} → Fact`);
      }
      return w;
    case 'measures': {
      const measures = [...(w.measures || [])];
      for (const name of check.value) if (!measures.some(m => m.name.toLowerCase() === name.toLowerCase())) measures.push({name, formula:`${name} = 1`});
      return {...w, measures};
    }
    case 'measureText':
      return {...w, measureText:`${w.measureText || ''}\n${check.value}`};
    case 'daxFormula':
      return {...w, daxObjects:[...(w.daxObjects || []).filter(item=>item.name!=='Workflow calculation'), {type:'Visual calculation',name:'Workflow calculation',formula:`Workflow calculation = ${check.value} ( [Metric], 7 )`} ]};
    case 'visuals':
      return {...w, visuals:[...new Set([...(w.visuals || []), ...check.value])], visualDetails:[...(w.visualDetails || [])]};
    case 'refreshMode':
      return {...w, refreshMode:check.value};
    case 'storageMode': {
      const next = {...w, storageMode:check.value};
      if (check.value === 'Direct Lake' && (w.sources || []).length) return markQueriesApplied(next, `10:${String(index).padStart(2, '0')}`);
      return next;
    }
    case 'rls':
      return {...w, rls:check.value};
    case 'performanceRun':
      return {...w, performance:{...(w.performance || {}), hasRun:check.value, evidenceSignature:check.value?performanceContextSignature(w):''}};
    case 'performanceCurrent':
      return {...w, performance:{...(w.performance || {}), hasRun:check.value, evidenceSignature:check.value?performanceContextSignature(w):''}};
    case 'appPublished':
      return {...w, service:{...(w.service || {}), appPublished:check.value}};
    case 'dateTable':
      return {...w, dateTable:check.value};
    case 'theme':
      return {...w, theme:check.value};
    case 'performanceOptimized':
      return {...w, performance:{...(w.performance || {}), optimized:[...new Set([...(w.performance?.optimized || []), check.value])]}};
    case 'relationshipDirection':
      return updateAllRelationships(w, {direction:check.value});
    case 'refreshFlags': {
      const refreshConfig = {...(w.refreshConfig || {})};
      for (const key of check.value) refreshConfig[key] = true;
      return {...w, refreshConfig};
    }
    case 'granularAction':
      return {...w, refreshConfig:{...(w.refreshConfig || {}), granularAction:check.value}};
    case 'copilotReady':
      return {...w, service:{...(w.service || {}), descriptionsReady:check.value, aiPrepared:check.value, copilotApproved:check.value}};
    case 'releaseReady':
      if ((releaseReadiness(w).passed === releaseReadiness(w).total) !== check.value) throw new Error('Release readiness preconditions were not satisfied by earlier workflow steps');
      return w;
    default:
      throw new Error(`Unsupported workflow check type: ${check.type}`);
  }
}

const allCases = [...caseStudies, ...advancedCaseStudies];
let totalSteps = 0;
for (const study of allCases) {
  let workspace = normalizeWorkspace({caseStudyId:study.id, ...(study.seed || {})});
  const satisfied = new Set();
  for (let i = 0; i < study.steps.length; i++) {
    const step = study.steps[i];
    totalSteps++;
    workspace = perform(workspace, step.check, i);
    if (!checkWorkspaceTask(step.check, workspace)) {
      fail(`${study.id}/${step.id} cannot be completed in sequential workflow state`);
      break;
    }
    satisfied.add(step.id);
    // Previously completed steps should remain complete unless their contract is explicitly transactional.
    for (const previous of study.steps.slice(0, i)) {
      if (previous.check.type === 'queryApplied' && workspace.queryDirty) continue;
      if (!checkWorkspaceTask(previous.check, workspace)) {
        fail(`${study.id}/${step.id} invalidated previous step ${previous.id}`);
      }
    }
  }
  if (satisfied.size === study.steps.length) pass(`${study.id}: ${satisfied.size}/${study.steps.length} sequential steps remain satisfiable`);
}

if (failed) process.exit(1);
console.log(`\nWorkflow checks passed: ${allCases.length} cases / ${totalSteps} sequential steps.`);
