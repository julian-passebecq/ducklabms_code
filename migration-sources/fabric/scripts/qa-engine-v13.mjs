import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const temp=path.resolve('.qa-engine-v13'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
const compile=spawnSync('tsc',['src/types/app.ts','src/lib/dataRuntime.ts','src/lib/practiceEngine.ts','src/data/caseStudies.ts','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',temp,'--esModuleInterop','--skipLibCheck','--strict'],{encoding:'utf8'});
if(compile.status!==0){console.error(compile.stdout||compile.stderr);process.exit(1);} fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
const require=createRequire(import.meta.url); const practice=require(path.join(temp,'lib/practiceEngine.js')); const runtime=require(path.join(temp,'lib/dataRuntime.js')); const data=require(path.join(temp,'data/caseStudies.js'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
const getCase=(id)=>data.caseStudies.find((c)=>c.id===id); const getExercise=(id)=>practice.practiceExercises.find((e)=>e.id===id);
for(const id of ['retail-medallion','turbine-realtime','erp-incremental']){
  const list=practice.exercisesForCase(id); check(`Practice catalog populated: ${id}`,list.length>=8,String(list.length));
  const progress=practice.createPracticeProgress(id); check(`Practice progress seeds all exercises: ${id}`,Object.keys(progress.exercises).length===list.length,String(Object.keys(progress.exercises).length));
}
let p=practice.createPracticeProgress('retail-medallion'); const decision=getExercise('decision-relational-small');
let r=practice.runPracticeExercise(decision,runtime.seedWorkspace(getCase('retail-medallion')),'Spark'); p=practice.recordPracticeAttempt(p,decision,r);
check('Wrong tool choice fails',!r.ok&&p.exercises[decision.id].failedAttempts===1,r.message);
p=practice.revealPracticeHint(p,decision.id); p=practice.revealPracticeHint(p,decision.id); p=practice.revealPracticeHint(p,decision.id); p=practice.revealPracticeHint(p,decision.id);
check('Practice hint ladder caps at three',p.exercises[decision.id].hintsUsed===3,String(p.exercises[decision.id].hintsUsed));
r=practice.runPracticeExercise(decision,r.workspace,'SQL'); p=practice.recordPracticeAttempt(p,decision,r);
check('Correct tool choice passes',r.ok&&p.exercises[decision.id].completed,r.evidence);
check('Assisted pass score is below 100',p.exercises[decision.id].bestScore>0&&p.exercises[decision.id].bestScore<100,String(p.exercises[decision.id].bestScore));
const challengeState={...practice.emptyPracticeExerciseProgress('x'),failedAttempts:1,hintsUsed:1}; const mediumState={...challengeState};
check('Challenge scoring penalizes mistakes strongly',practice.practiceExerciseScore(challengeState,'Challenge')<practice.practiceExerciseScore(mediumState,'Easy'),`${practice.practiceExerciseScore(challengeState,'Challenge')} < ${practice.practiceExerciseScore(mediumState,'Easy')}`);

let ws=runtime.seedWorkspace(getCase('retail-medallion')); const retailSql=getExercise('retail-sql-units');
r=practice.runPracticeExercise(retailSql,ws,retailSql.starter); ws=r.workspace;
check('Retail SQL exercise creates evidence table',r.ok&&runtime.findWorkspaceTable(ws,'practice.customer_units')?.rows.length>0,r.evidence);
const retailPy=getExercise('retail-python-clean'); r=practice.runPracticeExercise(retailPy,ws,retailPy.starter); ws=r.workspace;
const clean=runtime.findWorkspaceTable(ws,'practice.retail_clean'); check('Retail Python exercise writes cleaned table',r.ok&&clean?.rows.every((row)=>Number(row.qty)>0),r.evidence);
const retailDbt=getExercise('retail-dbt-build'); r=practice.runPracticeExercise(retailDbt,ws,'dbt build'); ws=r.workspace;
check('Retail dbt practice executes build + tests',r.ok&&r.output.includes('PASS test'),r.evidence);

let tws=runtime.seedWorkspace(getCase('turbine-realtime')); const turbineSql=getExercise('turbine-sql-avg'); r=practice.runPracticeExercise(turbineSql,tws,turbineSql.starter); tws=r.workspace;
check('Turbine SQL aggregate exercise passes',r.ok&&runtime.findWorkspaceTable(tws,'practice.turbine_temperature')?.rows.length>0,r.evidence);
const turbinePy=getExercise('turbine-python-features'); r=practice.runPracticeExercise(turbinePy,tws,turbinePy.starter); tws=r.workspace;
check('Turbine Python feature exercise creates temperature_delta',r.ok&&runtime.findWorkspaceTable(tws,'practice.turbine_features')?.columns.some((c)=>c.name==='temperature_delta'),r.evidence);
const sparkDecision=getExercise('turbine-spark-decision'); r=practice.runPracticeExercise(sparkDecision,tws,'Spark'); check('Production-scale Spark decision passes',r.ok,r.evidence);

let ews=runtime.seedWorkspace(getCase('erp-incremental')); const erpSql=getExercise('erp-sql-changes'); r=practice.runPracticeExercise(erpSql,ews,erpSql.starter); ews=r.workspace;
check('ERP incremental SQL exercise materializes change set',r.ok&&runtime.findWorkspaceTable(ews,'practice.erp_changed_orders')?.rows.length>0,r.evidence);
const erpDbt=getExercise('erp-dbt-build'); r=practice.runPracticeExercise(erpDbt,ews,'dbt build'); ews=r.workspace;
check('ERP dbt exercise passes build gate',r.ok&&r.output.includes('Done. PASS='),r.evidence);
const erpDecision=getExercise('erp-no-spark'); r=practice.runPracticeExercise(erpDecision,ews,'dbt'); check('ERP no-Spark decision passes with dbt',r.ok,r.evidence);

const compileExercise=getExercise('dbt-compile-no-mutation'); const before=ews.snapshot; r=practice.runPracticeExercise(compileExercise,ews,'dbt compile');
check('dbt compile practice leaves workspace unchanged',r.ok&&r.workspace.snapshot===before,`${before} -> ${r.workspace.snapshot}`);
const wrongCompile=practice.runPracticeExercise(compileExercise,ews,'dbt run'); check('Wrong dbt command does not satisfy compile exercise',!wrongCompile.ok,wrongCompile.message);

let migration=practice.createPracticeProgress('retail-medallion'); migration.exercises={'decision-relational-small':migration.exercises['decision-relational-small']}; const normalized=practice.normalizePracticeProgress(migration,'retail-medallion');
check('Practice migration restores missing exercise states',Object.keys(normalized.exercises).length===practice.exercisesForCase('retail-medallion').length,String(Object.keys(normalized.exercises).length));
const foreign=practice.normalizePracticeProgress({...migration,caseStudyId:'wrong'},'retail-medallion'); check('Foreign practice progress resets safely',practice.practiceSummary(foreign,'retail-medallion').completed===0,JSON.stringify(practice.practiceSummary(foreign,'retail-medallion')));
let reportProgress=practice.createPracticeProgress('retail-medallion'); let pass=practice.runPracticeExercise(decision,runtime.seedWorkspace(getCase('retail-medallion')),'SQL'); reportProgress=practice.recordPracticeAttempt(reportProgress,decision,pass); const report=practice.practiceReport(reportProgress,'retail-medallion');
check('Practice report preserves evidence and summary',report.summary.completed===1&&report.exercises.find((e)=>e.id===decision.id)?.lastEvidence.includes('SQL'),JSON.stringify(report.summary));

const failed=results.filter((x)=>!x.ok); for(const x of results) console.log(`${x.ok?'PASS':'FAIL'}  ${x.name}${x.detail?` :: ${x.detail}`:''}`); console.log(`\n${results.length-failed.length}/${results.length} V13 executable practice-engine tests passed.`); fs.rmSync(temp,{recursive:true,force:true}); if(failed.length) process.exit(1);
