/** Page d'accueil QR d'une pharmacie : destinations selon le rôle connecté. */

export type PublicPharmacy = {
  id: string
  name: string
  city: string | null
  orders_open: boolean
  accepts_click_collect: boolean
  accepts_home_delivery: boolean
}

/** Formulaires web de commande pharmacie par rôle (les autres rôles commandent dans l'app). */
const ORDER_FORM_PATHS: Record<string, string> = {
  patient: '/patient/traitements/new',
  nurse: '/nurse/commandes-pharmacie/new',
  pro: '/pro/commandes-pharmacie/new',
}

/** Retour après connexion : la page pharmacie reprend la commande pour le bon rôle. */
export const PHARMACY_ORDER_INTENT = 'commander'

function withQuery(path: string, query: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export function pharmacyOrderPath(role: string | null | undefined, pharmacyId: string, utmQr?: string | null): string | null {
  const base = role ? ORDER_FORM_PATHS[role] : undefined
  if (!base) return null
  return withQuery(base, { pharmacy_id: pharmacyId, utm_qr: utmQr })
}

export function pharmacyLandingPath(pharmacyId: string, utmQr?: string | null, intent?: string | null): string {
  return withQuery(`/pharmacie/${encodeURIComponent(pharmacyId)}`, { utm_qr: utmQr, intent })
}

export function pharmacyLoginPath(pharmacyId: string, utmQr?: string | null): string {
  return withQuery('/login', { returnTo: pharmacyLandingPath(pharmacyId, utmQr, PHARMACY_ORDER_INTENT) })
}

export function pharmacyBookingPath(pharmacyId: string, utmQr?: string | null): string {
  return withQuery('/rendez-vous/nouveau', { provider_id: pharmacyId, provider_type: 'pro', utm_qr: utmQr })
}

export function normalizePublicPharmacy(raw: unknown): PublicPharmacy | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (typeof data.id !== 'string' || !data.id) return null
  const city = typeof data.city === 'string' && data.city.trim() ? data.city.trim() : null
  return {
    id: data.id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Pharmacie',
    city,
    orders_open: data.orders_open === true,
    accepts_click_collect: data.accepts_click_collect === true,
    accepts_home_delivery: data.accepts_home_delivery === true,
  }
}
