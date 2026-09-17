/**
 * Cloche / liste notifications (§4.7) : pas de tiret cadratin, titres et corps compacts.
 */
export function sanitizeNotificationText(input: string | null | undefined): string {
  if (input == null || typeof input !== 'string') return ''
  return input
    .replace(/\u2014/g, '·')
    .replace(/\u2013/g, '·')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cloche / liste : titres plus longs (le menu gère le retour à la ligne). */
const BELL_TITLE_MAX_LEN = 120
const BELL_BODY_MAX_LEN = 400

export function truncateForNotificationTitle(s: string, maxLen = BELL_TITLE_MAX_LEN): string {
  const t = sanitizeNotificationText(s)
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trimEnd()}…`
}

export function truncateForNotificationBody(s: string, maxLen = BELL_BODY_MAX_LEN): string | undefined {
  const t = sanitizeNotificationText(s)
  if (!t) return undefined
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trimEnd()}…`
}

/** Titre + ligne secondaire optionnelle pour le menu cloche (évite doublon titre = corps). */
export type BellNotificationFormatOptions = {
  /** Type backend (ex. `welcome`) — règles d'affichage spécifiques. */
  type?: string
  titleMaxLen?: number
  bodyMaxLen?: number
}

const WELCOME_NOTIFICATION_BODY_MAX_LEN = 320

export function formatBellNotificationLines(
  title: string | null | undefined,
  message: string | null | undefined,
  options?: BellNotificationFormatOptions,
): { label: string; message?: string } {
  const titleMaxLen = options?.titleMaxLen ?? BELL_TITLE_MAX_LEN
  const bodyMaxLen =
    options?.bodyMaxLen ?? (options?.type === 'welcome' ? WELCOME_NOTIFICATION_BODY_MAX_LEN : BELL_BODY_MAX_LEN)

  const hasTitle = Boolean(title?.trim())
  const hasMessage = Boolean(message?.trim())
  const rawLabel = hasTitle ? String(title) : hasMessage ? String(message) : 'Notification'
  const label = truncateForNotificationTitle(sanitizeNotificationText(rawLabel), titleMaxLen)

  const tSan = hasTitle ? sanitizeNotificationText(title) : ''
  const mSan = hasMessage ? sanitizeNotificationText(message) : ''
  let secondary: string | undefined
  if (hasTitle && hasMessage && mSan !== tSan) {
    secondary = truncateForNotificationBody(mSan, bodyMaxLen)
  }
  return { label, message: secondary }
}
