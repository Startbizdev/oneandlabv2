/**
 * Détecteur d'anti-patterns de layout flexbox (cause racine des UI qui cassent).
 *
 * Catégorie A — flex sans minWidth:0 :
 *   un objet de style contient `flex: 1` / `flexShrink` / `flexGrow` mais pas `minWidth`.
 *   => l'item ne rétrécit pas → déborde / pousse les voisins hors de la carte.
 *
 * Catégorie B — row sans garde-fou :
 *   un objet contient `flexDirection: 'row'` mais pas `minWidth: 0`.
 *   => le conteneur garde la largeur intrinsèque de son contenu → overflow.
 *
 * Rapport indicatif, non bloquant (aucun code de sortie en échec).
 *
 * Usage :
 *   node scripts/lint-layout.mjs            # rapport complet
 *   node scripts/lint-layout.mjs --summary  # compteurs seulement
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const SUMMARY = process.argv.includes('--summary');

/** Fichiers/dossiers exemptés : ce sont les primitives et le moteur de thème. */
const EXEMPT = [
  'theme/',
  'components/layout/primitives.tsx',
  'components/ui/Button.tsx', // bouton : contenu centré, pas de colonne de texte flexible
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

function lineAt(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

/** Plus petit objet `{...}` englobant l'index donné. */
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
      if (d === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

const RE_FLEX = /\bflex(?:Shrink|Grow)?:\s*1\b/g;
const RE_ROW = /flexDirection:\s*['"]row['"]/g;

function findViolations(src, file) {
  const r = rel(file);
  const out = { file: r, A: [], B: [] };

  let m;
  RE_FLEX.lastIndex = 0;
  while ((m = RE_FLEX.exec(src)) !== null) {
    const obj = enclosingObject(src, m.index);
    if (obj && !/minWidth\s*:/.test(obj)) {
      // Ignore les boutons/centrés purs (justifyContent center sans contenu texte flex).
      out.A.push({ line: lineAt(src, m.index), snippet: m[0] });
    }
  }

  RE_ROW.lastIndex = 0;
  while ((m = RE_ROW.exec(src)) !== null) {
    const obj = enclosingObject(src, m.index);
    if (obj && !/minWidth\s*:/.test(obj)) {
      out.B.push({ line: lineAt(src, m.index) });
    }
  }

  return out;
}

const files = walk(SRC).filter((f) => {
  const r = rel(f);
  return !EXEMPT.some((e) => r.startsWith(e) || r === e);
});

const results = files
  .map((f) => findViolations(fs.readFileSync(f, 'utf8'), f))
  .filter((r) => r.A.length > 0 || r.B.length > 0);

const totalA = results.reduce((s, r) => s + r.A.length, 0);
const totalB = results.reduce((s, r) => s + r.B.length, 0);
const total = totalA + totalB;

if (!SUMMARY) {
  for (const r of results) {
    console.log(`\n${r.file}`);
    for (const a of r.A) console.log(`  A:${a.line}  flex sans minWidth:0  (${a.snippet})`);
    for (const b of r.B) console.log(`  B:${b.line}  row sans minWidth:0`);
  }
  console.log('\n──────────────────────────────────────────');
}

console.log(
  `layout: ${results.length} fichier(s) · ${totalA} flex-sans-minWidth · ${totalB} row-sans-garde-fou · total ${total}`,
);