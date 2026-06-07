/** Fix Proxy style typings after themed-styles migration */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

let fixed = 0;
for (const file of walk(SRC)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('getThemedStyles')) continue;
  const orig = src;

  src = src.replace(
    /new Proxy\(\{\} as ReturnType<typeof (build\w+)>/g,
    'new Proxy({} as Record<string, unknown>',
  );
  src = src.replace(
    /\[prop as keyof ReturnType<typeof build\w+>\]/g,
    '[prop]',
  );

  if (src !== orig) {
    fs.writeFileSync(file, src);
    fixed++;
  }
}
console.log(`Fixed proxy types in ${fixed} files`);
