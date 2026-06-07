/** Revert themed-styles codemod back to StyleSheet.create + colors proxy. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function revertFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('getThemedStyles')) return false;

  const blockRegex =
    /function (build\w+)\(c: AppColors\) \{\s*\n\s*return \{([\s\S]*?)\};\s*\n\}\s*\n\s*const (\w+) = new Proxy\([\s\S]*?\n\}\);/g;

  let changed = false;
  src = src.replace(blockRegex, (_match, _buildName, body, varName) => {
    changed = true;
    const converted = body.replace(/\bc\./g, 'colors.');
    return `const ${varName} = StyleSheet.create({${converted}});`;
  });

  if (!changed) return false;

  src = src.replace(
    /import type \{ AppColors \} from '@\/theme\/colors';\nimport \{ getThemedStyles \} from '@\/theme\/use-themed-styles';\n/g,
    '',
  );

  if (/\bcolors\./.test(src) && !src.match(/import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*'@\/theme'/)) {
    const themeImport = src.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme';/);
    if (themeImport) {
      const items = themeImport[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!items.includes('colors')) items.unshift('colors');
      src = src.replace(themeImport[0], `import { ${items.join(', ')} } from '@/theme';`);
    } else {
      const firstImport = src.search(/^import /m);
      src = src.slice(0, firstImport) + "import { colors } from '@/theme';\n" + src.slice(firstImport);
    }
  }

  if (!src.includes('StyleSheet')) {
    const firstImport = src.search(/^import /m);
    src =
      src.slice(0, firstImport) +
      "import { StyleSheet } from 'react-native';\n" +
      src.slice(firstImport);
  } else if (!src.match(/import\s*\{[^}]*StyleSheet/)) {
    const rnImport = src.match(/import\s*\{([^}]+)\}\s*from\s*'react-native';/);
    if (rnImport && !rnImport[1].includes('StyleSheet')) {
      src = src.replace(rnImport[0], `import { ${rnImport[1].trim()}, StyleSheet } from 'react-native';`);
    }
  }

  fs.writeFileSync(file, src);
  return true;
}

let count = 0;
for (const file of walk(SRC)) {
  if (revertFile(file)) {
    count++;
    console.log('reverted', path.relative(SRC, file));
  }
}
console.log(`Reverted ${count} files`);
