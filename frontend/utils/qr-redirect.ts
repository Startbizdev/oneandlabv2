/** Destinations autorisées après résolution d'un QR (anti open redirect). */

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PHARMACY_PATH = new RegExp(`^/pharmacie/${UUID_PATTERN}$`, 'i')
const BOOKING_PATH = '/rendez-vous/nouveau'

export function isAllowedQrRedirectPath(pathname: string): boolean {
  return pathname === BOOKING_PATH || PHARMACY_PATH.test(pathname)
}

/**
 * Chemin relatif (path + query + hash) si `redirectUrl` reste sur l'origine du site
 * et vise une destination QR connue ; sinon chaîne vide.
 */
export function safeQrRedirectPath(redirectUrl: string, siteUrl: string): string {
  try {
    const site = new URL(siteUrl)
    const target = new URL(redirectUrl, site)
    if (target.origin !== site.origin) return ''
    if (!isAllowedQrRedirectPath(target.pathname)) return ''
    return target.pathname + target.search + target.hash
  } catch {
    return ''
  }
}

export function isPharmacyId(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^${UUID_PATTERN}$`, 'i').test(value)
}
