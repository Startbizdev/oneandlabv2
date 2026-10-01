import { getAppMeta, getContactClientInfo } from '@/features/help/utils/app-meta';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.4.1' }, nativeAppVersion: '2.4.0', nativeBuildVersion: '118' },
}));
jest.mock('expo-device', () => ({ modelName: 'Pixel 8', deviceName: 'Mon téléphone' }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

describe('contexte client du formulaire de contact', () => {
  it('envoie les valeurs brutes attendues par ContactInquiry::clientRows', () => {
    expect(getContactClientInfo()).toEqual({
      platform: 'android',
      app_version: '2.4.1',
      build: '118',
      device_model: 'Pixel 8',
    });
  });

  it('garde les libellés d’affichage de l’écran Support', () => {
    expect(getAppMeta()).toEqual({
      appVersion: '2.4.1',
      buildNumber: '118',
      platform: 'Android',
      deviceModel: 'Pixel 8',
    });
  });
});
