import { queryChangesPending } from './simulatorLogic.js';

export const initialWorkspace = {
  sources: [], transforms: [], relationships: [], measures: [], visuals: [],
  measureText: '', refreshMode: '', rls: false,
  storageMode: 'Import', theme: 'Fluent 2', onObject: false,
  visualDetails: [], reportFilters: {page: [], report: []}, bookmarks: [], interactions: [], daxObjects: [], dateTable: false,
  queryTransforms: {}, transformLog: [], appliedQueryTransforms: {}, appliedSources: [], queryAppliedAt: '', queryDirty: false,
  relationshipSettings: { cardinality: 'One to many (1:*)', direction: 'Single', active: true }, relationshipDetails: [],
  refreshConfig: { gatewayMapped: false, credentials: false, schedule: '08:00 daily', incremental: false, granularAction: '' },
  service: { appPublished: false, endorsement: 'Promoted', deploymentStage: 'Development', buildPermission: false, descriptionsReady: false, aiPrepared: false, copilotApproved: false },
  performance: { hasRun: false, optimized: [], lastRunAt: '', evidenceSignature: '' },
  refreshHistory: [],
  caseStudyId: '',
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function uniqueStringArray(value) {
  return [...new Set(stringArray(value))];
}

function objectArray(value) {
  return Array.isArray(value) ? value.filter(isPlainObject).map(item => ({...item})) : [];
}

function safeObject(value) {
  return isPlainObject(value) ? value : {};
}


const STORAGE_MODES = new Set(['Import','DirectQuery','Direct Lake','Composite']);
const REL_CARDINALITIES = new Set(['One to many (1:*)','Many to one (*:1)','One to one (1:1)','Many to many (*:*)']);
const REL_DIRECTIONS = new Set(['Single','Both']);
const DEPLOYMENT_STAGES = new Set(['Development','Test','Production']);
const ENDORSEMENTS = new Set(['None','Promoted','Certified']);
const THEMES = new Set(['Fluent 2','Classic 2026','Executive','High contrast learning']);
const REFRESH_MODES = new Set(['','Manual desktop refresh','Scheduled Import refresh','Incremental refresh','DirectQuery','Direct Lake','Schema only','Data only']);
const REFRESH_SCHEDULES = new Set(['08:00 daily','06:00 and 18:00','Weekdays 07:00','Manual only']);
const VISUAL_INTERACTIONS = new Set(['','Filter','Highlight','None']);

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function string(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function enumValue(value, allowed, fallback) {
  return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

function sanitizeRelationshipSettings(value = {}) {
  const source = safeObject(value);
  return {
    cardinality: enumValue(source.cardinality, REL_CARDINALITIES, initialWorkspace.relationshipSettings.cardinality),
    direction: enumValue(source.direction, REL_DIRECTIONS, initialWorkspace.relationshipSettings.direction),
    active: bool(source.active, initialWorkspace.relationshipSettings.active),
  };
}

function sanitizeRefreshConfig(value = {}) {
  const source = safeObject(value);
  const granular = string(source.granularAction);
  const granularAction = ['Refresh schema and data','Sync schema only','Refresh data only'].includes(granular) || /^Table-level: .+/.test(granular) ? granular : '';
  return {
    gatewayMapped: bool(source.gatewayMapped),
    credentials: bool(source.credentials),
    schedule: enumValue(source.schedule, REFRESH_SCHEDULES, initialWorkspace.refreshConfig.schedule),
    incremental: bool(source.incremental),
    granularAction,
  };
}

function sanitizeService(value = {}) {
  const source = safeObject(value);
  const descriptionsReady = bool(source.descriptionsReady);
  const aiPrepared = bool(source.aiPrepared);
  return {
    appPublished: bool(source.appPublished),
    endorsement: enumValue(source.endorsement, ENDORSEMENTS, initialWorkspace.service.endorsement),
    deploymentStage: enumValue(source.deploymentStage, DEPLOYMENT_STAGES, initialWorkspace.service.deploymentStage),
    buildPermission: bool(source.buildPermission),
    descriptionsReady,
    aiPrepared,
    copilotApproved: bool(source.copilotApproved) && descriptionsReady && aiPrepared,
  };
}

const REFRESH_HISTORY_STATUSES = new Set(['Completed','Failed','Blocked']);

function sanitizeRefreshHistory(value) {
  return objectArray(value).map(entry => ({
    time: string(entry.time),
    action: string(entry.action),
    status: enumValue(entry.status, REFRESH_HISTORY_STATUSES, ''),
    message: string(entry.message),
    contextSignature: string(entry.contextSignature),
  }));
}

function cloneQueryMap(map = {}, allowedKeys = null) {
  if (!isPlainObject(map)) return {};
  const allowed = Array.isArray(allowedKeys) ? new Set(allowedKeys) : null;
  return Object.fromEntries(Object.entries(map)
    .filter(([key]) => !allowed || allowed.has(key))
    .map(([key, value]) => [key, stringArray(value)]));
}

function dedupeByIdentity(items, identity) {
  const map = new Map();
  items.forEach(item => {
    const key = identity(item);
    if (!key) return;
    if (map.has(key)) map.delete(key);
    map.set(key, item);
  });
  return [...map.values()];
}

function sanitizeMeasures(value) {
  const items = objectArray(value)
    .filter(item => typeof item.name === 'string' && item.name.trim())
    .map(item => ({name:item.name.trim(), formula:string(item.formula)}));
  return dedupeByIdentity(items, item => item.name.toLowerCase());
}

function sanitizeDaxObjects(value) {
  const items = objectArray(value)
    .filter(item => typeof item.type === 'string' && typeof item.name === 'string' && item.type.trim() && item.name.trim())
    .map(item => ({type:item.type.trim(), name:item.name.trim(), formula:string(item.formula)}));
  return dedupeByIdentity(items, item => `${item.type.toLowerCase()}\u0000${item.name.toLowerCase()}`);
}


export function normalizeWorkspace(parsed = {}) {
  parsed = safeObject(parsed);
  const visuals = stringArray(parsed.visuals);
  const detailSource = objectArray(parsed.visualDetails);
  const relationships = uniqueStringArray(parsed.relationships);
  const relDefaults = sanitizeRelationshipSettings(parsed.relationshipSettings);
  const relDetailSource = objectArray(parsed.relationshipDetails);
  const relDetailByName = new Map(relDetailSource.filter(item => typeof item.name === 'string').map(item => [item.name, item]));
  const relationshipDetails = relationships.map((name, index) => {
    const detail = relDetailByName.get(name) || relDetailSource[index] || {};
    return {name, ...sanitizeRelationshipSettings({...relDefaults, ...detail})};
  });

  const currentSources = uniqueStringArray(parsed.sources);
  const legacyTransforms = stringArray(parsed.transforms);
  const queryMapSource = safeObject(parsed.queryTransforms);
  const hasQueryMap = Object.keys(queryMapSource).length > 0;
  const firstQuery = currentSources.length ? currentSources[0] : 'Sales';
  const migratedQueryTransforms = hasQueryMap
    ? cloneQueryMap(queryMapSource, currentSources)
    : (legacyTransforms.length ? {[firstQuery]: [...legacyTransforms]} : {});
  const currentSourceSet = new Set(currentSources);
  const migratedTransformLog = objectArray(parsed.transformLog)
    .filter(entry => typeof entry.query === 'string' && typeof entry.step === 'string' && currentSourceSet.has(entry.query))
    .map(entry => ({query:entry.query, step:entry.step}));
  const transformLog = migratedTransformLog.length
    ? migratedTransformLog
    : Object.entries(migratedQueryTransforms).flatMap(([query, steps]) => steps.map(step => ({query, step})));

  const oldStateWasApplied = parsed.queryDirty === false || (parsed.queryDirty === undefined && !parsed.queryAppliedAt);
  const appliedSources = Array.isArray(parsed.appliedSources)
    ? uniqueStringArray(parsed.appliedSources)
    : (oldStateWasApplied || parsed.queryAppliedAt ? [...currentSources] : []);
  const appliedQueryTransforms = isPlainObject(parsed.appliedQueryTransforms)
    ? cloneQueryMap(parsed.appliedQueryTransforms, appliedSources)
    : (oldStateWasApplied ? cloneQueryMap(migratedQueryTransforms) : {});

  const performanceSource = safeObject(parsed.performance);
  const normalized = {
    ...initialWorkspace,
    sources: currentSources,
    transforms: transformLog.map(entry => entry.step),
    relationships,
    relationshipDetails,
    relationshipSettings: relDefaults,
    measures: sanitizeMeasures(parsed.measures),
    visuals,
    visualDetails: visuals.map((type, index) => {
      const detail = detailSource[index] || {};
      return {
        type,
        axis: string(detail.axis),
        value: string(detail.value),
        legend: string(detail.legend),
        altText: string(detail.altText),
        interaction: enumValue(detail.interaction, VISUAL_INTERACTIONS, ''),
        titleOn: bool(detail.titleOn, true),
        tooltipOn: bool(detail.tooltipOn, true),
        filters: stringArray(detail.filters),
        analytics: stringArray(detail.analytics),
      };
    }),
    reportFilters: {
      page: stringArray(safeObject(parsed.reportFilters).page),
      report: stringArray(safeObject(parsed.reportFilters).report),
    },
    bookmarks: stringArray(parsed.bookmarks),
    interactions: stringArray(parsed.interactions),
    daxObjects: sanitizeDaxObjects(parsed.daxObjects),
    measureText: typeof parsed.measureText === 'string' ? parsed.measureText : '',
    refreshMode: enumValue(parsed.refreshMode, REFRESH_MODES, initialWorkspace.refreshMode),
    storageMode: enumValue(parsed.storageMode, STORAGE_MODES, initialWorkspace.storageMode),
    theme: enumValue(parsed.theme, THEMES, initialWorkspace.theme),
    onObject: bool(parsed.onObject),
    dateTable: bool(parsed.dateTable),
    rls: bool(parsed.rls),
    refreshConfig: sanitizeRefreshConfig(parsed.refreshConfig),
    service: sanitizeService(parsed.service),
    performance: {
      ...initialWorkspace.performance,
      hasRun: bool(performanceSource.hasRun),
      optimized: stringArray(performanceSource.optimized),
      lastRunAt: string(performanceSource.lastRunAt),
      evidenceSignature: string(performanceSource.evidenceSignature),
    },
    refreshHistory: sanitizeRefreshHistory(parsed.refreshHistory),
    queryTransforms: migratedQueryTransforms,
    transformLog,
    appliedSources,
    appliedQueryTransforms,
    queryAppliedAt: typeof parsed.queryAppliedAt === 'string' ? parsed.queryAppliedAt : '',
    caseStudyId: typeof parsed.caseStudyId === 'string' ? parsed.caseStudyId : '',
  };
  return {
    ...normalized,
    // Derive dirty state from the applied snapshots instead of trusting a stale persisted flag.
    queryDirty: queryChangesPending(normalized),
  };
}
