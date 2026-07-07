#!/usr/bin/env node
/**
 * Migration one-shot : size={N} → size={iconSize.*}
 * Usage: node scripts/migrate-icon-sizes.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

/** Map pixel value → iconSize token key */
const SIZE_TO_TOKEN = {
  11: '2xs',
  12: '2xs',
  13: 'xs',
  14: 'xs',
  15: 'xs',
  16: 'sm',
  18: 'mdSm',
  20: 'md',
  22: 'mdLg',
  24: 'lg',
  28: 'xl',
  32: '2xl',
  36: '3xl',
  40: '4xl',
  48: '5xl',
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, files);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const matches = [...content.matchAll(/size=\{(\d+)\}/g)];
  if (matches.length === 0) return false;

  const tokensUsed = new Set();
  for (const [, num] of matches) {
    const px = Number(num);
    const token = SIZE_TO_TOKEN[px];
    if (!token) {
      console.warn(`  SKIP unmapped size=${px} in ${path.relative(SRC, filePath)}`);
      continue;
    }
    tokensUsed.add(token);
    const replacement = token === '2xs' ? "size={iconSize['2xs']}" : `size={iconSize.${token}}`;
    content = content.replace(new RegExp(`size=\\{${px}\\}`, 'g'), replacement);
  }

  if (content === original) return false;

  if (!content.includes('iconSize')) return false;

  const hasIconImport = /import\s*\{[^}]*\biconSize\b/.test(content);
  if (!hasIconImport) {
    const themeImport = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme'/);
    if (themeImport) {
      if (!themeImport[1].includes('iconSize')) {
        content = content.replace(
          themeImport[0],
          `import {${themeImport[1].trim()}, iconSize } from '@/theme'`,
        );
      }
    } else {
      const firstImport = content.match(/^import .+$/m);
      const importLine = "import { iconSize } from '@/theme';\n";
      if (firstImport) {
        content = content.replace(firstImport[0], `${importLine}${firstImport[0]}`);
      } else {
        content = importLine + content;
      }
    }
  }

  fs.writeFileSync(filePath, content);
  return true;
}

let count = 0;
for (const file of walk(SRC)) {
  if (migrateFile(file)) {
    count++;
    console.log('Updated:', path.relative(SRC, file));
  }
}
console.log(`\nDone: ${count} files updated.`);
