const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
let postcss;
try { postcss = require('postcss'); }
catch {
  try { postcss = require(path.join(execSync('npm root -g', {encoding:'utf8'}).trim(), 'postcss')); }
  catch { console.error('PostCSS parser is unavailable. Install dependencies or a global postcss package before npm run check:css.'); process.exit(2); }
}
const file = path.join(process.cwd(), 'src/styles.css');
const css = fs.readFileSync(file, 'utf8');
try {
  const root = postcss.parse(css, {from:file});
  let rules = 0;
  root.walkRules(() => rules++);
  console.log(`CSS parse passed: ${rules} rules / ${css.length} characters.`);
} catch (error) {
  console.error(`CSS parse failed: ${error.name || 'Error'}: ${error.reason || error.message}`);
  if (error.line) console.error(`  at ${error.line}:${error.column}`);
  process.exit(1);
}
