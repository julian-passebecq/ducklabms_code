import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/App.jsx',
  'src/styles.css',
  'src/data/curriculum.js',
  'src/components/PowerBIDesktop.jsx',
  'src/components/DaxLab.jsx',
  'src/components/CaseStudies.jsx',
  'src/components/TroubleshootingCenter.jsx',
];
let failed = false;
for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full) || fs.statSync(full).size < 200) {
    console.error(`Missing or unexpectedly small: ${file}`);
    failed = true;
  }
}
const curriculum = fs.readFileSync(path.join(root, 'src/data/curriculum.js'), 'utf8');
for (const term of ['Power Query', 'CALCULATE', 'DirectQuery', 'Direct Lake', 'gateway', 'visual calculations', 'user-defined functions', 'TMDL', 'Copilot', 'Direct Lake calculated columns']) {
  if (!curriculum.toLowerCase().includes(term.toLowerCase())) {
    console.error(`Curriculum missing expected topic: ${term}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('Content checks passed.');
