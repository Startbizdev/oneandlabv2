/**
 * Nettoie toutes les injections useAppColors() puis les réinsère correctement.
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
  if (!src.includes('useAppColors')) return false;
  const orig = src;

  // Réparer imports / identifiants coupés par l'injection
  src = src.replace(
    /from '@\/([^\n']*)\n  const c = useAppColors\(\);\n([^'\n]*')/g,
    "from '@/$1$2",
  );
  src = src.replace(
    /(const \w+ = [^\n;]*)\n  const c = useAppColors\(\);\n(\w+)/g,
    '$1$2',
  );
  src = src.replace(
    /((?:export )?(?:function|const \w+ = React\.memo\(function) )(\w+)\n  const c = useAppColors\(\);\n(\w+)/g,
    '$1$2$3',
  );
  src = src.replace(/\(\{\s*\n  const c = useAppColors\(\);\n/g, '({\n');
  src = src.replace(/\(\{\s*const c = useAppColors\(\);\s*\n/g, '({\n');
  src = src.replace(/\}\s*\n  const c = useAppColors\(\);\n:/g, '} :');

  // Supprimer toutes les lignes hook
  src = src.replace(/\n  const c = useAppColors\(\);\n/g, '\n');

  // Réinsérer dans les fonctions qui utilisent c. en JSX (hors factories)
  const factoryIdx = src.indexOf('function build');
  const jsxPart = factoryIdx >= 0 ? src.slice(0, factoryIdx) : src;
  if (!/\bc\.(primary|text|surface|error|success|warning|border|star|background)/.test(jsxPart)) {
    if (src !== orig) fs.writeFileSync(file, src);
    return src !== orig;
  }

  const fnRegex =
    /(?:export function \w+\([^)]*\)\s*\{|export const \w+ = React\.memo\(function \w+\([^)]*\)\s*\{|function \w+Component\([^)]*\)\s*\{|function \w+\(\{[\s\S]*?\}\s*:\s*\w+\)\s*\{)/g;

  let match;
  const inserts = [];
  while ((match = fnRegex.exec(src)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(start, i - 1);
    if (/\bc\.(primary|text|surface|error|success|warning|border|star|background)/.test(body)) {
      inserts.push(start);
    }
  }

  for (const pos of [...inserts].sort((a, b) => b - a)) {
    src = `${src.slice(0, pos)}\n  const c = useAppColors();${src.slice(pos)}`;
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
console.log(`Done: ${n}`);
