#!/usr/bin/env node
/**
 * Corrige le tunnel Expo : @expo/ngrok embarque ngrok 2.3.41 (API morte).
 * - Patch JS (@expo/ngrok) pour éviter les crash "reading 'body'"
 * - Remplace ngrok.exe par une v3 (winget / téléchargement / PATH global)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { execFileSync, spawnSync } = require('child_process');

const mobileRoot = path.join(__dirname, '..');
const repoRoot = path.join(mobileRoot, '..', '..');

function findNgrokBinDir() {
  const candidates = [
    path.join(repoRoot, 'node_modules', '@expo', 'ngrok-bin-win32-x64'),
    path.join(mobileRoot, 'node_modules', '@expo', 'ngrok-bin-win32-x64'),
  ];
  return candidates.find((p) => fs.existsSync(path.join(p, 'ngrok.exe'))) ?? null;
}

function findNgrokPackageDir() {
  const candidates = [
    path.join(repoRoot, 'node_modules', '@expo', 'ngrok'),
    path.join(mobileRoot, 'node_modules', '@expo', 'ngrok'),
  ];
  return candidates.find((p) => fs.existsSync(path.join(p, 'package.json'))) ?? null;
}

function ngrokVersion(exe) {
  try {
    const out = execFileSync(exe, ['version'], { encoding: 'utf8', timeout: 10000 });
    const match = String(out).match(/(\d+)\./);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function commandExists(cmd) {
  try {
    if (process.platform === 'win32') {
      execFileSync('where', [cmd], { stdio: 'ignore', timeout: 5000 });
    } else {
      execFileSync('which', [cmd], { stdio: 'ignore', timeout: 5000 });
    }
    return true;
  } catch {
    return false;
  }
}

function resolveGlobalNgrokV3() {
  if (!commandExists('ngrok')) return null;
  try {
    const out = execFileSync('ngrok', ['version'], { encoding: 'utf8', timeout: 10000, shell: true });
    const match = String(out).match(/(\d+)\./);
    if (match && Number(match[1]) >= 3) {
      if (process.platform === 'win32') {
        const where = execFileSync('where', ['ngrok'], { encoding: 'utf8', timeout: 5000 });
        return where.split(/\r?\n/).find(Boolean)?.trim() ?? 'ngrok';
      }
      return 'ngrok';
    }
  } catch {
    /* ignore */
  }
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error(`Timeout téléchargement ${url}`));
    });
  });
}

async function extractNgrokFromZip(zipPath, targetExe) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ngrok-patch-'));
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'ignore' },
    );
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', tmp], { stdio: 'ignore' });
  }
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'ngrok' || entry.name === 'ngrok.exe') found.push(full);
    }
  };
  walk(tmp);
  if (!found.length) throw new Error('ngrok.exe introuvable dans le zip');
  fs.copyFileSync(found[0], targetExe);
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

async function tryDownloadNgrokV3(targetExe) {
  const urls = [
    'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip',
    'https://dl.equinox.io/ngrok/ngrok-v3-stable-windows-amd64.zip',
  ];
  const zipPath = path.join(os.tmpdir(), `ngrok-v3-win-${Date.now()}.zip`);
  for (const url of urls) {
    try {
      console.log(`⬇️  Téléchargement ngrok v3… (${url})`);
      await downloadFile(url, zipPath);
      await extractNgrokFromZip(zipPath, targetExe);
      fs.unlinkSync(zipPath);
      return true;
    } catch (err) {
      console.warn(`   Échec : ${err.message}`);
    }
  }
  return false;
}

function patchNgrokClient(pkgDir) {
  const clientPath = path.join(pkgDir, 'src', 'client.js');
  const utilsPath = path.join(pkgDir, 'src', 'utils.js');
  const indexPath = path.join(pkgDir, 'index.js');
  const processPath = path.join(pkgDir, 'src', 'process.js');
  if (!fs.existsSync(clientPath)) return false;

  let client = fs.readFileSync(clientPath, 'utf8');
  if (!client.includes('if (!error.response)')) {
    client = client.replace(
      '    } catch (error) {\n      let clientError;',
      `    } catch (error) {\n      if (!error.response) {\n        throw new NgrokClientError(error.message, undefined, undefined);\n      }\n      let clientError;`,
    );
    fs.writeFileSync(clientPath, client);
  }

  if (fs.existsSync(utilsPath)) {
    let utils = fs.readFileSync(utilsPath, 'utf8');
    if (!utils.includes('if (!err.response) {\n    return false;')) {
      utils = utils.replace(
        /function isRetriable\(err\) \{[\s\S]*?return notReady500 \|\| notReady502 \|\| notReady503;/,
        `function isRetriable(err) {
  if (!err.response) {
    return false;
  }
  const statusCode = err.response.statusCode;
  const body = err.body;
  const notReady500 = statusCode === 500 && /panic/.test(body);
  const notReady502 =
    statusCode === 502 &&
    body.details &&
    body.details.err === "tunnel session not ready yet";
  const notReady503 =
    statusCode === 503 &&
    body.details &&
    body.details.err ===
      "a successful ngrok tunnel session has not yet been established";
  return notReady500 || notReady502 || notReady503;`,
      );
      fs.writeFileSync(utilsPath, utils);
    }
  }

  if (fs.existsSync(indexPath) && !fs.readFileSync(indexPath, 'utf8').includes('buildTunnelPayload')) {
    let index = fs.readFileSync(indexPath, 'utf8');
    index = index.replace(
      /async function connectRetry\(opts, retryCount = 0\) \{\r?\n  opts\.name = String\(opts\.name \|\| uuid\.v4\(\)\);\r?\n  try \{\r?\n    const response = await ngrokClient\.startTunnel\(opts\);/,
      `function buildTunnelPayload(opts) {
  const payload = {
    name: String(opts.name),
    addr: String(opts.addr ?? opts.port ?? 80),
    proto: opts.proto || "http",
  };
  if (opts.hostname) payload.hostname = opts.hostname;
  if (opts.subdomain) payload.subdomain = opts.subdomain;
  return payload;
}

async function connectRetry(opts, retryCount = 0) {
  opts.name = String(opts.name || uuid.v4());
  try {
    const response = await ngrokClient.startTunnel(buildTunnelPayload(opts));`,
    );
    if (!index.includes('buildTunnelPayload')) {
      throw new Error('patch index.js connectRetry : motif introuvable');
    }
    fs.writeFileSync(indexPath, index);
  }

  if (fs.existsSync(processPath)) {
    let process = fs.readFileSync(processPath, 'utf8');

    if (!process.includes('config", "add-authtoken"')) {
      process = process.replace(
        /async function setAuthtoken\(optsOrToken\) \{[\s\S]*?\n\}/,
        `async function setAuthtoken(optsOrToken) {
  const isOpts = typeof optsOrToken !== "string";
  const opts = isOpts ? optsOrToken : {};
  const token = isOpts ? opts.authtoken : optsOrToken;

  const args = ["config", "add-authtoken", token];
  if (opts.configPath) args.push("--config=" + opts.configPath);

  const ngrok = spawn(bin, args, { windowsHide: true });

  const killed = new Promise((resolve, reject) => {
    const done = (data) => {
      const msg = String(data || "");
      if (/saved|Authtoken saved/i.test(msg)) resolve();
    };
    ngrok.stdout.once("data", done);
    ngrok.stderr.once("data", (data) => {
      const msg = String(data || "");
      if (/saved|Authtoken saved/i.test(msg)) resolve();
      else reject(new Error("cant set authtoken: " + msg.trim()));
    });
    ngrok.on("error", (err) => reject(err));
  });

  try {
    return await killed;
  } finally {
    ngrok.kill();
  }
}`,
      );
    }

    if (!process.includes('sessionReady = false')) {
      process = process.replace(
        /async function startProcess\(opts\) \{[\s\S]*?ngrok\.stdout\.on\("data", \(data\) => \{[\s\S]*?\}\);/,
        `async function startProcess(opts) {
  const start = ["start", "--none", "--log=stdout"];
  if (opts.region) start.push("--region=" + opts.region);
  if (opts.configPath) start.push("--config=" + opts.configPath);

  const ngrok = spawn(bin, start, { windowsHide: true });

  let resolve, reject;
  let apiAddr = null;
  let sessionReady = false;
  let settled = false;

  const tryResolve = () => {
    if (settled || !apiAddr || !sessionReady) return;
    settled = true;
    resolve(\`http://\${apiAddr}\`);
  };

  const apiUrl = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  ngrok.stdout.on("data", (data) => {
    const msg = data.toString().trim();
    if (opts.onLogEvent) {
      opts.onLogEvent(msg);
    }

    const msgs = msg.split(/\\n/);
    msgs.forEach((line) => {
      if (opts.onStatusChange) {
        if (line.match(/client session established|Tunnel session established/i)) {
          sessionReady = true;
          opts.onStatusChange("connected");
          tryResolve();
        } else if (line.match(/session closed, starting reconnect loop/i)) {
          opts.onStatusChange("closed");
        }
      } else if (line.match(/client session established|Tunnel session established/i)) {
        sessionReady = true;
        tryResolve();
      }

      const addr = parseAddr(line);
      if (addr) {
        apiAddr = addr;
        tryResolve();
      } else if (line.match(inUse)) {
        if (!settled) {
          settled = true;
          reject(new Error(line.substring(0, 10000)));
        }
      }
    });
  });`,
      );
      if (!process.includes('sessionReady = false')) {
        throw new Error('patch process.js startProcess : motif introuvable');
      }
    }

    fs.writeFileSync(processPath, process);
  }

  return true;
}

async function ensureNgrokV3Binary(binDir) {
  const targetExe = path.join(binDir, 'ngrok.exe');
  const currentMajor = ngrokVersion(targetExe);
  if (currentMajor && currentMajor >= 3) {
    return { ok: true, source: 'bundled' };
  }

  const globalNgrok = resolveGlobalNgrokV3();
  if (globalNgrok && globalNgrok.endsWith('.exe')) {
    fs.copyFileSync(globalNgrok, targetExe);
    if (ngrokVersion(targetExe) >= 3) {
      return { ok: true, source: 'global' };
    }
  }

  const downloaded = await tryDownloadNgrokV3(targetExe);
  if (downloaded && ngrokVersion(targetExe) >= 3) {
    return { ok: true, source: 'download' };
  }

  return { ok: false, source: null };
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('patch-expo-ngrok: Windows uniquement (autres OS : tunnel Expo natif).');
    return;
  }

  const binDir = findNgrokBinDir();
  const pkgDir = findNgrokPackageDir();
  if (!binDir || !pkgDir) {
    console.warn('⚠️ @expo/ngrok introuvable — lancez npm install à la racine du monorepo.');
    process.exit(1);
  }

  patchNgrokClient(pkgDir);
  const result = await ensureNgrokV3Binary(binDir);
  const ver = ngrokVersion(path.join(binDir, 'ngrok.exe'));

  if (result.ok) {
    console.log(`✅ ngrok prêt pour Expo tunnel (v${ver ?? '?'}, source: ${result.source})`);
    return;
  }

  console.error(`
❌ Impossible de mettre à jour ngrok pour le tunnel Expo.

Solutions :
  1. winget install Ngrok.Ngrok
  2. Relancer : npm run postinstall -w @oneandlab/mobile
  3. Ou tester en LAN (même Wi‑Fi) : npm run start
`);
  process.exit(1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ensureNgrokV3Binary, patchNgrokClient, findNgrokBinDir, findNgrokPackageDir };
