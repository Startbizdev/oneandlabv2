/**
 * Convertit les StyleSheet.create({ ... colors.xxx }) en styles thématiques dynamiques.
 * Usage: node scripts/migrate-themed-styles.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const SKIP = new Set([
  'theme/colors.ts',
  'theme/colorblind-palette.ts',
  'theme/tokens.ts',
  'theme/use-themed-styles.ts',
  'theme/use-app-colors.ts',
]);

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
  if (SKIP.has(key)) return false;

  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('StyleSheet.create') || !/\bcolors\./.test(src)) return false;
  if (src.includes('getThemedStyles(') && src.includes('buildStyles')) return false;

  const styleVarRegex = /const\s+(\w+)\s*=\s*StyleSheet\.create\(\s*\{/g;
  const matches = [...src.matchAll(styleVarRegex)];
  if (matches.length === 0) return false;

  const conversions = [];
  for (const m of matches) {
    const varName = m[1];
    const start = m.index;
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    if (src[i] !== ')') continue;
    i++;
    if (src[i] === ';') i++;
    const end = i;
    const body = src.slice(m.index + m[0].length, end - 2);
    if (!/\bcolors\./.test(body)) continue;

    const buildName =
      varName === 'styles' ? 'buildStyles' : `build${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    const id = `${key.replace(/[^\w]/g, '_')}_${varName}`;
    const convertedBody = body.replace(/\bcolors\./g, 'c.');

    conversions.push({
      varName,
      buildName,
      id,
      start,
      end,
      replacement: `function ${buildName}(c: AppColors) {
  return {${convertedBody}};
}

const ${varName} = new Proxy({} as ReturnType<typeof ${buildName}>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('${id}', ${buildName})[prop as keyof ReturnType<typeof ${buildName}>];
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
    const themeImport = src.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme';/);
    if (themeImport) {
      const items = themeImport[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== 'colors');
      if (items.length > 0) {
        src = src.replace(themeImport[0], `import { ${items.join(', ')} } from '@/theme';`);
      } else {
        src = src.replace(themeImport[0], '');
      }
    }
    const firstImport = src.search(/^import /m);
    const importBlock =
      "import type { AppColors } from '@/theme/colors';\nimport { getThemedStyles } from '@/theme/use-themed-styles';\n";
    src = src.slice(0, firstImport) + importBlock + src.slice(firstImport);
  }

  const stripped = src.replace(/function build\w+\(c: AppColors\)\s*\{[\s\S]*?\n\}/g, '');
  if (/\bcolors\./.test(stripped) && !src.match(/import\s*\{[^}]*\bcolors\b/)) {
    const firstImport = src.search(/^import /m);
    src = src.slice(0, firstImport) + "import { colors } from '@/theme';\n" + src.slice(firstImport);
  }

  fs.writeFileSync(file, src);
  return true;
}

const files = walk(SRC);
let count = 0;
for (const file of files) {
  if (migrateFile(file)) {
    count++;
    console.log('migrated', rel(file));
  }
}
console.log(`Done: ${count} files migrated`);
