import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp = path.resolve('.qa-engine-v12');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });
const compile = spawnSync('tsc', [
  'src/types/app.ts',
  'src/lib/tutorialLearning.ts',
  'src/data/caseStudies.ts',
  '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', temp,
  '--esModuleInterop', '--skipLibCheck', '--strict'
], { encoding: 'utf8' });
if (compile.status !== 0) { console.error(compile.stdout || compile.stderr); process.exit(1); }
fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const learning = require(path.join(temp, 'lib/tutorialLearning.js'));
const data = require(path.join(temp, 'data/caseStudies.js'));
const retail = data.caseStudies.find((c) => c.id === 'retail-medallion');
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

let progress = learning.createTutorialProgress(retail);
check('Progress seeds one record per tutorial step', Object.keys(progress.steps).length === retail.steps.length, String(Object.keys(progress.steps).length));
check('New progress starts Guided', progress.mode === 'Guided', progress.mode);
check('New summary starts at zero completion', learning.tutorialSummary(progress, retail).completed === 0 && learning.tutorialSummary(progress, retail).masteryScore === 0, JSON.stringify(learning.tutorialSummary(progress, retail)));

const stepId = retail.steps[0].id;
progress = learning.recordTutorialValidation(progress, stepId, { ok: false, message: 'missing copy' });
check('Failed validation increments attempt counters', progress.steps[stepId].attempts === 1 && progress.steps[stepId].failedAttempts === 1, JSON.stringify(progress.steps[stepId]));
check('Failed validation does not unlock step', !learning.canAdvanceTutorial(progress, stepId), JSON.stringify(progress.steps[stepId]));

progress = learning.revealTutorialHint(progress, stepId);
progress = learning.revealTutorialHint(progress, stepId);
progress = learning.revealTutorialHint(progress, stepId);
progress = learning.revealTutorialHint(progress, stepId);
check('Hint ladder caps at three', progress.steps[stepId].hintLevel === 3, String(progress.steps[stepId].hintLevel));
check('Hint text escalates from concept to target configuration', learning.tutorialHintText(retail, stepId, 1).includes(retail.steps[0].concept) && learning.tutorialHintText(retail, stepId, 3).includes(retail.steps[0].solutionText), learning.tutorialHintText(retail, stepId, 3));

progress = learning.recordSolutionReveal(progress, stepId);
progress = learning.recordTutorialValidation(progress, stepId, { ok: true, message: 'found' });
check('Successful validation unlocks step', learning.canAdvanceTutorial(progress, stepId), JSON.stringify(progress.steps[stepId]));
check('Successful validation records best score', progress.steps[stepId].bestScore > 0 && progress.steps[stepId].bestScore < 100, String(progress.steps[stepId].bestScore));

const guidedScore = learning.calculateStepScore(progress.steps[stepId], 'Guided');
const challengeScore = learning.calculateStepScore(progress.steps[stepId], 'Challenge');
check('Challenge scoring penalizes assistance more than Guided', challengeScore < guidedScore, `${challengeScore} < ${guidedScore}`);

progress = learning.setTutorialMode(progress, 'Challenge');
check('Mode can switch to Challenge', progress.mode === 'Challenge', progress.mode);
progress = learning.recordSolutionApplied(progress, retail.steps[1].id);
check('Solution application records reveal + apply', progress.steps[retail.steps[1].id].solutionRevealed && progress.steps[retail.steps[1].id].solutionApplied, JSON.stringify(progress.steps[retail.steps[1].id]));

progress = learning.recordTutorialValidation(progress, retail.steps[1].id, { ok: true, message: 'ok' });
const summary = learning.tutorialSummary(progress, retail);
check('Summary counts validated steps', summary.completed === 2 && summary.completionPercent === Math.round(2 / retail.steps.length * 100), JSON.stringify(summary));
check('Summary counts assistance usage', summary.hintsUsed === 3 && summary.solutionUses === 2, JSON.stringify(summary));
const report = learning.buildTutorialReport(progress, retail);
check('Mission report preserves step evidence', report.steps.length === retail.steps.length && report.steps[0].attempts === 2 && report.summary.completed === 2, JSON.stringify(report.summary));

const migrated = learning.normalizeTutorialProgress({ ...progress, steps: { [stepId]: progress.steps[stepId] } }, retail);
check('Migration restores missing step records', Object.keys(migrated.steps).length === retail.steps.length && Boolean(migrated.steps[retail.steps.at(-1).id]), String(Object.keys(migrated.steps).length));

const reset = learning.resetTutorialStep(progress, stepId);
check('Step reset clears attempts without resetting entire mission', reset.steps[stepId].attempts === 0 && !reset.steps[stepId].validated && reset.steps[retail.steps[1].id].validated, JSON.stringify(reset.steps[stepId]));

const foreign = { ...progress, caseStudyId: 'different-case' };
const normalizedForeign = learning.normalizeTutorialProgress(foreign, retail);
check('Foreign-case progress is rejected safely', normalizedForeign.caseStudyId === retail.id && learning.tutorialSummary(normalizedForeign, retail).completed === 0, normalizedForeign.caseStudyId);

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` :: ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} V12 tutorial-learning engine tests passed.`);
fs.rmSync(temp, { recursive: true, force: true });
if (failed.length) process.exit(1);
