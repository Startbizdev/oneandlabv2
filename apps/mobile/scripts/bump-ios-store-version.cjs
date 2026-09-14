#!/usr/bin/env node
/**
 * Incrémente version marketing (patch semver) + iOS buildNumber avant un build App Store.
 * Synchronise package.json, app.json et defaults backend/.env.
 *
 * Ignorer : SKIP_IOS_VERSION_BUMP=1 npm run build:ios:store
 */
const fs = require('fs');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileDir, '../..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function bumpPatch(version) {
  const parts = String(version).trim().split('.');
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Version semver invalide: ${version}`);
  }
  parts[2] = String(Number(parts[2]) + 1);
  return parts.join('.');
}

function replaceEnvDefault(filePath, key, value) {
  const abs = path.join(repoRoot, filePath);
  let text = fs.readFileSync(abs, 'utf8');
  const re = new RegExp(`^(${key}=)[^\r\n]*`, 'm');
  if (!re.test(text)) {
    throw new Error(`Clé ${key} introuvable dans ${filePath}`);
  }
  text = text.replace(re, `$1${value}`);
  fs.writeFileSync(abs, text, 'utf8');
}

function replacePhpDefault(filePath, value) {
  const abs = path.join(repoRoot, filePath);
  let text = fs.readFileSync(abs, 'utf8');
  const re = /(\$_ENV\['MOBILE_(?:IOS|ANDROID)_LATEST_VERSION'\] \?\? ')([^']+)(')/g;
  if (!re.test(text)) {
    throw new Error(`Defaults MOBILE_*_LATEST_VERSION introuvables dans ${filePath}`);
  }
  text = fs.readFileSync(abs, 'utf8').replace(re, `$1${value}$3`);
  fs.writeFileSync(abs, text, 'utf8');
}

function replaceShDefault(filePath, value) {
  const abs = path.join(repoRoot, filePath);
  let text = fs.readFileSync(abs, 'utf8');
  const re = /(MOBILE_(?:IOS|ANDROID)_LATEST_VERSION="\$\{MOBILE_(?:IOS|ANDROID)_LATEST_VERSION:-)([^}]+)(\})/g;
  if (!re.test(text)) {
    throw new Error(`Defaults MOBILE_*_LATEST_VERSION introuvables dans ${filePath}`);
  }
  text = fs.readFileSync(abs, 'utf8').replace(re, `$1${value}$3`);
  fs.writeFileSync(abs, text, 'utf8');
}

function main() {
  const appJsonPath = path.join(mobileDir, 'app.json');
  const pkgJsonPath = path.join(mobileDir, 'package.json');

  const app = readJson(appJsonPath);
  const pkg = readJson(pkgJsonPath);

  const prevVersion = String(app.expo?.version ?? pkg.version ?? '').trim();
  const prevBuild = String(app.expo?.ios?.buildNumber ?? '0').trim();

  const nextVersion = bumpPatch(prevVersion);
  const nextBuild = String(Number.parseInt(prevBuild, 10) + 1);

  app.expo.version = nextVersion;
  app.expo.ios = app.expo.ios ?? {};
  app.expo.ios.buildNumber = nextBuild;

  pkg.version = nextVersion;

  writeJson(appJsonPath, app);
  writeJson(pkgJsonPath, pkg);

  replaceEnvDefault('.env.example', 'MOBILE_IOS_LATEST_VERSION', nextVersion);
  replaceEnvDefault('.env.example', 'MOBILE_ANDROID_LATEST_VERSION', nextVersion);
  replacePhpDefault('backend/config/mobile-app.php', nextVersion);
  replaceShDefault('database/scripts/apply-mobile-app-env-prod.sh', nextVersion);

  console.log(`✅ Version Cary iOS : ${prevVersion} (build ${prevBuild}) → ${nextVersion} (build ${nextBuild})`);
  console.log('   Fichiers mis à jour : app.json, package.json, .env.example, mobile-app.php, apply-mobile-app-env-prod.sh');
}

try {
  main();
} catch (err) {
  console.error('❌ bump-ios-store-version:', err.message);
  process.exit(1);
}
