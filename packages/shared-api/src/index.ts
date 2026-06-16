/**
 * Contrat API — source: frontend/utils/api.ts
 */

/** Routes publiques sans CSRF */
export const PUBLIC_API_ROUTES = [
  '/auth/check-email',
  '/auth/request-otp',
  '/auth/verify-otp',
  '/auth/login',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/guest-to-user',
  '/auth/csrf-token',
  '/auth/logout',
  '/ban/search',
  '/registration-requests',
  '/contact',
  '/qr/resolve',
  '/qr/visit',
] as const;

export const CSRF_ERROR_CODES = [
  'CSRF_TOKEN_MISSING',
  'CSRF_TOKEN_INVALID',
] as const;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages?: number;
  };
}

export function requiresCsrf(path: string, method: string): boolean {
  if (['GET', 'OPTIONS'].includes(method.toUpperCase())) return false;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return !PUBLIC_API_ROUTES.some((route) => normalized.startsWith(route));
}

/** URL pending offers — source: frontend/layouts/dashboard.vue appointmentsPendingOffersUrl */
export function appointmentsPendingOffersQuery(role: string): string {
  const qs = new URLSearchParams({ status: 'pending', limit: '100' });
  if (role === 'nurse') {
    qs.set('nurse_tab', 'soins');
    qs.set('nurse_segment', 'en_attente');
  }
  return `/appointments?${qs.toString()}`;
}
