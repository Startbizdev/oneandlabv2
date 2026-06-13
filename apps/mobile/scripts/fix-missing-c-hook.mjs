/**
 * Ajoute useAppColors() là où c.* est utilisé sans déclaration.
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

function hasCParam(sig) {
  return /\(\s*[^)]*\bc\s*:/.test(sig);
}

function findAllFunctions(src) {
  const blocks = [];
  const re = /\bfunction\s+(\w+)\s*(\([^)]*\))\s*(?::[^{]+)?\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    blocks.push({ name: m[1], sig: m[2], bodyStart, bodyEnd: i - 1 });
  }
  return blocks;
}

function usesC(body) {
  return /\bc\.(primary|text|surface|error|success|warning|border|star|background|primaryLight|textInverse|textTertiary|textSecondary|textPrimary|primaryDark|errorLight|successLight|warningLight|surfaceAlt|surfaceSubtle)/.test(
    body,
  );
}

function ensureImport(src) {
  if (src.includes("from '@/theme/use-app-colors'")) return src;
  if (src.includes("from '@/theme/use-themed-styles'")) {
    return src.replace(
      "import { useThemedStyles } from '@/theme/use-themed-styles';",
      "import { useThemedStyles } from '@/theme/use-themed-styles';\nimport { useAppColors } from '@/theme/use-app-colors';",
    );
  }
  const fi = src.search(/^import /m);
  return src.slice(0, fi) + "import { useAppColors } from '@/theme/use-app-colors';\n" + src.slice(fi);
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;

  // Seulement les factories StyleSheet en fin de fichier
  const factoryIdx = src.search(/^function build\w+Styles\(c: AppColors\)/m);
  const scanEnd = factoryIdx >= 0 ? factoryIdx : src.length;
  const scan = src.slice(0, scanEnd);

  if (!/\bc\./.test(scan)) return false;

  const blocks = findAllFunctions(scan)
    .filter((b) => !/^build\w+Styles$/.test(b.name) && !hasCParam(b.sig))
    .sort((a, b) => b.bodyStart - a.bodyStart);

  for (const b of blocks) {
    const body = src.slice(b.bodyStart, b.bodyEnd);
    if (!usesC(body)) continue;
    if (/const c = useAppColors\(\)/.test(body)) continue;
    src = src.slice(0, b.bodyStart) + '\n  const c = useAppColors();' + src.slice(b.bodyStart);
  }

  // Composants exportés génériques : export function Foo<T>(...) {
  const exportRe = /export function (\w+)[^{]+\{/g;
  let em;
  const exportFixes = [];
  while ((em = exportRe.exec(scan)) !== null) {
    const bodyStart = em.index + em[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < scan.length && depth > 0) {
      if (scan[i] === '{') depth++;
      else if (scan[i] === '}') depth--;
      i++;
    }
    const body = src.slice(bodyStart, i - 1);
    if (usesC(body) && !/const c = useAppColors\(\)/.test(body)) {
      exportFixes.push(bodyStart);
    }
  }
  for (const pos of [...new Set(exportFixes)].sort((a, b) => b - a)) {
    src = src.slice(0, pos) + '\n  const c = useAppColors();' + src.slice(pos);
  }

  if (src !== orig) {
    src = ensureImport(src);
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
