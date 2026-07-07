#!/usr/bin/env node
/**
 * Remplace Text → AppText dans features/ et components/ (sauf exclusions).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const SKIP = [
  'theme/AppText.tsx',
  'components/ui/MiniDateCalendar.tsx',
  'components/ui/Button.tsx',
  'components/navigation/',
];

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

function shouldSkip(r) {
  return SKIP.some((s) => r.startsWith(s) || r === s);
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  if (!content.includes('<Text') && !content.includes('</Text>')) return false;

  // Animated.Text — ne pas toucher
  if (content.includes('Animated.Text')) return false;

  content = content.replace(/<(\/)Text\b/g, '<$1AppText');
  content = content.replace(/<Text\b/g, '<AppText');

  if (content === original) return false;

  // Import AppText
  if (!content.includes("from '@/theme'") && !content.includes('AppText')) {
    const firstImport = content.match(/^import .+$/m);
    if (firstImport) {
      content = content.replace(firstImport[0], `import { AppText } from '@/theme';\n${firstImport[0]}`);
    }
  } else {
    const themeImport = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme'/);
    if (themeImport && !themeImport[1].includes('AppText')) {
      content = content.replace(
        themeImport[0],
        `import { ${themeImport[1].trim()}, AppText } from '@/theme'`,
      );
    } else if (!themeImport && !content.includes("import { AppText }")) {
      const rnImport = content.match(/import\s*\{([^}]*)\}\s*from\s*'react-native'/);
      if (rnImport) {
        let specs = rnImport[1];
        if (/\bText\b/.test(specs)) {
          specs = specs
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== 'Text' && s.length > 0)
            .join(', ');
          const replacement = specs
            ? `import { ${specs} } from 'react-native'`
            : '';
          content = content.replace(rnImport[0], replacement);
          if (replacement) {
            content = content.replace(replacement, `import { AppText } from '@/theme';\n${replacement}`);
          } else {
            content = content.replace(rnImport[0], `import { AppText } from '@/theme';`);
          }
        } else {
          const firstImport = content.match(/^import .+$/m);
          content = content.replace(firstImport[0], `import { AppText } from '@/theme';\n${firstImport[0]}`);
        }
      }
    }
  }

  // Retirer Text de react-native si plus utilisé
  content = content.replace(/import\s*\{([^}]*)\}\s*from\s*'react-native'/g, (full, specs) => {
    if (!/\bText\b/.test(specs)) return full;
    const next = specs
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== 'Text' && s.length > 0)
      .join(', ');
    return next ? `import { ${next} } from 'react-native'` : '';
  });

  // Nettoyer doubles lignes vides après import supprimé
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(filePath, content);
  return true;
}

let count = 0;
for (const file of walk(SRC)) {
  const r = rel(file);
  if (shouldSkip(r)) continue;
  if (!r.startsWith('features/') && !r.startsWith('components/')) continue;
  if (migrateFile(file)) {
    count++;
    console.log('Migrated:', r);
  }
}
console.log(`\nDone: ${count} files migrated to AppText.`);
