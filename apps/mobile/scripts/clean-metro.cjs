/**
 * Nettoyage Metro / Expo (Windows + macOS) — corrige les caches corrompus
 * (« Got unexpected undefined » dans Graph._recursivelyCommitModule).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const mobileRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(mobileRoot, '../..');

const dirsToRemove = [
  path.join(mobileRoot, '.expo'),
  path.join(mobileRoot, 'node_modules', '.cache'),
  path.join(mobileRoot, 'dist'),
  path.join(monorepoRoot, 'node_modules', '.cache'),
];

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`  supprimé: ${dir}`);
}

console.log('→ Arrêt des processus Node sur le port 8081 (Metro)…');
try {
  if (process.platform === 'win32') {
    const out = execSync('netstat -ano | findstr :8081', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const pids = new Set(
      out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid)),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`  processus ${pid} arrêté`);
      } catch {
        /* ignore */
      }
    }
  } else {
    execSync('lsof -ti:8081 | xargs kill -9 2>/dev/null || true', { shell: true, stdio: 'ignore' });
  }
} catch {
  /* aucun processus sur 8081 */
}

console.log('→ Caches Expo / Metro…');
for (const dir of dirsToRemove) rmrf(dir);

console.log('→ Caches temporaires Metro (best-effort)…');
const tmp = os.tmpdir();
try {
  for (const name of fs.readdirSync(tmp)) {
    if (/^metro-|^haste-map-|^react-|^expo-bundler-/i.test(name)) {
      rmrf(path.join(tmp, name));
    }
  }
} catch {
  /* ignore */
}

console.log('✔ Nettoyage terminé. Relancez : npm run start:clean');
