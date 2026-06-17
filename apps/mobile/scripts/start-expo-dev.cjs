#!/usr/bin/env node
/**
 * Démarre Expo avec l’IP LAN locale (Windows : --lan seul laisse souvent 127.0.0.1).
 *
 * Usage :
 *   node scripts/start-expo-dev.cjs           → LAN (cas normal, même Wi‑Fi)
 *   node scripts/start-expo-dev.cjs --tunnel  → tunnel Expo intégré (client hors réseau)
 *   node scripts/start-expo-dev.cjs -c        → clear cache
 */
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const mobileRoot = path.join(__dirname, '..');

function pickLanIpv4() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    for (const net of addrs ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push({ name, address: net.address });
    }
  }

  const preferred = candidates.find((c) =>
    /^(Wi-?Fi|WLAN|Ethernet|eth\d|en\d)/i.test(c.name),
  );
  return preferred?.address ?? candidates[0]?.address ?? null;
}

function resolveExpoCli() {
  try {
    return require.resolve('expo/bin/cli', { paths: [mobileRoot] });
  } catch {
    return null;
  }
}

function findFreePort(from = 8081) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      if (port > from + 20) {
        resolve(from);
        return;
      }
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port);
    };
    tryPort(from);
  });
}

const args = process.argv.slice(2);
const useTunnel = args.includes('--tunnel');
const extraArgs = args.filter((a) => a !== '--tunnel');

async function ensureTunnelReady() {
  if (process.platform !== 'win32') return;
  const patcher = require('./patch-expo-ngrok.cjs');
  const binDir = patcher.findNgrokBinDir();
  const pkgDir = patcher.findNgrokPackageDir();
  if (pkgDir) patcher.patchNgrokClient(pkgDir);
  if (!binDir) return;
  const exe = path.join(binDir, 'ngrok.exe');
  let major = null;
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync(exe, ['version'], { encoding: 'utf8', timeout: 8000 });
    const match = String(out).match(/(\d+)\./);
    major = match ? Number(match[1]) : null;
  } catch {
    major = null;
  }
  if (major && major >= 3) return;
  console.log('\n🔧 Mise à jour ngrok pour le tunnel Expo…\n');
  const result = await patcher.ensureNgrokV3Binary(binDir);
  if (!result.ok) {
    console.error('\n❌ Tunnel indisponible — utilisez `npm run start` (même Wi‑Fi) ou installez ngrok v3 (winget install Ngrok.Ngrok).\n');
    process.exit(1);
  }
}

async function main() {
  if (useTunnel) {
    await ensureTunnelReady();
  }
  const port = await findFreePort(Number(process.env.EXPO_DEV_PORT) || 8081);
  if (port !== 8081) {
    console.log(`\n⚠️ Port 8081 occupé — utilisation du port ${port}\n`);
  }

  const expoStartArgs = [
    'start',
    ...(useTunnel ? ['--tunnel'] : ['--lan']),
    '--port',
    String(port),
    ...extraArgs.filter((a) => a !== '--port' && !/^\d+$/.test(a)),
  ];

  const lanIp = pickLanIpv4();
  const env = { ...process.env };

  if (!useTunnel && lanIp) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
    env.EXPO_PACKAGER_HOSTNAME = lanIp;
    console.log(`\n📡 Expo LAN : ${lanIp} — scannez le QR avec Expo Go (même Wi‑Fi)\n`);
  } else if (useTunnel) {
    console.log('\n🌐 Tunnel Expo intégré — client peut être sur un autre réseau\n');
    console.log('   Si erreur ngrok : essayez `npx expo login` puis relancez, ou utilisez le LAN.\n');
  } else {
    console.warn('\n⚠️ IP LAN introuvable — localhost seul (Expo Go physique impossible)\n');
  }

  const expoCli = resolveExpoCli();
  const isWin = process.platform === 'win32';
  const child = expoCli
    ? spawn(process.execPath, [expoCli, ...expoStartArgs], {
        stdio: 'inherit',
        env,
        cwd: mobileRoot,
      })
    : spawn(isWin ? 'npx.cmd' : 'npx', ['expo', ...expoStartArgs], {
        stdio: 'inherit',
        env,
        cwd: mobileRoot,
        shell: isWin,
      });

  child.on('error', (err) => {
    console.error('\n❌ Impossible de lancer Expo :', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
