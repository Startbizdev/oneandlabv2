#!/usr/bin/env node
/**
 * Démarre Expo avec l’IP LAN locale (Windows : --lan seul laisse souvent 127.0.0.1).
 * Usage : node scripts/start-expo-dev.cjs [--tunnel] [--clear]
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

  // Wi‑Fi / Ethernet en priorité (évite VPN / Hyper-V / Docker)
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

/** Port libre à partir de 8081 (Metro précédent encore actif). */
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

async function main() {
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
    console.log(`\n📡 Expo LAN : ${lanIp} (Expo Go doit joindre exp://${lanIp}:${port})\n`);
  } else if (useTunnel) {
    console.log('\n🌐 Expo tunnel (ngrok) — utile si le Wi‑Fi isole les appareils\n');
  } else {
    console.warn('\n⚠️ IP LAN introuvable — fallback localhost (Expo Go physique ne marchera pas)\n');
  }

  const expoCli = resolveExpoCli();
  let child;

  if (expoCli) {
    child = spawn(process.execPath, [expoCli, ...expoStartArgs], {
      stdio: 'inherit',
      env,
      cwd: mobileRoot,
    });
  } else {
    const isWin = process.platform === 'win32';
    child = spawn(isWin ? 'npx.cmd' : 'npx', ['expo', ...expoStartArgs], {
      stdio: 'inherit',
      env,
      cwd: mobileRoot,
      shell: isWin,
    });
  }

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
