const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Monorepo npm : les packages @oneandlab/* sont hoistés à la racine.
 * Metro (cwd apps/mobile) doit voir node_modules du workspace + packages/.
 */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])];
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    '@oneandlab/onboarding': path.resolve(monorepoRoot, 'packages/onboarding'),
    '@oneandlab/shared-api': path.resolve(monorepoRoot, 'packages/shared-api'),
    '@oneandlab/shared-constants': path.resolve(monorepoRoot, 'packages/shared-constants'),
    '@oneandlab/shared-types': path.resolve(monorepoRoot, 'packages/shared-types'),
    '@oneandlab/shared-utils': path.resolve(monorepoRoot, 'packages/shared-utils'),
    // SDK 54 : une seule version worklets (0.5.1) alignée sur le binaire Cary Dev.
    'react-native-worklets': path.resolve(projectRoot, 'node_modules/react-native-worklets'),
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
