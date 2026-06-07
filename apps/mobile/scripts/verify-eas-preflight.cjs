#!/usr/bin/env node
/**
 * Pré-vol EAS (Windows/macOS) — bundle iOS + expo-doctor avant build cloud.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');

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
      require('fs').accessSync(dir);
      parts.unshift(dir);
    } catch {
      // ignore
    }
  }
  process.env.PATH = parts.join(path.delimiter);
}

function run(label, command, args, { optional = false } = {}) {
  console.log(`\n→ ${label}…`);
  const result = spawnSync(command, args, {
    cwd: mobileDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    if (optional) {
      console.warn(`⚠ ${label} a signalé des avertissements (non bloquant pour EAS).`);
      return;
    }
    process.exit(result.status ?? 1);
  }
}

prependGitToPath();
run('Expo Doctor', 'npx', ['expo-doctor'], { optional: true });
run('Bundle iOS', 'npx', ['expo', 'export', '--platform', 'ios']);
console.log('\n✓ Pré-vol EAS OK — tu peux lancer npm run build:ios:store');
