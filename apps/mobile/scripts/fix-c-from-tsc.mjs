/**
 * Corrige les erreurs TS2304 Cannot find name 'c' en injectant useAppColors().
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const tscOut = execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf8' });
const errors = [...tscOut.matchAll(/^(src\/[^(]+)\((\d+),\d+\): error TS2304: Cannot find name 'c'\./gm)];

const byFile = new Map();
for (const [, file, line] of errors) {
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(Number(line));
}

function lineToFunction(src, lineNum) {
  const lines = src.split('\n');
  let depth = 0;
  let fnStart = -1;
  let fnSig = '';
  for (let i = 0; i < lineNum; i++) {
    const line = lines[i];
    if (/\bfunction\s+\w+\s*\(/.test(line) && !/^function build\w+Styles/.test(line.trim())) {
      if (depth === 0) {
        fnStart = i;
        fnSig = line;
      }
    }
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth === 0 && fnStart >= 0 && i >= lineNum - 1) {
      return { fnStart, fnSig, fnEnd: i };
    }
  }
  // fallback: export function
  for (let i = lineNum - 1; i >= 0; i--) {
    if (/export function \w+/.test(lines[i]) || /function \w+Component/.test(lines[i])) {
      return { fnStart: i, fnSig: lines[i], fnEnd: lineNum + 50 };
    }
  }
  return null;
}

function hasCParam(sig) {
  return /\bc\s*:/.test(sig);
}

function ensureImport(src) {
  if (src.includes("from '@/theme/use-app-colors'")) return src;
  if (src.includes("from '@/theme/use-themed-styles'")) {
    return src.replace(
      "import { useThemedStyles } from '@/theme/use-themed-styles';",
      "import { useThemedStyles } from '@/theme/use-themed-styles';\nimport { useAppColors } from '@/theme/use-app-colors';",
    );
  }
  const fi = src.search(/^import /m);
  return src.slice(0, fi) + "import { useAppColors } from '@/theme/use-app-colors';\n" + src.slice(fi);
}

for (const [rel, lineNums] of byFile) {
  const file = path.join(ROOT, rel.replace(/\//g, path.sep));
  let src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const injectLines = new Set();

  for (const lineNum of lineNums) {
    const fn = lineToFunction(src, lineNum);
    if (!fn) continue;
    if (hasCParam(fn.fnSig)) continue;
    const bodyStart = fn.fnStart + 1;
    const slice = lines.slice(bodyStart, Math.min(bodyStart + 30, lines.length)).join('\n');
    if (slice.includes('const c = useAppColors()')) continue;
    injectLines.add(bodyStart);
  }

  if (injectLines.size === 0) continue;

  const sorted = [...injectLines].sort((a, b) => b - a);
  for (const ln of sorted) {
    lines.splice(ln, 0, '  const c = useAppColors();');
  }
  src = ensureImport(lines.join('\n'));
  fs.writeFileSync(file, src);
  console.log('fixed', rel, 'at lines', sorted.join(','));
}

console.log('done');
