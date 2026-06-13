#!/usr/bin/env node
/**
 * Vérifie que l'archive EAS reste sous la limite (2 Go) avant upload cloud.
 * Usage : node scripts/verify-eas-archive-size.cjs [--max-mb 1800]
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileDir, '../..');
const maxMb = Number(
  (process.argv.find((a) => a.startsWith('--max-mb=')) ?? '--max-mb=1800').split('=')[1]
);
const outDir = path.join(os.tmpdir(), `cary-eas-archive-check-${Date.now()}`);

function dirSizeBytes(root) {
  let total = 0;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {
          // ignore
        }
      }
    }
  }
  return total;
}

function prependGitToPath() {
  if (process.platform !== 'win32') return;
  const candidates = [
    'C:\\Program Files\\Git\\cmd',
    'C:\\Program Files\\Git\\bin',
  ];
  const parts = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of candidates) {
    if (parts.some((p) => p.toLowerCase() === dir.toLowerCase())) continue;
    try {
      fs.accessSync(dir);
      parts.unshift(dir);
    } catch {
      // ignore
    }
  }
  process.env.PATH = parts.join(path.delimiter);
}

prependGitToPath();

process.env.EAS_NO_VCS = '1';
process.env.EAS_PROJECT_ROOT = repoRoot;

console.log(`→ Simulation archive EAS → ${outDir}`);
const inspect = spawnSync(
  'npx',
  [
    'eas-cli',
    'build:inspect',
    '--platform',
    'ios',
    '--stage',
    'archive',
    '--output',
    outDir,
    '--profile',
    'production',
  ],
  { cwd: mobileDir, stdio: 'inherit', shell: true, env: process.env }
);

if (inspect.status !== 0) {
  process.exit(inspect.status ?? 1);
}

const bytes = dirSizeBytes(outDir);
const mb = bytes / (1024 * 1024);
console.log(`\nTaille archive simulée : ${mb.toFixed(1)} Mo (limite conseillée : ${maxMb} Mo)`);

try {
  fs.rmSync(outDir, { recursive: true, force: true });
} catch {
  // ignore cleanup errors
}

if (mb > maxMb) {
  console.error(
    `\n❌ Archive trop volumineuse pour EAS (max ~2048 Mo). Vérifiez .easignore à la racine du repo.`
  );
  process.exit(1);
}

console.log('✓ Archive EAS OK');
