import {
  buildPatientAdoptBody,
  lookupPatientByContact as lookupByContact,
  type PatientLookupContact,
  type PatientLookupResult,
} from '@oneandlab/shared-api';

type LookupApiFetch = (
  url: string,
  opts?: { method?: string; body?: unknown },
) => Promise<{ success?: boolean; error?: string; data?: unknown }>;

/** GET /patients/lookup : e-mail d’abord, puis téléphone. Renvoie aussi le contact qui a trouvé le dossier. */
export function lookupPatientByContact(
  apiFetch: LookupApiFetch,
  email: string,
  phone: string,
): Promise<PatientLookupResult | null> {
  return lookupByContact((path) => apiFetch(path, { method: 'GET' }), email, phone);
}

/** POST /patients/adopt : contact recherché + consentement du patient. Lève `ApiHttpError` en cas de refus. */
export async function adoptStaffPatient(
  apiFetch: LookupApiFetch,
  patientId: string,
  contact: PatientLookupContact,
  consent: boolean,
): Promise<void> {
  const res = await apiFetch('/patients/adopt', {
    method: 'POST',
    body: buildPatientAdoptBody(patientId, contact, consent),
  });
  if (!res?.success) throw new Error(res?.error || 'Impossible d’utiliser ce dossier.');
}
