#!/usr/bin/env node
/**
 * Post-install EAS : sandbox fix + Hermes précompilé (sans reset Pods).
 * Ne pas supprimer Pods/ — EAS les installe déjà en mode précompilé.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  patchPodfile,
  podInstallEnv,
  getReactNativeRoot,
  prepareHermesReleaseArtifacts,
  assertHermesXcframework,
  assertHermesPrebuilt,
  pruneIosBuildExceptGenerated,
} = require('./ios-hermes-pods.shared.cjs');

const mobileDir = path.resolve(__dirname, '..');
const iosDir = path.join(mobileDir, 'ios');
const podfilePath = path.join(iosDir, 'Podfile');

function fail(message) {
  console.error(`\n✗ Fix iOS post-install: ${message}\n`);
  process.exit(1);
}

console.log('=== Fix iOS post-install ===');
console.log(`  GYM_DERIVED_DATA_PATH=${process.env.GYM_DERIVED_DATA_PATH ?? '(absent)'}`);
console.log(
  `  RCT_BUILD_HERMES_FROM_SOURCE=${process.env.RCT_BUILD_HERMES_FROM_SOURCE ?? '(absent)'}`
);

if (!process.env.GYM_DERIVED_DATA_PATH) {
  fail('GYM_DERIVED_DATA_PATH doit être défini dans eas.json (production.env).');
}

if (!fs.existsSync(podfilePath)) {
  fail('ios/Podfile introuvable.');
}

try {
  patchPodfile(podfilePath);
} catch (error) {
  fail(error.message);
}

console.log('\n→ pod install (sandbox + Hermes précompilé, sans reset Pods)');
const podResult = spawnSync('pod', ['install'], {
  cwd: iosDir,
  stdio: 'inherit',
  shell: true,
  env: podInstallEnv(process.env),
});

if (podResult.status !== 0) {
  process.exit(podResult.status ?? 1);
}

try {
  const rnRoot = getReactNativeRoot(mobileDir);
  assertHermesPrebuilt(iosDir);
  prepareHermesReleaseArtifacts(iosDir, rnRoot);
  assertHermesXcframework(iosDir);
  pruneIosBuildExceptGenerated(iosDir);
} catch (error) {
  fail(error.message);
}

console.log('✓ Hermes précompilé prêt — derived data hors ios/build');
