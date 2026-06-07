/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

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
      'expo-font',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
          ios: {
            // EAS SDK 54 : forcer RN + Hermes depuis sources (évite [CP] Copy XCFrameworks).
            buildReactNativeFromSource: true,
          },
        },
      ],
      './plugins/withIosForceBuildFromSource',
    ],
  },
};
