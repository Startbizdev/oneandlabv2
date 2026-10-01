/**
 * Recherche (`GET /patients/lookup`) puis rattachement (`POST /patients/adopt`) d'un dossier patient.
 * Sans lien préalable, l'adoption exige le contact exact qui a trouvé le dossier
 * (e-mail OU téléphone, jamais les deux) et le consentement du patient.
 */

/** Contact ayant permis de trouver le dossier ; rejoué tel quel à l'adoption. */
export type PatientLookupContact = { email: string } | { phone: string };

/**
 * Seuls champs de la réponse lookup lus par les clients : l'identifiant pour l'adoption,
 * le nom et la date de naissance pour l'invite « Patient déjà enregistré ».
 * Le dossier complet est rechargé après adoption (`GET /users/{id}`).
 */
export interface PatientLookupMatch {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
}

export interface PatientLookupResult {
  patient: PatientLookupMatch;
  contact: PatientLookupContact;
}

export interface PatientAdoptBody {
  patient_id: string;
  email?: string;
  phone?: string;
  patient_booking_consent: boolean;
}

type LookupGet = (path: string) => Promise<{ success?: boolean; data?: unknown }>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Format FR accepté par le lookup (0XXXXXXXXX ou +33XXXXXXXXX). */
export function isFrenchPhoneLookupFormat(phone: string): boolean {
  return /^(\+33|0)[1-9]\d{8}$/.test(phone.replace(/[\s.-]/g, ''));
}

function toLookupMatch(data: unknown): PatientLookupMatch | null {
  if (typeof data !== 'object' || data === null || !('id' in data)) return null;
  const row: { id: unknown; first_name?: unknown; last_name?: unknown; birth_date?: unknown } = data;
  if (row.id === null || row.id === undefined || String(row.id) === '') return null;
  const text = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    id: String(row.id),
    first_name: text(row.first_name),
    last_name: text(row.last_name),
    birth_date: text(row.birth_date),
  };
}

/** E-mail d'abord, puis téléphone si aucun dossier n'est trouvé par e-mail. */
export async function lookupPatientByContact(
  get: LookupGet,
  email: string,
  phone: string,
): Promise<PatientLookupResult | null> {
  const em = email.trim();
  const ph = phone.trim();
  if (EMAIL_RE.test(em)) {
    const res = await get(`/patients/lookup?email=${encodeURIComponent(em)}`);
    const patient = res.success ? toLookupMatch(res.data) : null;
    if (patient) return { patient, contact: { email: em } };
  }
  if (isFrenchPhoneLookupFormat(ph)) {
    const res = await get(`/patients/lookup?phone=${encodeURIComponent(ph)}`);
    const patient = res.success ? toLookupMatch(res.data) : null;
    if (patient) return { patient, contact: { phone: ph } };
  }
  return null;
}

export function buildPatientAdoptBody(
  patientId: string,
  contact: PatientLookupContact,
  consent: boolean,
): PatientAdoptBody {
  return {
    patient_id: patientId,
    ...('email' in contact ? { email: contact.email } : { phone: contact.phone }),
    patient_booking_consent: consent,
  };
}
