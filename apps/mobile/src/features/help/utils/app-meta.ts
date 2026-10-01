import type { ContactClientInfo } from '@oneandlab/shared-api';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

function rawAppMeta() {
  return {
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? undefined,
    buildNumber: Constants.nativeBuildVersion ?? undefined,
    deviceModel: Device.modelName ?? Device.deviceName ?? undefined,
  };
}

export function getAppMeta() {
  const meta = rawAppMeta();
  return {
    appVersion: meta.appVersion ?? '—',
    buildNumber: meta.buildNumber ?? '—',
    platform: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS,
    deviceModel: meta.deviceModel ?? '—',
  };
}

/** Champ `client` de `POST /contact` : le serveur ignore toute valeur hors de son format. */
export function getContactClientInfo(): ContactClientInfo {
  const meta = rawAppMeta();
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    app_version: meta.appVersion,
    build: meta.buildNumber,
    device_model: meta.deviceModel,
  };
}
