/**
 * Migrate StyleSheet.create({ colors.* }) → getThemedStyles proxy (semantic colors only).
 * Usage: node scripts/migrate-themed-styles-v3.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const SEMANTIC = /colors\.(success|error|warning|status|primary)/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function rel(file) {
  return path.relative(SRC, file).replace(/\\/g, '/');
}

function migrateFile(file) {
  const key = rel(file);
  if (key.startsWith('theme/')) return false;

  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('StyleSheet.create') || !SEMANTIC.test(src)) return false;
  if (src.includes('getThemedStyles(')) return false;

  const styleVarRegex = /const\s+(\w+)\s*=\s*StyleSheet\.create\(\s*\{/g;
  const matches = [...src.matchAll(styleVarRegex)];
  if (matches.length === 0) return false;

  const conversions = [];
  for (const m of matches) {
    const varName = m[1];
    const start = m.index;
    let depth = 1;
    let i = m.index + m[0].length;
    const bodyStart = i;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(bodyStart, i - 1);
    if (!SEMANTIC.test(body)) continue;

    let end = i;
    if (src[end] === ')') end++;
    if (src[end] === ';') end++;

    const buildName =
      varName === 'styles' ? 'buildStyles' : `build${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    const id = `${key.replace(/[^\w]/g, '_')}_${varName}`;
    const convertedBody = body.replace(/\bcolors\./g, 'c.');

    conversions.push({
      start,
      end,
      varName,
      buildName,
      id,
      replacement: `function ${buildName}(c: AppColors) {
  return {${convertedBody}};
}

const ${varName} = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('${id}', ${buildName})[prop];
    }
    return undefined;
  },
});`,
    });
  }

  if (conversions.length === 0) return false;

  conversions.sort((a, b) => b.start - a.start);
  for (const c of conversions) {
    src = src.slice(0, c.start) + c.replacement + src.slice(c.end);
  }

  if (!src.includes("import type { AppColors }")) {
    const firstImport = src.search(/^import /m);
    src =
      src.slice(0, firstImport) +
      "import type { AppColors } from '@/theme/colors';\nimport { getThemedStyles } from '@/theme/use-themed-styles';\n" +
      src.slice(firstImport);
  }

  const stripped = src.replace(/function build\w+\(c: AppColors\)[\s\S]*?\n\}/g, '');
  if (/\bcolors\./.test(stripped) && !src.match(/import\s*\{[^}]*\bcolors\b/)) {
    const firstImport = src.search(/^import /m);
    src = src.slice(0, firstImport) + "import { colors } from '@/theme';\n" + src.slice(firstImport);
  }

  fs.writeFileSync(file, src);
  return true;
}

let count = 0;
for (const file of walk(SRC)) {
  if (migrateFile(file)) {
    count++;
    console.log('migrated', rel(file));
  }
}
console.log(`Done: ${count} files`);
