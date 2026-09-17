import { caseStudies } from '../src/data/curriculum.js';
import { advancedCaseStudies } from '../src/data/advancedCurriculum.js';
import { checkWorkspaceTask } from '../src/utils/workspaceChecks.js';
import { performanceContextSignature, releaseReadiness } from '../src/utils/simulatorLogic.js';

const base = () => ({
  sources: [], transforms: [], relationships: [], measures: [], measureText: '', daxObjects: [], visuals: [], visualDetails: [], reportFilters:{page:[],report:[]},
  queryTransforms: {}, transformLog: [], appliedQueryTransforms: {}, appliedSources: [], queryAppliedAt: '', queryDirty: false,
  refreshMode: '', rls: false, dateTable: false, theme: 'Fluent 2',
  performance: {hasRun:false, optimized:[], evidenceSignature:''},
  relationshipSettings: {cardinality:'One to many (1:*)',direction:'Single',active:true}, relationshipDetails: [],
  refreshConfig: {gatewayMapped:false,credentials:false,granularAction:''},
  service: {appPublished:false,descriptionsReady:false,aiPrepared:false,copilotApproved:false},
});
const merge = (seed={}) => {
  const merged = {
    ...base(), ...seed,
    performance: {...base().performance, ...(seed.performance||{})},
    relationshipSettings: {...base().relationshipSettings, ...(seed.relationshipSettings||{})},
    refreshConfig: {...base().refreshConfig, ...(seed.refreshConfig||{})},
    service: {...base().service, ...(seed.service||{})},
  };
  merged.relationshipDetails = Array.isArray(seed.relationshipDetails) && seed.relationshipDetails.length
    ? seed.relationshipDetails.map((detail,index)=>({name:merged.relationships[index], ...merged.relationshipSettings, ...detail}))
    : merged.relationships.map(name=>({name, ...merged.relationshipSettings}));
  return merged;
};

function satisfy(check, seed={}) {
  const w = merge(seed);
  switch (check.type) {
    case 'source': w.sources=[check.value]; break;
    case 'sources': w.sources=[...check.value]; break;
    case 'transformCount': w.transforms=Array.from({length:check.value},(_,i)=>`Step ${i}`); break;
    case 'queryApplied': if (!w.sources.length) w.sources=['SQL Server']; w.appliedSources=[...w.sources]; w.queryTransforms=w.queryTransforms||{}; w.appliedQueryTransforms={...w.queryTransforms}; w.queryAppliedAt='09:00'; w.queryDirty=false; break;
    case 'relationships': w.relationships=Array.from({length:check.value},(_,i)=>`Dim${i} -> Fact`); w.relationshipDetails=w.relationships.map(name=>({name,...w.relationshipSettings})); break;
    case 'measures': w.measures=check.value.map(name=>({name,formula:`${name} = 1`})); break;
    case 'measureText': w.measureText=`x ${check.value} y`; break;
    case 'daxFormula': w.daxObjects=[{type:'Visual calculation',name:'Test',formula:`Test = ${check.value} ( [Metric], 7 )`}]; break;
    case 'visuals': w.visuals=[...check.value]; break;
    case 'refreshMode': w.refreshMode=check.value; break;
    case 'storageMode': w.storageMode=check.value; break;
    case 'rls': w.rls=check.value; break;
    case 'performanceRun': w.performance.hasRun=check.value; break;
    case 'performanceCurrent': w.performance.hasRun=check.value; w.performance.evidenceSignature=check.value?performanceContextSignature(w):''; break;
    case 'appPublished': w.service.appPublished=check.value; break;
    case 'dateTable': w.dateTable=check.value; break;
    case 'theme': w.theme=check.value; break;
    case 'performanceOptimized': w.performance.optimized=[check.value]; break;
    case 'relationshipDirection': w.relationshipSettings.direction=check.value; w.relationshipDetails=w.relationships.map((name,index)=>({name,...w.relationshipSettings,...(w.relationshipDetails[index]||{}),direction:check.value})); break;
    case 'refreshFlags': for (const key of check.value) w.refreshConfig[key]=true; break;
    case 'granularAction': w.refreshConfig.granularAction=check.value; break;
    case 'copilotReady': w.service.descriptionsReady=w.service.aiPrepared=w.service.copilotApproved=check.value; break;
    case 'releaseReady':
      if (check.value) {
        if (!w.sources.length) w.sources=['SQL Server'];
        w.appliedSources=[...w.sources];
        w.queryTransforms=w.queryTransforms||{};
        w.appliedQueryTransforms={...w.queryTransforms};
        w.relationships=['DimA → Fact','DimB → Fact'];
        w.relationshipDetails=w.relationships.map(name=>({name,cardinality:'One to many (1:*)',direction:'Single',active:true}));
        w.dateTable=true; w.rls=true;
        w.refreshConfig={...(w.refreshConfig||{}),gatewayMapped:true,credentials:true};
        w.performance={...(w.performance||{}),hasRun:true};
        w.performance.evidenceSignature=performanceContextSignature(w);
      }
      break;
    default: throw new Error(`Unsupported check type ${check.type}`);
  }
  return w;
}

let failed = false;
const fail = msg => { console.error(`FAIL: ${msg}`); failed=true; };
const pass = msg => console.log(`PASS: ${msg}`);
const allCases=[...caseStudies,...advancedCaseStudies];
let steps=0;
for (const c of allCases) {
  const seeded=merge(c.seed||{});
  if (checkWorkspaceTask(c.steps[0].check, seeded)) fail(`${c.id} starts with its first guided step already satisfied`);
  for (const step of c.steps) {
    steps++;
    const w=satisfy(step.check,c.seed||{});
    if (!checkWorkspaceTask(step.check,w)) fail(`${c.id}/${step.id} cannot be satisfied by its documented check contract`);
  }
}
const rescue=advancedCaseStudies.find(x=>x.id==='broken-bi-rescue');
if (!rescue) fail('broken-bi-rescue case missing');
else {
  const w=merge(rescue.seed);
  if (!w.relationshipDetails.length || !w.relationshipDetails.every(r=>r.direction==='Both')) fail('rescue seed must start with bidirectional filtering on its seeded relationships');
  if (w.dateTable) fail('rescue seed must start without a marked Date table');
  if (w.refreshConfig.gatewayMapped || w.refreshConfig.credentials) fail('rescue seed must start with broken Service connectivity');
  if (w.service.copilotApproved) fail('rescue seed must start without Copilot approval');
  if (w.rls) fail('rescue seed must start without completed row-level security review');
  if (releaseReadiness(w).passed === releaseReadiness(w).total) fail('rescue seed must not start release-ready');
}
if (!failed) pass(`${allCases.length} cases / ${steps} steps satisfy pure workspace-state contracts`);
if (failed) process.exit(1);
