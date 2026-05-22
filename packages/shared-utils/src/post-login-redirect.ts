import { ROLE_HOME_PATHS } from '@oneandlab/shared-constants';

export { ROLE_HOME_PATHS };

export function safeInternalReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function pathOnly(fullPath: string): string {
  const q = fullPath.indexOf('?');
  return q === -1 ? fullPath : fullPath.slice(0, q);
}

type Rule = { test: (pathname: string) => boolean; roles: string[] };

const PROTECTED_PREFIXES: Rule[] = [
  { test: (p) => p === '/admin' || p.startsWith('/admin/'), roles: ['super_admin'] },
  { test: (p) => p === '/lab' || p.startsWith('/lab/'), roles: ['lab'] },
  { test: (p) => p === '/subaccount' || p.startsWith('/subaccount/'), roles: ['subaccount'] },
  { test: (p) => p === '/nurse' || p.startsWith('/nurse/'), roles: ['nurse'] },
  { test: (p) => p === '/preleveur' || p.startsWith('/preleveur/'), roles: ['preleveur'] },
  { test: (p) => p === '/pro' || p.startsWith('/pro/'), roles: ['pro'] },
  { test: (p) => p === '/patient' || p.startsWith('/patient/'), roles: ['patient'] },
  { test: (p) => p.startsWith('/p/'), roles: ['patient'] },
];

function requiredRolesForPathname(pathname: string): string[] | null {
  for (const rule of PROTECTED_PREFIXES) {
    if (rule.test(pathname)) return rule.roles;
  }
  return null;
}

export function resolvePostLoginPath(returnToRaw: unknown, role: string | undefined): string {
  const home = ROLE_HOME_PATHS[role || ''] || '/patient';
  const backFull = safeInternalReturnPath(returnToRaw);
  if (!backFull || backFull === '/' || backFull === '/login' || backFull.startsWith('/login?')) {
    return home;
  }

  const pathname = pathOnly(backFull);
  const required = requiredRolesForPathname(pathname);
  if (required) {
    if (!role || !required.includes(role)) {
      return home;
    }
    return backFull;
  }

  if (pathname.startsWith('/rendez-vous') || pathname.startsWith('/p/')) {
    if (role === 'patient') return backFull;
    return home;
  }

  return backFull;
}
