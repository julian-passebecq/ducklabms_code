import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('src/App.tsx');
const curriculum = read('src/data/curriculum.ts');
const cases = read('src/data/caseStudies.ts');
const requiredRoutes = ['toolchoice','practice','challenge','dbt','airflow','recovery','lakehouse','runtime','realtime','governance','deployment','copyjob','dbx-home','dbx-notebook','dbx-catalog','dbx-compute','dbx-streaming','dbx-pipelines','dbx-jobs','dbx-sql','dbx-monitor','dbx-adf-integration'];
const missing = requiredRoutes.filter((r) => !app.includes(`case '${r}'`));
const counts = {
  fabricModules: (curriculum.match(/product: 'Fabric'/g) || []).length,
  databricksModules: (curriculum.match(/product: 'Azure Databricks'/g) || []).length,
  adfModules: (curriculum.match(/product: 'Azure Data Factory'/g) || []).length,
  caseStudies: ((cases.match(/export const caseStudies: CaseStudy\[\] = \[([\s\S]*?)\n\];/)?.[1] || '').match(/^  \{/gm) || []).length
};
console.log(JSON.stringify({ missingRoutes: missing, counts }, null, 2));
if (missing.length || counts.fabricModules !== 16 || counts.databricksModules !== 9 || counts.adfModules !== 2 || counts.caseStudies !== 3) process.exit(1);
console.log('STATIC_QA_PASS');
