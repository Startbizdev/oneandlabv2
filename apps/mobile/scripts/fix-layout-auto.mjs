/**
 * Insère minWidth: 0 dans les objets de style violant lint:layout.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const EXEMPT = [
  'theme/',
  'components/layout/primitives.tsx',
  'components/ui/Button.tsx',
];

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

function enclosingObjectRange(src, idx) {
  let depth = 0;
  let start = -1;
  for (let i = idx; i >= 0; i--) {
    const ch = src[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;
  let d = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') {
      d--;
      if (d === 0) return { start, end: i + 1, text: src.slice(start, i + 1) };
    }
  }
  return null;
}

function insertMinWidth(objText) {
  if (/minWidth\s*:/.test(objText)) return objText;
  const brace = objText.indexOf('{');
  if (brace === -1) return objText;
  const after = objText.slice(brace + 1);
  const indentMatch = after.match(/\n(\s+)\S/);
  const indent = indentMatch ? indentMatch[1] : '    ';
  return `${objText.slice(0, brace + 1)}\n${indent}minWidth: 0,${after}`;
}

const RE_FLEX = /\bflex(?:Shrink|Grow)?:\s*1\b/g;
const RE_ROW = /flexDirection:\s*['"]row['"]/g;

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  const ranges = new Map();

  for (const re of [RE_FLEX, RE_ROW]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const obj = enclosingObjectRange(src, m.index);
      if (obj && !/minWidth\s*:/.test(obj.text)) {
        ranges.set(obj.start, obj);
      }
    }
  }

  if (ranges.size === 0) return false;

  const sorted = [...ranges.values()].sort((a, b) => b.start - a.start);
  for (const obj of sorted) {
    const fixed = insertMinWidth(obj.text);
    src = src.slice(0, obj.start) + fixed + src.slice(obj.end);
  }

  fs.writeFileSync(filePath, src);
  return true;
}

let count = 0;
for (const file of walk(SRC)) {
  const r = rel(file);
  if (EXEMPT.some((e) => r.startsWith(e) || r === e)) continue;
  if (fixFile(file)) {
    count++;
    console.log('Fixed:', r);
  }
}
console.log(`\nDone: ${count} files fixed.`);
