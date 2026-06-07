/** Fix codemod artifacts: `}};`, `};`n}`, missing closing brace */
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

let fixed = 0;
for (const file of walk(SRC)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('getThemedStyles')) continue;

  const orig = src;
  src = src.replace(/\}\};\s*\n\}/g, '};\n}');
  src = src.replace(/\};\`n\}/g, '};\n}');
  src = src.replace(/\}\};\s*\n\nconst styles = new Proxy/g, '};\n}\n\nconst styles = new Proxy');
  src = src.replace(/\};\s*\n\nconst styles = new Proxy/g, (m, offset) => {
    // ensure buildStyles function closes with }
    return m;
  });

  // Fix: return { ... };`n} -> return { ... };\n}
  src = src.replace(
    /function build\w+\(c: AppColors\) \{\s*\n\s*return \{/g,
    (match) => match,
  );

  if (src !== orig) {
    fs.writeFileSync(file, src);
    fixed++;
  }
}

console.log(`Fixed ${fixed} files`);
