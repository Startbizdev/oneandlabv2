jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo/fetch s'appuie sur le module natif ExpoFetchModule, absent sous Jest.
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
