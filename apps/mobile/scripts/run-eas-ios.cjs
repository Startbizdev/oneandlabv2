#!/usr/bin/env node
/**
 * Lance EAS iOS avec Git dans le PATH (Windows : Git souvent absent du PATH PowerShell).
 * Usage : node scripts/run-eas-ios.cjs [args eas-cli…]
 * Défaut : build --platform ios --profile production --auto-submit
 */
const { spawnSync } = require('child_process');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileDir, '../..');

function prependGitToPath() {
  if (process.platform !== 'win32') return;

  const candidates = [
    'C:\\Program Files\\Git\\cmd',
    'C:\\Program Files\\Git\\bin',
    process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, 'Git', 'cmd')
      : null,
    process.env['ProgramFiles(x86)']
      ? path.join(process.env['ProgramFiles(x86)'], 'Git', 'cmd')
      : null,
  ].filter(Boolean);

  const existing = process.env.PATH ?? '';
  const parts = existing.split(path.delimiter).filter(Boolean);
  for (const dir of candidates) {
    if (parts.some((p) => p.toLowerCase() === dir.toLowerCase())) continue;
    try {
      require('fs').accessSync(dir);
      parts.unshift(dir);
    } catch {
      // Git non installé à cet emplacement
    }
  }
  process.env.PATH = parts.join(path.delimiter);
}

prependGitToPath();

// Évite d'uploader .git (~2 Go) et respecte .easignore à la racine du monorepo (Windows).
process.env.EAS_NO_VCS = '1';
process.env.EAS_PROJECT_ROOT = repoRoot;

const passthrough = process.argv.slice(2);
const easArgs =
  passthrough.length > 0
    ? passthrough
    : ['build', '--platform', 'ios', '--profile', 'production', '--auto-submit'];

const result = spawnSync('npx', ['eas-cli', ...easArgs], {
  cwd: mobileDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
