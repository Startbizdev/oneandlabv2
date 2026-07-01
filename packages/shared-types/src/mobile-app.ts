export type MobileAppPlatformPolicy = {
  min_version: string;
  latest_version: string;
  store_url: string;
  min_version_code?: number;
};

export type MobileAppVersionPolicy = {
  ios: MobileAppPlatformPolicy;
  android: MobileAppPlatformPolicy & { min_version_code: number };
  messages: {
    force: string;
    optional: string;
  };
};
