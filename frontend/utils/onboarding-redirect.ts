import { isTutorialRole } from '@oneandlab/onboarding'
import { getOnboardingPath, isOnboardingCompleted } from '~/utils/onboarding-storage'
import { resolvePostLoginPath, safeInternalReturnPath } from '~/utils/postLoginRedirect'
import {
  isNurseShareDeepLink,
  isPublicRdvSharePath,
  storePendingNurseShareLink,
} from '~/utils/nurse-share-pending'

function pathOnly(fullPath: string): string {
  const q = fullPath.indexOf('?')
  return q === -1 ? fullPath : fullPath.slice(0, q)
}

/** Accueil ou tutoriel startup si première connexion (aligné mobile). */
export function resolvePostLoginPathWithOnboarding(
  returnToRaw: unknown,
  role: string | undefined,
  options: { mustChangePassword?: boolean } = {},
): string {
  if (options.mustChangePassword) {
    return '/profile?changePassword=1'
  }

  const backFull = safeInternalReturnPath(returnToRaw)
  const pathname = backFull ? pathOnly(backFull) : null

  // Lien partage WhatsApp : atteindre /p/rdv (puis modal acceptation) avant le tutoriel.
  if (role === 'nurse' && pathname && isPublicRdvSharePath(pathname)) {
    return backFull!
  }

  if (isTutorialRole(role) && !isOnboardingCompleted(role)) {
    return getOnboardingPath(role)
  }

  return resolvePostLoginPath(returnToRaw, role)
}

export function isOnboardingRoutePath(path: string): boolean {
  return /\/(patient|nurse|pro|preleveur)\/onboarding\/?$/.test(path.split('?')[0])
}

/** Espaces dashboard où le gate onboarding s’applique. */
export function shouldApplyOnboardingGate(
  pathname: string,
  role: string | undefined,
  query?: Record<string, unknown>,
): boolean {
  if (!isTutorialRole(role)) return false
  if (isOnboardingRoutePath(pathname)) return false
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return false
  if (pathname === '/login' || pathname.startsWith('/login')) return false
  if (role === 'nurse' && isPublicRdvSharePath(pathname)) return false
  if (role === 'nurse' && query && isNurseShareDeepLink(query)) return false

  const prefixes = [`/${role}`]
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Mémorise le deep link partage avant redirection vers le tutoriel (login sans returnTo). */
export function rememberNurseShareBeforeOnboarding(query: Record<string, unknown>) {
  if (!isNurseShareDeepLink(query)) return
  const openAppointment = String(query.openAppointment).trim()
  const shareToken = String(query.shareToken ?? query.token).trim()
  storePendingNurseShareLink(shareToken, openAppointment)
}
