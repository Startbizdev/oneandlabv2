/**
 * Remplace colors.* en JSX par useAppColors() → c.*
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

function rel(file) {
  return path.relative(SRC, file).replace(/\\/g, '/');
}

function splitFactories(src) {
  const parts = src.split(/(?=function build\w+\(c: AppColors\))/);
  return parts;
}

for (const file of walk(SRC)) {
  const key = rel(file);
  if (key.startsWith('theme/')) continue;

  let src = fs.readFileSync(file, 'utf8');
  if (!/\bcolors\.(primary|textPrimary|textSecondary|textTertiary|error|success|warning|surface|border)\b/.test(src)) {
    continue;
  }
  if (src.includes('useAppColors')) continue;

  const segments = splitFactories(src);
  const jsxPart = segments[0];
  if (!/\bcolors\./.test(jsxPart)) continue;

  if (!src.includes("from '@/theme/use-app-colors'")) {
    const anchor = src.includes("from '@/theme/use-themed-styles'")
      ? "import { useThemedStyles } from '@/theme/use-themed-styles';"
      : src.match(/^import .+\n/m)?.[0];
    if (src.includes("from '@/theme/use-themed-styles'")) {
      src = src.replace(
        "import { useThemedStyles } from '@/theme/use-themed-styles';",
        "import { useThemedStyles } from '@/theme/use-themed-styles';\nimport { useAppColors } from '@/theme/use-app-colors';",
      );
    } else {
      const firstImport = src.search(/^import /m);
      src =
        src.slice(0, firstImport) +
        "import { useAppColors } from '@/theme/use-app-colors';\n" +
        src.slice(firstImport);
    }
  }

  const fnMatch =
    src.match(/export function \w+[^{]+\{/) ??
    src.match(/export const \w+ = React\.memo\(function \w+[^{]+\{/) ??
    src.match(/function \w+Component[^{]+\{/);
  if (!fnMatch) continue;

  const injectAt = fnMatch.index + fnMatch[0].length;
  src = `${src.slice(0, injectAt)}\n  const c = useAppColors();${src.slice(injectAt)}`;

  const factoryStart = src.indexOf('function build');
  const jsxOnly = factoryStart >= 0 ? src.slice(0, factoryStart) : src;
  const factories = factoryStart >= 0 ? src.slice(factoryStart) : '';

  const fixedJsx = jsxOnly.replace(/\bcolors\./g, 'c.');
  src = fixedJsx + factories;

  src = src.replace(/import \{([^}]*)\bcolors\b,?([^}]*)\} from '@\/theme';/g, (_, a, b) => {
    const items = [a, b]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return '';
    return `import { ${items.join(', ')} } from '@/theme';`;
  });

  fs.writeFileSync(file, src);
  console.log('fixed', key);
}
