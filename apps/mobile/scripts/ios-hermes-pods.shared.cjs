const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PODFILE_SANDBOX_MARKER = '# @oneandlab/eas-script-sandboxing-fix';

function patchPodfile(podfilePath) {
  let contents = fs.readFileSync(podfilePath, 'utf8');
  const anchor =
    "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";

  if (!contents.includes(anchor)) {
    throw new Error('Podfile Expo inattendu — anchor podfile_properties introuvable.');
  }

  contents = contents.replace(/\n# @oneandlab\/eas-hermes-from-source[\s\S]*?ENV\['RCT_USE_RN_DEP'\] = '0'\n/g, '\n');

  if (!contents.includes(PODFILE_SANDBOX_MARKER)) {
    const sandboxBlock = `
    ${PODFILE_SANDBOX_MARKER}
    # Fix [CP] Copy XCFrameworks sur Xcode 16+ (user script sandbox).
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    installer.aggregate_targets.each do |aggregate_target|
      aggregate_target.user_project.native_targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
        end
      end
      aggregate_target.user_project.save
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

function getReactNativeRoot(mobileDir) {
  const candidates = [
    path.resolve(mobileDir, 'node_modules', 'react-native'),
    path.resolve(mobileDir, '..', '..', 'node_modules', 'react-native'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  throw new Error('react-native introuvable dans le monorepo.');
}

function resetPods(iosDir) {
  for (const target of ['Pods', 'Podfile.lock']) {
    fs.rmSync(path.join(iosDir, target), { recursive: true, force: true });
  }
}

function cleanPodCache() {
  console.log('→ pod cache clean --all');
  spawnSync('pod', ['cache', 'clean', '--all'], {
    stdio: 'inherit',
    shell: true,
  });
}

function prepareHermesReleaseArtifacts(iosDir, rnRoot) {
  const version = require(path.join(rnRoot, 'package.json')).version;
  const replaceScript = path.join(
    rnRoot,
    'sdks/hermes-engine/utils/replace_hermes_version.js'
  );
  const podsRoot = path.join(iosDir, 'Pods');

  console.log('→ replace_hermes_version.js (Release)');
  const result = spawnSync(
    'node',
    [replaceScript, '-c', 'Release', '-r', version, '-p', podsRoot],
    {
      cwd: path.join(podsRoot, 'hermes-engine'),
      stdio: 'inherit',
      shell: true,
    }
  );

  if (result.status !== 0) {
    throw new Error('replace_hermes_version.js a échoué.');
  }
}

function assertHermesXcframework(iosDir) {
  const xcframework = path.join(
    iosDir,
    'Pods',
    'hermes-engine',
    'destroot',
    'Library',
    'Frameworks',
    'universal',
    'hermes.xcframework'
  );
  if (!fs.existsSync(xcframework)) {
    throw new Error(`hermes.xcframework introuvable: ${xcframework}`);
  }
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

function assertHermesPrebuilt(iosDir) {
  const pbx = readPodsProject(iosDir);
  if (!pbx) {
    throw new Error('Pods/Pods.xcodeproj introuvable après pod install.');
  }
  if (!isHermesPrebuiltMode(pbx)) {
    throw new Error('Hermes n’est pas en mode précompilé.');
  }
}

function pruneIosBuildExceptGenerated(iosDir) {
  const buildDir = path.join(iosDir, 'build');
  if (!fs.existsSync(buildDir)) {
    return;
  }
  for (const entry of fs.readdirSync(buildDir)) {
    if (entry === 'generated') {
      continue;
    }
    fs.rmSync(path.join(buildDir, entry), { recursive: true, force: true });
  }
}

module.exports = {
  patchPodfile,
  getReactNativeRoot,
  resetPods,
  cleanPodCache,
  prepareHermesReleaseArtifacts,
  assertHermesXcframework,
  readPodsProject,
  isHermesPrebuiltMode,
  assertHermesPrebuilt,
  pruneIosBuildExceptGenerated,
};
