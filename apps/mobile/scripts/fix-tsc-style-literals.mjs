/**
 * Ajoute `as const` aux littéraux string des propriétés flex/text dans build*Styles.
 * Corrige le widening `string` → incompatible avec ViewStyle / TextStyle.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const STYLE_PROPS = [
  'flexDirection',
  'alignItems',
  'justifyContent',
  'alignContent',
  'alignSelf',
  'overflow',
  'position',
  'flexWrap',
  'textAlign',
  'textDecorationLine',
  'textTransform',
  'writingDirection',
  'resizeMode',
  'objectFit',
  'display',
  'pointerEvents',
  'borderStyle',
  'textAlignVertical',
  'fontStyle',
  'userSelect',
  'width',
  'height',
  'maxWidth',
  'maxHeight',
  'minHeight',
  'marginLeft',
  'marginRight',
  'top',
  'left',
  'right',
  'bottom',
];

const PROP_RE = new RegExp(
  `\\b(${STYLE_PROPS.join('|')}):\\s*(['"])([^'"]+)\\2(?!\\s+as\\s+const)`,
  'g',
);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

let totalFiles = 0;
let totalReplacements = 0;

for (const file of walk(SRC)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!/function build\w*Styles/.test(src) && !/borderStyle:|textAlignVertical:/.test(src)) continue;

  let count = 0;
  const next = src.replace(PROP_RE, (match, prop, quote, value) => {
    count++;
    return `${prop}: ${quote}${value}${quote} as const`;
  });

  if (count > 0) {
    fs.writeFileSync(file, next);
    totalFiles++;
    totalReplacements += count;
    console.log(`${path.relative(SRC, file).replace(/\\/g, '/')}: +${count} as const`);
  }
}

console.log(`\nDone: ${totalReplacements} as const in ${totalFiles} file(s).`);
