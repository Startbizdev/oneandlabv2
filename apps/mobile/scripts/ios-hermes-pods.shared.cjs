const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PODFILE_ENV_MARKER = '# @oneandlab/eas-hermes-from-source';
const PODFILE_SANDBOX_MARKER = '# @oneandlab/eas-script-sandboxing-fix';

const HERMES_ENV = {
  RCT_BUILD_HERMES_FROM_SOURCE: 'true',
  RCT_USE_PREBUILT_RNCORE: '0',
  RCT_USE_RN_DEP: '0',
};

function patchPodfile(podfilePath) {
  let contents = fs.readFileSync(podfilePath, 'utf8');
  const anchor =
    "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";

  if (!contents.includes(anchor)) {
    throw new Error('Podfile Expo inattendu — anchor podfile_properties introuvable.');
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
      throw new Error('Podfile Expo inattendu — post_install introuvable.');
    }
    contents = contents.replace(postInstallAnchor, `${postInstallAnchor}${sandboxBlock}`);
  }

  fs.writeFileSync(podfilePath, contents);
}

function readPodsProject(iosDir) {
  const pbxPath = path.join(iosDir, 'Pods', 'Pods.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(pbxPath)) {
    return null;
  }
  return fs.readFileSync(pbxPath, 'utf8');
}

function isHermesPrebuiltMode(pbx) {
  return pbx.includes('[Hermes] Replace Hermes for the right configuration, if needed');
}

function isHermesFromSourceMode(pbx) {
  return (
    pbx.includes('[RN] [1] Build Hermesc') || pbx.includes('[RN] [2] Build Hermes')
  );
}

function assertHermesFromSource(iosDir) {
  const pbx = readPodsProject(iosDir);
  if (!pbx) {
    throw new Error('Pods/Pods.xcodeproj introuvable après pod install.');
  }
  if (isHermesPrebuiltMode(pbx)) {
    throw new Error(
      'Hermes encore en mode précompilé (script Replace Hermes détecté).'
    );
  }
  if (!isHermesFromSourceMode(pbx)) {
    throw new Error('Scripts Build Hermes absents — mode from-source non actif.');
  }
}

function resetPods(iosDir) {
  for (const target of ['Pods', 'Podfile.lock']) {
    const fullPath = path.join(iosDir, target);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    encoding: 'utf8',
  });
  return result.status === 0 && Boolean(result.stdout?.trim());
}

function ensureCmake() {
  if (commandExists('cmake')) {
    console.log('✓ cmake disponible');
    return;
  }

  console.log('→ cmake absent — requis pour Hermes from source (brew install cmake)');
  const result = spawnSync('brew', ['install', 'cmake'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      HOMEBREW_NO_AUTO_UPDATE: '1',
      HOMEBREW_NO_INSTALL_CLEANUP: '1',
    },
  });

  if (result.status !== 0 || !commandExists('cmake')) {
    throw new Error(
      'cmake introuvable après brew install — impossible de compiler Hermes depuis sources.'
    );
  }

  console.log('✓ cmake installé');
}

module.exports = {
  HERMES_ENV,
  patchPodfile,
  readPodsProject,
  isHermesPrebuiltMode,
  isHermesFromSourceMode,
  assertHermesFromSource,
  resetPods,
  ensureCmake,
};
