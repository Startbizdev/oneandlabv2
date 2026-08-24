#!/usr/bin/env node
/**
 * Lance eas-cli avec Git dans le PATH (Windows) et racine monorepo pour EAS.
 * Usage : node scripts/run-eas.cjs [args eas-cli…]
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

function runEas(easArgs) {
  prependGitToPath();

  // Évite d'uploader .git (~2 Go) et respecte .easignore à la racine du monorepo (Windows).
  process.env.EAS_NO_VCS = '1';
  process.env.EAS_PROJECT_ROOT = repoRoot;

  const isBuild = easArgs.includes('build');
  if (isBuild && !process.env.SKIP_EAS_VERIFY) {
    console.log('→ Vérification taille archive EAS (verify-eas-archive-size)…');
    const verify = spawnSync('node', [path.join(__dirname, 'verify-eas-archive-size.cjs')], {
      cwd: mobileDir,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    if (verify.status !== 0) {
      console.error(
        '\n❌ Archive EAS trop volumineuse. Utilisez npm run build:ios:store (pas npx eas-cli direct).'
      );
      return verify.status ?? 1;
    }
  }

  const result = spawnSync('npx', ['eas-cli', ...easArgs], {
    cwd: mobileDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  return result.status ?? 1;
}

if (require.main === module) {
  const easArgs = process.argv.slice(2);
  if (easArgs.length === 0) {
    console.error('Usage: node scripts/run-eas.cjs <args eas-cli…>');
    console.error('Exemple: node scripts/run-eas.cjs build --platform all --profile production');
    process.exit(1);
  }
  process.exit(runEas(easArgs));
}

module.exports = { runEas };
