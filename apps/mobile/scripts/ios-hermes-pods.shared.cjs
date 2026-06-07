const fs = require('fs');
const path = require('path');

const PODFILE_SANDBOX_MARKER = '# @oneandlab/eas-script-sandboxing-fix';

function patchPodfile(podfilePath) {
  let contents = fs.readFileSync(podfilePath, 'utf8');
  const anchor =
    "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";

  if (!contents.includes(anchor)) {
    throw new Error('Podfile Expo inattendu — anchor podfile_properties introuvable.');
  }

  // Retire d’anciennes injections from-source si le Podfile a été réutilisé.
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
    throw new Error(
      'Hermes n’est pas en mode précompilé — hermesc custom risque de casser le bundle JS.'
    );
  }
}

module.exports = {
  patchPodfile,
  readPodsProject,
  isHermesPrebuiltMode,
  assertHermesPrebuilt,
};
