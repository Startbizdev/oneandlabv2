/**
 * Échoue si un factory useThemedStyles / getThemedStyles contient `return StyleSheet.create`.
 * Usage: node scripts/lint-themed-styles.mjs
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
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function rel(file) {
  return path.relative(SRC, file).replace(/\\/g, '/');
}

/** Détecte return StyleSheet.create dans une function build*Styles. */
function findViolations(src, file) {
  if (!src.includes('useThemedStyles') && !src.includes('getThemedStyles')) return [];

  const violations = [];
  const fnRegex = /function\s+(build\w*Styles)\s*\([^)]*\)\s*\{/g;
  let match;

  while ((match = fnRegex.exec(src)) !== null) {
    const fnName = match[1];
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(bodyStart, i - 1);
    if (/return\s+StyleSheet\.create\s*\(/.test(body)) {
      violations.push({ file, fnName });
    }
  }

  return violations;
}

const files = walk(SRC);
const all = files.flatMap((file) => findViolations(fs.readFileSync(file, 'utf8'), rel(file)));

if (all.length > 0) {
  console.error('themed-styles: buildStyles must return plain objects, not StyleSheet.create:\n');
  for (const v of all) {
    console.error(`  ${v.file} → ${v.fnName}()`);
  }
  console.error(
    '\nFix: replace `return StyleSheet.create({ ... })` with `return { ... }` in build*Styles.',
  );
  console.error('useThemedStyles / getThemedStyles already call StyleSheet.create once.\n');
  process.exit(1);
}

console.log('themed-styles: OK (no double StyleSheet.create in themed factories)');

/** Avertit colors.primary dans les composants sans useAppColors (phase warning). */
const COLOR_WARN = process.argv.includes('--strict-colors');
const colorViolations = [];

for (const file of files) {
  const r = rel(file);
  if (!r.endsWith('.tsx')) continue;
  if (r.startsWith('theme/')) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!/\bcolors\.(primary|textPrimary|textSecondary)\b/.test(src)) continue;
  if (src.includes('useAppColors')) continue;
  colorViolations.push(r);
}

if (colorViolations.length > 0) {
  const msg = `themed-styles: ${colorViolations.length} file(s) use colors.* without useAppColors()`;
  if (COLOR_WARN) {
    console.error(msg + ':\n');
    for (const v of colorViolations) console.error(`  ${v}`);
    process.exit(1);
  } else {
    console.warn(msg + ' (run with --strict-colors to fail)');
  }
}
