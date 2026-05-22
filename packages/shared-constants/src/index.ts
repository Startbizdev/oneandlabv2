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

/** Polling notifications — frontend/layouts/dashboard.vue */
export const NOTIFICATION_POLL_INTERVAL_MS = 10_000;

/** Polling RDV en attente — frontend/layouts/dashboard.vue (10s) */
export const APPOINTMENT_PENDING_POLL_INTERVAL_MS = 10_000;

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
