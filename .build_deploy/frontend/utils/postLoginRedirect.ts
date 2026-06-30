/**
 * Accueil par rôle après connexion (hors deep links explicites).
 * À garder aligné avec les préfixes protégés ci-dessous.
 */
export const ROLE_HOME_PATHS: Record<string, string> = {
  super_admin: '/admin',
  admin: '/admin',
  lab: '/lab',
  subaccount: '/subaccount',
  nurse: '/nurse/appointments',
  preleveur: '/preleveur',
  pro: '/pro',
  patient: '/patient',
}

/** Query returnTo : URL interne uniquement (anti open redirect). */
export function safeInternalReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

function pathOnly(fullPath: string): string {
  const q = fullPath.indexOf('?')
  return q === -1 ? fullPath : fullPath.slice(0, q)
}

type Rule = { test: (pathname: string) => boolean; roles: string[] }

/** Espaces dashboard : si returnTo pointaille un espace, le rôle doit correspondre. */
const PROTECTED_PREFIXES: Rule[] = [
  { test: (p) => p === '/admin' || p.startsWith('/admin/'), roles: ['super_admin'] },
  { test: (p) => p === '/lab' || p.startsWith('/lab/'), roles: ['lab'] },
  { test: (p) => p === '/subaccount' || p.startsWith('/subaccount/'), roles: ['subaccount'] },
  { test: (p) => p === '/nurse' || p.startsWith('/nurse/'), roles: ['nurse'] },
  { test: (p) => p === '/preleveur' || p.startsWith('/preleveur/'), roles: ['preleveur'] },
  { test: (p) => p === '/pro' || p.startsWith('/pro/'), roles: ['pro'] },
  { test: (p) => p === '/patient' || p.startsWith('/patient/'), roles: ['patient'] },
  { test: (p) => p.startsWith('/p/'), roles: ['patient'] },
]

function requiredRolesForPathname(pathname: string): string[] | null {
  for (const rule of PROTECTED_PREFIXES) {
    if (rule.test(pathname)) return rule.roles
  }
  return null
}

/**
 * Après login : priorité au returnTo seulement s’il est compatible avec le rôle.
 * Évite /, /login ou une page « autre rôle » qui écrasait le bon tableau de bord.
 */
export function resolvePostLoginPath(returnToRaw: unknown, role: string | undefined): string {
  const home = ROLE_HOME_PATHS[role || ''] || '/patient'
  const backFull = safeInternalReturnPath(returnToRaw)
  if (!backFull || backFull === '/' || backFull === '/login' || backFull.startsWith('/login?')) {
    return home
  }

  const pathname = pathOnly(backFull)
  const required = requiredRolesForPathname(pathname)
  if (required) {
    if (!role || !required.includes(role)) {
      return home
    }
    return backFull
  }

  // Réservation / lien patient : garder le deep link pour les patients uniquement
  if (pathname.startsWith('/rendez-vous') || pathname.startsWith('/p/')) {
    if (role === 'patient') return backFull
    return home
  }

  return backFull
}
