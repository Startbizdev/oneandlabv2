/**
 * Correctif mécanique SÛR : injecte `minWidth: 0` dans chaque objet de style qui
 * contient `flex:1` / `flexShrink` / `flexGrow` / `flexDirection:'row'` sans `minWidth`.
 *
 * Pourquoi c'est sûr : `minWidth: 0` est purement additif. Il n'élargit ni ne déplace
 * jamais un élément ; il autorise seulement un item flex à rétrécir sous sa largeur
 * intrinsèque. Au pire il ne fait rien, au mieux il corrige un débordement.
 *
 * Idempotent : ne réinsère pas si `minWidth` est déjà présent dans l'objet.
 *
 * Usage :
 *   node scripts/fix-layout-minwidth.mjs --dry   # aperçu (compte les insertions)
 *   node scripts/fix-layout-minwidth.mjs         # applique
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');
const DRY = process.argv.includes('--dry');

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

/** Retourne {start,end} du plus petit objet `{...}` englobant idx. */
function enclosingObject(src, idx) {
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
      if (d === 0) return { start, end: i };
    }
  }
  return null;
}

const RE = /\bflex(?:Shrink|Grow)?:\s*1\b|flexDirection:\s*['"]row['"]/g;

function transform(src) {
  const starts = new Set();
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(src)) !== null) {
    const obj = enclosingObject(src, m.index);
    if (!obj) continue;
    const text = src.slice(obj.start, obj.end + 1);
    if (/minWidth\s*:/.test(text)) continue;
    starts.add(obj.start);
  }

  if (starts.size === 0) return { src, count: 0 };

  // Insérer du plus grand index au plus petit pour ne pas décaler les positions.
  const ordered = [...starts].sort((a, b) => b - a);
  let out = src;
  for (const start of ordered) {
    const after = out.slice(start + 1);
    // Indentation : reproduire celle de la 1re propriété (ligne suivante non vide).
    const nlMatch = after.match(/^\s*\n([ \t]*)\S/);
    if (nlMatch) {
      const indent = nlMatch[1];
      out = out.slice(0, start + 1) + `\n${indent}minWidth: 0,` + after;
    } else {
      out = out.slice(0, start + 1) + ` minWidth: 0,` + after;
    }
  }
  return { src: out, count: starts.size };
}

const files = walk(SRC).filter((f) => {
  const r = rel(f);
  return !EXEMPT.some((e) => r.startsWith(e) || r === e);
});

let totalFiles = 0;
let totalInsertions = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const { src: next, count } = transform(src);
  if (count > 0) {
    totalFiles++;
    totalInsertions += count;
    if (!DRY) fs.writeFileSync(file, next);
    console.log(`${DRY ? '[dry] ' : ''}${rel(file)} : +${count} minWidth:0`);
  }
}

console.log(
  `\n${DRY ? 'À insérer' : 'Inséré'} : ${totalInsertions} minWidth:0 dans ${totalFiles} fichier(s).`,
);
