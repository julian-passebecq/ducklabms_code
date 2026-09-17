import { performanceEvidenceCurrent, queryChangesPending, releaseReadiness } from './simulatorLogic.js';

export function checkWorkspaceTask(check, workspace) {
  if (!check || !workspace) return false;
  switch (check.type) {
    case 'source': return (workspace.sources || []).includes(check.value);
    case 'sources': return check.value.every(v => (workspace.sources || []).includes(v));
    case 'transformCount': return (workspace.transforms || []).length >= check.value;
    case 'queryApplied': return (workspace.sources || []).length > 0 && Boolean(workspace.queryAppliedAt) && !queryChangesPending(workspace);
    case 'relationships': return (workspace.relationships || []).length >= check.value;
    case 'measures': return check.value.every(v => (workspace.measures || []).some(m => m.name.toLowerCase() === v.toLowerCase()));
    case 'measureText': return (workspace.measureText || '').toLowerCase().includes(check.value.toLowerCase());
    case 'daxFormula': return [...(workspace.measures || []), ...(workspace.daxObjects || [])].some(item => String(item?.formula || '').toLowerCase().includes(check.value.toLowerCase()));
    case 'visuals': return check.value.every(v => (workspace.visuals || []).includes(v));
    case 'refreshMode': return workspace.refreshMode === check.value;
    case 'storageMode': return workspace.storageMode === check.value;
    case 'rls': return workspace.rls === check.value;
    case 'performanceRun': return Boolean(workspace.performance?.hasRun) === check.value;
    case 'performanceCurrent': return performanceEvidenceCurrent(workspace) === check.value;
    case 'appPublished': return Boolean(workspace.service?.appPublished) === check.value;
    case 'dateTable': return Boolean(workspace.dateTable) === check.value;
    case 'theme': return workspace.theme === check.value;
    case 'performanceOptimized': return (workspace.performance?.optimized || []).includes(check.value);
    case 'relationshipDirection': {
      const details = Array.isArray(workspace.relationshipDetails) ? workspace.relationshipDetails : [];
      return details.length ? details.every(detail => detail?.direction === check.value) : workspace.relationshipSettings?.direction === check.value;
    }
    case 'refreshFlags': return check.value.every(v => Boolean(workspace.refreshConfig?.[v]));
    case 'granularAction': return workspace.refreshConfig?.granularAction === check.value;
    case 'copilotReady': return Boolean(workspace.service?.descriptionsReady && workspace.service?.aiPrepared && workspace.service?.copilotApproved) === check.value;
    case 'releaseReady': {
      const release = releaseReadiness(workspace);
      return (release.passed === release.total) === check.value;
    }
    default: return false;
  }
}

export function workspaceObjectCount(workspace) {
  return ['sources','transforms','relationships','measures','visuals']
    .reduce((total, key) => total + (Array.isArray(workspace?.[key]) ? workspace[key].length : 0), 0);
}
