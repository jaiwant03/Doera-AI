import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('git grep -l "logger"', { encoding: 'utf8' }).trim().split(/\r?\n/);
for (const f of files) {
  if (!f.endsWith('.js') && !f.endsWith('.mjs')) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  let hasImport = false;
  lines.forEach((l) => {
    if (l.includes('logger') && (l.includes('import') || l.includes('require') || l.includes('const logger') || l.includes('let logger'))) {
      hasImport = true;
    }
  });
  if (!hasImport && f !== 'backend/src/utils/logger.js') {
    console.log('NO IMPORT IN:', f);
  }
}
console.log('Done checking all files.');
