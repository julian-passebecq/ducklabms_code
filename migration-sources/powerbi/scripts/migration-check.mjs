import { normalizeWorkspace } from '../src/utils/workspaceState.js';

let failed = false;
const fail = (msg) => { console.error(`FAIL: ${msg}`); failed = true; };
const pass = (msg) => console.log(`PASS: ${msg}`);
const expect = (condition, msg) => condition ? pass(msg) : fail(msg);

const legacyGlobal = normalizeWorkspace({
  sources:['SQL Server'],
  transforms:['Changed Type','Filtered Rows'],
  relationships:['Product → Sales'],
  relationshipSettings:{cardinality:'One to many (1:*)',direction:'Both',active:true},
  visualDetails:[{type:'Card',altText:'Revenue'}],
  visuals:['Card'],
});
expect(legacyGlobal.queryTransforms['SQL Server']?.length === 2, 'Legacy global transforms migrate into the first source query');
expect(legacyGlobal.transformLog.length === 2 && legacyGlobal.transformLog.every(x=>x.query==='SQL Server'), 'Legacy transforms gain query-aware log entries');
expect(legacyGlobal.relationshipDetails.length === 1 && legacyGlobal.relationshipDetails[0].direction === 'Both', 'Legacy global relationship properties migrate to each existing relationship');
expect(Array.isArray(legacyGlobal.visualDetails[0].filters) && legacyGlobal.visualDetails[0].filters.length === 0, 'Legacy visuals gain an empty visual-filter collection');
expect(legacyGlobal.queryDirty === false, 'Previously clean legacy workspace remains clean after migration');

const v4QueryState = normalizeWorkspace({
  sources:['SQL Server','SharePoint Folder'],
  queryTransforms:{'SQL Server':['Changed Type'],'SharePoint Folder':['Filtered Rows']},
  transforms:['Changed Type','Filtered Rows'],
  queryDirty:false,
  refreshConfig:{credentials:true},
  service:{descriptionsReady:true},
});
expect(v4QueryState.transformLog.some(x=>x.query==='SharePoint Folder' && x.step==='Filtered Rows'), 'V4 query map reconstructs a query-aware transformation log');
expect(v4QueryState.appliedSources.length === 2 && v4QueryState.appliedQueryTransforms['SQL Server']?.length === 1, 'Clean V4 query state is treated as the applied snapshot');
expect(v4QueryState.refreshConfig.credentials && v4QueryState.refreshConfig.schedule === '08:00 daily', 'Nested refresh defaults survive partial legacy state');
expect(v4QueryState.service.descriptionsReady && v4QueryState.service.deploymentStage === 'Development', 'Nested Service defaults survive partial legacy state');

const dirtyV4 = normalizeWorkspace({
  sources:['SQL Server'],
  queryTransforms:{'SQL Server':['Changed Type','Removed Columns']},
  transforms:['Changed Type','Removed Columns'],
  queryAppliedAt:'09:00',
  queryDirty:true,
});
expect(dirtyV4.queryDirty === true, 'Explicit dirty state remains dirty during migration');
expect(dirtyV4.appliedSources.includes('SQL Server'), 'Dirty post-apply migration preserves the known applied source set');
expect(Object.keys(dirtyV4.appliedQueryTransforms).length === 0, 'Unknown pre-V5 applied-step snapshot is not fabricated for dirty legacy state');

const v5Filters = normalizeWorkspace({
  reportFilters:{page:['Date[Year] = 2026'],report:['Region[Country] = Norway']},
  visuals:['Matrix'],
  visualDetails:[{type:'Matrix',filters:['[Total Sales] > 100000']}],
});
expect(v5Filters.reportFilters.page.length === 1 && v5Filters.reportFilters.report.length === 1, 'Page/report filter state survives normalization');
expect(v5Filters.visualDetails[0].filters[0] === '[Total Sales] > 100000', 'Visual-scope filter state survives normalization');

const malformed = normalizeWorkspace({
  sources:'bad', relationships:'bad', visualDetails:'bad', refreshHistory:'bad',
  measures:'bad', bookmarks:{bad:true}, interactions:42, daxObjects:['bad'],
  performance:{hasRun:true, optimized:'bad', evidenceSignature:7},
  relationshipDetails:['bad'], service:['bad'], refreshConfig:'bad',
});
expect(Array.isArray(malformed.sources) && Array.isArray(malformed.relationships) && Array.isArray(malformed.refreshHistory), 'Malformed core array fields fall back to safe workspace defaults');
expect(Array.isArray(malformed.measures) && malformed.measures.length===0 && Array.isArray(malformed.daxObjects) && malformed.daxObjects.length===0, 'Malformed DAX/model collections are sanitized before panes attempt to map them');
expect(Array.isArray(malformed.bookmarks) && Array.isArray(malformed.interactions) && malformed.bookmarks.length===0 && malformed.interactions.length===0, 'Malformed authoring collections are sanitized instead of being spread as strings/objects');
expect(Array.isArray(malformed.performance.optimized) && malformed.performance.optimized.length===0 && malformed.performance.evidenceSignature==='', 'Malformed performance evidence fields are normalized to safe V8 defaults');
expect(malformed.service.deploymentStage==='Development' && malformed.refreshConfig.schedule==='08:00 daily', 'Malformed nested objects fall back to default Service/refresh structures');

const malformedScalars = normalizeWorkspace({storageMode:'Bad', onObject:'yes', dateTable:'yes', rls:1, relationshipSettings:{direction:'Bad',cardinality:'Bad',active:'yes'}, relationships:['Date → Sales'], relationshipDetails:[{direction:'Bad',cardinality:'Bad',active:'no'}], refreshConfig:{gatewayMapped:'yes',credentials:1,schedule:9,incremental:'yes'}, service:{endorsement:'Gold',deploymentStage:'Live',descriptionsReady:true,aiPrepared:false,copilotApproved:true}});
expect(malformedScalars.storageMode==='Import' && malformedScalars.onObject===false && malformedScalars.dateTable===false && malformedScalars.rls===false, 'Malformed persisted scalar flags fall back to typed workspace defaults');
expect(malformedScalars.relationshipDetails[0].direction==='Single' && malformedScalars.relationshipDetails[0].cardinality==='One to many (1:*)' && malformedScalars.relationshipDetails[0].active===true, 'Malformed relationship enums/booleans are normalized');
expect(malformedScalars.refreshConfig.gatewayMapped===false && malformedScalars.refreshConfig.credentials===false && malformedScalars.refreshConfig.schedule==='08:00 daily', 'Malformed refresh scalar fields are normalized');
expect(malformedScalars.service.endorsement==='Promoted' && malformedScalars.service.deploymentStage==='Development' && malformedScalars.service.copilotApproved===false, 'Malformed Service enums and invalid Copilot approval are normalized');

const staleCleanFlag = normalizeWorkspace({
  sources:['SQL Server'],
  queryTransforms:{'SQL Server':['Changed Type']},
  appliedSources:['SQL Server'],
  appliedQueryTransforms:{'SQL Server':[]},
  queryDirty:false,
  queryAppliedAt:'08:00',
});
expect(staleCleanFlag.queryDirty === true, 'Migration recomputes dirty state from snapshots instead of trusting a stale persisted false flag');

const visualAnalytics = normalizeWorkspace({visuals:['Line chart'],visualDetails:[{type:'Line chart',analytics:['Average line']}]});
expect(visualAnalytics.visualDetails[0].analytics[0] === 'Average line', 'Visual analytics overlays survive workspace normalization');

const orphanedQueries = normalizeWorkspace({
  sources:['SQL Server'],
  queryTransforms:{'SQL Server':['Changed Type'],'Deleted Query':['Filtered Rows']},
  transformLog:[{query:'SQL Server',step:'Changed Type'},{query:'Deleted Query',step:'Filtered Rows'}],
  appliedSources:['SQL Server'],
  appliedQueryTransforms:{'SQL Server':['Changed Type'],'Deleted Query':['Filtered Rows']},
  queryAppliedAt:'09:00',
});
expect(!('Deleted Query' in orphanedQueries.queryTransforms) && !orphanedQueries.transformLog.some(x=>x.query==='Deleted Query'), 'Normalization prunes orphan current-query state for sources that no longer exist');
expect(!('Deleted Query' in orphanedQueries.appliedQueryTransforms), 'Normalization prunes orphan applied-query snapshots that no longer belong to applied sources');

const malformedAuthoringScalars = normalizeWorkspace({
  theme:'Mystery theme', refreshMode:'Every 3 seconds',
  visuals:['Card'], visualDetails:[{type:'Matrix',interaction:'Explode',titleOn:true,tooltipOn:true}],
  measures:[{name:'Revenue',formula:{bad:true}}],
  daxObjects:[{type:'Measure',name:'Margin',formula:['bad']}],
});
expect(malformedAuthoringScalars.theme === 'Fluent 2' && malformedAuthoringScalars.refreshMode === '', 'Theme and refresh-mode values are normalized to supported simulator enums');
expect(malformedAuthoringScalars.visualDetails[0].type === 'Card' && malformedAuthoringScalars.visualDetails[0].interaction === '', 'Visual metadata cannot override the authoritative visual type or inject an unsupported interaction mode');
expect(malformedAuthoringScalars.measures[0].formula === '' && malformedAuthoringScalars.daxObjects[0].formula === '', 'Malformed measure/DAX formulas are normalized to safe strings before editors and signatures consume them');

const reorderedRelationships = normalizeWorkspace({
  relationships:['Date → Sales','Product → Sales'],
  relationshipDetails:[
    {name:'Product → Sales',cardinality:'Many to many (*:*)',direction:'Both',active:true},
    {name:'Date → Sales',cardinality:'One to many (1:*)',direction:'Single',active:false},
  ],
});
expect(reorderedRelationships.relationshipDetails[0].name === 'Date → Sales' && reorderedRelationships.relationshipDetails[0].active === false, 'Relationship migration matches named metadata to the correct relationship after array reordering');
expect(reorderedRelationships.relationshipDetails[1].name === 'Product → Sales' && reorderedRelationships.relationshipDetails[1].cardinality === 'Many to many (*:*)', 'Relationship migration preserves the correct named cardinality after reordering');

const duplicateIdentityState = normalizeWorkspace({
  sources:['SQL Server','SQL Server','SharePoint Folder'],
  relationships:['Date → Sales','Date → Sales','Product → Sales'],
});
expect(duplicateIdentityState.sources.length === 2 && duplicateIdentityState.sources[0] === 'SQL Server', 'Workspace migration removes duplicate source identities while preserving source order');
expect(duplicateIdentityState.relationships.length === 2 && duplicateIdentityState.relationshipDetails.length === 2, 'Workspace migration removes duplicate relationship identities and keeps metadata aligned');

const malformedHistoryStatus = normalizeWorkspace({refreshHistory:[{time:'10:00',action:'Refresh',status:'Exploded',message:'bad'}]});
expect(malformedHistoryStatus.refreshHistory[0].status === '', 'Unknown persisted refresh-history statuses are cleared instead of leaking unsupported operational states into Service');

const invalidRefreshEnums = normalizeWorkspace({refreshConfig:{schedule:'every 17 minutes',granularAction:'Do magic refresh'}});
expect(invalidRefreshEnums.refreshConfig.schedule === '08:00 daily' && invalidRefreshEnums.refreshConfig.granularAction === '', 'Unsupported refresh schedule and granular-action strings fall back to valid simulator options');
const validDynamicGranular = normalizeWorkspace({refreshConfig:{schedule:'Manual only',granularAction:'Table-level: Sales'}});
expect(validDynamicGranular.refreshConfig.schedule === 'Manual only' && validDynamicGranular.refreshConfig.granularAction === 'Table-level: Sales', 'Supported schedule and dynamic table-level granular action survive migration');

const duplicateSemanticObjects = normalizeWorkspace({
  measures:[{name:'Revenue',formula:'old'},{name:'revenue',formula:'new'}],
  daxObjects:[{type:'UDF',name:'SafeRatio',formula:'old'},{type:'UDF',name:'saferatio',formula:'new'},{type:'Visual calculation',name:'SafeRatio',formula:'visual'}],
});
expect(duplicateSemanticObjects.measures.length === 1 && duplicateSemanticObjects.measures[0].formula === 'new', 'Duplicate persisted measure identities collapse case-insensitively to the latest definition');
expect(duplicateSemanticObjects.daxObjects.length === 2 && duplicateSemanticObjects.daxObjects.some(x=>x.type==='UDF' && x.formula==='new') && duplicateSemanticObjects.daxObjects.some(x=>x.type==='Visual calculation'), 'Duplicate DAX objects deduplicate by type + name without collapsing different object types');

const pollutedState = normalizeWorkspace({
  obsoleteTopLevel:'remove me',
  visuals:['Card'], visualDetails:[{type:'Card',axis:'Date[Month]',obsoleteVisualKey:'remove me'}],
  daxObjects:[{type:'UDF',name:'SafeRatio',formula:'FUNCTION SafeRatio = 1',obsoleteDaxKey:'remove me'}],
  performance:{hasRun:true,optimized:[],lastRunAt:'now',evidenceSignature:'sig',obsoletePerformanceKey:'remove me'},
});
expect(!('obsoleteTopLevel' in pollutedState), 'Workspace normalization prunes unknown top-level keys from old/corrupt state');
expect(!('obsoleteVisualKey' in pollutedState.visualDetails[0]) && !('obsoleteDaxKey' in pollutedState.daxObjects[0]), 'Workspace normalization prunes unknown nested authoring keys');
expect(!('obsoletePerformanceKey' in pollutedState.performance), 'Workspace normalization prunes unknown nested performance keys');

if (failed) process.exit(1);
console.log('\nMigration checks passed.');
