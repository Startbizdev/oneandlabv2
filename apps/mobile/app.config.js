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
      usesCleartextTraffic: true,
    },
    plugins: ['expo-font'],
  },
};
