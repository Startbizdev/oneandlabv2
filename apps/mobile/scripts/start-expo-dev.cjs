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
    if (/vEthernet|Hyper-V|VirtualBox|VMware|WSL|TAP|Tun|Teredo|Loopback|Bluetooth/i.test(name)) {
      continue;
    }
    for (const net of addrs ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push({ name, address: net.address });
    }
  }

  const preferred = candidates.find(
    (c) =>
      /^(Wi-?Fi|WLAN|Ethernet|eth\d|en\d)/i.test(c.name) &&
      /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(c.address),
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

const DEV_SCHEME = 'com.carybioapp.app.dev';

async function main() {
  if (useTunnel) {
    await ensureTunnelReady();
  }
  const port = await findFreePort(Number(process.env.EXPO_DEV_PORT) || 8081);
  if (port !== 8081) {
    console.log(`\n⚠️ Port 8081 occupé — utilisation du port ${port}\n`);
  }

  const devClient = process.env.EXPO_USE_DEV_CLIENT !== '0';
  const expoStartArgs = [
    'start',
    ...(devClient ? ['--dev-client', '--scheme', DEV_SCHEME] : []),
    ...(useTunnel ? ['--tunnel'] : ['--lan']),
    '--port',
    String(port),
    ...extraArgs.filter((a) => a !== '--port' && !/^\d+$/.test(a)),
  ];

  const lanIp = pickLanIpv4();
  const env = {
    ...process.env,
    // Aligne le QR Metro sur Cary Dev (com.carybioapp.app.dev), pas TestFlight.
    APP_VARIANT: process.env.APP_VARIANT ?? 'development',
  };

  if (!useTunnel && lanIp) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
    env.EXPO_PACKAGER_HOSTNAME = lanIp;
    const metroUrl = `http://${lanIp}:${port}`;
    const deepLinkDev = `${DEV_SCHEME}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`;
    const expoQrUrl = `https://qr.expo.dev/development-client?appScheme=${encodeURIComponent(DEV_SCHEME)}&url=${encodeURIComponent(metroUrl)}`;
    console.log('\n📡 Cary Dev — Metro (doc Expo : variants + dev-client)');
    console.log(`   Metro URL  : ${metroUrl}`);
    console.log(`   Deep link  : ${deepLinkDev}`);
    console.log(`   QR Expo    : ${expoQrUrl}`);
    console.log('      ↑ Ouvrez ce lien dans Safari (iPhone) pour un QR scannable');
    console.log('\n   Procédure doc Expo (use-development-builds) :');
    console.log('   1) npm run start tourne sur le PC');
    console.log('   2) Ouvrez Cary Dev → écran launcher (pas l’icône seule avant rebuild)');
    console.log('   3) « Enter URL manually » → Metro URL ci-dessus');
    console.log('      OU connectez le même compte Expo sur PC (npx expo login) et sur Cary Dev');
    console.log('   4) Tunnel si réseaux différents : npm run start:tunnel');
    console.log('\n   ⚠️  Si « No script URL » sans écran launcher : rebuild obligatoire');
    console.log('      npm run build:dev:ios:clean  (fix prebuilt iOS, expo/expo#41751)\n');
  } else if (useTunnel) {
    const tunnelHint = 'https://qr.expo.dev/development-client?appScheme=' + encodeURIComponent(DEV_SCHEME);
    console.log('\n🌐 Tunnel Expo — après démarrage, Metro URL affichée par Expo');
    console.log(`   QR Expo (après tunnel) : ${tunnelHint}&url=<URL_METRO_EXPO>`);
    console.log('   Ou Enter URL manually dans Cary Dev avec l’URL Metro du terminal.\n');
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
