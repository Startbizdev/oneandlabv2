import fs from 'fs';
import path from 'path';

const keys = ['2xs', '3xs', '2xl', '2xlSm', '3xl', '4xl', '5xl'];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, files);
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let count = 0;
for (const file of walk('src')) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  for (const key of keys) {
    content = content.replaceAll(`iconSize.${key}`, `iconSize['${key}']`);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
    console.log('Fixed:', file);
  }
}
console.log(`Done: ${count} files`);
