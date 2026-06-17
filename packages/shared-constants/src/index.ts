/**
 * Constantes partagées — source: frontend/utils/postLoginRedirect.ts, usePolling
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
};

/** Polling notifications (mobile + web) — 60s pour limiter la concurrence réseau */
export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

/** Polling RDV en attente infirmier */
export const APPOINTMENT_PENDING_POLL_INTERVAL_MS = 60_000;

/** React Query staleTime (mobile) */
export const CACHE_STALE_APPOINTMENTS_LIST_MS = 120_000;
export const CACHE_STALE_APPOINTMENT_DETAIL_MS = 60_000;
export const CACHE_STALE_CATEGORIES_MS = 24 * 60 * 60_000;
export const CACHE_STALE_RELATIVES_MS = 10 * 60_000;
export const FOREGROUND_REFETCH_MIN_AGE_MS = 120_000;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  lab: 'Laboratoire',
  subaccount: 'Sous-compte',
  nurse: 'Infirmier',
  preleveur: 'Préleveur',
  pro: 'Professionnel',
  patient: 'Patient',
};

/** Rôles ciblés par l'app mobile */
export const MOBILE_ROLES = ['nurse', 'pro', 'preleveur', 'patient'] as const;

export type MobileRole = (typeof MOBILE_ROLES)[number];

export * from './availability';
export * from './nursing-duration';
export * from './care-category-autre-detail';
export * from './cancellation-reasons';
export * from './nurse-subscription-plans';
export * from './patient-vip-iap';
