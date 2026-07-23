// Runs ESLint with JSON output and re-emits results as GitHub Actions
// annotations (::error/::warning workflow commands), so failures are visible
// as check-run annotations even without log access. Exits 1 on any error.
import { spawnSync } from 'node:child_process';

const res = spawnSync('npx', ['eslint', '.', '-f', 'json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let results = [];
try {
  results = JSON.parse(res.stdout || '[]');
} catch {
  console.error('eslint did not produce JSON output:');
  console.error(res.stdout?.slice(0, 4000));
  console.error(res.stderr?.slice(0, 4000));
  process.exit(2);
}

let errors = 0, warnings = 0;
for (const file of results) {
  for (const m of file.messages) {
    const rel = file.filePath.replace(process.cwd() + '/', 'packages/web/');
    const kind = m.severity === 2 ? 'error' : 'warning';
    if (m.severity === 2) errors++; else warnings++;
    const msg = `${m.message} (${m.ruleId ?? 'fatal'})`.replace(/\r?\n/g, ' ');
    console.log(`::${kind} file=${rel},line=${m.line ?? 1},col=${m.column ?? 1}::${msg}`);
    console.log(`${rel}:${m.line}:${m.column} ${kind} ${msg}`);
  }
}
console.log(`\nlint summary: ${errors} errors, ${warnings} warnings`);
if (res.error) { console.error(res.error); process.exit(2); }
process.exit(errors > 0 ? 1 : 0);
