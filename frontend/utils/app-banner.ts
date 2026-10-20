/** Bandeau « Ouvrir dans l'app » (iOS hors Safari) : logique pure, testable sans DOM. */

export const IOS_APP_STORE_ID = '6778805884'
/** Lien non localisé : fonctionne dans tous les pays. */
export const IOS_APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`

export const APP_BANNER_DISMISS_KEY = 'cary.appBanner.dismissedAt'
export const APP_BANNER_EMBED_KEY = 'cary.embed'
export const APP_BANNER_DISMISS_MS = 30 * 24 * 60 * 60 * 1000

/** Navigateurs iOS ou WebViews in-app où Safari n'affiche pas la Smart App Banner native. */
const NON_SAFARI_IOS_TOKENS =
  /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|Brave|FBAN|FBAV|FB_IAB|FBIOS|Instagram|Snapchat|LinkedInApp|Twitter|musical_ly|BytedanceWebview|TikTok|Line\/|MicroMessenger|Pinterest|WhatsApp/i

/** UA de l'app mobile Cary (WebView) : jamais de bandeau. */
const CARY_APP_UA = /CaryApp/i

export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  // iPadOS 13+ annonce un UA « Macintosh » de bureau : seul l'écran tactile le distingue.
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/** Safari iOS « pur » : la bannière native (meta apple-itunes-app) s'en charge. */
export function isIosSafari(userAgent: string): boolean {
  if (NON_SAFARI_IOS_TOKENS.test(userAgent)) return false
  return /Safari\//.test(userAgent) && /Version\//.test(userAgent)
}

export function isDismissalActive(dismissedAtRaw: string | null, now: number): boolean {
  if (!dismissedAtRaw) return false
  const dismissedAt = Number(dismissedAtRaw)
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return false
  if (dismissedAt > now) return false
  return now - dismissedAt < APP_BANNER_DISMISS_MS
}

export type AppBannerContext = {
  userAgent: string
  maxTouchPoints: number
  embedded: boolean
  dismissedAtRaw: string | null
  now: number
}

export function shouldShowCustomAppBanner(ctx: AppBannerContext): boolean {
  if (ctx.embedded) return false
  if (CARY_APP_UA.test(ctx.userAgent)) return false
  if (!isIosDevice(ctx.userAgent, ctx.maxTouchPoints)) return false
  if (isIosSafari(ctx.userAgent)) return false
  return !isDismissalActive(ctx.dismissedAtRaw, ctx.now)
}

/** Contenu de la meta Smart App Banner : l'app ouvre le lien universel reçu en argument. */
export function smartAppBannerContent(siteUrl: string, fullPath: string): string {
  const base = siteUrl.replace(/\/$/, '')
  const path = fullPath.startsWith('/') ? fullPath : `/${fullPath}`
  // La virgule sépare les paramètres de la meta : on l'encode dans l'URL.
  return `app-id=${IOS_APP_STORE_ID}, app-argument=${`${base}${path}`.replace(/,/g, '%2C')}`
}
