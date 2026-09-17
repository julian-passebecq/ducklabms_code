import {
  addRelationshipToWorkspace,
  addSourceToWorkspace,
  appendQueryTransform,
  applyStorageModeSelection,
  buildPerformanceRows,
  buildRefreshHistoryEntry,
  buildServiceItems,
  canApproveCopilot,
  daxObjectCompatibility,
  evaluateLoadedModelRefreshState,
  evaluateRefreshState,
  filterServiceItems,
  getScenarioProfile,
  hasLoadedSemanticModel,
  parseDaxQueryDefinedMeasure,
  parseTmdlMeasureScript,
  markQueriesApplied,
  nextAiServiceState,
  nextRecommendedRelationship,
  performanceContextSignature,
  performanceEvidenceCurrent,
  queryChangesPending,
  relationshipCardinalityMarkers,
  relationshipHealth,
  relationshipVisualSlot,
  refreshContextSignature,
  refreshStrategyCompatibility,
  releaseReadiness,
  semanticModelRefreshStatus,
  storageCompatibility,
  removeLastQueryTransform,
  removeRelationshipAt,
  removeSourceFromWorkspace,
  updateAllRelationships,
  updateRelationshipAt,
  upsertDaxObjectInWorkspace,
  upsertMeasureInWorkspace,
} from '../src/utils/simulatorLogic.js';
import { checkWorkspaceTask } from '../src/utils/workspaceChecks.js';
import { caseProgressKey, caseSessionKey, clearAllCaseSessions, clearCaseProgress, clearCaseSession, loadCaseProgress, loadCaseSession, readCaseProgress, readCaseSessions, saveCaseProgress, saveCaseSession } from '../src/utils/caseSessions.js';
import { normalizeWorkspace } from '../src/utils/workspaceState.js';

let failed = false;
const fail = (msg) => { console.error(`FAIL: ${msg}`); failed = true; };
const pass = (msg) => console.log(`PASS: ${msg}`);
const expect = (condition, msg) => condition ? pass(msg) : fail(msg);

const base = {
  sources: [], storageMode: 'Import', relationships: [], relationshipDetails: [], dateTable: false, rls: false,
  relationshipSettings: {cardinality:'One to many (1:*)', direction: 'Single', active:true},
  refreshConfig: {gatewayMapped: false, credentials: false},
  performance: {hasRun: false, optimized:[], evidenceSignature:''},
  visuals:[], visualDetails:[], measures:[], reportFilters:{page:[],report:[]}, daxObjects:[],
  service: {descriptionsReady: false, aiPrepared: false, copilotApproved: false, endorsement: 'Promoted'},
  queryTransforms:{}, appliedQueryTransforms:{}, appliedSources:[], transformLog:[], transforms:[], queryDirty:false,
};

expect(!evaluateRefreshState(base).ready, 'Import operation blocks when no source is connected');
expect(!evaluateRefreshState({...base, sources:['SQL Server'], refreshConfig:{gatewayMapped:false, credentials:true}}).ready, 'Private SQL Import requires gateway mapping');
expect(!evaluateRefreshState({...base, sources:['SQL Server'], refreshConfig:{gatewayMapped:true, credentials:false}}).ready, 'Private SQL Import requires credentials');
expect(evaluateRefreshState({...base, sources:['SQL Server'], refreshConfig:{gatewayMapped:true, credentials:true}}).ready, 'Private SQL Import becomes ready with gateway + credentials');
expect(evaluateRefreshState({...base, sources:['Azure SQL Database'], refreshConfig:{gatewayMapped:false, credentials:true}}).ready, 'Cloud Azure SQL Import does not require the on-premises gateway toggle');
expect(!evaluateRefreshState({...base, sources:['Azure SQL Database'], refreshConfig:{gatewayMapped:false, credentials:false}}).ready, 'Cloud Import still requires source credentials in the learning model');
expect(evaluateRefreshState({...base, storageMode:'Direct Lake', sources:['OneLake catalog']}).ready, 'Direct Lake uses a different operational readiness path');
expect(!evaluateRefreshState({...base, storageMode:'Direct Lake', sources:['SQL Server'], refreshConfig:{gatewayMapped:true,credentials:true}}).ready, 'Direct Lake rejects non-OneLake source paths in the global learning storage model');
expect(!storageCompatibility({...base, storageMode:'DirectQuery', sources:['Text / CSV']}).compatible, 'DirectQuery rejects file connectors that do not advertise DirectQuery');
expect(!storageCompatibility({...base, storageMode:'Direct Lake', sources:['OneLake catalog','Text / CSV']}).compatible, 'Pure Direct Lake mode rejects mixed non-OneLake sources and points learners toward composite architecture');
expect(!evaluateRefreshState({...base, storageMode:'Import', sources:['Power BI semantic model'], refreshConfig:{credentials:true}}).ready, 'Import rejects a live-model connector that has no Import mode');
expect(!evaluateRefreshState({...base, storageMode:'DirectQuery', sources:['SQL Server'], refreshConfig:{gatewayMapped:false, credentials:true}}).ready, 'Private SQL DirectQuery also requires a gateway path');
expect(!evaluateRefreshState({...base, storageMode:'DirectQuery', sources:['SQL Server'], refreshConfig:{gatewayMapped:true, credentials:false}}).ready, 'Private SQL DirectQuery requires source credentials');
expect(evaluateRefreshState({...base, storageMode:'DirectQuery', sources:['SQL Server'], refreshConfig:{gatewayMapped:true, credentials:true}}).ready, 'Private SQL DirectQuery becomes operational only after gateway + credentials');
expect(!evaluateRefreshState({...base, storageMode:'DirectQuery', sources:['Azure SQL Database'], refreshConfig:{gatewayMapped:false, credentials:false}}).ready, 'Cloud DirectQuery still requires connection credentials');
expect(!refreshStrategyCompatibility({...base, storageMode:'Direct Lake', refreshMode:'Scheduled Import refresh'}).compatible, 'Direct Lake rejects an Import-style scheduled refresh strategy');
expect(!evaluateRefreshState({...base, storageMode:'DirectQuery', refreshMode:'Incremental refresh', sources:['Azure SQL Database'], refreshConfig:{credentials:true}}).ready, 'DirectQuery rejects an Import-style incremental refresh strategy');
expect(evaluateRefreshState({...base, storageMode:'Import', refreshMode:'Incremental refresh', sources:['Azure SQL Database'], refreshConfig:{credentials:true}}).ready, 'Import accepts incremental refresh as a compatible learning strategy');
expect(refreshStrategyCompatibility({...base, storageMode:'Composite', refreshMode:'Incremental refresh'}).compatible, 'Composite remains intentionally flexible because table-level storage behavior can differ');
expect(evaluateRefreshState({...base, storageMode:'DirectQuery', sources:['Azure SQL Database'], refreshConfig:{gatewayMapped:false, credentials:true}}).ready, 'Cloud DirectQuery does not require the on-premises gateway toggle');
expect(!evaluateRefreshState({...base, storageMode:'Composite', sources:['SQL Server'], refreshConfig:{gatewayMapped:false, credentials:true}}).ready, 'Composite model honors the private-source gateway path');

expect(!canApproveCopilot(base.service), 'Copilot approval is blocked before semantic preparation prerequisites');
let ai = nextAiServiceState(base.service, 'copilotApproved', true);
expect(!ai.copilotApproved, 'Copilot approval cannot bypass missing prerequisites');
ai = nextAiServiceState({...base.service, descriptionsReady:true, aiPrepared:true}, 'copilotApproved', true);
expect(ai.copilotApproved, 'Copilot approval succeeds after descriptions + AI preparation');
ai = nextAiServiceState(ai, 'aiPrepared', false);
expect(!ai.copilotApproved, 'Turning off an AI prerequisite revokes simulated Copilot approval');
let runtimeObjects = upsertMeasureInWorkspace({...base}, 'Revenue', 'Revenue = 1');
runtimeObjects = upsertMeasureInWorkspace(runtimeObjects, 'revenue', 'revenue = 2');
expect(runtimeObjects.measures.length === 1 && runtimeObjects.measures[0].name === 'revenue' && runtimeObjects.measures[0].formula === 'revenue = 2', 'Runtime measure upsert is case-insensitive and keeps the latest definition instead of waiting for reload normalization');
runtimeObjects = upsertDaxObjectInWorkspace(runtimeObjects, {type:'Visual calculation',name:'Rolling 7',formula:'Rolling 7 = 1'});
runtimeObjects = upsertDaxObjectInWorkspace(runtimeObjects, {type:'visual calculation',name:'rolling 7',formula:'Rolling 7 = 2'});
expect(runtimeObjects.daxObjects.length === 1 && runtimeObjects.daxObjects[0].formula === 'Rolling 7 = 2', 'Runtime DAX-object upsert deduplicates type + name case-insensitively');
expect(!daxObjectCompatibility({...base, storageMode:'Import', appliedSources:['OneLake catalog']}, 'Direct Lake calc column (Preview)').compatible, 'Direct Lake calculated-column preview cannot be applied to an Import model');
expect(daxObjectCompatibility({...base, storageMode:'Direct Lake', sources:['OneLake catalog'], appliedSources:['OneLake catalog']}, 'Direct Lake calc column (Preview)').compatible, 'Direct Lake calculated-column preview is allowed on a loaded compatible OneLake Direct Lake model');
const queryDefine = parseDaxQueryDefinedMeasure(`DEFINE\n  MEASURE 'Sales'[Query Metric] = SUM ( Sales[Sales] )\nEVALUATE ROW ( \"x\", [Query Metric] )`);
expect(queryDefine.ok && queryDefine.name === 'Query Metric' && queryDefine.dax.includes('SUM ( Sales[Sales] )'), 'DAX Query View learning parser extracts DEFINE MEASURE for Update model');
expect(!parseDaxQueryDefinedMeasure('EVALUATE ROW ( "x", 1 )').ok, 'DAX Query Update model blocks queries with no DEFINE MEASURE declaration');

const phantomQueryWorkspace = appendQueryTransform({...base}, 'Sales', 'Changed Type');
expect((phantomQueryWorkspace.transforms || []).length === 0 && !phantomQueryWorkspace.queryTransforms?.Sales, 'Power Query refuses to create transformation state for a query that is not backed by a connected source');

let queryWorkspace = addSourceToWorkspace({...base}, 'Sales');
expect(queryWorkspace.queryDirty, 'Adding a new query/source creates pending Power Query changes');
queryWorkspace = appendQueryTransform(queryWorkspace, 'Sales', 'Changed Type');
queryWorkspace = addSourceToWorkspace(queryWorkspace, 'Targets');
queryWorkspace = appendQueryTransform(queryWorkspace, 'Targets', 'Changed Type');
queryWorkspace = appendQueryTransform(queryWorkspace, 'Sales', 'Removed Columns');
expect(queryWorkspace.transforms.length === 3, 'Global transformation count still supports case-study progress');
expect(queryWorkspace.queryTransforms.Sales.length === 2 && queryWorkspace.queryTransforms.Targets.length === 1, 'Power Query Applied Steps are isolated per query');
queryWorkspace = markQueriesApplied(queryWorkspace, '09:15');
expect(!queryWorkspace.queryDirty && !queryChangesPending(queryWorkspace), 'Close & Apply snapshots both sources and per-query Applied Steps');
expect(checkWorkspaceTask({type:'queryApplied',value:true}, queryWorkspace), 'Guided Close & Apply contract passes only on an applied query snapshot');
queryWorkspace = appendQueryTransform(queryWorkspace, 'Sales', 'Filtered Rows');
expect(queryWorkspace.queryDirty, 'Editing after Close & Apply marks the model load state pending again');
expect(!checkWorkspaceTask({type:'queryApplied',value:true}, queryWorkspace), 'Guided Close & Apply contract becomes incomplete after new query edits');
queryWorkspace = removeLastQueryTransform(queryWorkspace, 'Sales');
expect(!queryWorkspace.queryDirty, 'Undoing back to the applied query snapshot clears the pending state');
expect(queryWorkspace.transformLog.filter(x=>x.query==='Targets' && x.step==='Changed Type').length === 1, 'Query-aware transform log preserves a same-named step on another query');
queryWorkspace = removeLastQueryTransform(queryWorkspace, 'Sales');
expect(queryWorkspace.queryDirty, 'Undoing past the applied snapshot correctly becomes a pending model change');
expect(queryWorkspace.queryTransforms.Targets[0] === 'Changed Type', 'Per-query undo cannot delete a same-named Applied Step from another query');
queryWorkspace = removeSourceFromWorkspace(queryWorkspace, 'Targets');
expect(!queryWorkspace.sources.includes('Targets') && !('Targets' in queryWorkspace.queryTransforms), 'Deleting a query removes its source and query-scoped Applied Steps');
expect(!queryWorkspace.transformLog.some(x=>x.query==='Targets'), 'Deleting a query also removes its entries from the global transformation log');

let stagedLastDelete = markQueriesApplied(addSourceToWorkspace({...base}, 'SQL Server'), '10:00');
stagedLastDelete = removeSourceFromWorkspace(stagedLastDelete, 'SQL Server');
expect(queryChangesPending(stagedLastDelete), 'Deleting the last loaded query creates a staged Power Query change until Close & Apply');
expect(semanticModelRefreshStatus(stagedLastDelete) === 'Pending changes', 'Service preserves the loaded-model interpretation when the last source deletion is only staged');
const stagedDeleteRelease = releaseReadiness({...stagedLastDelete, relationships:['Product → Sales','Date → Sales'], relationshipDetails:[{name:'Product → Sales',cardinality:'One to many (1:*)',direction:'Single',active:true},{name:'Date → Sales',cardinality:'One to many (1:*)',direction:'Single',active:true}], dateTable:true, rls:true, performance:{hasRun:true,evidenceSignature:performanceContextSignature({...stagedLastDelete, relationships:['Product → Sales','Date → Sales'], relationshipDetails:[{name:'Product → Sales',cardinality:'One to many (1:*)',direction:'Single',active:true},{name:'Date → Sales',cardinality:'One to many (1:*)',direction:'Single',active:true}], dateTable:true, rls:true})}});
expect(stagedDeleteRelease.checks.find(x=>x.id==='load')?.detail.startsWith('Close & Apply'), 'Governed release guidance prioritizes Close & Apply when the last source deletion is staged');

let modelWorkspace = addRelationshipToWorkspace({...base}, 'Product → Sales');
modelWorkspace = addRelationshipToWorkspace(modelWorkspace, 'Date → Sales');
expect(modelWorkspace.relationshipDetails.length === 2, 'Relationship creation stores per-relationship metadata');
modelWorkspace = updateRelationshipAt(modelWorkspace, 0, {direction:'Both'});
expect(relationshipHealth(modelWorkspace).broadBoth.length === 1, 'Model health detects bidirectional filtering on the specific edited relationship');
let partialRelease = releaseReadiness({...modelWorkspace, sources:['Azure SQL Database'], refreshConfig:{gatewayMapped:false,credentials:true}, dateTable:true, rls:true, performance:{hasRun:true}});
expect(partialRelease.checks.find(x=>x.id==='model')?.ok === false, 'Release readiness fails when any relationship still uses a broad Both path');
modelWorkspace = updateAllRelationships(modelWorkspace, {direction:'Single'});
expect(relationshipHealth(modelWorkspace).broadBoth.length === 0, 'Apply-to-all repair removes bidirectional paths without flattening other relationship metadata');

const reorderedRelationshipState = {
  ...base,
  relationships:['Date → Sales','Product → Sales'],
  relationshipDetails:[
    {name:'Product → Sales',cardinality:'One to many (1:*)',direction:'Both',active:true},
    {name:'Date → Sales',cardinality:'One to many (1:*)',direction:'Single',active:false},
  ],
};
const reorderedHealth = relationshipHealth(reorderedRelationshipState);
expect(reorderedHealth.relationships[0].name === 'Date → Sales' && reorderedHealth.relationships[0].active === false, 'Relationship health matches persisted metadata by relationship name when arrays are reordered');
expect(reorderedHealth.relationships[1].name === 'Product → Sales' && reorderedHealth.relationships[1].direction === 'Both', 'Relationship health does not swap filter-direction metadata after relationship reordering');
let removableModel = addRelationshipToWorkspace(addRelationshipToWorkspace({...base}, 'Product → Sales'), 'Date → Sales');
removableModel = updateRelationshipAt(removableModel, 1, {active:false, direction:'Both'});
const beforeDeleteSignature = performanceContextSignature({...removableModel, performance:{hasRun:true}});
removableModel = removeRelationshipAt(removableModel, 0);
expect(removableModel.relationships.length === 1 && removableModel.relationships[0] === 'Date → Sales', 'Deleting a selected relationship removes exactly that relationship');
expect(removableModel.relationshipDetails.length === 1 && removableModel.relationshipDetails[0].name === 'Date → Sales' && removableModel.relationshipDetails[0].active === false && removableModel.relationshipDetails[0].direction === 'Both', 'Relationship deletion preserves the surviving relationship metadata');
expect(performanceContextSignature(removableModel) !== beforeDeleteSignature, 'Relationship deletion changes the performance evidence signature and therefore invalidates prior model evidence');

const trainerPairs = [['Product','Sales'],['Region','Sales'],['Date','Sales'],['Reseller','Sales']];
const missingMiddle = {relationships:['Product → Sales','Date → Sales','Reseller → Sales']};
expect(nextRecommendedRelationship(trainerPairs, missingMiddle)?.join(' → ') === 'Region → Sales', 'Relationship trainer restores the first missing recommended path instead of choosing by relationship count');
expect(nextRecommendedRelationship(trainerPairs, {relationships:trainerPairs.map(([from,to])=>`${from} → ${to}`)}) === null, 'Relationship trainer reports complete only when every recommended relationship exists');

const windProfile = getScenarioProfile({...base, caseStudyId:'windops'});
expect(windProfile.reportName === 'Wind Operations Monitor' && windProfile.primaryFact === 'Telemetry', 'Scenario profile resolves Wind case metadata consistently');
const financeProfile = getScenarioProfile({...base, caseStudyId:'finance'});
expect(financeProfile.semanticModelName === 'Project Finance Model' && financeProfile.primaryFact === 'Actuals', 'Scenario profile resolves Finance case metadata consistently');
expect(financeProfile.tmdlFormula !== financeProfile.primaryMeasure && windProfile.tmdlFormula !== windProfile.primaryMeasure, 'Scenario TMDL templates use real expressions rather than self-referential measure definitions');
expect(getScenarioProfile({...base, caseStudyId:'finance', sources:['OneLake catalog']}).id === 'finance', 'Explicit Finance case identity takes precedence over incidental source additions');
expect(getScenarioProfile({...base, caseStudyId:'executive-governed', sources:['OneLake catalog']}).id === 'sales', 'Sales/governance case identity does not silently switch scenario because of an incidental OneLake source');
const perfScenarios = [
  {name:'Card',dax:20,render:10,other:2},
  {name:'Matrix',dax:400,render:80,other:10},
  {name:'Map',dax:90,render:300,other:20},
];
const perfRows = buildPerformanceRows(perfScenarios, {visuals:new Array(8).fill('Card')});
expect(perfRows[1].dax === 800 && perfRows[2].render === 480, 'Performance rows scale consistently with report visual density for both table and inspector consumers');
let evidenceWorkspace = {...base, visuals:['Card'], visualDetails:[{type:'Card',value:'[Total Sales]',filters:[],analytics:[]}], measures:[{name:'Total Sales',formula:'Total Sales = SUM ( Sales[Sales] )'}]};
evidenceWorkspace = {...evidenceWorkspace, performance:{hasRun:true,optimized:[],evidenceSignature:performanceContextSignature(evidenceWorkspace)}};
expect(performanceEvidenceCurrent(evidenceWorkspace), 'Performance evidence is current immediately after recording against the active report/model signature');
const changedEvidenceWorkspace = {...evidenceWorkspace, visuals:[...evidenceWorkspace.visuals,'Matrix'], visualDetails:[...evidenceWorkspace.visualDetails,{type:'Matrix',filters:[],analytics:[]}]};
expect(!performanceEvidenceCurrent(changedEvidenceWorkspace), 'Adding or changing report/model objects makes prior Performance Analyzer evidence stale');
expect(!performanceEvidenceCurrent({...evidenceWorkspace, storageMode:'DirectQuery'}), 'Changing storage architecture also invalidates prior Performance Analyzer evidence');
expect(!performanceEvidenceCurrent({...evidenceWorkspace, theme:'High contrast'}), 'Changing the report theme invalidates prior Performance Analyzer evidence');
expect(!performanceEvidenceCurrent({...evidenceWorkspace, visualDetails:[{...evidenceWorkspace.visualDetails[0], titleOn:false}]}), 'Changing visual rendering options invalidates prior Performance Analyzer evidence');
expect(!performanceEvidenceCurrent({...evidenceWorkspace, rls:true}), 'Changing RLS/security semantics invalidates prior Performance Analyzer evidence');
expect(!performanceEvidenceCurrent({...evidenceWorkspace, dateTable:true}), 'Changing Date-table semantics invalidates prior Performance Analyzer evidence');
const appliedQueryEvidence = {...evidenceWorkspace, sources:['SQL Server'], appliedSources:['SQL Server'], queryTransforms:{'SQL Server':['Changed Type']}, appliedQueryTransforms:{'SQL Server':['Changed Type']}};
appliedQueryEvidence.performance = {hasRun:true,optimized:[],evidenceSignature:performanceContextSignature(appliedQueryEvidence)};
const stagedQueryEdit = {...appliedQueryEvidence, queryTransforms:{'SQL Server':['Changed Type','Filtered Rows']}};
expect(performanceEvidenceCurrent(stagedQueryEdit), 'Staged Power Query edits do not invalidate evidence for the still-loaded semantic model before Close & Apply');
const appliedAfterEdit = markQueriesApplied(stagedQueryEdit, '11:00');
expect(!performanceEvidenceCurrent(appliedAfterEdit), 'Close & Apply changes the loaded-model signature and correctly makes prior performance evidence stale');
expect(!checkWorkspaceTask({type:'performanceCurrent',value:true}, changedEvidenceWorkspace), 'Guided verification cannot pass with stale performance evidence');

expect(!checkWorkspaceTask({type:'daxFormula',value:'MOVINGAVERAGE'}, {...base, measureText:'old MOVINGAVERAGE history'}), 'Historical DAX text cannot satisfy a current-object formula contract');
expect(checkWorkspaceTask({type:'daxFormula',value:'MOVINGAVERAGE'}, {...base, daxObjects:[{type:'Visual calculation',name:'Rolling 7',formula:'Rolling 7 = MOVINGAVERAGE ( [Energy MWh], 7 )'}]}), 'Current DAX object formula satisfies the visual-calculation contract');

const windItems = buildServiceItems({...base, caseStudyId:'windops', service:{...base.service, endorsement:'Certified'}});
expect(windItems.some(item=>item.name==='Wind Operations Monitor') && windItems.some(item=>item.name==='Wind Operations Model'), 'Service inventory follows the active case scenario');
expect(semanticModelRefreshStatus({...base, refreshHistory:[]}) === 'Not configured', 'Service semantic-model status does not imply a refresh state before a source is configured');
const serviceBase = {...base, sources:['Azure SQL Database'], appliedSources:['Azure SQL Database'], queryTransforms:{'Azure SQL Database':[]}, appliedQueryTransforms:{'Azure SQL Database':[]}, refreshConfig:{gatewayMapped:false,credentials:true}};
expect(semanticModelRefreshStatus({...serviceBase, refreshHistory:[]}) === 'Not run', 'Configured Import model starts as Not run instead of claiming a completed refresh');
const failedContext = refreshContextSignature(serviceBase);
expect(semanticModelRefreshStatus({...serviceBase, refreshHistory:[{status:'Failed',contextSignature:failedContext}]}) === 'Failed', 'Service semantic-model status reflects the latest failed simulated refresh for the current configuration');
expect(buildServiceItems({...serviceBase, refreshHistory:[{status:'Failed',contextSignature:failedContext}]}).find(item=>item.type==='Semantic model')?.refresh === 'Failed', 'Service inventory propagates the latest semantic-model refresh failure');
const stagedCloudOnly = addSourceToWorkspace({...base, refreshConfig:{gatewayMapped:false,credentials:true}}, 'Azure SQL Database');
expect(!evaluateLoadedModelRefreshState(stagedCloudOnly).ready && evaluateLoadedModelRefreshState(stagedCloudOnly).status === 'No loaded semantic model', 'Service connectivity does not claim Ready for a first source that is only staged in Power Query');
const appliedCloudOnly = markQueriesApplied(stagedCloudOnly, '12:00');
expect(evaluateLoadedModelRefreshState(appliedCloudOnly).ready, 'Service connectivity becomes Ready after the cloud source snapshot is loaded');
const stagedPrivateReplacement = addSourceToWorkspace(appliedCloudOnly, 'SQL Server');
expect(evaluateLoadedModelRefreshState(stagedPrivateReplacement).ready, 'Service connectivity continues to describe the loaded model while a new private source is only staged');
const completedService = {...serviceBase, refreshMode:'Scheduled Import refresh'};
const completedSignature = refreshContextSignature(completedService);
expect(semanticModelRefreshStatus({...completedService, refreshHistory:[{status:'Completed',contextSignature:completedSignature}]}) === 'Completed', 'Current refresh evidence is shown when it matches the active source/storage configuration');
expect(semanticModelRefreshStatus({...completedService, refreshMode:'Manual desktop refresh', refreshHistory:[{status:'Completed',contextSignature:completedSignature}]}) === 'Refresh required', 'Changing the refresh/source context invalidates stale completed refresh evidence');
expect(semanticModelRefreshStatus({...serviceBase, queryTransforms:{'Azure SQL Database':['Changed Type']}, refreshHistory:[{status:'Completed',contextSignature:failedContext}]}) === 'Pending changes', 'Unapplied Power Query edits override stale refresh-complete status in Service');
const pendingOperation = buildRefreshHistoryEntry({...serviceBase, queryTransforms:{'Azure SQL Database':['Changed Type']}}, '10:00');
expect(pendingOperation.status === 'Blocked' && pendingOperation.message.includes('Close & Apply'), 'Semantic-model operations are blocked while Power Query/source changes are still staged');
const appliedOperation = buildRefreshHistoryEntry(serviceBase, '10:05');
expect(appliedOperation.status === 'Completed' && appliedOperation.contextSignature === refreshContextSignature(serviceBase), 'Refresh history captures current configuration evidence after queries are applied');
const refreshedAfterApply = {...completedService, refreshHistory:[{status:'Completed',contextSignature:completedSignature}]};
const stagedRefreshTransform = {...refreshedAfterApply, queryTransforms:{'Azure SQL Database':['Filtered Rows']}};
expect(semanticModelRefreshStatus(stagedRefreshTransform) === 'Pending changes', 'Staged query edits take precedence over old completed refresh evidence');
const appliedRefreshTransform = markQueriesApplied(stagedRefreshTransform, '10:10');
expect(semanticModelRefreshStatus(appliedRefreshTransform) === 'Refresh required', 'Close & Apply of changed query logic invalidates prior Import refresh evidence');


expect(!hasLoadedSemanticModel(base), 'Blank workspace has no loaded semantic model');
const stagedFirstSource = addSourceToWorkspace(base, 'SQL Server');
expect(!hasLoadedSemanticModel(stagedFirstSource), 'Staging the first Power Query source does not create a loaded semantic model');
const loadedFirstSource = markQueriesApplied(stagedFirstSource, '09:20');
expect(hasLoadedSemanticModel(loadedFirstSource), 'Close & Apply creates the loaded semantic-model snapshot');
const stagedLastSourceDeletion = removeSourceFromWorkspace(loadedFirstSource, 'SQL Server');
expect(hasLoadedSemanticModel(stagedLastSourceDeletion), 'Staging deletion of the final query preserves the previously loaded semantic model until Close & Apply');
expect(!hasLoadedSemanticModel(markQueriesApplied(stagedLastSourceDeletion, '09:25')), 'Applying deletion of the final loaded source removes the loaded semantic model');

const loadedSalesWithStagedOneLake = {
  ...base,
  sources:['SQL Server','OneLake catalog'],
  appliedSources:['SQL Server'],
  queryTransforms:{'SQL Server':[],'OneLake catalog':[]},
  appliedQueryTransforms:{'SQL Server':[]},
};
expect(getScenarioProfile(loadedSalesWithStagedOneLake).id === 'sales', 'Staged source additions do not change Report/Model/Service scenario identity before Close & Apply');
const appliedWindScenario = markQueriesApplied({...loadedSalesWithStagedOneLake, sources:['OneLake catalog'], queryTransforms:{'OneLake catalog':[]}}, '09:30');
expect(getScenarioProfile(appliedWindScenario).id === 'wind', 'Scenario identity changes after the compatible source snapshot becomes loaded');
const directLakeSelection = applyStorageModeSelection(addSourceToWorkspace(base, 'OneLake catalog'), 'Direct Lake', '09:35');
expect(directLakeSelection.directLakeLoad && directLakeSelection.workspace.storageMode === 'Direct Lake', 'Selecting Direct Lake recognizes a compatible OneLake path');
expect(directLakeSelection.workspace.appliedSources.includes('OneLake catalog') && !queryChangesPending(directLakeSelection.workspace), 'Compatible OneLake Direct Lake selection becomes the loaded semantic-model path without Power Query Close & Apply');
const directLakeWithTransforms = applyStorageModeSelection(appendQueryTransform(addSourceToWorkspace(base, 'OneLake catalog'), 'OneLake catalog', 'Changed Type'), 'Direct Lake', '09:40');
expect(!directLakeWithTransforms.directLakeLoad && queryChangesPending(directLakeWithTransforms.workspace), 'Direct Lake selection does not silently auto-apply staged Power Query transformations');
const tmdlParsed = parseTmdlMeasureScript("createOrReplace\n table Sales\n   measure 'Revenue' = SUM ( Sales[Sales] )\n     formatString: '#,0'");
expect(tmdlParsed.ok && tmdlParsed.name === 'Revenue' && tmdlParsed.dax === 'Revenue = SUM ( Sales[Sales] )', 'TMDL learning parser extracts an applicable measure declaration');
expect(!parseTmdlMeasureScript('createOrReplace\n table Sales').ok, 'TMDL learning parser blocks Apply when no supported measure declaration is present');

const items = buildServiceItems({endorsement:'Certified'});
expect(filterServiceItems(items, 'Reports').length === 1, 'Service Reports tab filters to reports');
expect(filterServiceItems(items, 'Semantic models').length === 1, 'Service Semantic models tab filters correctly');
expect(filterServiceItems(items, 'Dashboards').length === 1, 'Service Dashboards tab filters correctly');
expect(filterServiceItems(items, 'Dataflows').length === 1, 'Service Dataflows tab filters correctly');
expect(filterServiceItems(items, 'All').length === 4, 'Service All tab returns the full simulated inventory');

const unsignedLegacyRefresh = {...base, sources:['SQL Server'], appliedSources:['SQL Server'], queryTransforms:{'SQL Server':[]}, appliedQueryTransforms:{'SQL Server':[]}, refreshConfig:{gatewayMapped:true,credentials:true}, refreshHistory:[{time:'07:00',action:'Refresh schema and data',status:'Completed',message:'legacy',contextSignature:''}]};
expect(semanticModelRefreshStatus(unsignedLegacyRefresh) === 'Refresh required', 'Legacy refresh history without a configuration signature is not trusted as current evidence');

const broken = releaseReadiness(base);
expect(broken.passed === 0 && broken.total === 5, 'Release readiness exposes five independent failing gates for a blank/broken workspace');
const incompatibleRelease = releaseReadiness({...base, storageMode:'Direct Lake', sources:['SQL Server'], relationships:['Product → Sales','Date → Sales'], relationshipDetails:[{name:'Product → Sales',direction:'Single',cardinality:'One to many (1:*)',active:true},{name:'Date → Sales',direction:'Single',cardinality:'One to many (1:*)',active:true}], dateTable:true, rls:true, performance:{hasRun:true}, refreshConfig:{gatewayMapped:true,credentials:true}});
expect(incompatibleRelease.checks.find(x=>x.id==='refresh')?.ok === false, 'Release readiness blocks an incompatible storage/source architecture');
const pendingRelease = releaseReadiness({...base, sources:['Azure SQL Database'], queryTransforms:{'Azure SQL Database':['Changed Type']}, appliedSources:['Azure SQL Database'], appliedQueryTransforms:{'Azure SQL Database':[]}, relationships:['Project → Actuals','Date → Actuals'], relationshipDetails:[{name:'Project → Actuals',direction:'Single',cardinality:'One to many (1:*)',active:true},{name:'Date → Actuals',direction:'Single',cardinality:'One to many (1:*)',active:true}], dateTable:true, rls:true, performance:{hasRun:true}, refreshConfig:{credentials:true}});
expect(pendingRelease.checks.find(x=>x.id==='load')?.ok === false, 'Release readiness blocks unapplied Power Query changes');

const inactiveModelRelease = releaseReadiness({...serviceBase, relationships:['Product → Sales','Date → Sales'], relationshipDetails:[{name:'Product → Sales',direction:'Single',cardinality:'One to many (1:*)',active:false},{name:'Date → Sales',direction:'Single',cardinality:'One to many (1:*)',active:false}], dateTable:true, rls:true});
expect(inactiveModelRelease.checks.find(x=>x.id==='model')?.ok === false, 'Release readiness rejects a governed model whose core relationships are inactive');
const manyToManyRelease = releaseReadiness({...serviceBase, relationships:['Product → Sales','Date → Sales'], relationshipDetails:[{name:'Product → Sales',direction:'Single',cardinality:'Many to many (*:*)',active:true},{name:'Date → Sales',direction:'Single',cardinality:'One to many (1:*)',active:true}], dateTable:true, rls:true});
expect(manyToManyRelease.checks.find(x=>x.id==='model')?.ok === false, 'Release readiness rejects an unexplained many-to-many core path in the governed star-schema exercise');
const oneToOneRelease = releaseReadiness({...serviceBase, relationships:['Product → Sales','Date → Sales'], relationshipDetails:[{name:'Product → Sales',direction:'Single',cardinality:'One to one (1:1)',active:true},{name:'Date → Sales',direction:'Single',cardinality:'One to many (1:*)',active:true}], dateTable:true, rls:true});
expect(oneToOneRelease.checks.find(x=>x.id==='model')?.ok === false, 'Release readiness rejects a one-to-one core path that contradicts the governed dimension-to-fact star exercise');

const relationshipPairs = [['Product','Sales'],['Region','Sales'],['Date','Sales'],['Reseller','Sales']];
expect(relationshipVisualSlot(relationshipPairs, 'Date → Sales') === 2, 'Relationship diagram resolves geometry from relationship identity rather than mutable array position');
expect(relationshipVisualSlot(relationshipPairs, 'Missing → Sales') === -1, 'Relationship diagram reports an unknown relationship instead of assigning a false semantic slot');
expect(relationshipCardinalityMarkers('One to many (1:*)').join(':') === '1:*', 'Relationship diagram markers reflect one-to-many cardinality');
expect(relationshipCardinalityMarkers('Many to one (*:1)').join(':') === '*:1', 'Relationship diagram markers reflect many-to-one cardinality');
expect(relationshipCardinalityMarkers('One to one (1:1)').join(':') === '1:1' && relationshipCardinalityMarkers('Many to many (*:*)').join(':') === '*:*', 'Relationship diagram markers also reflect one-to-one and many-to-many cardinality');

const healthyWorkspace = {
  ...base,
  sources:['SQL Server'], appliedSources:['SQL Server'], queryTransforms:{'SQL Server':[]}, appliedQueryTransforms:{'SQL Server':[]}, relationships:['Product → Sales','Date → Sales'],
  relationshipDetails:[
    {name:'Product → Sales',cardinality:'One to many (1:*)',direction:'Single',active:true},
    {name:'Date → Sales',cardinality:'One to many (1:*)',direction:'Single',active:true},
  ],
  dateTable:true, rls:true, refreshConfig:{gatewayMapped:true, credentials:true}, visuals:['Card'], visualDetails:[{type:'Card',filters:[],analytics:[]}],
};
healthyWorkspace.performance = {hasRun:true,optimized:[],evidenceSignature:performanceContextSignature(healthyWorkspace)};
const healthyCurrent = releaseReadiness(healthyWorkspace);
expect(healthyCurrent.passed === healthyCurrent.total, 'Release readiness turns green only when model, connectivity, performance, security, and loaded-query checks pass');
expect(checkWorkspaceTask({type:'releaseReady',value:true}, healthyWorkspace), 'Guided releaseReady contract requires the same all-green governed release state');

const memoryStore = (()=>{const data=new Map(); return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};})();
saveCaseSession(memoryStore, 'sales360', {caseStudyId:'sales360', measures:[{name:'Total Sales'}]});
saveCaseSession(memoryStore, 'finance', {caseStudyId:'finance', measures:[{name:'Actual'}]});
expect(loadCaseSession(memoryStore, 'sales360')?.measures?.[0]?.name === 'Total Sales', 'Case sessions persist independently per project');
expect(loadCaseSession(memoryStore, 'finance')?.measures?.[0]?.name === 'Actual', 'Switching cases can resume the target project session');
clearCaseSession(memoryStore, 'sales360');
expect(loadCaseSession(memoryStore, 'sales360') === null && loadCaseSession(memoryStore, 'finance')?.caseStudyId === 'finance', 'Restarting one case clears only that project session');
memoryStore.setItem(caseSessionKey, '[]');
expect(Object.keys(readCaseSessions(memoryStore)).length === 0, 'Malformed array-shaped case-session storage is sanitized to an empty session registry');
saveCaseSession(memoryStore, 'windops', {caseStudyId:'windops', measures:[]});
expect(loadCaseSession(memoryStore, 'windops')?.caseStudyId === 'windops', 'Case-session persistence recovers after malformed stored JSON shape instead of silently losing new sessions');
memoryStore.setItem(caseSessionKey, JSON.stringify({finance:'bad', windops:{caseStudyId:'windops'}}));
expect(loadCaseSession(memoryStore, 'finance') === null && loadCaseSession(memoryStore, 'windops')?.caseStudyId === 'windops', 'Invalid individual case-session entries are ignored while valid sessions remain available');
saveCaseSession(memoryStore, 'sales360', {caseStudyId:'sales360'});
saveCaseSession(memoryStore, 'finance', {caseStudyId:'finance'});
saveCaseProgress(memoryStore, 'sales360', 6);
saveCaseProgress(memoryStore, 'finance', 3);
expect(loadCaseProgress(memoryStore, 'sales360', 9) === 6 && loadCaseProgress(memoryStore, 'finance', 7) === 3, 'Case-study resume state preserves the last guided-step position per project');
expect(loadCaseProgress(memoryStore, 'sales360', 4) === 3, 'Persisted case step is clamped when a future release shortens a case');
clearCaseProgress(memoryStore, 'sales360');
expect(loadCaseProgress(memoryStore, 'sales360', 9) === 0 && loadCaseProgress(memoryStore, 'finance', 7) === 3, 'Restarting one case clears only that project step position');
memoryStore.setItem(caseProgressKey, JSON.stringify({finance:'bad',windops:5}));
expect(readCaseProgress(memoryStore).finance === undefined && loadCaseProgress(memoryStore, 'windops', 7) === 5, 'Malformed case-step progress is sanitized without discarding valid project positions');
clearAllCaseSessions(memoryStore);
expect(Object.keys(readCaseSessions(memoryStore)).length === 0 && Object.keys(readCaseProgress(memoryStore)).length === 0, 'Global lab reset clears both saved case workspaces and guided-step positions');

const scalarCorruption = normalizeWorkspace({
  storageMode:'Impossible mode', onObject:'yes', dateTable:'true', rls:1,
  relationshipSettings:{cardinality:'nonsense',direction:'everywhere',active:'yes'},
  relationships:['Product → Sales'], relationshipDetails:[{cardinality:'bad',direction:'bad',active:'false'}],
  refreshConfig:{gatewayMapped:'true',credentials:1,incremental:'yes',schedule:42,granularAction:[]},
  service:{appPublished:'yes',endorsement:'Gold',deploymentStage:'Live',descriptionsReady:true,aiPrepared:false,copilotApproved:true},
  performance:{hasRun:'yes',lastRunAt:42,evidenceSignature:99},
  refreshHistory:[{time:42,status:['Completed'],message:{},contextSignature:8}],
});
expect(scalarCorruption.storageMode === 'Import' && scalarCorruption.onObject === false && scalarCorruption.dateTable === false && scalarCorruption.rls === false, 'Malformed scalar workspace flags fall back to safe typed defaults');
expect(scalarCorruption.relationshipDetails[0].cardinality === 'One to many (1:*)' && scalarCorruption.relationshipDetails[0].direction === 'Single' && scalarCorruption.relationshipDetails[0].active === true, 'Malformed relationship scalar metadata is normalized to valid model options');
expect(scalarCorruption.refreshConfig.gatewayMapped === false && scalarCorruption.refreshConfig.credentials === false && scalarCorruption.refreshConfig.schedule === '08:00 daily', 'Malformed refresh scalar settings are normalized instead of leaking into controls');
expect(scalarCorruption.service.endorsement === 'Promoted' && scalarCorruption.service.deploymentStage === 'Development' && scalarCorruption.service.copilotApproved === false, 'Malformed Service enums and impossible Copilot approval are repaired during normalization');
expect(scalarCorruption.performance.hasRun === false && scalarCorruption.refreshHistory[0].status === '', 'Malformed performance/history scalar evidence is sanitized before operational panes consume it');

if (failed) process.exit(1);
console.log('\nBehavior checks passed.');
