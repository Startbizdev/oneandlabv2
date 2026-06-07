#!/usr/bin/env node
/**
 * Corrige Hermes après le pod install EAS (qui force le mode précompilé).
 * S'exécute en eas-build-post-install, juste avant fastlane.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  HERMES_ENV,
  patchPodfile,
  readPodsProject,
  isHermesPrebuiltMode,
  assertHermesFromSource,
  resetPods,
} = require('./ios-hermes-pods.shared.cjs');

const mobileDir = path.resolve(__dirname, '..');
const iosDir = path.join(mobileDir, 'ios');
const podfilePath = path.join(iosDir, 'Podfile');

function fail(message) {
  console.error(`\n✗ Fix Hermes post-install: ${message}\n`);
  process.exit(1);
}

function runPodInstall() {
  console.log('\n→ pod install (Hermes from source, après pod install EAS)');
  const result = spawnSync('pod', ['install'], {
    cwd: iosDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...HERMES_ENV },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('=== Fix Hermes post-install (après pod install EAS) ===');

if (!fs.existsSync(podfilePath)) {
  fail('ios/Podfile introuvable.');
}

try {
  patchPodfile(podfilePath);
} catch (error) {
  fail(error.message);
}

const existingPbx = readPodsProject(iosDir);
if (existingPbx && !isHermesPrebuiltMode(existingPbx)) {
  try {
    assertHermesFromSource(iosDir);
    console.log('✓ Hermes déjà en mode from-source — rien à refaire');
    process.exit(0);
  } catch {
    // Continue avec réinstallation complète.
  }
}

console.log('→ Réinitialisation Pods (pod install EAS = mode précompilé)');
resetPods(iosDir);
runPodInstall();

try {
  assertHermesFromSource(iosDir);
} catch (error) {
  fail(error.message);
}

console.log('✓ Hermes corrigé — mode compilation depuis sources');
