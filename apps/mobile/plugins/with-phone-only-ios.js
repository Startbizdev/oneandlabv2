const { withInfoPlist } = require('expo/config-plugins');

/**
 * App Store : iPhone uniquement (UIDeviceFamily = 1).
 * `supportsTablet: false` dans app.json aligne déjà la cible Xcode ; ce plugin verrouille l'Info.plist.
 */
function withPhoneOnlyIos(config) {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.UIDeviceFamily = [1];
    modConfig.modResults.UIRequiresFullScreen = true;
    delete modConfig.modResults['UISupportedInterfaceOrientations~ipad'];
    return modConfig;
  });
}

module.exports = withPhoneOnlyIos;
