/**
 * Corrige les injections useAppColors() mal placées par migrate-colors-to-use-app-colors.mjs
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

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;

  // 1. Nom de fonction coupé : export function FooBar\n  const c...\nBaz(
  src = src.replace(
    /((?:export )?(?:function|const \w+ = React\.memo\(function) )(\w+)\n  const c = useAppColors\(\);\n(\w+)/g,
    '$1$2$3',
  );

  // 2. Hook dans les params destructurés : ({ \n  const c = useAppColors();\n  foo,
  src = src.replace(/\(\{\s*\n  const c = useAppColors\(\);\n/g, '({\n');

  // 3. Hook entre params et type : }\n  const c = useAppColors();\n: {
  src = src.replace(/\}\s*\n  const c = useAppColors\(\);\n:/g, '} :');

  // 4. Hook après export function Name({ sans fermer - cas HeaderGradientOrbButton
  src = src.replace(
    /(export function \w+\(\{\s*)const c = useAppColors\(\);\s*\n/g,
    '$1',
  );

  // 5. Ajouter hook au début du corps si colors/c. utilisé en JSX mais pas de hook
  const needsHook =
    /\bc\.(primary|text|surface|error|success|warning|border|star)/.test(
      src.split(/function build\w+\(c: AppColors\)/)[0],
    ) && !src.match(/function \w+[^{]*\{[^}]*useAppColors\(\)/s);

  if (needsHook) {
    const patterns = [
      /export function \w+\([^)]*\)\s*\{/,
      /export const \w+ = React\.memo\(function \w+\([^)]*\)\s*\{/,
      /function \w+Component\([^)]*\)\s*\{/,
    ];
    for (const re of patterns) {
      const m = src.match(re);
      if (m && !src.slice(m.index, m.index + 200).includes('useAppColors()')) {
        const injectAt = m.index + m[0].length;
        src = `${src.slice(0, injectAt)}\n  const c = useAppColors();${src.slice(injectAt)}`;
        break;
      }
    }
  }

  if (src !== orig) {
    fs.writeFileSync(file, src);
    return true;
  }
  return false;
}

let n = 0;
for (const file of walk(SRC)) {
  if (fixFile(file)) {
    n++;
    console.log('fixed', path.relative(SRC, file));
  }
}
console.log(`Done: ${n} files`);
