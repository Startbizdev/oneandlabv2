const { createRunOncePlugin, withPodfile } = require('expo/config-plugins');

const MARKER = '# @oneandlab/withIosForceBuildFromSource';

const FORCE_FROM_SOURCE_RUBY = `
${MARKER}
# EAS SDK 54 peut pré-définir RCT_USE_PREBUILT_*=1 ; on force la compilation depuis sources.
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
ENV['RCT_USE_RN_DEP'] = '0'
ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
`;

function withIosForceBuildFromSource(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes(MARKER)) {
      const anchor =
        "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";
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

module.exports = createRunOncePlugin(
  withIosForceBuildFromSource,
  'withIosForceBuildFromSource'
);
