#!/usr/bin/env node
/**
 * Prebuild iOS EAS avec garde-fous Hermes (option B).
 * Échoue en ~30s si les vars d'env ne sont pas présentes avant pod install.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`\n✗ Pré-vol iOS EAS: ${message}\n`);
  process.exit(1);
}

const requiredEnv = {
  RCT_BUILD_HERMES_FROM_SOURCE: 'true',
  RCT_USE_PREBUILT_RNCORE: '0',
  RCT_USE_RN_DEP: '0',
};

console.log('=== Pré-vol iOS EAS (Hermes from source) ===');
for (const [key, expected] of Object.entries(requiredEnv)) {
  const value = process.env[key];
  console.log(`  ${key}=${value ?? '(absent)'}`);
  if (value !== expected) {
    fail(`${key} doit valoir "${expected}" dans eas.json (production.env).`);
  }
}

console.log('\n→ expo prebuild --platform ios');
const prebuild = spawnSync('npx', ['expo', 'prebuild', '--platform', 'ios'], {
  cwd: mobileDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (prebuild.status !== 0) {
  process.exit(prebuild.status ?? 1);
}

const propsPath = path.join(mobileDir, 'ios', 'Podfile.properties.json');
if (!fs.existsSync(propsPath)) {
  fail('ios/Podfile.properties.json introuvable après prebuild.');
}

const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
if (props['ios.buildReactNativeFromSource'] !== 'true') {
  fail(
    'ios.buildReactNativeFromSource !== true dans Podfile.properties.json — vérifier expo-build-properties.'
  );
}

console.log('\n✓ Prébuild iOS OK — vars Hermes/RN configurées pour compilation depuis sources');
