/** Contexte lien partage WhatsApp à restaurer après le tutoriel startup. */
const PENDING_SHARE_KEY = 'nurse_pending_share_link'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export type PendingNurseShareLink = {
  shareToken: string
  openAppointment: string
  at: number
}

export function isNurseShareDeepLink(query: Record<string, unknown>): boolean {
  const openAppointment = query.openAppointment
  const shareToken = query.shareToken ?? query.token
  return (
    typeof openAppointment === 'string'
    && openAppointment.trim().length > 0
    && typeof shareToken === 'string'
    && shareToken.trim().length > 0
  )
}

export function isPublicRdvSharePath(pathname: string): boolean {
  return /^\/p\/rdv\/[^/]+$/.test(pathname.split('?')[0])
}

export function storePendingNurseShareLink(shareToken: string, openAppointment: string) {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      PENDING_SHARE_KEY,
      JSON.stringify({
        shareToken: shareToken.trim(),
        openAppointment: openAppointment.trim(),
        at: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function readPendingNurseShareLink(): PendingNurseShareLink | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(PENDING_SHARE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as Partial<PendingNurseShareLink>
    if (
      !j?.shareToken
      || !j?.openAppointment
      || typeof j.at !== 'number'
      || Date.now() - j.at > MAX_AGE_MS
    ) {
      sessionStorage.removeItem(PENDING_SHARE_KEY)
      return null
    }
    return {
      shareToken: String(j.shareToken),
      openAppointment: String(j.openAppointment),
      at: j.at,
    }
  } catch {
    return null
  }
}

export function clearPendingNurseShareLink() {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(PENDING_SHARE_KEY)
  } catch {
    /* ignore */
  }
}

export function pendingNurseShareDemandesPath(): string | null {
  const pending = readPendingNurseShareLink()
  if (!pending) return null
  const q = new URLSearchParams({
    shareToken: pending.shareToken,
    openAppointment: pending.openAppointment,
  })
  return `/nurse/demandes?${q.toString()}`
}
