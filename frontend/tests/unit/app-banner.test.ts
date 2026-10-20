import { describe, expect, it } from 'vitest';
import {
  APP_BANNER_DISMISS_MS,
  isDismissalActive,
  isIosDevice,
  isIosSafari,
  shouldShowCustomAppBanner,
  smartAppBannerContent,
  type AppBannerContext,
} from '~/utils/app-banner';

const UA = {
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  firefoxIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
  edgeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/125.0.2535.87 Mobile/15E148 Safari/605.1.15',
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone14,5; iOS 17_5; fr_FR)',
  facebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.98;FBBV/123]',
  ipadDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  ipadChromeDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  caryApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CaryApp/1.8.47',
};

const NOW = 1_800_000_000_000;

function ctx(userAgent: string, extra: Partial<AppBannerContext> = {}): AppBannerContext {
  return { userAgent, maxTouchPoints: 5, embedded: false, dismissedAtRaw: null, now: NOW, ...extra };
}

describe('détection iOS', () => {
  it('reconnaît iPhone et iPadOS en UA bureau tactile', () => {
    expect(isIosDevice(UA.safariIphone)).toBe(true);
    expect(isIosDevice(UA.ipadDesktop, 5)).toBe(true);
    expect(isIosDevice(UA.ipadDesktop, 0)).toBe(false);
    expect(isIosDevice(UA.android, 5)).toBe(false);
  });

  it('distingue Safari des autres navigateurs iOS', () => {
    expect(isIosSafari(UA.safariIphone)).toBe(true);
    expect(isIosSafari(UA.chromeIphone)).toBe(false);
    expect(isIosSafari(UA.firefoxIphone)).toBe(false);
    expect(isIosSafari(UA.edgeIphone)).toBe(false);
    expect(isIosSafari(UA.instagram)).toBe(false);
    expect(isIosSafari(UA.facebook)).toBe(false);
  });
});

describe('bandeau app personnalisé', () => {
  it('s’affiche sur Chrome, Firefox, Edge iOS et les navigateurs in-app', () => {
    for (const ua of [UA.chromeIphone, UA.firefoxIphone, UA.edgeIphone, UA.instagram, UA.facebook, UA.ipadChromeDesktop]) {
      expect(shouldShowCustomAppBanner(ctx(ua))).toBe(true);
    }
  });

  it('ne double pas la bannière native de Safari iOS', () => {
    expect(shouldShowCustomAppBanner(ctx(UA.safariIphone))).toBe(false);
    expect(shouldShowCustomAppBanner(ctx(UA.ipadDesktop))).toBe(false);
  });

  it('reste masqué sur Android, bureau et dans la WebView de l’app', () => {
    expect(shouldShowCustomAppBanner(ctx(UA.android))).toBe(false);
    expect(shouldShowCustomAppBanner(ctx(UA.desktopChrome, { maxTouchPoints: 0 }))).toBe(false);
    expect(shouldShowCustomAppBanner(ctx(UA.chromeIphone, { embedded: true }))).toBe(false);
    expect(shouldShowCustomAppBanner(ctx(UA.caryApp))).toBe(false);
  });

  it('respecte la fermeture pendant 30 jours', () => {
    const recent = String(NOW - 1000);
    const old = String(NOW - APP_BANNER_DISMISS_MS - 1);
    expect(shouldShowCustomAppBanner(ctx(UA.chromeIphone, { dismissedAtRaw: recent }))).toBe(false);
    expect(shouldShowCustomAppBanner(ctx(UA.chromeIphone, { dismissedAtRaw: old }))).toBe(true);
  });

  it('ignore une date de fermeture invalide ou future', () => {
    expect(isDismissalActive('abc', NOW)).toBe(false);
    expect(isDismissalActive('0', NOW)).toBe(false);
    expect(isDismissalActive(String(NOW + 60_000), NOW)).toBe(false);
    expect(isDismissalActive(null, NOW)).toBe(false);
  });
});

describe('Smart App Banner native', () => {
  it('passe l’URL courante en argument', () => {
    expect(smartAppBannerContent('https://cary.bio/', '/pharmacie/abc?utm_qr=x')).toBe(
      'app-id=6778805884, app-argument=https://cary.bio/pharmacie/abc?utm_qr=x',
    );
  });

  it('encode les virgules qui casseraient la meta', () => {
    expect(smartAppBannerContent('https://cary.bio', '/a?x=1,2')).toBe(
      'app-id=6778805884, app-argument=https://cary.bio/a?x=1%2C2',
    );
  });
});
