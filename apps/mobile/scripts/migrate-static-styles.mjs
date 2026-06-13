/**
 * Migre `const styles = StyleSheet.create(...)` module-level vers useThemedStyles dans les composants.
 * Usage: node scripts/migrate-static-styles.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');
const dryRun = process.argv.includes('--dry-run');

const SKIP = new Set([
  'theme/colors.ts',
  'theme/typography.ts',
  'theme/use-themed-styles.ts',
  'theme/STYLES.md',
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

function extractStyleSheetBlocks(src) {
  const blocks = [];
  const re = /const\s+(\w+)\s*=\s*StyleSheet\.create\(\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
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
    let end = i;
    if (src[end] === ')') end++;
    if (src[end] === ';') end++;
    blocks.push({ varName, start, end, body });
  }
  return blocks;
}

function buildFnName(varName) {
  if (varName === 'styles') return 'buildStyles';
  return `build${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
}

function convertBody(body) {
  return body.replace(/\bcolors\./g, 'c.');
}

function findComponentBodies(src) {
  /** @type {{ name: string; bodyStart: number; injectAt: number }[]} */
  const components = [];

  const patterns = [
    /export\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g,
    /export\s+const\s+(\w+)\s*=\s*React\.memo\s*\(\s*function\s+\1\s*\([^)]*\)\s*\{/g,
    /function\s+(\w+Component)\s*\([^)]*\)\s*\{/g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      const injectAt = m.index + m[0].length;
      components.push({ name, injectAt });
    }
  }

  return components;
}

function usesVarInRange(src, varName, start, end) {
  const slice = src.slice(start, end);
  return new RegExp(`\\b${varName}\\.`).test(slice) || new RegExp(`\\b${varName}\\b`).test(slice);
}

function findFunctionEnd(src, openBraceIndex) {
  let depth = 1;
  let i = openBraceIndex + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return i;
}

function migrateFile(filePath) {
  const key = rel(filePath);
  if (SKIP.has(key)) return { key, status: 'skip' };

  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes('useThemedStyles')) return { key, status: 'skip-themed' };
  if (!src.includes('StyleSheet.create')) return { key, status: 'skip-no-ss' };

  const blocks = extractStyleSheetBlocks(src);
  if (blocks.length === 0) return { key, status: 'skip-no-blocks' };

  const hasColors = blocks.some((b) => /\bcolors\./.test(b.body));
  const factories = blocks.map((b) => {
    const fnName = buildFnName(b.varName);
    const converted = convertBody(b.body);
    return {
      ...b,
      fnName,
      factory: `function ${fnName}(c: AppColors) {
  return {${converted}};
}`,
    };
  });

  // Remove StyleSheet.create blocks (reverse order)
  for (const b of [...factories].sort((a, b) => b.start - a.start)) {
    src = src.slice(0, b.start) + src.slice(b.end);
  }

  // Append factories at end
  src = src.trimEnd() + '\n\n' + factories.map((f) => f.factory).join('\n\n') + '\n';

  // Add imports
  if (!src.includes("import type { AppColors }")) {
    const firstImport = src.search(/^import /m);
    const block =
      "import type { AppColors } from '@/theme/colors';\nimport { useThemedStyles } from '@/theme/use-themed-styles';\n";
    src = firstImport >= 0 ? src.slice(0, firstImport) + block + src.slice(firstImport) : block + src;
  } else if (!src.includes('useThemedStyles')) {
    src = src.replace(
      /import type \{ AppColors \} from '@\/theme\/colors';/,
      "import type { AppColors } from '@/theme/colors';\nimport { useThemedStyles } from '@/theme/use-themed-styles';",
    );
  }

  // Remove colors import if only used in styles (keep if used elsewhere)
  if (hasColors) {
    const withoutFactories = src.replace(/function build\w+\(c: AppColors\)[\s\S]*?\n\}/g, '');
    const stillUsesColorsImport =
      /\bcolors\./.test(withoutFactories) ||
      /import\s*\{[^}]*\bcolors\b/.test(withoutFactories);
    if (!stillUsesColorsImport) {
      src = src.replace(/import\s*\{([^}]*)\}\s*from\s*'@\/theme';/g, (full, items) => {
        const kept = items
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== 'colors');
        if (kept.length === 0) return '';
        return `import { ${kept.join(', ')} } from '@/theme';`;
      });
    }
  }

  const components = findComponentBodies(src);
  if (components.length === 0) {
    return { key, status: 'no-component' };
  }

  // Inject hooks (reverse order to preserve indices)
  const sorted = [...components].sort((a, b) => b.injectAt - a.injectAt);
  for (const comp of sorted) {
    const fnEnd = findFunctionEnd(src, comp.injectAt - 1);
    const fnBody = src.slice(comp.injectAt, fnEnd);

    for (const f of factories) {
      if (!usesVarInRange(fnBody, f.varName, 0, fnBody.length)) continue;
      const contextId = `${key.replace(/[^\w]/g, '_')}_${comp.name}_${f.varName}`;
      const hookLine = `  const ${f.varName} = useThemedStyles(${f.fnName}, '${contextId}');\n`;
      if (fnBody.includes(`useThemedStyles(${f.fnName}`)) continue;
      src = src.slice(0, comp.injectAt) + '\n' + hookLine + src.slice(comp.injectAt);
    }
  }

  // Add useAppColors if colors used in JSX after migration
  const jsxUsesColors =
    /\bcolors\./.test(src.replace(/function build\w+\(c: AppColors\)[\s\S]*?\n\}/g, '')) &&
    !src.includes('useAppColors');
  if (jsxUsesColors) {
    if (!src.includes("from '@/theme/use-app-colors'")) {
      src = src.replace(
        /import \{ useThemedStyles \} from '@\/theme\/use-themed-styles';/,
        "import { useThemedStyles } from '@/theme/use-themed-styles';\nimport { useAppColors } from '@/theme/use-app-colors';",
      );
    }
    // Inject c = useAppColors in first component that uses colors in JSX
    for (const comp of [...components].sort((a, b) => a.injectAt - b.injectAt)) {
      const fnEnd = findFunctionEnd(src, comp.injectAt - 1);
      const fnBody = src.slice(comp.injectAt, fnEnd);
      if (/\bcolors\./.test(fnBody) && !fnBody.includes('useAppColors()')) {
        src =
          src.slice(0, comp.injectAt) +
          '\n  const c = useAppColors();\n' +
          src.slice(comp.injectAt);
        // Replace colors. with c. in this function only - simpler: replace all remaining colors. in file outside factories
        break;
      }
    }
    src = src.replace(
      /(?<!function build\w+\(c: AppColors\)[\s\S]{0,500})(?<!\bc\.)\bcolors\./g,
      'c.',
    );
  }

  if (!dryRun) fs.writeFileSync(filePath, src);
  return { key, status: 'migrated', blocks: factories.length };
}

const results = walk(SRC).map(migrateFile);
const migrated = results.filter((r) => r.status === 'migrated');
const failed = results.filter((r) => r.status === 'no-component');

console.log(`Migrated: ${migrated.length}`);
for (const r of migrated) console.log(`  ${r.key} (${r.blocks} block(s))`);
if (failed.length) {
  console.log(`\nNo component (manual): ${failed.length}`);
  failed.forEach((r) => console.log(`  ${r.key}`));
}
if (dryRun) console.log('\n(dry-run — no files written)');
