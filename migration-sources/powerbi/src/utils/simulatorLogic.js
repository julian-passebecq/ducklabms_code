import { connectors } from '../data/curriculum.js';


const scenarioProfiles = {
  sales: {
    id: 'sales', label: 'Sales analytics', documentName: 'Sales Analysis.pbix', pageName: 'Executive overview',
    reportName: 'Sales 360', semanticModelName: 'Sales Semantic Model', workspaceName: 'BI Learning Lab',
    lineageSource: 'SQL / files', primaryFact: 'Sales', primaryMeasure: '[Total Sales]', primaryMeasureLabel: 'Total Sales', tmdlFormula: 'SUM ( Sales[Sales] )',
    axis: 'Date[Month]', legend: 'Product[Category]', fields: ['Sales','Product','Region','Date','Measures'],
    filterOptions: ['Date[Year] = 2026','Region[Country] = Norway','Product[Category] = Bikes','[Total Sales] > 100000'],
  },
  wind: {
    id: 'wind', label: 'Operations telemetry', documentName: 'Wind Operations.pbix', pageName: 'Operations overview',
    reportName: 'Wind Operations Monitor', semanticModelName: 'Wind Operations Model', workspaceName: 'Operations BI Lab',
    lineageSource: 'OneLake / Lakehouse', primaryFact: 'Telemetry', primaryMeasure: '[Energy MWh]', primaryMeasureLabel: 'Energy MWh', tmdlFormula: 'SUM ( Telemetry[EnergyMWh] )',
    axis: 'Date[Month]', legend: 'Site[Site]', fields: ['Telemetry','Turbine','Site','Date','Measures'],
    filterOptions: ['Date[Year] = 2026','Site[Country] = Norway','Turbine[Model] = WT-4','[Availability %] < 0.95'],
  },
  finance: {
    id: 'finance', label: 'Finance & budget', documentName: 'Project Margin Forecast.pbix', pageName: 'Management overview',
    reportName: 'Project Margin & Forecast', semanticModelName: 'Project Finance Model', workspaceName: 'Finance BI Lab',
    lineageSource: 'Azure SQL / SharePoint', primaryFact: 'Actuals', primaryMeasure: '[Actual]', primaryMeasureLabel: 'Actual', tmdlFormula: 'SUM ( Actuals[Amount] )',
    axis: 'Date[Month]', legend: 'Project[BusinessUnit]', fields: ['Actuals','Budget','Project','Date','Measures'],
    filterOptions: ['Date[Year] = 2026','Project[BusinessUnit] = Finance','Project[Manager] = M. Dubois','[Variance] < 0'],
  },
};

export function detectScenario(workspace = {}) {
  const caseId = workspace.caseStudyId || '';
  if (caseId) {
    if (caseId === 'windops') return 'wind';
    if (caseId === 'finance') return 'finance';
    return 'sales';
  }
  // Report/model/service surfaces represent the loaded semantic model. While Power Query
  // changes are staged, keep scenario identity on the last Close & Apply snapshot.
  const currentSources = Array.isArray(workspace.sources) ? workspace.sources : [];
  const appliedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : [];
  const scenarioSources = queryChangesPending(workspace) ? appliedSources : currentSources;
  if (scenarioSources.includes('OneLake catalog')) return 'wind';
  if (scenarioSources.includes('Azure SQL Database') && scenarioSources.includes('SharePoint Folder')) return 'finance';
  return 'sales';
}

export function getScenarioProfile(workspace = {}) {
  return scenarioProfiles[detectScenario(workspace)] || scenarioProfiles.sales;
}

export function hasLoadedSemanticModel(workspace = {}) {
  return Array.isArray(workspace.appliedSources) && workspace.appliedSources.length > 0;
}


export function upsertMeasureInWorkspace(workspace = {}, name = '', formula = '') {
  const cleanName = String(name || '').trim();
  if (!cleanName) return workspace;
  const cleanFormula = String(formula || '').trim();
  const measures = Array.isArray(workspace.measures) ? workspace.measures : [];
  const next = [
    ...measures.filter(item => String(item?.name || '').trim().toLowerCase() !== cleanName.toLowerCase()),
    {name: cleanName, formula: cleanFormula},
  ];
  return {
    ...workspace,
    measures: next,
    measureText: `${workspace.measureText || ''}${workspace.measureText ? '\n' : ''}${cleanFormula}`.trim(),
  };
}

export function upsertDaxObjectInWorkspace(workspace = {}, object = {}) {
  const type = String(object?.type || '').trim();
  const name = String(object?.name || '').trim();
  if (!type || !name) return workspace;
  const formula = String(object?.formula || '').trim();
  const objects = Array.isArray(workspace.daxObjects) ? workspace.daxObjects : [];
  const key = `${type.toLowerCase()}\u0000${name.toLowerCase()}`;
  const next = [
    ...objects.filter(item => `${String(item?.type || '').trim().toLowerCase()}\u0000${String(item?.name || '').trim().toLowerCase()}` !== key),
    {...object, type, name, formula},
  ];
  return {
    ...workspace,
    daxObjects: next,
    measureText: `${workspace.measureText || ''}${workspace.measureText ? '\n' : ''}${formula}`.trim(),
  };
}

export function daxObjectCompatibility(workspace = {}, objectType = '') {
  if (objectType !== 'Direct Lake calc column (Preview)') return {compatible:true, message:''};
  const loadedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : [];
  if ((workspace.storageMode || 'Import') !== 'Direct Lake') {
    return {compatible:false, message:'Direct Lake calculated columns require a Direct Lake semantic model in this learning path.'};
  }
  if (!loadedSources.length) {
    return {compatible:false, message:'Load a compatible OneLake Direct Lake semantic model before adding this preview object.'};
  }
  const loadedWorkspace = {...workspace, sources:loadedSources};
  const compatibility = storageCompatibility(loadedWorkspace);
  return compatibility.compatible
    ? {compatible:true, message:''}
    : {compatible:false, message:compatibility.message};
}

export function parseDaxQueryDefinedMeasure(code = '') {
  const text = String(code || '');
  const match = text.match(/\bDEFINE[\s\S]*?\bMEASURE\s+(?:'[^']+'|[^\[]+)\[([^\]]+)\]\s*=\s*([\s\S]*?)(?=\n\s*(?:MEASURE\b|EVALUATE\b)|$)/i);
  if (!match) {
    return {ok:false, error:'No DEFINE MEASURE statement was found. Add a DEFINE MEASURE declaration before Update model.'};
  }
  const name = String(match[1] || '').trim();
  const expression = String(match[2] || '').trim();
  if (!name || !expression) return {ok:false, error:'DEFINE MEASURE requires both a measure name and an expression.'};
  return {ok:true, name, expression, dax:`${name} = ${expression}`};
}

export function evaluateLoadedModelRefreshState(workspace = {}) {
  const loadedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : [];
  if (!loadedSources.length) {
    return {ready:false, requiresGateway:false, requiresCredentials:false, compatible:true, status:'No loaded semantic model', failure:'Load a semantic model before reviewing Service connectivity.'};
  }
  const loadedWorkspace = {...workspace, sources:[...loadedSources], queryTransforms:workspace.appliedQueryTransforms || {}};
  return evaluateRefreshState(loadedWorkspace);
}

export function parseTmdlMeasureScript(code = '') {
  const text = String(code || '');
  const match = text.match(/^\s*measure\s+(?:'([^']+)'|"([^"]+)"|([^\s=]+))\s*=\s*(.+)$/mi);
  if (!match) {
    return { ok: false, error: "This learning parser expects a TMDL measure declaration such as measure 'Revenue' = SUM ( Sales[Sales] )." };
  }
  const name = (match[1] || match[2] || match[3] || '').trim();
  const expression = (match[4] || '').trim();
  if (!name || !expression) return { ok: false, error: 'Measure name and expression are both required.' };
  return { ok: true, name, expression, dax: `${name} = ${expression}` };
}

function connectorFor(source) {
  return connectors.find(c => c.name === source);
}

export function storageCompatibility(workspace = {}) {
  const storage = workspace.storageMode || 'Import';
  const sources = Array.isArray(workspace.sources) ? workspace.sources : [];
  if (!sources.length || storage === 'Composite') return {compatible:true, incompatibleSources:[], message:''};
  const supports = (source) => {
    const modes = connectorFor(source)?.modes || [];
    if (storage === 'Import') return modes.some(mode => mode.includes('Import'));
    if (storage === 'DirectQuery') return modes.some(mode => mode.includes('DirectQuery'));
    if (storage === 'Direct Lake') return modes.some(mode => mode.includes('Direct Lake'));
    return true;
  };
  const incompatibleSources = sources.filter(source => !supports(source));
  return {
    compatible: incompatibleSources.length === 0,
    incompatibleSources,
    message: incompatibleSources.length
      ? `${storage} is not a supported learning-path storage mode for ${incompatibleSources.join(', ')}. Choose a supported mode or use a deliberate composite architecture.`
      : '',
  };
}

export function sourceNeedsGateway(source) {
  return ['SQL Server', 'Oracle', 'SAP HANA', 'SQL Server Analysis Services'].includes(source);
}

export function applyStorageModeSelection(workspace = {}, mode = 'Import', appliedAt = '') {
  const candidate = {...workspace, storageMode:mode};
  const noQuerySteps = Object.values(workspace.queryTransforms || {}).every(steps => !Array.isArray(steps) || steps.length === 0);
  const directLakeLoad = mode === 'Direct Lake'
    && (Array.isArray(workspace.sources) ? workspace.sources.length : 0) > 0
    && storageCompatibility(candidate).compatible
    && noQuerySteps;
  return {
    workspace: directLakeLoad ? markQueriesApplied(candidate, appliedAt) : candidate,
    directLakeLoad,
  };
}

export function refreshStrategyCompatibility(workspace = {}) {
  const storage = workspace.storageMode || 'Import';
  const strategy = workspace.refreshMode || '';
  if (!strategy || storage === 'Composite') return {compatible:true, message:''};
  const allowed = {
    Import: new Set(['Manual desktop refresh','Scheduled Import refresh','Incremental refresh','Schema only','Data only']),
    DirectQuery: new Set(['DirectQuery','Schema only']),
    'Direct Lake': new Set(['Direct Lake','Schema only']),
  }[storage];
  if (!allowed || allowed.has(strategy)) return {compatible:true, message:''};
  return {
    compatible:false,
    message:`${strategy} does not match the ${storage} learning-path storage behavior. Choose a strategy that represents how this model actually gets fresh data.`,
  };
}

function isRemoteStorage(storage) {
  return storage === 'DirectQuery' || storage === 'Composite';
}

export function evaluateRefreshState(workspace = {}) {
  const storage = workspace.storageMode || 'Import';
  const sources = Array.isArray(workspace.sources) ? workspace.sources : [];
  const config = workspace.refreshConfig || {};
  const compatibility = storageCompatibility(workspace);
  const strategyCompatibility = refreshStrategyCompatibility(workspace);
  const privateSources = sources.filter(sourceNeedsGateway);
  const remoteOrImport = storage === 'Import' || isRemoteStorage(storage);
  const requiresGateway = remoteOrImport && privateSources.length > 0;
  const requiresCredentials = remoteOrImport && sources.length > 0;

  if (!sources.length) {
    return {
      ready: false,
      requiresGateway,
      requiresCredentials,
      compatible: true,
      status: 'No source connected',
      failure: 'Connect at least one source before running a semantic-model operation.',
    };
  }

  if (!compatibility.compatible) {
    return {
      ready: false,
      requiresGateway,
      requiresCredentials,
      compatible: false,
      status: 'Storage mode and source are incompatible',
      failure: compatibility.message,
    };
  }

  if (!strategyCompatibility.compatible) {
    return {
      ready: false,
      requiresGateway,
      requiresCredentials,
      compatible: false,
      status: 'Refresh strategy and storage mode are incompatible',
      failure: strategyCompatibility.message,
    };
  }

  if (requiresGateway && !config.gatewayMapped) {
    return {
      ready: false,
      requiresGateway,
      requiresCredentials,
      status: `Gateway mapping missing for ${privateSources.join(', ')}`,
      failure: `${storage} cannot reach the simulated private source until an on-premises gateway mapping is configured.`,
    };
  }

  if (requiresCredentials && !config.credentials) {
    return {
      ready: false,
      requiresGateway,
      requiresCredentials,
      status: `Source credentials are not configured for ${storage} connectivity`,
      failure: `${storage} requires valid source credentials in the Service connection settings for this learning path.`,
    };
  }

  if (storage === 'Import') {
    return {
      ready: true,
      compatible: true,
      requiresGateway,
      requiresCredentials,
      status: requiresGateway
        ? 'Gateway mapping and credentials are ready for scheduled private-source refresh'
        : 'Cloud/source credentials are ready for scheduled Import refresh',
      failure: '',
    };
  }

  if (storage === 'Direct Lake') {
    return {
      ready: true,
      compatible: true,
      requiresGateway: false,
      requiresCredentials: false,
      status: 'Operate OneLake data arrival separately from semantic-model metadata/framing lifecycle',
      failure: '',
    };
  }

  if (storage === 'DirectQuery') {
    return {
      ready: true,
      compatible: true,
      requiresGateway,
      requiresCredentials,
      status: requiresGateway
        ? 'DirectQuery connectivity is ready through the simulated gateway; visual latency still depends on the remote source.'
        : 'DirectQuery source credentials are ready; visual latency still depends on source availability and generated queries.',
      failure: '',
    };
  }

  if (storage === 'Composite') {
    return {
      ready: true,
      compatible: true,
      requiresGateway,
      requiresCredentials,
      status: 'Connectivity is ready for the simulated sources. In a real composite model, validate storage mode, credentials, gateway path, and refresh behavior table by table.',
      failure: '',
    };
  }

  return {
    ready: true,
    requiresGateway,
    requiresCredentials,
    status: 'Review each table storage mode, source path, and refresh behavior independently',
    failure: '',
  };
}


export function buildRefreshHistoryEntry(workspace = {}, time = '') {
  const cfg = workspace.refreshConfig || {};
  const storage = workspace.storageMode || 'Import';
  const action = cfg.granularAction || (storage === 'Direct Lake' ? 'Direct Lake metadata/framing check' : workspace.refreshMode || 'Manual operation');
  if (queryChangesPending(workspace)) {
    return {
      time,
      action,
      status: 'Blocked',
      message: 'Close & Apply the pending Power Query/source changes before running a semantic-model operation in this learning workflow.',
      contextSignature: refreshContextSignature(workspace),
    };
  }
  const state = evaluateRefreshState(workspace);
  const message = !state.ready
    ? state.failure
    : storage === 'Direct Lake'
      ? 'OneLake-backed model checked. This is not an Import-style copy refresh; operate upstream data arrival and semantic-model lifecycle separately.'
      : storage === 'DirectQuery'
        ? 'DirectQuery connectivity check completed. Report visuals still issue source-side queries, so source latency and generated query shape remain operational dependencies.'
        : storage === 'Composite'
          ? 'Composite connectivity check completed. Imported and remotely queried tables still need table-specific refresh/connectivity review.'
          : action === 'Sync schema only'
            ? 'Metadata synchronized without processing row data.'
            : action === 'Refresh data only'
              ? 'Row data processed without a schema synchronization.'
              : 'Simulated semantic-model operation completed.';
  return {
    time,
    action,
    status: state.ready ? 'Completed' : 'Failed',
    message,
    contextSignature: refreshContextSignature(workspace),
  };
}

export function refreshContextSignature(workspace = {}) {
  const currentSources = Array.isArray(workspace.sources) ? workspace.sources : [];
  const appliedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : [];
  const sources = [...(appliedSources.length || !currentSources.length ? appliedSources : currentSources)].sort();
  const loadedQueries = workspace.appliedQueryTransforms && typeof workspace.appliedQueryTransforms === 'object' && Object.keys(workspace.appliedQueryTransforms).length
    ? workspace.appliedQueryTransforms
    : (workspace.queryTransforms && typeof workspace.queryTransforms === 'object' ? workspace.queryTransforms : {});
  const queryTransforms = Object.fromEntries(Object.keys(loadedQueries).sort().map(key => [key, Array.isArray(loadedQueries[key]) ? loadedQueries[key] : []]));
  const config = workspace.refreshConfig || {};
  return JSON.stringify({
    sources,
    queryTransforms,
    storageMode: workspace.storageMode || 'Import',
    refreshMode: workspace.refreshMode || '',
    gatewayMapped: Boolean(config.gatewayMapped),
    credentials: Boolean(config.credentials),
  });
}

export function performanceContextSignature(workspace = {}) {
  const visuals = Array.isArray(workspace.visuals) ? workspace.visuals : [];
  const details = Array.isArray(workspace.visualDetails) ? workspace.visualDetails : [];
  const measures = Array.isArray(workspace.measures) ? workspace.measures : [];
  const relationships = Array.isArray(workspace.relationships) ? workspace.relationships : [];
  const relationshipDetails = Array.isArray(workspace.relationshipDetails) ? workspace.relationshipDetails : [];
  const reportFilters = workspace.reportFilters || {};
  const loadedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : (Array.isArray(workspace.sources) ? workspace.sources : []);
  const loadedQueries = workspace.appliedQueryTransforms && typeof workspace.appliedQueryTransforms === 'object' ? workspace.appliedQueryTransforms : (workspace.queryTransforms && typeof workspace.queryTransforms === 'object' ? workspace.queryTransforms : {});
  const canonicalQueries = Object.fromEntries(Object.keys(loadedQueries).sort().map(key => [key, Array.isArray(loadedQueries[key]) ? loadedQueries[key] : []]));
  return JSON.stringify({
    sources: [...loadedSources].sort(),
    storageMode: workspace.storageMode || 'Import',
    queryTransforms: canonicalQueries,
    visuals,
    visualDetails: details.map(detail => ({
      type: detail?.type || '', axis: detail?.axis || '', value: detail?.value || '', legend: detail?.legend || '',
      filters: Array.isArray(detail?.filters) ? detail.filters : [], analytics: Array.isArray(detail?.analytics) ? detail.analytics : [],
      interaction: detail?.interaction || '', titleOn: detail?.titleOn !== false, tooltipOn: detail?.tooltipOn !== false,
    })),
    measures: measures.map(item => ({name:item?.name || '', formula:item?.formula || ''})),
    daxObjects: (Array.isArray(workspace.daxObjects) ? workspace.daxObjects : []).map(item => ({type:item?.type || '', name:item?.name || '', formula:item?.formula || ''})),
    relationships,
    relationshipDetails: relationshipDetails.map(item => ({
      name:item?.name || '', cardinality:item?.cardinality || '', direction:item?.direction || '', active:item?.active !== false,
    })),
    reportFilters: {
      page: Array.isArray(reportFilters.page) ? reportFilters.page : [],
      report: Array.isArray(reportFilters.report) ? reportFilters.report : [],
    },
    theme: workspace.theme || 'Fluent 2',
    dateTable: Boolean(workspace.dateTable),
    rls: Boolean(workspace.rls),
  });
}

export function performanceEvidenceCurrent(workspace = {}) {
  return Boolean(workspace.performance?.hasRun && workspace.performance?.evidenceSignature && workspace.performance.evidenceSignature === performanceContextSignature(workspace));
}

export function nextAiServiceState(service = {}, key, value) {
  const next = {...service, [key]: value};
  if ((key === 'descriptionsReady' || key === 'aiPrepared') && !value) {
    next.copilotApproved = false;
  }
  if (key === 'copilotApproved' && value && !(service.descriptionsReady && service.aiPrepared)) {
    next.copilotApproved = false;
  }
  return next;
}

export function canApproveCopilot(service = {}) {
  return Boolean(service.descriptionsReady && service.aiPrepared);
}

export function semanticModelRefreshStatus(workspace = {}) {
  // A staged source deletion still leaves the previously applied semantic model loaded until Close & Apply.
  // Surface the pending transition before interpreting the current query list as the loaded model.
  if (queryChangesPending(workspace)) return 'Pending changes';
  const sources = Array.isArray(workspace.sources) ? workspace.sources : [];
  if (!sources.length) return 'Not configured';
  const readiness = evaluateRefreshState(workspace);
  if (!readiness.ready) return 'Configuration issue';
  const latest = Array.isArray(workspace.refreshHistory) ? workspace.refreshHistory[0] : null;
  if (latest) {
    // Legacy refresh records without evidence signatures cannot prove they describe the current model configuration.
    if (!latest.contextSignature || latest.contextSignature !== refreshContextSignature(workspace)) return 'Refresh required';
    if (latest.status) return latest.status;
  }
  if ((workspace.storageMode || 'Import') === 'Direct Lake') return 'Direct Lake';
  if ((workspace.storageMode || 'Import') === 'DirectQuery') return 'Query-time';
  return 'Not run';
}

export function buildServiceItems(input = {}) {
  const workspace = input.service ? input : {service: input};
  const service = workspace.service || {};
  const profile = getScenarioProfile(workspace);
  const endorsement = service.endorsement || 'Promoted';
  const dashboardName = profile.id === 'wind' ? 'Operations Dashboard' : profile.id === 'finance' ? 'Finance Dashboard' : 'Executive Dashboard';
  const dataflowName = profile.id === 'wind' ? 'Telemetry Preparation' : profile.id === 'finance' ? 'Budget Preparation' : 'Planning Targets';
  const modelRefresh = semanticModelRefreshStatus(workspace);
  return [
    {name: profile.reportName, type: 'Report', icon: '▧', owner: 'You', refresh: '—', endorsement},
    {name: profile.semanticModelName, type: 'Semantic model', icon: '◉', owner: 'You', refresh: modelRefresh, endorsement},
    {name: dashboardName, type: 'Dashboard', icon: '▦', owner: 'You', refresh: '—', endorsement: '—'},
    {name: dataflowName, type: 'Dataflow', icon: '◇', owner: 'You', refresh: 'Completed', endorsement: '—'},
  ];
}

export function filterServiceItems(items, tab) {
  if (!tab || tab === 'All') return items;
  const singular = {
    Reports: 'Report',
    'Semantic models': 'Semantic model',
    Dashboards: 'Dashboard',
    Dataflows: 'Dataflow',
  }[tab];
  return singular ? items.filter(item => item.type === singular) : items;
}

export function buildPerformanceRows(scenarios = [], workspace = {}) {
  const visualCount = Array.isArray(workspace.visuals) ? workspace.visuals.length : 0;
  const visualMultiplier = Math.max(1, visualCount / 4);
  return scenarios.map((item, index) => ({
    ...item,
    dax: Math.round(item.dax * (index === 1 ? visualMultiplier : 1)),
    render: Math.round(item.render * (index === 2 ? Math.max(1, visualMultiplier * 0.8) : 1)),
  }));
}

function normalizedRelationshipDetails(workspace = {}) {
  const relationships = Array.isArray(workspace.relationships) ? workspace.relationships : [];
  const details = Array.isArray(workspace.relationshipDetails) ? workspace.relationshipDetails : [];
  const byName = new Map(details.filter(item => item && typeof item.name === 'string').map(item => [item.name, item]));
  const fallback = workspace.relationshipSettings || {cardinality:'One to many (1:*)', direction:'Single', active:true};
  return relationships.map((name, index) => ({name, ...fallback, ...(byName.get(name) || details[index] || {}), name}));
}

export function releaseReadiness(workspace = {}) {
  const rels = normalizedRelationshipDetails(workspace);
  const refresh = evaluateRefreshState(workspace);
  const hasBroadBoth = rels.some(rel => rel.direction === 'Both');
  const hasManyToMany = rels.some(rel => rel.cardinality === 'Many to many (*:*)');
  const hasOneToOne = rels.some(rel => rel.cardinality === 'One to one (1:1)');
  const activeRelationshipCount = rels.filter(rel => rel.active !== false).length;
  const activeStarRelationshipCount = rels.filter(rel => rel.active !== false && ['One to many (1:*)','Many to one (*:1)'].includes(rel.cardinality)).length;
  const hasSources = (workspace.sources || []).length > 0;
  const pendingQueries = queryChangesPending(workspace);
  const checks = [
    {
      id: 'model',
      label: 'Model contract',
      ok: activeStarRelationshipCount >= 2 && Boolean(workspace.dateTable) && !hasBroadBoth && !hasManyToMany && !hasOneToOne,
      detail: activeRelationshipCount < 2 || activeStarRelationshipCount < 2
        ? 'Keep at least two active one-to-many/many-to-one dimension-to-fact relationships for this governed star-schema exercise.'
        : hasBroadBoth
          ? 'Remove broad bidirectional filter paths unless a specific exception is deliberately modeled.'
          : hasManyToMany
            ? 'Resolve the many-to-many core path with an explicit bridge/business design before this governed release.'
            : hasOneToOne
              ? 'Replace the one-to-one core path with the intended dimension-to-fact cardinality for this governed star-schema exercise.'
              : 'At least two active star-schema relationships, a marked Date table, and deliberate single-direction paths are present.',
    },
    {
      id: 'load',
      label: 'Power Query load state',
      ok: hasSources && !pendingQueries,
      detail: pendingQueries ? 'Close & Apply is required because query/source edits are still pending.' : !hasSources ? 'Connect the governed source set before release.' : 'The current query/source snapshot matches the loaded semantic-model state.',
    },
    {
      id: 'refresh',
      label: 'Operational connectivity',
      ok: refresh.ready,
      detail: refresh.status,
    },
    {
      id: 'performance',
      label: 'Performance evidence',
      ok: performanceEvidenceCurrent(workspace),
      detail: !workspace.performance?.hasRun
        ? 'Record Performance Analyzer before release so tuning is evidence-based.'
        : performanceEvidenceCurrent(workspace)
          ? 'The recorded Performance Analyzer evidence matches the current report/model state.'
          : 'The report/model changed after the last Performance Analyzer run. Re-record evidence before release.',
    },
    {
      id: 'security',
      label: 'Security reviewed',
      ok: Boolean(workspace.rls),
      detail: 'This training gate expects an explicit RLS review for the governed case.',
    },
  ];
  return {
    checks,
    passed: checks.filter(x => x.ok).length,
    total: checks.length,
  };
}

function cloneQueryMap(map = {}) {
  return Object.fromEntries(Object.entries(map || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : []]));
}

function queryMapsEqual(a = {}, b = {}) {
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();
  return keys.every(key => {
    const left = Array.isArray(a?.[key]) ? a[key] : [];
    const right = Array.isArray(b?.[key]) ? b[key] : [];
    return left.length === right.length && left.every((value, index) => value === right[index]);
  });
}

function stringArraysEqual(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function queryChangesPending(workspace = {}) {
  const currentSources = Array.isArray(workspace.sources) ? workspace.sources : [];
  const appliedSources = Array.isArray(workspace.appliedSources) ? workspace.appliedSources : [];
  const currentQueries = workspace.queryTransforms && typeof workspace.queryTransforms === 'object' ? workspace.queryTransforms : {};
  const appliedQueries = workspace.appliedQueryTransforms && typeof workspace.appliedQueryTransforms === 'object' ? workspace.appliedQueryTransforms : {};
  return !stringArraysEqual(currentSources, appliedSources) || !queryMapsEqual(currentQueries, appliedQueries);
}

export function markQueriesApplied(workspace = {}, appliedAt = '') {
  return {
    ...workspace,
    appliedSources: [...(Array.isArray(workspace.sources) ? workspace.sources : [])],
    appliedQueryTransforms: cloneQueryMap(workspace.queryTransforms || {}),
    queryAppliedAt: appliedAt,
    queryDirty: false,
  };
}

export function addSourceToWorkspace(workspace = {}, source) {
  const sources = Array.isArray(workspace.sources) ? workspace.sources : [];
  if (!source || sources.includes(source)) return workspace;
  const queryTransforms = cloneQueryMap(workspace.queryTransforms || {});
  if (!queryTransforms[source]) queryTransforms[source] = [];
  const next = {...workspace, sources:[...sources, source], queryTransforms};
  return {...next, queryDirty: queryChangesPending(next)};
}

export function removeSourceFromWorkspace(workspace = {}, source) {
  const sources = (Array.isArray(workspace.sources) ? workspace.sources : []).filter(x => x !== source);
  const queryTransforms = cloneQueryMap(workspace.queryTransforms || {});
  delete queryTransforms[source];
  const transformLog = (Array.isArray(workspace.transformLog) ? workspace.transformLog : []).filter(entry => entry?.query !== source);
  const transforms = transformLog.length ? transformLog.map(entry => entry.step) : Object.values(queryTransforms).flat();
  const next = {...workspace, sources, queryTransforms, transformLog, transforms};
  return {...next, queryDirty: queryChangesPending(next)};
}

export function appendQueryTransform(workspace = {}, queryName = 'Sales', step) {
  const sources = Array.isArray(workspace.sources) ? workspace.sources : [];
  if (!step || !sources.includes(queryName)) return workspace;
  const queryTransforms = cloneQueryMap(workspace.queryTransforms || {});
  const transformLog = Array.isArray(workspace.transformLog) ? [...workspace.transformLog] : [];
  queryTransforms[queryName] = [...(queryTransforms[queryName] || []), step];
  transformLog.push({query: queryName, step});
  const next = {...workspace, queryTransforms, transformLog, transforms:transformLog.map(entry=>entry.step)};
  return {...next, queryDirty: queryChangesPending(next)};
}

export function removeLastQueryTransform(workspace = {}, queryName = 'Sales') {
  const queryTransforms = cloneQueryMap(workspace.queryTransforms || {});
  const querySteps = [...(queryTransforms[queryName] || [])];
  const removed = querySteps.pop();
  queryTransforms[queryName] = querySteps;
  let transformLog = Array.isArray(workspace.transformLog) ? [...workspace.transformLog] : [];

  if (removed !== undefined) {
    const logIndex = transformLog.map(entry => `${entry?.query}\u0000${entry?.step}`).lastIndexOf(`${queryName}\u0000${removed}`);
    if (logIndex >= 0) transformLog.splice(logIndex, 1);
    else {
      // Migration fallback: reconstruct from the query map when an older workspace has no query-aware log.
      transformLog = Object.entries(queryTransforms).flatMap(([query, steps]) => steps.map(step => ({query, step})));
    }
  }

  const next = {...workspace, queryTransforms, transformLog, transforms:transformLog.map(entry=>entry.step)};
  return {...next, queryDirty: queryChangesPending(next)};
}

export function addRelationshipToWorkspace(workspace = {}, name) {
  const relationships = Array.isArray(workspace.relationships) ? workspace.relationships : [];
  if (!name || relationships.includes(name)) return workspace;
  const details = normalizedRelationshipDetails(workspace);
  const defaults = workspace.relationshipSettings || {cardinality:'One to many (1:*)',direction:'Single',active:true};
  return {
    ...workspace,
    relationships: [...relationships, name],
    relationshipDetails: [...details, {name, ...defaults}],
  };
}

export function updateRelationshipAt(workspace = {}, index, patch = {}) {
  const relationships = Array.isArray(workspace.relationships) ? workspace.relationships : [];
  if (index < 0 || index >= relationships.length) return workspace;
  const details = normalizedRelationshipDetails(workspace);
  details[index] = {...details[index], ...patch, name:relationships[index]};
  return {...workspace, relationshipDetails:details};
}

export function removeRelationshipAt(workspace = {}, index) {
  const relationships = Array.isArray(workspace.relationships) ? workspace.relationships : [];
  if (index < 0 || index >= relationships.length) return workspace;
  const details = normalizedRelationshipDetails(workspace);
  return {
    ...workspace,
    relationships: relationships.filter((_, i) => i !== index),
    relationshipDetails: details.filter((_, i) => i !== index),
  };
}

export function updateAllRelationships(workspace = {}, patch = {}) {
  const relationships = Array.isArray(workspace.relationships) ? workspace.relationships : [];
  const details = normalizedRelationshipDetails(workspace).map((detail, index) => ({...detail, ...patch, name:relationships[index]}));
  return {...workspace, relationshipDetails:details, relationshipSettings:{...(workspace.relationshipSettings||{}), ...patch}};
}

export function nextRecommendedRelationship(pairs = [], workspace = {}) {
  const existing = new Set(Array.isArray(workspace.relationships) ? workspace.relationships : []);
  return pairs.find(([from, to]) => !existing.has(`${from} → ${to}`)) || null;
}


export function relationshipVisualSlot(pairs = [], relationshipName = '') {
  const target = String(relationshipName || '');
  return pairs.findIndex(([from, to]) => `${from} → ${to}` === target);
}

export function relationshipCardinalityMarkers(cardinality = 'One to many (1:*)') {
  if (cardinality === 'Many to one (*:1)') return ['*', '1'];
  if (cardinality === 'One to one (1:1)') return ['1', '1'];
  if (cardinality === 'Many to many (*:*)') return ['*', '*'];
  return ['1', '*'];
}

export function relationshipHealth(workspace = {}) {
  const relationships = normalizedRelationshipDetails(workspace);
  const broadBoth = relationships.filter(rel => rel.direction === 'Both');
  const manyToMany = relationships.filter(rel => rel.cardinality === 'Many to many (*:*)');
  const oneToOne = relationships.filter(rel => rel.cardinality === 'One to one (1:1)');
  const inactive = relationships.filter(rel => rel.active === false);
  return {relationships, broadBoth, manyToMany, oneToOne, inactive};
}
