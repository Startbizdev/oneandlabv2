#!/usr/bin/env node
/**
 * Après pod install EAS : applique le fix sandbox Xcode 16+ et relance pod install.
 * Hermes reste en mode précompilé (hermesc officiel Expo/RN).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { patchPodfile, assertHermesPrebuilt } = require('./ios-hermes-pods.shared.cjs');

const mobileDir = path.resolve(__dirname, '..');
const iosDir = path.join(mobileDir, 'ios');
const podfilePath = path.join(iosDir, 'Podfile');

function fail(message) {
  console.error(`\n✗ Fix iOS post-install: ${message}\n`);
  process.exit(1);
}

console.log('=== Fix iOS post-install (sandbox + Hermes précompilé) ===');

if (!fs.existsSync(podfilePath)) {
  fail('ios/Podfile introuvable.');
}

try {
  patchPodfile(podfilePath);
} catch (error) {
  fail(error.message);
}

console.log('\n→ pod install (appliquer ENABLE_USER_SCRIPT_SANDBOXING=NO)');
const result = spawnSync('pod', ['install'], {
  cwd: iosDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

try {
  assertHermesPrebuilt(iosDir);
} catch (error) {
  fail(error.message);
}

console.log('✓ Hermes précompilé + sandbox désactivé pour les scripts Pods');
