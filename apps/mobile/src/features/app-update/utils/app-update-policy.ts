import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import type { MobileAppPlatformPolicy, MobileAppVersionPolicy } from '@oneandlab/shared-types';
import { isVersionLower } from '@oneandlab/shared-utils';
import { getAppMeta } from '@/features/help/utils/app-meta';
import {
  ANDROID_PLAY_STORE_URL,
  APP_DOWNLOAD_FALLBACK_URL,
  IOS_APP_STORE_URL,
} from '@/config/brand';

export type AppUpdateRequirement = 'none' | 'optional' | 'force';

export type AppUpdateState = {
  requirement: AppUpdateRequirement;
  message: string;
  storeUrl: string;
  latestVersion: string;
};

function getAndroidVersionCode(): number | null {
  const code = Constants.expoConfig?.android?.versionCode;
  return typeof code === 'number' && Number.isFinite(code) ? code : null;
}

function defaultStoreUrl(): string {
  return Platform.OS === 'ios' ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL;
}

function getPlatformPolicy(policy: MobileAppVersionPolicy): MobileAppPlatformPolicy & { min_version_code?: number } {
  return Platform.OS === 'ios' ? policy.ios : policy.android;
}

export function evaluateAppUpdateRequirement(policy: MobileAppVersionPolicy): AppUpdateState {
  const platformPolicy = getPlatformPolicy(policy);
  const { appVersion } = getAppMeta();
  const storeUrl = platformPolicy.store_url?.trim() || defaultStoreUrl();

  const belowMinimum =
    isVersionLower(appVersion, platformPolicy.min_version) ||
    (Platform.OS === 'android' &&
      typeof platformPolicy.min_version_code === 'number' &&
      (() => {
        const versionCode = getAndroidVersionCode();
        return versionCode != null && versionCode < platformPolicy.min_version_code!;
      })());

  if (belowMinimum) {
    return {
      requirement: 'force',
      message: policy.messages.force,
      storeUrl,
      latestVersion: platformPolicy.latest_version,
    };
  }

  if (isVersionLower(appVersion, platformPolicy.latest_version)) {
    return {
      requirement: 'optional',
      message: policy.messages.optional,
      storeUrl,
      latestVersion: platformPolicy.latest_version,
    };
  }

  return {
    requirement: 'none',
    message: '',
    storeUrl,
    latestVersion: platformPolicy.latest_version,
  };
}

export function openAppStoreUrl(url: string): void {
  const target =
    Platform.OS === 'android' && url.startsWith('https://play.google.com/')
      ? url.replace('https://play.google.com/', 'market://')
      : url;
  void Linking.openURL(target).catch(() => Linking.openURL(APP_DOWNLOAD_FALLBACK_URL));
}
