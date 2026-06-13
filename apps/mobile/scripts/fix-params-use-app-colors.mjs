/**
 * Corrige `function Foo({ const c = useAppColors(); bar }: Props)` → params + hook corps.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

const RE =
  /((?:export )?function \w+\(\{\s*)const c = useAppColors\(\);\s*([^}]+)\}(\s*:\s*[^)]+\)\s*\{)/g;

for (const file of walk(SRC)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!RE.test(src)) continue;
  RE.lastIndex = 0;
  src = src.replace(RE, '$1$2}$3\n  const c = useAppColors();');
  fs.writeFileSync(file, src);
  console.log('fixed', path.relative(SRC, file));
}

// TabItem needs hook too
const tabBar = path.join(SRC, 'components/navigation/TabBar.tsx');
let tb = fs.readFileSync(tabBar, 'utf8');
if (!tb.includes('function TabItem') || !tb.match(/function TabItem[\s\S]*?useAppColors/)) {
  tb = tb.replace(
    /(function TabItem\(\{[\s\S]*?\}\) \{\n)/,
    '$1  const c = useAppColors();\n',
  );
  fs.writeFileSync(tabBar, tb);
  console.log('fixed TabItem hook');
}

console.log('done');
