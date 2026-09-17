import fs from 'node:fs';
import path from 'node:path';
import { caseStudies, connectors, daxTopics, learningModules, latestUpdates, powerQueryConcepts, refreshPatterns, visuals } from '../src/data/curriculum.js';
import { advancedCaseStudies, authoringFeatures, decisionScenarios, performanceScenarios, troubleshootingScenarios, aiReadinessChecklist } from '../src/data/advancedCurriculum.js';

let failed = false;
const fail = (msg) => { console.error(`FAIL: ${msg}`); failed = true; };
const ok = (msg) => console.log(`PASS: ${msg}`);
const allCases = [...caseStudies, ...advancedCaseStudies];
const views = new Set(['report','data','model','dax','tmdl','powerquery','performance','refresh','service']);
const checkTypes = new Set(['source','sources','transformCount','queryApplied','relationships','measures','measureText','daxFormula','visuals','refreshMode','storageMode','rls','performanceRun','performanceCurrent','appPublished','dateTable','theme','performanceOptimized','relationshipDirection','refreshFlags','granularAction','copilotReady','releaseReady']);
const connectorNames = new Set(connectors.map(x=>x.name));
const visualNames = new Set(visuals.map(x=>x.name));
const refreshNames = new Set(refreshPatterns.map(x=>x.name));
const desktop = fs.readFileSync('src/components/PowerBIDesktop.jsx','utf8');
const advancedCode = fs.readFileSync('src/components/AdvancedSimulatorViews.jsx','utf8');
const caseCode = fs.readFileSync('src/components/CaseStudies.jsx','utf8');
const workspaceCheckCode = fs.readFileSync('src/utils/workspaceChecks.js','utf8');
const appCode = fs.readFileSync('src/App.jsx','utf8');
const learningExtrasCode = fs.readFileSync('src/components/LearningExtras.jsx','utf8');
const simulatorLogicCode = fs.readFileSync('src/utils/simulatorLogic.js','utf8');
const workspaceStateCode = fs.readFileSync('src/utils/workspaceState.js','utf8');
const caseSessionCode = fs.readFileSync('src/utils/caseSessions.js','utf8');
const daxCode = fs.readFileSync('src/components/DaxLab.jsx','utf8');
const readme = fs.readFileSync('README.md','utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json','utf8'));
if (packageJson.version !== '15.0.0') fail(`package.json version expected 15.0.0, found ${packageJson.version}`); else ok('package.json version is 15.0.0');

const expectedCoverage = {
  learningModules: 13,
  daxTopics: 13,
  daxExercises: 16,
  connectors: 23,
  visuals: 20,
  powerQueryConcepts: 12,
  refreshPatterns: 7,
  decisionScenarios: 12,
  authoringFeatures: 12,
  performanceScenarios: 5,
  latestUpdates: 13,
  troubleshootingScenarios: 8,
  aiReadinessChecklist: 6,
};
const actualCoverage = {
  learningModules: learningModules.length,
  daxTopics: daxTopics.length,
  daxExercises: (daxCode.match(/^    id: /gm) || []).length,
  connectors: connectors.length,
  visuals: visuals.length,
  powerQueryConcepts: powerQueryConcepts.length,
  refreshPatterns: refreshPatterns.length,
  decisionScenarios: decisionScenarios.length,
  authoringFeatures: authoringFeatures.length,
  performanceScenarios: performanceScenarios.length,
  latestUpdates: latestUpdates.length,
  troubleshootingScenarios: troubleshootingScenarios.length,
  aiReadinessChecklist: aiReadinessChecklist.length,
};
for (const [key, expected] of Object.entries(expectedCoverage)) {
  if (actualCoverage[key] !== expected) fail(`Coverage ${key}: expected ${expected}, found ${actualCoverage[key]}`);
}
if (!failed) ok(`Coverage registry counts match V15 release contract (${Object.values(actualCoverage).join('/')})`);
for (const requiredLine of ['23 connector/source patterns','20 visual types','5 end-to-end case studies / 45 guided steps','8 troubleshooting tickets','16 guided DAX exercises']) {
  if (!readme.includes(requiredLine)) fail(`README coverage snapshot missing: ${requiredLine}`);
}
if (!failed) ok('README release counts match source contract');

if (allCases.length !== 5) fail(`Expected 5 case studies, found ${allCases.length}`); else ok('5 case studies loaded');
const caseIds = new Set(); const stepIds = new Set(); let steps = 0;
for (const c of allCases) {
  if (caseIds.has(c.id)) fail(`Duplicate case id ${c.id}`); caseIds.add(c.id);
  if (!Array.isArray(c.steps) || !c.steps.length) fail(`Case ${c.id} has no steps`);
  for (const step of c.steps) {
    steps++;
    if (stepIds.has(step.id)) fail(`Duplicate step id ${step.id}`); stepIds.add(step.id);
    if (!views.has(step.view)) fail(`${step.id} uses unsupported view ${step.view}`);
    if (!step.check || !checkTypes.has(step.check.type)) fail(`${step.id} uses unsupported check ${step.check?.type}`);
    if (step.check?.type === 'source' && !connectorNames.has(step.check.value)) fail(`${step.id} source does not exist: ${step.check.value}`);
    if (step.check?.type === 'sources') for (const x of step.check.value) if (!connectorNames.has(x)) fail(`${step.id} source does not exist: ${x}`);
    if (step.check?.type === 'visuals') for (const x of step.check.value) if (!visualNames.has(x)) fail(`${step.id} visual does not exist: ${x}`);
    if (step.check?.type === 'refreshMode' && !refreshNames.has(step.check.value)) fail(`${step.id} refresh mode does not exist: ${step.check.value}`);
    if (step.check?.type === 'relationshipDirection' && !['Single','Both'].includes(step.check.value)) fail(`${step.id} invalid relationship direction ${step.check.value}`);
    if (step.check?.type === 'refreshFlags' && !Array.isArray(step.check.value)) fail(`${step.id} refreshFlags must be an array`);
    if (step.check?.type === 'copilotReady' && typeof step.check.value !== 'boolean') fail(`${step.id} copilotReady must be boolean`);
  }
}
if (!failed) ok(`${steps} guided steps have valid views/check contracts`);

for (const type of checkTypes) if (!workspaceCheckCode.includes(`case '${type}'`)) fail(`workspaceChecks missing type ${type}`);
if (!desktop.includes("['performance', 'visual', 'Performance']")) fail('Performance view missing from simulator rail'); else ok('Performance view is wired into simulator rail');
if (!desktop.includes('addSource={addSource}')) fail('Power Query/Report source-add wiring missing'); else ok('Source-add controls are wired');
if (!desktop.includes('Advanced Editor') || !desktop.includes('Column quality')) fail('Power Query advanced/profiling UI missing'); else ok('Power Query advanced editor and profiling present');
if (!desktop.includes('On-object') || !desktop.includes('Edit interactions') || !desktop.includes('Alt text')) fail('Report authoring controls incomplete'); else ok('Report build/format/interaction/accessibility controls present');
if (!desktop.includes('RangeStart / RangeEnd') || !desktop.includes('Refresh schema and data')) fail('Refresh depth controls incomplete'); else ok('Incremental and granular refresh controls present');
if (!desktop.includes('Publish app') || !desktop.includes('Build permission')) fail('Service governance controls incomplete'); else ok('Service release and permission controls present');
if (!desktop.includes('Approved for Copilot') || !desktop.includes('Prepare data for AI')) fail('Copilot readiness controls missing'); else ok('Copilot readiness controls present');
if (!desktop.includes('Refresh history simulator') || !desktop.includes('Run simulated operation')) fail('Refresh failure/history simulation missing'); else ok('Refresh operation and history simulation present');
if (!desktop.includes('Model health scanner')) fail('Model health scanner missing'); else ok('Model health scanner present');
if (!desktop.includes('Delete selected relationship') || !simulatorLogicCode.includes('export function removeRelationshipAt')) fail('Relationship destructive-edit workflow missing'); else ok('Relationship deletion is wired through shared model state');
if (!desktop.includes('relationshipVisualSlot(pairs, r)') || !desktop.includes('relationshipCardinalityMarkers(detail.cardinality)') || !simulatorLogicCode.includes('export function relationshipVisualSlot') || !simulatorLogicCode.includes('export function relationshipCardinalityMarkers')) fail('Relationship diagram still relies on mutable array position or fixed 1:* markers'); else ok('Relationship diagram geometry follows relationship identity and cardinality markers');
if (!desktop.includes('nextRecommendedRelationship(pairs, workspace)') || !simulatorLogicCode.includes('export function nextRecommendedRelationship')) fail('Relationship trainer missing-gap recovery is not wired through shared logic'); else ok('Relationship trainer restores missing recommended paths after destructive edits');
if (!simulatorLogicCode.includes("if (queryChangesPending(workspace)) return 'Pending changes';")) fail('Semantic-model status does not prioritize staged query changes'); else ok('Service status prioritizes staged Power Query transitions, including last-source deletion');
if (!appCode.includes('onClick={resetAllLabState}') || !appCode.includes('const resetAllLabState = () =>')) fail('Global reset button must use an event-safe zero-argument reset wrapper'); else ok('Global reset button uses an event-safe zero-argument reset wrapper');
if (!desktop.includes('hasQuery && profiling') || !desktop.includes('No query steps yet')) fail('Power Query empty state still exposes phantom profiling/applied steps'); else ok('Power Query hides profiling and source/navigation steps until a real query exists');
if (!desktop.includes('if (activeQuery !== safeActiveQuery) setActiveQuery(safeActiveQuery)') || !desktop.includes('existingIndex=queries.indexOf(newSource)')) fail('Power Query local selection does not recover safely after query deletion/addition'); else ok('Power Query query selection clamps after destructive edits and selects newly added sources deterministically');
if (!desktop.includes("'= Select or create a query'") || !desktop.includes('disabled={!hasQuery}>Choose Columns')) fail('Power Query empty formula/ribbon state is still presented as active'); else ok('Power Query formula bar and transform ribbon disable until a real query exists');
if (!desktop.includes("['Failed','Blocked'].includes(latest.status)")) fail('Refresh blocked-state visual warning missing'); else ok('Blocked refresh operations render as warnings rather than success');

for (const field of ['storageMode','theme','onObject','visualDetails','reportFilters','bookmarks','interactions','daxObjects','dateTable','queryTransforms','transformLog','appliedQueryTransforms','appliedSources','queryAppliedAt','queryDirty','relationshipDetails','refreshConfig','refreshHistory','service','performance','caseStudyId']) {
  if (!workspaceStateCode.includes(`${field}:`)) fail(`initialWorkspace missing ${field}`);
}
if (!failed) ok('V15 workspace schema fields present in pure migration module');
if (!caseSessionCode.includes('caseProgressKey') || !caseCode.includes('loadCaseProgress') || !caseCode.includes('saveCaseProgress')) fail('Case-study last-step resume wiring missing'); else ok('Case-study sessions resume both workspace state and last guided-step position');
if (!simulatorLogicCode.includes('upsertMeasureInWorkspace') || !simulatorLogicCode.includes('upsertDaxObjectInWorkspace') || !desktop.includes('upsertMeasureInWorkspace')) fail('Runtime semantic-object upsert hardening missing'); else ok('Runtime measure and DAX-object identities are deduplicated before reload');
if (!simulatorLogicCode.includes('daxObjectCompatibility') || !desktop.includes('Apply blocked: ${compatibility.message}')) fail('DAX object/storage compatibility guard missing'); else ok('Direct Lake calculated-column preview is architecture-gated');
if (!simulatorLogicCode.includes('parseDaxQueryDefinedMeasure') || !desktop.includes('updateModelFromQuery')) fail('DAX Query Update model parser/wiring missing'); else ok('DAX Query View Update model persists DEFINE MEASURE changes');
if (!simulatorLogicCode.includes('evaluateLoadedModelRefreshState') || !desktop.includes('evaluateLoadedModelRefreshState(workspace)')) fail('Loaded-model Service connectivity evaluation missing'); else ok('Service connectivity follows the loaded semantic model rather than staged Power Query sources');
if (!caseCode.includes('workspace.caseStudyId') || !caseCode.includes('seedFor') || !caseCode.includes('loadCaseSession(localStorage, id)') || !caseCode.includes('clearCaseSession(localStorage, studyId)') || !caseSessionCode.includes('saveCaseSession')) fail('Case-session seed/isolation/resume wiring missing'); else ok('Case-study sessions are isolated, seeded, resumable, and independently restartable');
if (!appCode.includes('clearAllCaseSessions(localStorage)') || !caseSessionCode.includes('clearAllCaseSessions')) fail('Global reset does not clear resumable case-session storage'); else ok('Global lab reset clears all saved case-study sessions');
if (!caseCode.includes('validWorkspaceCase') || !caseCode.includes('workspace.caseStudyId !== studyId')) fail('Invalid persisted case-study identity recovery missing'); else ok('Case Studies recovers invalid/reset persisted case identity before validation');

if (decisionScenarios.length < 12) fail('Decision lab has fewer than 12 scenarios'); else ok(`${decisionScenarios.length} decision scenarios loaded`);
for (const d of decisionScenarios) {
  if (d.answer < 0 || d.answer >= d.options.length) fail(`Decision ${d.id} has invalid answer index`);
}

const troubleIds = new Set();
for (const t of troubleshootingScenarios) {
  if (troubleIds.has(t.id)) fail(`Duplicate troubleshooting id ${t.id}`);
  troubleIds.add(t.id);
  if (!Array.isArray(t.options) || t.options.length < 2) fail(`Troubleshooting scenario ${t.id} needs options`);
  if (t.answer < 0 || t.answer >= t.options.length) fail(`Troubleshooting scenario ${t.id} has invalid answer index`);
  if (!t.rootCause || !t.fix || !t.surface) fail(`Troubleshooting scenario ${t.id} missing diagnostic fields`);
}
if (!failed) ok(`${troubleshootingScenarios.length} troubleshooting scenarios have valid answer/root-cause contracts`);
const troubleCode = fs.readFileSync('src/components/TroubleshootingCenter.jsx','utf8');
if (!troubleCode.includes('DIAGNOSE BEFORE YOU CHANGE THINGS') || !troubleCode.includes('REFERENCE REMEDIATION')) fail('Troubleshooting center UI contract missing'); else ok('Troubleshooting center UI is wired');
if (!appCode.includes('normalizeWorkspace') || !workspaceStateCode.includes('visualDetails: visuals.map')) fail('Workspace schema migration normalization missing'); else ok('Nested workspace + visual/filter/relationship migration normalization present');


if (!learningExtrasCode.includes('...viz,...trouble')) fail('Global search does not include troubleshooting tickets'); else ok('Troubleshooting tickets are included in global search');
if (!desktop.includes('workspace.queryTransforms?.[queryName]') || !desktop.includes('Close & Apply simulated')) fail('Per-query Power Query state / Close & Apply wiring missing'); else ok('Power Query keeps Applied Steps per query and exposes Close & Apply state');
if (!desktop.includes('No Power Query source connected') || !desktop.includes('disabled={!hasQuery}') || !simulatorLogicCode.includes('!sources.includes(queryName)')) fail('Power Query phantom-query guard missing'); else ok('Power Query blocks transformations and apply operations until a real query/source exists');
if (!desktop.includes('effectiveSelectedIndex') || !desktop.includes("patchSelected({altText:e.target.value})") || !desktop.includes("updateVisual(i,{interaction:mode})")) fail('Selected visual persistence/interactions wiring missing'); else ok('Selected-visual formatting and interactions persist to visual state');
if (!desktop.includes('visual-analytics-badges') || !desktop.includes('analytics:[]') || !workspaceStateCode.includes('analytics: stringArray(detail.analytics)')) fail('Persistent visual analytics overlay wiring missing'); else ok('Analytics-pane overlays persist per visual and survive workspace migration');
if (!desktop.includes('filter-scope-editor') || !desktop.includes('updateReportFilters') || !workspaceStateCode.includes('reportFilters')) fail('Persistent filter-scope editor wiring missing'); else ok('Visual/page/report filter scopes persist in workspace state');
if (!desktop.includes('Loaded connections') || !desktop.includes('Power Query has pending changes')) fail('Data view does not distinguish loaded connections from staged Power Query state'); else ok('Data view distinguishes the loaded model snapshot from staged Power Query edits');
if (!desktop.includes('No semantic-model data loaded') || !desktop.includes('hasLoadedSemanticModel(workspace)')) fail('Data view still exposes representative model rows before Close & Apply'); else ok('Data view stays empty until a source snapshot is loaded');
if (!simulatorLogicCode.includes('export function hasLoadedSemanticModel') || !desktop.includes('No semantic model loaded') || !desktop.includes('Load a semantic model first')) fail('Loaded-model authoring guard missing'); else ok('Report, Model, DAX, and TMDL authoring respect the loaded semantic-model boundary');
if (!simulatorLogicCode.includes('export function refreshStrategyCompatibility') || !simulatorLogicCode.includes('Refresh strategy and storage mode are incompatible')) fail('Storage/refresh-strategy compatibility guard missing'); else ok('Refresh readiness rejects clearly incompatible storage/refresh strategies');
if (!desktop.includes('filterServiceItems(buildServiceItems(workspace), tab)')) fail('Service workspace tab filtering missing'); else ok('Service workspace tabs filter the simulated inventory');
if (!desktop.includes('canApproveCopilot(service)') || !desktop.includes('nextAiServiceState(service, key, value)')) fail('Copilot prerequisite chain missing'); else ok('Copilot approval is prerequisite-gated');
if (!desktop.includes('releaseReadiness(workspace)')) fail('Governed pre-release readiness card missing'); else ok('Governed pre-release readiness is wired');
if (!simulatorLogicCode.includes("id: 'load'") || !simulatorLogicCode.includes('Power Query load state')) fail('Release load-state gate missing'); else ok('Governed release readiness blocks unapplied Power Query changes');
if (!simulatorLogicCode.includes('semanticModelRefreshStatus') || !desktop.includes("'Refresh required'") || !desktop.includes("item.refresh==='Completed'")) fail('Service refresh-state propagation missing'); else ok('Service inventory reflects latest semantic-model refresh outcome');
if (!simulatorLogicCode.includes('buildRefreshHistoryEntry') || !simulatorLogicCode.includes("status: 'Blocked'") || !desktop.includes('buildRefreshHistoryEntry(w')) fail('Pending-query refresh blocking missing'); else ok('Semantic-model operations block until staged Power Query changes are applied');
if (!simulatorLogicCode.includes('queryTransforms,') || !simulatorLogicCode.includes('appliedQueryTransforms')) fail('Refresh evidence does not include the loaded Power Query snapshot'); else ok('Refresh evidence tracks the loaded query-transformation snapshot');
if (!simulatorLogicCode.includes('performanceEvidenceCurrent') || !advancedCode.includes('Stale · rerun required')) fail('Stale Performance Analyzer evidence handling missing'); else ok('Performance evidence becomes visibly stale after report/model changes');
if (!advancedCode.includes('disabled={!loadedModel}') || !advancedCode.includes('Load a semantic model before recording Performance Analyzer evidence.')) fail('Performance Analyzer can still record evidence without a loaded semantic model'); else ok('Performance Analyzer evidence recording respects the loaded semantic-model boundary');
if (!desktop.includes('broken-viz') || !desktop.includes('Semantic model unavailable')) fail('Report visuals still render healthy values after the loaded model is removed'); else ok('Report visuals surface a broken-model state when their semantic model is unavailable');
if (!desktop.includes('items = loadedModel ? filterServiceItems') || !desktop.includes('No loaded semantic model') || !desktop.includes("'Semantic model: not loaded'")) fail('Service/status UI still presents a semantic model before one is loaded'); else ok('Service inventory, model-specific controls, lineage, and status bar respect the loaded semantic-model boundary');
if (!simulatorLogicCode.includes('buildPerformanceRows') || !fs.readFileSync('src/components/AdvancedSimulatorViews.jsx','utf8').includes('rows.find(row=>row.name===selectedName)')) fail('Performance table/inspector synchronization missing'); else ok('Performance Analyzer table and inspector share scaled timing rows');
if (!simulatorLogicCode.includes('sourceNeedsGateway') || !simulatorLogicCode.includes("storage === 'DirectQuery'") || !simulatorLogicCode.includes('Cloud/source credentials are ready')) fail('Gateway/source applicability logic missing'); else ok('Refresh readiness covers Import, DirectQuery, Composite, private gateways, and cloud credentials');
if (!simulatorLogicCode.includes('storageCompatibility') || !simulatorLogicCode.includes('getScenarioProfile') || !desktop.includes('profile.documentName') || !desktop.includes('profile.primaryFact') || !desktop.includes('profile.tmdlFormula')) fail('Scenario/storage compatibility wiring missing'); else ok('Scenario-specific surfaces and storage/source compatibility are wired');
if (!simulatorLogicCode.includes('scenarioSources = queryChangesPending(workspace) ? appliedSources : currentSources')) fail('Loaded-vs-staged scenario detection missing'); else ok('Scenario identity follows the loaded semantic-model snapshot while Power Query changes are pending');
if (!simulatorLogicCode.includes('parseTmdlMeasureScript') || !desktop.includes('Apply measure') || !desktop.includes('applyTmdlMeasure={addMeasure}')) fail('TMDL Apply still behaves as a local-only status control'); else ok('TMDL preview/apply persists a parsed measure into semantic-model state');
if (!simulatorLogicCode.includes('applyStorageModeSelection') || !desktop.includes('result.directLakeLoad')) fail('Direct Lake loaded-path semantics missing'); else ok('Direct Lake selection can load a compatible OneLake path without pretending it is Power Query Apply');
if (!workspaceCheckCode.includes("case 'queryApplied'") || !allCases.some(c=>c.steps.some(step=>step.check?.type==='queryApplied'))) fail('Case-study Close & Apply contract missing'); else ok('Case studies explicitly validate Close & Apply before downstream modeling/report work');
if (!workspaceStateCode.includes('migratedQueryTransforms') || !workspaceStateCode.includes('migratedTransformLog') || !workspaceStateCode.includes('appliedQueryTransforms')) fail('V3/V4-to-V5 Power Query migration missing'); else ok('Legacy Power Query state migrates into query-aware log + applied snapshot state');
if (!workspaceStateCode.includes('sanitizeRelationshipSettings') || !workspaceStateCode.includes('sanitizeRefreshConfig') || !workspaceStateCode.includes('sanitizeService')) fail('V10 scalar/enumeration workspace sanitizers missing'); else ok('Persisted relationship, refresh, and Service scalar state is type/enum normalized');
if (!workspaceStateCode.includes('sanitizeMeasures') || !workspaceStateCode.includes('sanitizeDaxObjects') || !workspaceStateCode.includes('VISUAL_INTERACTIONS') || !workspaceStateCode.includes('THEMES') || !workspaceStateCode.includes('REFRESH_MODES')) fail('V10 authoring scalar/formula normalization missing'); else ok('Measure/DAX formulas and authoring enums are normalized');
if (workspaceStateCode.includes('...parsed,') || workspaceStateCode.includes('...performanceSource,') || workspaceStateCode.includes('...detail,')) fail('Workspace normalization still rehydrates unknown persisted keys after sanitizing known fields'); else ok('Workspace normalization prunes unknown top-level and nested persisted keys');
if (!workspaceStateCode.includes('cloneQueryMap(queryMapSource, currentSources)') || !workspaceStateCode.includes('currentSourceSet.has(entry.query)')) fail('Orphan query-state pruning missing'); else ok('Workspace migration prunes query state whose source no longer exists');
if (!simulatorLogicCode.includes('loadedSources') || !simulatorLogicCode.includes('loadedQueries') || !simulatorLogicCode.includes('canonicalQueries')) fail('Performance evidence is not tied to the loaded Power Query snapshot'); else ok('Performance evidence signatures follow the loaded query snapshot rather than staged edits');
if (!desktop.includes('Apply {settings.direction} direction to all relationships') || !simulatorLogicCode.includes('relationshipDetails') || !simulatorLogicCode.includes('updateRelationshipAt')) fail('Per-relationship model metadata wiring missing'); else ok('Relationship cardinality/filter/active state is stored per relationship');
if (!simulatorLogicCode.includes('transformLog') || !simulatorLogicCode.includes('queryChangesPending') || !desktop.includes('Delete query')) fail('Transactional Power Query state wiring missing'); else ok('Power Query source/step changes use query-aware log and applied-state snapshots');
if (!fs.existsSync('scripts/behavior-check.mjs')) fail('Behavior regression gate missing'); else ok('Behavior regression gate is present');
if (!fs.existsSync('scripts/workflow-check.mjs')) fail('Sequential workflow regression gate missing'); else ok('Sequential workflow regression gate is present');
if (!fs.existsSync('scripts/migration-check.mjs')) fail('Migration regression gate missing'); else ok('Pure workspace migration gate is present');
if (!fs.existsSync('scripts/css-check.cjs')) fail('CSS parser gate missing'); else ok('CSS parser gate is present');

// Check relative imports resolve without needing npm.
const sourceFiles = [];
function walk(dir) { for (const name of fs.readdirSync(dir)) { const full=path.join(dir,name); const st=fs.statSync(full); if(st.isDirectory()) walk(full); else if(/\.(jsx|js|mjs)$/.test(name)) sourceFiles.push(full); } }
walk('src'); walk('scripts');
for (const file of sourceFiles) {
  const text = fs.readFileSync(file,'utf8');
  for (const match of text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const spec = match[1]; const full = path.resolve(path.dirname(file), spec);
    const candidates = [full, `${full}.js`, `${full}.jsx`, `${full}.mjs`, path.join(full,'index.js'), path.join(full,'index.jsx')];
    if (!candidates.some(x=>fs.existsSync(x))) fail(`${file} unresolved relative import ${spec}`);
  }
}
if (!failed) ok('All relative source imports resolve');

if (failed) process.exit(1);
console.log(`\nDeep checks passed: ${allCases.length} cases / ${steps} steps / ${decisionScenarios.length} decision scenarios.`);
