/**
 * Supprime les déclarations dupliquées `const c = useAppColors()` dans un même bloc.
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
    else if (/\.tsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

function dedupeBlock(block) {
  let seen = false;
  return block
    .split('\n')
    .filter((line) => {
      if (/^\s*const c = useAppColors\(\);\s*$/.test(line)) {
        if (seen) return false;
        seen = true;
      }
      return true;
    })
    .join('\n');
}

function dedupeFunctions(src) {
  const hook = /const c = useAppColors\(\);/g;
  if (!hook.test(src)) return src;

  // Découpe grossière par fonctions exportées / function / =>
  const parts = src.split(/(?=(?:export )?(?:function|const \w+ = (?:React\.memo\()?function|\w+Component\s*\())/);
  return parts.map((part, i) => (i === 0 ? part : dedupeBlock(part))).join('');
}

let fixed = 0;
for (const file of walk(SRC)) {
  const orig = fs.readFileSync(file, 'utf8');
  let src = orig;

  // Pass 1 : lignes consécutives identiques
  while (/\n  const c = useAppColors\(\);\n  const c = useAppColors\(\);/.test(src)) {
    src = src.replace(
      /\n  const c = useAppColors\(\);\n  const c = useAppColors\(\);/g,
      '\n  const c = useAppColors();',
    );
  }

  // Pass 2 : dedupe dans chaque bloc fonction
  src = dedupeFunctions(src);

  // Pass 3 : hook interdit dans build*Styles(c) — le paramètre c suffit
  src = src.replace(
    /(function build\w+\(c: AppColors\) \{\n)\s*const c = useAppColors\(\);\n/g,
    '$1',
  );

  if (src !== orig) {
    fs.writeFileSync(file, src);
    fixed++;
    console.log('fixed', path.relative(SRC, file));
  }
}
console.log(`Done: ${fixed} files`);
