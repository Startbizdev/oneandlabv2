import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export function getAppMeta() {
  return {
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '—',
    buildNumber: Constants.nativeBuildVersion ?? '—',
    platform: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS,
    deviceModel: Device.modelName ?? Device.deviceName ?? '—',
  };
}
