#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const REPLACEMENTS = [
  [/fontSize:\s*9\b/g, "fontSize: fontSize['2xs']"],
  [/fontSize:\s*10\b/g, "fontSize: fontSize['2xs']"],
  [/fontSize:\s*14\b/g, 'fontSize: fontSize.xs'],
  [/fontSize:\s*18\b/g, 'fontSize: fontSize.md'],
  [/fontSize:\s*20\b/g, 'fontSize: fontSize.lg'],
  [/fontSize:\s*22\b/g, 'fontSize: fontSize.xl'],
  [/fontSize:\s*24\b/g, "fontSize: fontSize['2xl']"],
  [/fontSize:\s*40\b/g, "fontSize: fontSize['4xl']"],
  [/fontSize:\s*56\b/g, "fontSize: fontSize['5xl']"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, files);
    } else if (/\.tsx$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function ensureFontSizeImport(content) {
  if (/\bfontSize\b/.test(content.match(/^import .+$/gm)?.join('\n') ?? '')) {
    if (/from '@\/theme'/.test(content) && /import\s*\{[^}]*fontSize/.test(content)) return content;
    if (/from '@\/theme\/typography'/.test(content)) return content;
  }
  const themeImport = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme'/);
  if (themeImport && !themeImport[1].includes('fontSize')) {
    return content.replace(themeImport[0], `import { ${themeImport[1].trim()}, fontSize } from '@/theme'`);
  }
  const typoImport = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme\/typography'/);
  if (typoImport && !typoImport[1].includes('fontSize')) {
    return content.replace(typoImport[0], `import { ${typoImport[1].trim()}, fontSize } from '@/theme/typography'`);
  }
  const firstImport = content.match(/^import .+$/m);
  const line = "import { fontSize } from '@/theme';\n";
  return firstImport ? content.replace(firstImport[0], `${line}${firstImport[0]}`) : line + content;
}

let count = 0;
for (const file of walk(SRC)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  for (const [re, rep] of REPLACEMENTS) {
    content = content.replace(re, rep);
  }
  if (content === original) continue;
  content = ensureFontSizeImport(content);
  fs.writeFileSync(file, content);
  count++;
  console.log('Updated:', path.relative(SRC, file));
}
console.log(`\nDone: ${count} files.`);
