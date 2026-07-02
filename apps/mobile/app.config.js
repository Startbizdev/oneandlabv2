/** @type {import('expo/config').ExpoConfig} */
const { withAndroidManifest } = require('expo/config-plugins');
const appJson = require('./app.json');

const IS_DEV = process.env.APP_VARIANT === 'development';
const DEV_SCHEME = 'com.carybioapp.app.dev';

const basePlugins = (appJson.expo.plugins ?? []).filter(
  (plugin) =>
    plugin !== 'expo-dev-client' &&
    !(Array.isArray(plugin) && plugin[0] === 'expo-dev-client'),
);

/** Store Android : téléphones uniquement (pas tablettes). */
function withPhoneOnlyAndroid(config) {
  return withAndroidManifest(config, (modConfig) => {
    modConfig.modResults.manifest['supports-screens'] = [
      {
        $: {
          'android:smallScreens': 'true',
          'android:normalScreens': 'true',
          'android:largeScreens': 'false',
          'android:xlargeScreens': 'false',
        },
      },
    ];
    return modConfig;
  });
}

module.exports = {
  expo: {
    ...appJson.expo,
    name: IS_DEV ? 'Cary Dev' : appJson.expo.name,
    slug: appJson.expo.slug,
    scheme: IS_DEV ? DEV_SCHEME : appJson.expo.scheme,
    extra: {
      ...appJson.expo.extra,
      eas: {
        projectId: '7aee15c6-b9f9-45ac-b30e-0577641fcb03',
      },
      appVariant: IS_DEV ? 'development' : 'production',
    },
    platforms: ['ios', 'android'],
    ios: {
      ...appJson.expo.ios,
      bundleIdentifier: IS_DEV ? 'com.carybioapp.app.dev' : appJson.expo.ios.bundleIdentifier,
      infoPlist: {
        ...appJson.expo.ios.infoPlist,
        CFBundleDisplayName: IS_DEV ? 'Cary Dev' : appJson.expo.ios.infoPlist?.CFBundleDisplayName,
        ...(IS_DEV
          ? {
              NSLocalNetworkUsageDescription:
                'Cary Dev se connecte au serveur Metro sur votre réseau local pour charger le code JavaScript.',
              NSBonjourServices: ['_expo._tcp'],
            }
          : {}),
      },
    },
    android: {
      ...appJson.expo.android,
      package: IS_DEV ? 'com.carybioapp.app.dev' : appJson.expo.android.package,
      softwareKeyboardLayoutMode: 'resize',
    },
    ...(IS_DEV
      ? {
          autolinking: {
            ios: {
              // Fix EAS dev client iOS : prebuilt XCFrameworks → dev launcher jamais invoqué
              // → "No script URL provided" (expo/expo#41751, docs prebuilt-expo-modules).
              buildFromSource: ['.*'],
            },
          },
        }
      : {}),
    plugins: [
      [
        'expo-dev-client',
        {
          // Doc Expo : "most-recent" tente de charger sans URL Metro → "No script URL provided".
          // "launcher" affiche toujours l'écran de connexion (Enter URL manually).
          // https://docs.expo.dev/versions/latest/sdk/dev-client/
          launchMode: IS_DEV ? 'launcher' : 'most-recent',
          ios: { launchMode: IS_DEV ? 'launcher' : 'most-recent' },
          android: { launchMode: IS_DEV ? 'launcher' : 'most-recent' },
          addGeneratedScheme: IS_DEV,
        },
      ],
      ...basePlugins,
      withPhoneOnlyAndroid,
      'expo-iap',
      'expo-font',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
            minSdkVersion: 26,
          },
          ...(IS_DEV
            ? {
                buildReactNativeFromSource: true,
                ios: {
                  usePrecompiledModules: false,
                  buildReactNativeFromSource: true,
                },
              }
            : {}),
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Cary utilise votre position pour optimiser l’ordre de votre tournée et afficher les distances entre vos passages.',
        },
      ],
    ],
  },
};
