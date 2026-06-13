/**
 * Migre les 5 fichiers restants (forwardRef ou patterns spéciaux).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  '../src/components/layout/FormScreen.tsx',
  '../src/components/ui/QueryFlatList.tsx',
  '../src/components/ui/InfiniteQueryFlatList.tsx',
  '../src/features/appointments/detail/components/OfferActions.tsx',
  '../src/features/patients/screens/PatientsListScreen.tsx',
];

function extractBlock(src, varName = 'styles') {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*StyleSheet\\.create\\(\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index;
  let depth = 1;
  let i = m.index + m[0].length;
  const bodyStart = i;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  let end = i;
  if (src[end] === ')') end++;
  if (src[end] === ';') end++;
  return { start, end, body: src.slice(bodyStart, i - 1) };
}

for (const rel of FILES) {
  const file = path.join(__dirname, rel);
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('StyleSheet.create')) {
    console.log('skip', rel);
    continue;
  }

  const block = extractBlock(src);
  if (!block) {
    console.log('no block', rel);
    continue;
  }

  const body = block.body.replace(/\bcolors\./g, 'c.');
  src = src.slice(0, block.start) + src.slice(block.end);

  if (!src.includes('useThemedStyles')) {
    const imp =
      "import type { AppColors } from '@/theme/colors';\nimport { useThemedStyles } from '@/theme/use-themed-styles';\n";
    const firstImport = src.search(/^import /m);
    src = src.slice(0, firstImport) + imp + src.slice(firstImport);
  }

  const fnMatch =
    src.match(/export function \w+\([^)]*\)\s*\{/) ??
    src.match(/forwardRef<[^>]+>\(function \w+\([^)]*\)\s*\{/);
  if (!fnMatch) {
    console.log('no fn', rel);
    continue;
  }

  const injectAt = fnMatch.index + fnMatch[0].length;
  src =
    src.slice(0, injectAt) +
    "\n  const styles = useThemedStyles(buildStyles, '" +
    rel.replace(/[^\w]/g, '_') +
    "');" +
    src.slice(injectAt);

  if (/\bcolors\./.test(src.split('function buildStyles')[0]) && !src.includes('useAppColors()')) {
    src = src.replace(
      /const styles = useThemedStyles\(buildStyles[^)]+\);/,
      (m) => `${m}\n  const c = useAppColors();`,
    );
    if (!src.includes('useAppColors')) {
      src = src.replace(
        "import { useThemedStyles } from '@/theme/use-themed-styles';",
        "import { useThemedStyles } from '@/theme/use-themed-styles';\nimport { useAppColors } from '@/theme/use-app-colors';",
      );
    }
    src = src.replace(/\bcolors\./g, 'c.');
    src = src.replace(/import \{ colors(?:,\s*([^}]+))?\} from '@\/theme';/g, (_, rest) =>
      rest ? `import { ${rest.trim()} } from '@/theme';` : '',
    );
  }

  src =
    src.trimEnd() +
    `\n\nfunction buildStyles(c: AppColors) {\n  return {${body}\n};\n}\n`;

  fs.writeFileSync(file, src);
  console.log('migrated', rel);
}
