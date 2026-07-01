/** @type {import('expo/config').ExpoConfig} */
const { withAndroidManifest } = require('expo/config-plugins');
const appJson = require('./app.json');

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
    extra: {
      ...appJson.expo.extra,
      eas: {
        projectId: '7aee15c6-b9f9-45ac-b30e-0577641fcb03',
      },
    },
    platforms: ['ios', 'android'],
    android: {
      ...appJson.expo.android,
      softwareKeyboardLayoutMode: 'resize',
    },
    plugins: [
      ...(appJson.expo.plugins ?? []),
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
