#!/usr/bin/env node
/**
 * Prebuild iOS EAS : génère ios/ sans pod install, patch Podfile, pod install contrôlé.
 * Échoue avant fastlane si Hermes reste en mode précompilé.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');
const iosDir = path.join(mobileDir, 'ios');

const PODFILE_ENV_MARKER = '# @oneandlab/eas-hermes-from-source';
const PODFILE_SANDBOX_MARKER = '# @oneandlab/eas-script-sandboxing-fix';

const requiredEnv = {
  RCT_BUILD_HERMES_FROM_SOURCE: 'true',
  RCT_USE_PREBUILT_RNCORE: '0',
  RCT_USE_RN_DEP: '0',
};

function fail(message) {
  console.error(`\n✗ Pré-vol iOS EAS: ${message}\n`);
  process.exit(1);
}

function run(label, command, args, options = {}) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? mobileDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function patchPodfile(podfilePath) {
  let contents = fs.readFileSync(podfilePath, 'utf8');
  const anchor =
    "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";

  if (!contents.includes(anchor)) {
    fail('Podfile Expo inattendu — anchor podfile_properties introuvable.');
  }

  if (!contents.includes(PODFILE_ENV_MARKER)) {
    const envBlock = `
${PODFILE_ENV_MARKER}
ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
ENV['RCT_USE_RN_DEP'] = '0'
`;
    contents = contents.replace(anchor, `${anchor}${envBlock}`);
  }

  if (!contents.includes(PODFILE_SANDBOX_MARKER)) {
    const sandboxBlock = `
    ${PODFILE_SANDBOX_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
`;
    const postInstallAnchor = 'post_install do |installer|';
    if (!contents.includes(postInstallAnchor)) {
      fail('Podfile Expo inattendu — post_install introuvable.');
    }
    contents = contents.replace(postInstallAnchor, `${postInstallAnchor}${sandboxBlock}`);
  }

  fs.writeFileSync(podfilePath, contents);
}

function verifyHermesPodsMode() {
  const pbxPath = path.join(iosDir, 'Pods', 'Pods.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(pbxPath)) {
    fail('Pods/Pods.xcodeproj introuvable — pod install a échoué ou n’a pas tourné.');
  }

  const pbx = fs.readFileSync(pbxPath, 'utf8');

  if (pbx.includes('[Hermes] Replace Hermes for the right configuration, if needed')) {
    fail(
      'Hermes est encore en mode précompilé (script Replace Hermes détecté). ' +
        'Les vars ENV ne sont pas appliquées pendant pod install.'
    );
  }

  const fromSource =
    pbx.includes('[RN] [1] Build Hermesc') || pbx.includes('[RN] [2] Build Hermes');

  if (!fromSource) {
    fail('Scripts de compilation Hermes absents — mode from-source non actif.');
  }

  console.log('✓ Hermes configuré en mode compilation depuis sources');
}

console.log('=== Prébuild iOS EAS (Hermes from source) ===');
for (const [key, expected] of Object.entries(requiredEnv)) {
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

patchPodfile(path.join(iosDir, 'Podfile'));

run('pod install (Hermes from source)', 'pod', ['install'], {
  cwd: iosDir,
  env: requiredEnv,
});

verifyHermesPodsMode();
console.log('\n✓ Prébuild iOS + pod install OK');
