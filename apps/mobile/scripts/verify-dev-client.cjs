#!/usr/bin/env node
/**
 * Audit Cary Dev ↔ Metro (Windows) — manifest, bundle, timings.
 * Usage : node scripts/verify-dev-client.cjs [--host 192.168.1.24] [--port 8081]
 */
const http = require('http');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');

function parseArgs() {
  const hostArg = process.argv.find((a) => a.startsWith('--host='));
  const portArg = process.argv.find((a) => a.startsWith('--port='));
  return {
    host: hostArg?.split('=')[1] ?? '127.0.0.1',
    port: Number(portArg?.split('=')[1] ?? process.env.EXPO_DEV_PORT ?? 8081),
  };
}

function request(url, headers = {}, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers, timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${timeoutMs}ms`));
    });
    req.on('error', reject);
  });
}

async function main() {
  const { host, port } = parseArgs();
  const base = `http://${host}:${port}`;
  const manifestHeaders = {
    'expo-platform': 'ios',
    'expo-protocol-version': '1',
    'expo-api-version': '1',
  };

  console.log(`\n🔎 Audit Cary Dev — Metro @ ${base}\n`);

  let manifest;
  const t0 = Date.now();
  try {
    const res = await request(base, manifestHeaders, 30_000);
    manifest = JSON.parse(res.body.toString('utf8'));
    console.log(`✔ Manifest iOS     ${Date.now() - t0}ms (HTTP ${res.status})`);
  } catch (err) {
    console.error(`✖ Manifest iOS     ${err.message}`);
    console.error('\n→ Metro ne tourne pas ou le port est incorrect. Lancez npm run start.\n');
    process.exit(1);
  }

  const expoClient = manifest.extra?.expoClient ?? {};
  const scheme = expoClient.scheme;
  const bundleId = expoClient.ios?.bundleIdentifier;
  const appName = expoClient.name;
  const launchUrl = manifest.launchAsset?.url;

  console.log(`  App manifeste   : ${appName}`);
  console.log(`  Bundle iOS      : ${bundleId}`);
  console.log(`  Scheme          : ${scheme}`);
  console.log(`  runtimeVersion  : ${manifest.runtimeVersion}`);

  const checks = [
    [appName === 'Cary Dev', `name="${appName}" (attendu Cary Dev)`],
    [bundleId === 'com.carybioapp.app.dev', `bundle="${bundleId}"`],
    [scheme === 'com.carybioapp.app.dev', `scheme="${scheme}"`],
    [Boolean(launchUrl), 'launchAsset.url présent'],
  ];
  for (const [ok, label] of checks) {
    console.log(`${ok ? '✔' : '✖'} ${label}`);
  }

  if (!launchUrl) {
    process.exit(1);
  }

  const bundlePath = launchUrl.replace(/^https?:\/\/[^/]+/, '');
  const bundleLocal = `http://127.0.0.1:${port}${bundlePath}`;
  console.log(`\n  Bundle path     : ${bundlePath}`);

  const t1 = Date.now();
  try {
    const bundleRes = await request(bundleLocal, {}, 180_000);
    const mb = (bundleRes.body.length / (1024 * 1024)).toFixed(1);
    const elapsed = Date.now() - t1;
    console.log(`✔ Bundle iOS       ${elapsed}ms — ${mb} Mo (HTTP ${bundleRes.status})`);
    if (elapsed > 8000) {
      console.warn(
        '\n⚠️  Bundle > 8s : Cary Dev iOS peut timeout avant la fin du téléchargement.',
      );
      console.warn('   Attendez « Bundle prêt » dans npm run start avant de connecter l’iPhone.\n');
    }
  } catch (err) {
    console.error(`✖ Bundle iOS       ${err.message}`);
    process.exit(1);
  }

  console.log('\n→ Si Cary Dev plante quand même : rebuild OBLIGATOIRE avec cache vidé :');
  console.log('   npm run build:dev:ios:clean\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
