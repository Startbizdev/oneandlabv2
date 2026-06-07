#!/usr/bin/env node
/**
 * Prebuild iOS EAS : génère ios/ et patch Podfile (sans pod install).
 * Le pod install contrôlé se fait en eas-build-post-install, après celui d'EAS.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { HERMES_ENV, patchPodfile } = require('./ios-hermes-pods.shared.cjs');

const mobileDir = path.resolve(__dirname, '..');
const iosDir = path.join(mobileDir, 'ios');

function fail(message) {
  console.error(`\n✗ Prébuild iOS EAS: ${message}\n`);
  process.exit(1);
}

function run(label, command, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, {
    cwd: mobileDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('=== Prebuild iOS EAS ===');
for (const [key, expected] of Object.entries(HERMES_ENV)) {
  const value = process.env[key];
  console.log(`  ${key}=${value ?? '(absent)'}`);
  if (value !== expected) {
    fail(`${key} doit valoir "${expected}" dans eas.json (production.env).`);
  }
}

run('expo prebuild --platform ios --no-install', 'npx', [
  'expo',
  'prebuild',
  '--platform',
  'ios',
  '--no-install',
]);

const propsPath = path.join(iosDir, 'Podfile.properties.json');
if (!fs.existsSync(propsPath)) {
  fail('ios/Podfile.properties.json introuvable après prebuild.');
}

const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
if (props['ios.buildReactNativeFromSource'] !== 'true') {
  fail('ios.buildReactNativeFromSource !== true — vérifier expo-build-properties.');
}

try {
  patchPodfile(path.join(iosDir, 'Podfile'));
} catch (error) {
  fail(error.message);
}

console.log('\n✓ Prebuild iOS OK — pod install Hermes sera fait en post-install');
