import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import type { MobileAppPlatformPolicy, MobileAppVersionPolicy } from '@oneandlab/shared-types';
import { isVersionLower } from '@oneandlab/shared-utils';
import { getAppMeta } from '@/features/help/utils/app-meta';
import {
  ANDROID_PLAY_STORE_URL,
  APP_BUNDLE_ID,
  APP_DOWNLOAD_FALLBACK_URL,
  IOS_APP_STORE_ID,
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

function resolveStoreHttpsUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed || defaultStoreUrl();
}

function extractAndroidPackageId(url: string): string {
  const match = url.match(/[?&]id=([^&]+)/);
  return match?.[1] ?? APP_BUNDLE_ID;
}

function extractIosAppStoreId(url: string): string {
  const match = url.match(/\/id(\d+)/);
  if (match?.[1]) return match[1];
  if (/^\d+$/.test(url.trim())) return url.trim();
  return IOS_APP_STORE_ID;
}

function toAndroidPlayStoreDeepLink(httpsUrl: string): string {
  return `market://details?id=${extractAndroidPackageId(httpsUrl)}`;
}

function toIosAppStoreDeepLink(httpsUrl: string): string {
  return `itms-apps://apps.apple.com/app/id${extractIosAppStoreId(httpsUrl)}`;
}

async function openUrlWithFallbacks(primary: string, fallbacks: string[]): Promise<void> {
  const candidates = [primary, ...fallbacks];
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      await Linking.openURL(candidates[i]!);
      return;
    } catch {
      // Essayer l’URL suivante.
    }
  }
}

/** Ouvre la fiche store native (Play Store / App Store), avec repli HTTPS puis page Cary. */
export async function openAppStoreUrl(url: string): Promise<void> {
  const httpsUrl = resolveStoreHttpsUrl(url);

  if (Platform.OS === 'ios') {
    await openUrlWithFallbacks(toIosAppStoreDeepLink(httpsUrl), [httpsUrl, APP_DOWNLOAD_FALLBACK_URL]);
    return;
  }

  if (Platform.OS === 'android') {
    await openUrlWithFallbacks(toAndroidPlayStoreDeepLink(httpsUrl), [httpsUrl, APP_DOWNLOAD_FALLBACK_URL]);
  }
}
