import type { CaseStudy, DbtBuildState, DbtDefinition, DbtModelDefinition, DbtTestDefinition, ScenarioDefinition } from '../types.js';
import { compileDbtModel, topologicalModels, type ModelSqlOverrides } from './dbtCompiler.js';
import { snapshotDependencyId } from './snapshotSimulator.js';

export type DbtCommand = 'run'|'test'|'build';
export type DbtSelectionMode = 'all'|'exact'|'parents'|'children'|'parents_children';

export interface DbtBuildOptions {
  selectedModels?: string[];
  runTests?: boolean;
  testModels?: string[];
  selectionReason?: string;
  command?:DbtCommand;
  includeProjectResources?: boolean;
}

export function createDbtBuild(caseStudy: CaseStudy): DbtBuildState {
  return {
    status:'idle',
    modelStates:Object.fromEntries(caseStudy.dbt.models.map((m)=>[m.id,'idle'])),
    testStates:Object.fromEntries(caseStudy.dbt.tests.map((t)=>[t.id,'idle'])),
    seedStates:Object.fromEntries(caseStudy.dbt.seeds.map((seed)=>[seed.replace(/\.csv$/i,''),'idle'])),
    snapshotStates:Object.fromEntries(caseStudy.dbt.snapshots.map((snapshot)=>[snapshot.id,'idle'])),
    contractStates:Object.fromEntries(caseStudy.dbt.models.filter((m)=>Boolean(m.contract?.length)).map((m)=>[m.id,'idle'])),
    compileErrors:{},
    logs:['SIMULATED DBT COMMAND — no warehouse queries are executed.'],
  };
}

export function selectDbtModels(project:DbtDefinition,currentModelId:string|undefined,mode:DbtSelectionMode):string[]{
  const all=project.models.map((model)=>model.id);
  if(mode==='all') return all;
  if(!currentModelId||!all.includes(currentModelId)) return [];
  const modelIds=new Set(all);
  const parents=new Map(project.models.map((model)=>[model.id,model.dependsOn.filter((dep)=>modelIds.has(dep))]));
  const children=new Map(all.map((id)=>[id,project.models.filter((model)=>model.dependsOn.includes(id)).map((model)=>model.id)]));
  const expand=(start:string,direction:'parents'|'children'):Set<string>=>{
    const result=new Set<string>([start]); const queue=[start];
    while(queue.length){const id=queue.shift()!;const next=direction==='parents'?(parents.get(id)??[]):(children.get(id)??[]);for(const dep of next)if(!result.has(dep)){result.add(dep);queue.push(dep);}}
    return result;
  };
  if(mode==='exact') return [currentModelId];
  if(mode==='parents') return [...expand(currentModelId,'parents')];
  if(mode==='children') return [...expand(currentModelId,'children')];
  return [...new Set([...expand(currentModelId,'parents'),...expand(currentModelId,'children')])];
}

export function runDbtBuild(caseStudy: CaseStudy, scenario: ScenarioDefinition, overrides:ModelSqlOverrides = {}, options:DbtBuildOptions = {}): DbtBuildState {
  const command=options.command ?? 'build';
  const state = createDbtBuild(caseStudy); state.status='running';
  const selectedModels=options.selectedModels ? new Set(options.selectedModels) : new Set(caseStudy.dbt.models.map((model)=>model.id));
  const explicitTestModels=options.testModels ? new Set(options.testModels) : undefined;
  const runTests=options.runTests ?? command!=='run';
  state.logs[0]=`SIMULATED DBT ${command.toUpperCase()} — no warehouse queries are executed.`;
  if(options.selectedModels) state.logs.push(`SIMULATED SELECTION — ${[...selectedModels].join(', ') || 'no models'}${options.selectionReason?` (${options.selectionReason})`:''}.`);
  if (caseStudy.isScratch) { state.status='success'; state.logs.push('Scratch compilation is available, but command execution is intentionally not inferred.'); return state; }

  if(command==='test'){
    Object.keys(state.modelStates).forEach((id)=>{state.modelStates[id]='skipped';});
    Object.keys(state.seedStates).forEach((id)=>{state.seedStates[id]='skipped';});
    Object.keys(state.snapshotStates).forEach((id)=>{state.snapshotStates[id]='skipped';});
    Object.keys(state.contractStates).forEach((id)=>{state.contractStates[id]='skipped';});
    runTestsAgainstExistingRelations(caseStudy,scenario,state,selectedModels,explicitTestModels);
    finalizeDbtState(state);
    return state;
  }

  if(command==='build'&&options.includeProjectResources){
    for(const seed of caseStudy.dbt.seeds){
      const id=seed.replace(/\.csv$/i,''); state.seedStates[id]='success'; state.logs.push(`OK seed ${id} — simulated project seed load.`);
    }
    runEligibleProjectSnapshots(caseStudy,state);
  }else{
    Object.keys(state.seedStates).forEach((id)=>{state.seedStates[id]='skipped';});
    Object.keys(state.snapshotStates).forEach((id)=>{state.snapshotStates[id]='skipped';});
  }

  const failedTests=new Set<string>();
  for (const model of topologicalModels(caseStudy.dbt)) {
    if(!selectedModels.has(model.id)){
      state.modelStates[model.id]='skipped';
      if(model.contract) state.contractStates[model.id]='skipped';
      state.logs.push(`SKIP model ${model.id} — not selected by this simulated dbt ${command}.`);
      continue;
    }

    const modelBlockers=failedTestsBlockingModel(caseStudy.dbt,model.id,failedTests);
    const selectedInternalDeps=model.dependsOn.filter((dep)=>selectedModels.has(dep)&&caseStudy.dbt.models.some((candidate)=>candidate.id===dep));
    const stateBlockers=selectedInternalDeps.filter((dep)=>state.modelStates[dep] !== 'success');
    const blockers=[...new Set([...stateBlockers,...modelBlockers])];
    if(blockers.length){
      state.modelStates[model.id]='skipped';
      if(model.contract) state.contractStates[model.id]='skipped';
      state.logs.push(`SKIP model ${model.id} — selected upstream model/test dependency failed or was blocked: ${blockers.join(', ')}`);
      continue;
    }

    state.modelStates[model.id]='running';
    const compiled=compileDbtModel(model,caseStudy.dbt,false,overrides);
    if(!compiled.ok){
      state.modelStates[model.id]='failed';
      if(model.contract) state.contractStates[model.id]='skipped';
      state.compileErrors[model.id]=compiled.errors;
      state.logs.push(`FAIL compile ${model.id} — ${compiled.errors.join(' | ')}`);
      continue;
    }

    if(model.contract?.length){
      const contract=runContractPreflight(model,compiled.sql);
      state.contractStates[model.id]=contract.state;
      state.logs.push(contract.message);
      if(contract.state==='failed'){
        state.modelStates[model.id]='failed';
        state.compileErrors[model.id]=[...(state.compileErrors[model.id]??[]),contract.message];
        continue;
      }
    }

    if(model.materialization==='ephemeral'){
      state.modelStates[model.id]='success';
      state.logs.push(`INLINE model ${model.id} [ephemeral] — compiled into dependent SQL; no physical relation is simulated.`);
    }else{
      state.logs.push(`START model ${model.id} [${model.materialization}]`);
      state.modelStates[model.id]='success';
      state.logs.push(`OK model ${model.id}`);
    }

    if(command==='build'&&runTests){
      for(const failedTest of runEligibleBuildTests(caseStudy,scenario,state,selectedModels,explicitTestModels)) failedTests.add(failedTest);
    }
    if(command==='build'&&options.includeProjectResources) runEligibleProjectSnapshots(caseStudy,state);
  }

  if(command==='build'&&options.includeProjectResources) finalizeProjectSnapshots(caseStudy,state);

  if(command==='run'){
    Object.keys(state.testStates).forEach((id)=>{state.testStates[id]='skipped';});
    state.logs.push('dbt run mode: data tests are not part of this simulated command. Model contracts remain build-time checks.');
  }else if(command==='build'&&runTests){
    // Finish any selected tests that became eligible only after the final selected model.
    for(const failedTest of runEligibleBuildTests(caseStudy,scenario,state,selectedModels,explicitTestModels)) failedTests.add(failedTest);
    finalizePendingBuildTests(caseStudy,state,selectedModels,explicitTestModels);
  }else{
    Object.keys(state.testStates).forEach((id)=>{state.testStates[id]='skipped';});
  }

  finalizeDbtState(state);
  return state;
}

function runEligibleProjectSnapshots(caseStudy:CaseStudy,state:DbtBuildState):void{
  const modelIds=new Set(caseStudy.dbt.models.map((model)=>model.id));
  const sourceIds=new Set(caseStudy.dbt.sources.map((source)=>source.id));
  const seedIds=new Set(caseStudy.dbt.seeds.map((seed)=>seed.replace(/\.csv$/i,'')));
  for(const snapshot of caseStudy.dbt.snapshots){
    if(state.snapshotStates[snapshot.id]!=='idle') continue;
    const dependency=snapshotDependencyId(snapshot.relation);
    if(!dependency){
      state.snapshotStates[snapshot.id]='failed';
      state.logs.push(`FAIL snapshot ${snapshot.id} — unsupported relation expression in bounded snapshot simulator.`);
      continue;
    }
    if(sourceIds.has(dependency)){
      state.snapshotStates[snapshot.id]='success';
      state.logs.push(`OK snapshot ${snapshot.id} [${snapshot.strategy}] — source dependency ${dependency} is available; bounded SCD2 lesson executed.`);
      continue;
    }
    if(seedIds.has(dependency)){
      if(state.seedStates[dependency]==='success'){
        state.snapshotStates[snapshot.id]='success';
        state.logs.push(`OK snapshot ${snapshot.id} [${snapshot.strategy}] — seed dependency ${dependency} loaded first.`);
      }
      continue;
    }
    if(modelIds.has(dependency)){
      const modelState=state.modelStates[dependency];
      if(modelState==='success'){
        state.snapshotStates[snapshot.id]='success';
        state.logs.push(`OK snapshot ${snapshot.id} [${snapshot.strategy}] — model dependency ${dependency} built first.`);
      }else if(modelState==='failed'||modelState==='skipped'){
        state.snapshotStates[snapshot.id]='skipped';
        state.logs.push(`SKIP snapshot ${snapshot.id} — referenced model ${dependency} did not build successfully.`);
      }
    }
  }
}

function finalizeProjectSnapshots(caseStudy:CaseStudy,state:DbtBuildState):void{
  runEligibleProjectSnapshots(caseStudy,state);
  for(const snapshot of caseStudy.dbt.snapshots){
    if(state.snapshotStates[snapshot.id]==='idle'){
      state.snapshotStates[snapshot.id]='skipped';
      state.logs.push(`SKIP snapshot ${snapshot.id} — its declared dependency did not become runnable in this simulated dbt build.`);
    }
  }
}

function testParentModels(project:DbtDefinition,test:DbtTestDefinition):string[]{
  const modelIds=new Set(project.models.map((model)=>model.id));
  const parents=[test.model];
  if(test.type==='relationships'&&test.target){
    const targetModel=test.target.split('.')[0];
    if(modelIds.has(targetModel)&&!parents.includes(targetModel)) parents.push(targetModel);
  }
  return parents;
}

function testIsSelected(project:DbtDefinition,test:DbtTestDefinition,selectedModels:Set<string>,explicitTestModels:Set<string>|undefined):boolean{
  if(explicitTestModels&&!explicitTestModels.has(test.model)) return false;
  if(!selectedModels.has(test.model)) return false;
  // Bounded indirect-selection rule: a multi-parent relationships test is only included
  // when all of its model parents are part of this simulated selection.
  return testParentModels(project,test).every((parent)=>selectedModels.has(parent));
}

function runEligibleBuildTests(caseStudy:CaseStudy,scenario:ScenarioDefinition,state:DbtBuildState,selectedModels:Set<string>,explicitTestModels:Set<string>|undefined):string[]{
  const failed:string[]=[];
  for(const test of caseStudy.dbt.tests){
    if(state.testStates[test.id]!=='idle') continue;
    if(!testIsSelected(caseStudy.dbt,test,selectedModels,explicitTestModels)) continue;
    const parents=testParentModels(caseStudy.dbt,test);
    const states=parents.map((parent)=>state.modelStates[parent]);
    if(states.some((value)=>value==='failed'||value==='skipped')){
      state.testStates[test.id]='skipped';
      state.logs.push(`SKIP test ${test.id} — one of its model parents did not build successfully: ${parents.join(', ')}.`);
      continue;
    }
    if(!states.every((value)=>value==='success')) continue;
    runSingleTest(test.id,test.model,caseStudy,scenario,state);
    if(state.testStates[test.id]==='failed') failed.push(test.id);
  }
  return failed;
}

function finalizePendingBuildTests(caseStudy:CaseStudy,state:DbtBuildState,selectedModels:Set<string>,explicitTestModels:Set<string>|undefined):void{
  for(const test of caseStudy.dbt.tests){
    if(state.testStates[test.id]!=='idle') continue;
    if(!testIsSelected(caseStudy.dbt,test,selectedModels,explicitTestModels)){
      state.testStates[test.id]='skipped';
      const parents=testParentModels(caseStudy.dbt,test);
      const extraParents=parents.filter((parent)=>parent!==test.model&&!selectedModels.has(parent));
      const reason=extraParents.length?`multi-parent test requires unselected model parent(s): ${extraParents.join(', ')}`:'outside selected test/model scope';
      state.logs.push(`SKIP test ${test.id} — ${reason}.`);
      continue;
    }
    state.testStates[test.id]='skipped';
    state.logs.push(`SKIP test ${test.id} — required model parent did not reach a successful state.`);
  }
}

function isDescendantOf(project:DbtDefinition,candidateId:string,ancestorId:string):boolean{
  const byId=new Map(project.models.map((model)=>[model.id,model]));
  const visit=(id:string,seen:Set<string>):boolean=>{
    if(seen.has(id)) return false;
    seen.add(id);
    const model=byId.get(id); if(!model) return false;
    for(const dep of model.dependsOn){
      if(dep===ancestorId) return true;
      if(byId.has(dep)&&visit(dep,seen)) return true;
    }
    return false;
  };
  return candidateId!==ancestorId&&visit(candidateId,new Set());
}

function failedTestsBlockingModel(project:DbtDefinition,candidateId:string,failedTests:Set<string>):string[]{
  const blockers:string[]=[];
  for(const testId of failedTests){
    const test=project.tests.find((item)=>item.id===testId); if(!test) continue;
    const parents=testParentModels(project,test);
    if(parents.length===1){
      if(isDescendantOf(project,candidateId,parents[0])) blockers.push(`test:${test.id}`);
      continue;
    }
    const mostDownstream=parents.find((parent)=>parents.every((other)=>other===parent||isDescendantOf(project,parent,other)));
    if(mostDownstream){
      if(isDescendantOf(project,candidateId,mostDownstream)) blockers.push(`test:${test.id}`);
    }else if(parents.every((parent)=>isDescendantOf(project,candidateId,parent))){
      blockers.push(`test:${test.id}`);
    }
  }
  return blockers;
}

function runSingleTest(testId:string,modelId:string,caseStudy:CaseStudy,scenario:ScenarioDefinition,state:DbtBuildState):void{
  const test=caseStudy.dbt.tests.find((item)=>item.id===testId);
  if(!test) return;
  state.testStates[test.id]='running';
  const fails=scenario.failedDbtTest===test.id;
  state.testStates[test.id]=fails?'failed':'success';
  const parents=testParentModels(caseStudy.dbt,test);
  state.logs.push(`${fails?'FAIL':'PASS'} test ${test.id} on ${parents.join(' + ')}${fails?' — scenario-injected failing rows':''}`);
}

function runTestsAgainstExistingRelations(caseStudy:CaseStudy,scenario:ScenarioDefinition,state:DbtBuildState,selectedModels:Set<string>,explicitTestModels:Set<string>|undefined):void{
  state.logs.push('dbt test mode: selected model relations are treated as already existing; this command does not rebuild them or re-run model contracts.');
  for(const test of caseStudy.dbt.tests){
    if(!testIsSelected(caseStudy.dbt,test,selectedModels,explicitTestModels)){
      state.testStates[test.id]='skipped';
      const parents=testParentModels(caseStudy.dbt,test);
      const unselected=parents.filter((parent)=>!selectedModels.has(parent));
      state.logs.push(`SKIP test ${test.id} — ${unselected.length?`multi-parent test has unselected model parent(s): ${unselected.join(', ')}`:'outside selected test scope'}.`);
      continue;
    }
    runSingleTest(test.id,test.model,caseStudy,scenario,state);
  }
}

function splitTopLevelCsv(input:string):string[]{
  const parts:string[]=[]; let start=0; let depth=0; let quote='';
  for(let i=0;i<input.length;i+=1){
    const char=input[i];
    if(quote){if(char===quote&&input[i-1]!=='\\')quote='';continue;}
    if(char==='\''||char==='"'){quote=char;continue;}
    if(char==='(') depth+=1; else if(char===')') depth=Math.max(0,depth-1); else if(char===','&&depth===0){parts.push(input.slice(start,i).trim());start=i+1;}
  }
  parts.push(input.slice(start).trim());
  return parts.filter(Boolean);
}

function finalProjection(sql:string):string|undefined{
  const lower=sql.toLowerCase();
  let depth=0; let quote=''; let selectIndex=-1;
  for(let i=0;i<sql.length;i+=1){
    const char=sql[i];
    if(quote){if(char===quote&&sql[i-1]!=='\\')quote='';continue;}
    if(char==='\''||char==='"'){quote=char;continue;}
    if(char==='('){depth+=1;continue;}
    if(char===')'){depth=Math.max(0,depth-1);continue;}
    if(depth===0&&/^select\b/i.test(lower.slice(i))){selectIndex=i;i+=5;}
  }
  if(selectIndex<0) return undefined;
  depth=0; quote='';
  for(let i=selectIndex+6;i<sql.length;i+=1){
    const char=sql[i];
    if(quote){if(char===quote&&sql[i-1]!=='\\')quote='';continue;}
    if(char==='\''||char==='"'){quote=char;continue;}
    if(char==='('){depth+=1;continue;}
    if(char===')'){depth=Math.max(0,depth-1);continue;}
    if(depth===0&&/^from\b/i.test(lower.slice(i))) return sql.slice(selectIndex+6,i).trim();
  }
  return undefined;
}

function projectedColumnNames(sql:string):string[]|undefined{
  const projection=finalProjection(sql); if(!projection||/^(distinct\s+)?\*/i.test(projection.trim())) return undefined;
  const names:string[]=[];
  for(const expression of splitTopLevelCsv(projection)){
    if(/\*/.test(expression)&&!/[\w)]\s+(?:as\s+)?[A-Za-z_][\w$]*\s*$/i.test(expression)) return undefined;
    const asMatch=expression.match(/\bas\s+([A-Za-z_][\w$]*)\s*$/i);
    if(asMatch){names.push(asMatch[1]);continue;}
    const aliasMatch=expression.match(/\s+([A-Za-z_][\w$]*)\s*$/);
    if(aliasMatch&&/[()]/.test(expression.slice(0,aliasMatch.index))){names.push(aliasMatch[1]);continue;}
    const simple=expression.trim().match(/(?:^|\.)([A-Za-z_][\w$]*)\s*$/);
    if(simple){names.push(simple[1]);continue;}
    return undefined;
  }
  return names;
}

function runContractPreflight(model:DbtModelDefinition,compiledSql:string):{state:'success'|'failed'|'skipped';message:string}{
  const expected=(model.contract??[]).map((entry)=>entry.trim().split(/\s+/)[0]).filter(Boolean);
  if(!expected.length) return {state:'skipped',message:`CONTRACT ${model.id} — no contract metadata declared.`};
  const actual=projectedColumnNames(compiledSql);
  if(!actual){
    return {state:'skipped',message:`CONTRACT ${model.id} — bounded name preflight could not safely infer the final projection; real dbt/adapter contract enforcement is not simulated here.`};
  }
  const missing=expected.filter((column)=>!actual.includes(column));
  const extra=actual.filter((column)=>!expected.includes(column));
  if(missing.length||extra.length){
    return {state:'failed',message:`FAIL contract ${model.id} — bounded column-name preflight mismatch${missing.length?`; missing: ${missing.join(', ')}`:''}${extra.length?`; undeclared: ${extra.join(', ')}`:''}. Data-type/adapter checks are outside this simulator.`};
  }
  return {state:'success',message:`PASS contract ${model.id} — bounded column-name preflight matched ${expected.length} declared columns. Data types/adapter constraints are not inferred.`};
}

function finalizeDbtState(state:DbtBuildState):void{
  const nodeStates=[...Object.values(state.modelStates),...Object.values(state.testStates),...Object.values(state.seedStates),...Object.values(state.snapshotStates),...Object.values(state.contractStates)];
  const didWork=nodeStates.some((node)=>node==='success'||node==='failed');
  state.status=nodeStates.includes('failed')?'failed':didWork?'success':'skipped';
}

export function skipDbtBuild(caseStudy: CaseStudy, reason: string): DbtBuildState {
  const state=createDbtBuild(caseStudy);
  state.status='skipped';
  Object.keys(state.modelStates).forEach((id)=>{state.modelStates[id]='skipped';});
  Object.keys(state.testStates).forEach((id)=>{state.testStates[id]='skipped';});
  Object.keys(state.seedStates).forEach((id)=>{state.seedStates[id]='skipped';});
  Object.keys(state.snapshotStates).forEach((id)=>{state.snapshotStates[id]='skipped';});
  Object.keys(state.contractStates).forEach((id)=>{state.contractStates[id]='skipped';});
  state.logs.push(`SKIPPED dbt command — ${reason}`);
  return state;
}
