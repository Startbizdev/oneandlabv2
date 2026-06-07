const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * SDK 52+ : Expo configure automatiquement watchFolders / nodeModulesPaths.
 * Ne pas les redéfinir manuellement (risque d’erreurs Metro « Got unexpected undefined »).
 */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
