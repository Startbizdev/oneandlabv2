import { FRENCH_MOBILE_PHONE_ERROR, isNursingAppointment, normalizeFrenchMobilePhone } from '@oneandlab/shared-utils';

export type NurseAssignmentMode = 'cary_dispatch' | 'patient_nurse';

export type ProNurseAssignment = {
  mode: NurseAssignmentMode;
  linkedNurseId?: string;
  external?: {
    phone: string;
  };
};

export function applyProNurseAssignmentToPayloads<T extends Record<string, unknown>>(
  payloads: T[],
  assignment: ProNurseAssignment | null | undefined,
): T[] {
  if (!assignment || assignment.mode !== 'patient_nurse') {
    return payloads;
  }

  const linkedNurseId = assignment.linkedNurseId?.trim() || '';
  const rawPhone = assignment.external?.phone?.trim() || '';
  const extPhone = normalizeFrenchMobilePhone(rawPhone) ?? rawPhone;

  if (!linkedNurseId && !extPhone) {
    return payloads;
  }

  let externalAttached = false;
  return payloads.map((raw) => {
    if (typeof raw.type !== 'string' || !isNursingAppointment(String(raw.type))) {
      return raw;
    }
    const extra: Record<string, unknown> = {};
    if (linkedNurseId) {
      extra.assigned_nurse_id = linkedNurseId;
    } else if (extPhone) {
      extra.skip_zone_dispatch = true;
      if (!externalAttached) {
        extra.external_nurse_invite = { phone: extPhone };
        externalAttached = true;
      }
    }
    return { ...raw, ...extra };
  });
}

export function validateProNurseAssignment(assignment: ProNurseAssignment | null | undefined): string | null {
  if (!assignment || assignment.mode !== 'patient_nurse') {
    return null;
  }
  const linked = assignment.linkedNurseId?.trim() || '';
  const extPhone = assignment.external?.phone?.trim() || '';

  if (!linked && !extPhone) {
    return "Choisissez un infirmier(ère) dans la liste ou renseignez son numéro de mobile pour l'invitation SMS.";
  }
  if (!linked) return externalNursePhoneError(extPhone);
  return null;
}

/** Erreur à afficher sous le champ, ou null si vide ou valide. */
export function externalNursePhoneError(phone: string): string | null {
  return phone.trim() && !normalizeFrenchMobilePhone(phone) ? FRENCH_MOBILE_PHONE_ERROR : null;
}
