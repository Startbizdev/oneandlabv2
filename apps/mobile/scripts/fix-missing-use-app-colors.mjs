/**
 * Ajoute useAppColors() aux composants qui utilisent c.* en JSX sans hook.
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

for (const file of walk(SRC)) {
  let src = fs.readFileSync(file, 'utf8');
  const jsxPart = src.split(/function build\w+\(c: AppColors\)/)[0];
  if (!/\bc\.(primary|text|surface|error|warning|star|border)/.test(jsxPart)) continue;
  if (jsxPart.includes('useAppColors()')) continue;

  if (!src.includes('useAppColors')) {
    if (src.includes("from '@/theme/use-themed-styles'")) {
      src = src.replace(
        "import { useThemedStyles } from '@/theme/use-themed-styles';",
        "import { useThemedStyles } from '@/theme/use-themed-styles';\nimport { useAppColors } from '@/theme/use-app-colors';",
      );
    } else {
      src = src.replace(
        "import type { AppColors } from '@/theme/colors';",
        "import type { AppColors } from '@/theme/colors';\nimport { useAppColors } from '@/theme/use-app-colors';",
      );
    }
  }

  const hookMatch = src.match(/const styles = useThemedStyles\([^)]+\);/);
  if (hookMatch) {
    const idx = hookMatch.index + hookMatch[0].length;
    src = `${src.slice(0, idx)}\n  const c = useAppColors();${src.slice(idx)}`;
  } else {
    const fnMatch = src.match(/(?:export function|function \w+Component)\s*\w*\([^)]*\)\s*\{/);
    if (!fnMatch) continue;
    const idx = fnMatch.index + fnMatch[0].length;
    src = `${src.slice(0, idx)}\n  const c = useAppColors();${src.slice(idx)}`;
  }

  src = src.replace(/import \{ colors \} from '@\/theme';\n/g, '');
  fs.writeFileSync(file, src);
  console.log('fixed', path.relative(SRC, file));
}
