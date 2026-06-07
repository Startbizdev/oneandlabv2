const { withPodfile } = require('expo/config-plugins');

const MARKER = '# @oneandlab/withIosForceBuildFromSource';

const FORCE_FROM_SOURCE_RUBY = `
${MARKER}
if podfile_properties['ios.buildReactNativeFromSource'] == 'true'
  ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
  ENV['RCT_USE_RN_DEP'] = '0'
  ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
end
`;

/**
 * EAS SDK 54 peut exporter RCT_USE_PREBUILT_RNCORE=1 avant pod install.
 * Le Podfile template n'utilise que ||= et ne désactive pas les binaires précompilés.
 * Hermes reste alors en XCFramework → échec fréquent sur [CP] Copy XCFrameworks.
 */
function withIosForceBuildFromSource(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes(MARKER)) {
      const anchor =
        "ENV['RCT_USE_PREBUILT_RNCORE'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true' && podfile_properties['newArchEnabled'] != 'false'";
      if (!contents.includes(anchor)) {
        throw new Error(
          'withIosForceBuildFromSource: Podfile Expo inattendu — mettez à jour le plugin ou le SDK Expo.'
        );
      }
      contents = contents.replace(anchor, `${anchor}${FORCE_FROM_SOURCE_RUBY}`);
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withIosForceBuildFromSource;
