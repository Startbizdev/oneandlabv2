import { isTutorialRole } from '@oneandlab/onboarding'
import { getOnboardingPath, isOnboardingCompleted } from '~/utils/onboarding-storage'
import { resolvePostLoginPath } from '~/utils/postLoginRedirect'

/** Accueil ou tutoriel startup si première connexion (aligné mobile). */
export function resolvePostLoginPathWithOnboarding(
  returnToRaw: unknown,
  role: string | undefined,
  options: { mustChangePassword?: boolean } = {},
): string {
  if (options.mustChangePassword) {
    return '/profile?changePassword=1'
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
export function shouldApplyOnboardingGate(pathname: string, role: string | undefined): boolean {
  if (!isTutorialRole(role)) return false
  if (isOnboardingRoutePath(pathname)) return false
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return false
  if (pathname === '/login' || pathname.startsWith('/login')) return false

  const prefixes = [`/${role}`]
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
