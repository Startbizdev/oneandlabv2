import { isBloodTestAppointment, isNursingAppointment, type AppointmentTypeLike } from './appointment-type-rules';

/**
 * Réservation patient avec un prestataire choisi (fiche publique, QR, « Mes donneurs de soins »).
 * Le serveur revérifie le rôle du prestataire (AppointmentCreateInputPolicy::patientAssignments).
 */
export type DirectedProviderType = 'nurse' | 'lab' | 'pro';

export type DirectedProvider = { id: string; type: DirectedProviderType };

export type DirectedProviderAssignmentField = 'assigned_nurse_id' | 'assigned_lab_id' | 'assigned_pro_id';

export type DirectedProviderAppointmentType = 'nursing' | 'blood_test';

/** Rôle de profil → prestataire réservable ; préleveur, pharmacie et autres rôles : null. */
export function directedProviderTypeForRole(role: string | null | undefined): DirectedProviderType | null {
  switch (String(role ?? '').trim()) {
    case 'nurse':
      return 'nurse';
    case 'lab':
    case 'subaccount':
      return 'lab';
    case 'pro':
      return 'pro';
    default:
      return null;
  }
}

export function resolveDirectedProvider(
  id: string | null | undefined,
  role: string | null | undefined,
): DirectedProvider | null {
  const trimmedId = String(id ?? '').trim();
  const type = directedProviderTypeForRole(role);
  return trimmedId && type ? { id: trimmedId, type } : null;
}

/** Types de soin réservables avec ce prestataire, alignés sur GET /categories?provider_id=. */
export function directedProviderAppointmentTypes(
  type: DirectedProviderType,
): readonly DirectedProviderAppointmentType[] {
  switch (type) {
    case 'nurse':
      return ['nursing'];
    case 'lab':
      return ['blood_test'];
    case 'pro':
      return ['nursing', 'blood_test'];
  }
}

/** Champ d'assignation d'un payload de création de RDV, ou null si ce soin ne passe pas par ce prestataire. */
export function directedProviderAssignmentField(
  type: DirectedProviderType,
  appointmentType: AppointmentTypeLike,
): DirectedProviderAssignmentField | null {
  switch (type) {
    case 'nurse':
      return isNursingAppointment(appointmentType) ? 'assigned_nurse_id' : null;
    case 'lab':
      return isBloodTestAppointment(appointmentType) ? 'assigned_lab_id' : null;
    case 'pro':
      return 'assigned_pro_id';
  }
}

export function applyDirectedProviderToPayloads<T extends Record<string, unknown>>(
  payloads: T[],
  provider: DirectedProvider | null | undefined,
): T[] {
  if (!provider) return payloads;
  return payloads.map((payload) => {
    const field = directedProviderAssignmentField(
      provider.type,
      typeof payload.type === 'string' ? payload.type : null,
    );
    return field ? { ...payload, [field]: provider.id } : payload;
  });
}
