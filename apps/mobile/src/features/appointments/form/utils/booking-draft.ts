import type { LabPreferenceMode } from '@oneandlab/shared-types';
import {
  bloodTestNeedsLabPreferenceStep,
  type DirectedProvider,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import type { AddressPayload } from '../types';
import type { NurseAssignmentMode } from './pro-nurse-assignment';
import { skipsLabPreferenceStep } from './booking-wizard-role-rules';

/** Un brouillon de réservation n'est proposé à la reprise que pendant 24 h. */
export const BOOKING_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type BookingDraftPatient = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: string;
  address: AddressPayload | null;
};

/**
 * Saisie simple du tunnel de création. Jamais de document ni de fichier (URI locale),
 * ni de donnée de paiement, ni de consentement : ils sont redemandés à la reprise.
 */
export type BookingDraftData = {
  step: number;
  wizardIndex: number;
  selectedServices: SelectedServiceInput[];
  formDataByService: Record<string, Record<string, unknown>>;
  patient: BookingDraftPatient;
  addressComplement: string;
  selectedPatientId: string;
  patientMode: 'existing' | 'new';
  selectedRelativeId: string | null;
  labPreferenceMode: LabPreferenceMode | '';
  preferredLabBrandId: string | null;
  nurseAssignmentMode: NurseAssignmentMode;
  proLinkedNurseId: string;
  externalNursePhone: string;
  /** Soignant présélectionné ; absent des brouillons enregistrés avant son ajout. */
  directedProvider?: DirectedProvider | null;
};

export type BookingDraft = { savedAt: number; data: BookingDraftData };

/** Clé de stockage propre au compte et au rôle connectés. */
export function bookingDraftOwnerKey(
  user: { id?: string | null; role?: string | null } | null | undefined,
): string | null {
  if (!user?.id || !user.role) return null;
  return `${user.role}:${user.id}`;
}

export function isBookingDraftExpired(draft: BookingDraft, now = Date.now()): boolean {
  return now - draft.savedAt > BOOKING_DRAFT_TTL_MS || draft.savedAt > now;
}

export function hasBookingDraftContent(data: BookingDraftData): boolean {
  return data.selectedServices.length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Retire récursivement toute référence de fichier (objet portant une `uri`). */
function stripFileRefs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripFileRefs).filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) {
    return typeof value === 'function' ? undefined : value;
  }
  if ('uri' in value) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const clean = stripFileRefs(item);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

/** Conserve les valeurs simples de chaque soin, sans les pièces jointes (`files`). */
export function sanitizeDraftFormDataByService(
  formDataByService: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [serviceId, slice] of Object.entries(formDataByService)) {
    if (!isPlainObject(slice)) continue;
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(slice)) {
      if (key === 'files') continue;
      const clean = stripFileRefs(value);
      if (clean !== undefined) rest[key] = clean;
    }
    out[serviceId] = rest;
  }
  return out;
}

/** Étape restaurée, bornée à ce que la sélection de soins permet d'atteindre. */
export function restoredBookingStep(
  data: BookingDraftData,
  role: string,
  provider: DirectedProvider | null = null,
): number {
  if (!hasBookingDraftContent(data)) return 0;
  const needsLab = bloodTestNeedsLabPreferenceStep(data.selectedServices, {
    skipForProviderBooking: skipsLabPreferenceStep(role, provider),
  });
  const maxStep = needsLab ? 2 : 1;
  const step = Math.trunc(Number(data.step) || 0);
  return Math.min(Math.max(0, step), maxStep);
}

/** Vérifie la forme d'un brouillon relu depuis le stockage de l'appareil. */
export function isBookingDraft(value: unknown): value is BookingDraft {
  if (!isPlainObject(value) || typeof value.savedAt !== 'number') return false;
  const data = value.data;
  return (
    isPlainObject(data) &&
    typeof data.step === 'number' &&
    typeof data.wizardIndex === 'number' &&
    Array.isArray(data.selectedServices) &&
    data.selectedServices.every(
      (svc) => isPlainObject(svc) && typeof svc.id === 'string' && typeof svc.type === 'string',
    ) &&
    isPlainObject(data.formDataByService) &&
    isPlainObject(data.patient) &&
    (data.patientMode === 'existing' || data.patientMode === 'new')
  );
}

/** Brouillons valides et non expirés parmi ceux relus depuis le stockage. */
export function pruneBookingDrafts(raw: unknown, now = Date.now()): Record<string, BookingDraft> {
  if (!isPlainObject(raw)) return {};
  const out: Record<string, BookingDraft> = {};
  for (const [key, draft] of Object.entries(raw)) {
    if (isBookingDraft(draft) && !isBookingDraftExpired(draft, now)) out[key] = draft;
  }
  return out;
}
