import { isNursingAppointment } from '@oneandlab/shared-utils';

export type NurseAssignmentMode = 'cary_dispatch' | 'patient_nurse';

export type ProNurseAssignment = {
  mode: NurseAssignmentMode;
  linkedNurseId?: string;
  external?: {
    phone: string;
  };
};

export function applyProNurseAssignmentToPayloads(
  payloads: Record<string, unknown>[],
  assignment: ProNurseAssignment | null | undefined,
): Record<string, unknown>[] {
  if (!assignment || assignment.mode !== 'patient_nurse') {
    return payloads;
  }

  const linkedNurseId = assignment.linkedNurseId?.trim() || '';
  const extPhone = assignment.external?.phone?.replace(/\s/g, '').trim() || '';

  if (!linkedNurseId && !extPhone) {
    return payloads;
  }

  let externalAttached = false;
  return payloads.map((raw) => {
    const p = { ...raw };
    if (typeof p.type !== 'string' || !isNursingAppointment(String(p.type))) {
      return p;
    }
    if (linkedNurseId) {
      p.assigned_nurse_id = linkedNurseId;
    } else if (extPhone) {
      p.skip_zone_dispatch = true;
      if (!externalAttached) {
        p.external_nurse_invite = { phone: extPhone };
        externalAttached = true;
      }
    }
    return p;
  });
}

export function validateProNurseAssignment(assignment: ProNurseAssignment | null | undefined): string | null {
  if (!assignment || assignment.mode !== 'patient_nurse') {
    return null;
  }
  const linked = assignment.linkedNurseId?.trim() || '';
  const extPhone = assignment.external?.phone?.replace(/\s/g, '').trim() || '';

  if (!linked && !extPhone) {
    return "Choisissez un infirmier(ère) dans la liste ou renseignez son numéro de mobile pour l'invitation SMS.";
  }
  return null;
}
