/**
 * Migre `const styles = new Proxy(... getThemedStyles ...)` vers `useThemedStyles` dans le composant exporté.
 * Usage: node scripts/migrate-proxy-styles.mjs [--dry-run]
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
  'features/appointments/detail/components/layout/rdv-detail-section-styles.ts',
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

const PROXY_RE =
  /const styles = new Proxy\([\s\S]*?getThemedStyles\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)[\s\S]*?\}\s*,\s*\}\s*\)\s*;?\s*$/m;

function migrateFile(filePath) {
  const r = rel(filePath);
  if (SKIP.has(r)) return { r, status: 'skip' };

  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('new Proxy') || !src.includes('getThemedStyles')) {
    return { r, status: 'skip' };
  }

  const proxyMatch = src.match(PROXY_RE);
  if (!proxyMatch) {
    return { r, status: 'no-match' };
  }

  const [, contextId, factoryName] = proxyMatch;
  src = src.replace(PROXY_RE, '');

  if (!src.includes('useThemedStyles')) {
    if (src.includes("from '@/theme/use-themed-styles'")) {
      src = src.replace(
        /import \{ getThemedStyles(?:,\s*([^}]+))?\} from '@\/theme\/use-themed-styles';/,
        (m, rest) => {
          const extra = rest ? `, ${rest.trim()}` : '';
          if (rest?.includes('useThemedStyles')) return m;
          return `import { useThemedStyles${extra ? `, ${rest.trim()}` : ''} } from '@/theme/use-themed-styles';`;
        },
      );
      if (!src.includes('useThemedStyles')) {
        src = src.replace(
          "import { getThemedStyles } from '@/theme/use-themed-styles';",
          "import { useThemedStyles } from '@/theme/use-themed-styles';",
        );
      }
    } else {
      src = src.replace(
        /^(import .+\n)/m,
        `$1import { useThemedStyles } from '@/theme/use-themed-styles';\n`,
      );
    }
  }

  src = src.replace(
    /import \{ getThemedStyles(?:,\s*useThemedStyles)?(?:,\s*)?\} from '@\/theme\/use-themed-styles';/,
    "import { useThemedStyles } from '@/theme/use-themed-styles';",
  );
  src = src.replace(
    /import \{ useThemedStyles,\s*getThemedStyles \} from '@\/theme\/use-themed-styles';/,
    "import { useThemedStyles } from '@/theme/use-themed-styles';",
  );

  const exportFnRe = /export function (\w+)\([^)]*\)\s*\{/;
  const exportMatch = src.match(exportFnRe);
  if (!exportMatch) {
    return { r, status: 'no-export-fn' };
  }

  const fnName = exportMatch[1];
  const insertRe = new RegExp(`(export function ${fnName}\\([^)]*\\)\\s*\\{)`);
  if (src.includes(`useThemedStyles(${factoryName}`)) {
    return { r, status: 'already-migrated' };
  }

  src = src.replace(
    insertRe,
    `$1\n  const styles = useThemedStyles(${factoryName}, '${contextId}');`,
  );

  if (!dryRun) fs.writeFileSync(filePath, src);
  return { r, status: 'migrated', fnName, contextId };
}

const files = walk(SRC);
const results = files.map(migrateFile).filter((x) => x.status !== 'skip');

const migrated = results.filter((x) => x.status === 'migrated');
const failed = results.filter((x) => !['migrated', 'skip', 'already-migrated'].includes(x.status));

console.log(`Migrated: ${migrated.length}${dryRun ? ' (dry-run)' : ''}`);
for (const m of migrated) console.log(`  ✓ ${m.r}`);

if (failed.length) {
  console.log(`\nNeeds manual review: ${failed.length}`);
  for (const f of failed) console.log(`  ? ${f.r} (${f.status})`);
}
