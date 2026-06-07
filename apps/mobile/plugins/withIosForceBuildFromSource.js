const { createRunOncePlugin, withPodfile } = require('expo/config-plugins');

const ENV_MARKER = '# @oneandlab/withIosForceBuildFromSource';
const POST_INSTALL_MARKER = '# @oneandlab/hermes-script-sandboxing-fix';

// Inject ENV vars right after Podfile.properties.json is loaded
const ENV_INJECTION = `
${ENV_MARKER}
# Xcode 16 + macOS Sequoia: disable user script sandboxing that breaks [CP] Copy XCFrameworks
# for hermes-engine. RCT_BUILD_HERMES_FROM_SOURCE also avoids prebuilt xcframework issues.
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
ENV['RCT_USE_RN_DEP'] = '0'
ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
`;

// Patch post_install to disable user script sandboxing for all Pods targets
const POST_INSTALL_PATCH = `
    ${POST_INSTALL_MARKER}
    # Fix [CP] Copy XCFrameworks failure on Xcode 16 / macOS Sequoia (user script sandbox).
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
`;

function withIosForceBuildFromSource(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Inject ENV vars after Podfile.properties.json load
    if (!contents.includes(ENV_MARKER)) {
      const anchor =
        "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";
      if (!contents.includes(anchor)) {
        throw new Error(
          'withIosForceBuildFromSource: anchor not found in Podfile — update the plugin for this Expo SDK.'
        );
      }
      contents = contents.replace(anchor, `${anchor}${ENV_INJECTION}`);
    }

    // 2. Inject sandboxing fix inside post_install block
    if (!contents.includes(POST_INSTALL_MARKER)) {
      const postInstallAnchor = 'post_install do |installer|';
      if (contents.includes(postInstallAnchor)) {
        contents = contents.replace(
          postInstallAnchor,
          `${postInstallAnchor}${POST_INSTALL_PATCH}`
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withIosForceBuildFromSource,
  'withIosForceBuildFromSource'
);
