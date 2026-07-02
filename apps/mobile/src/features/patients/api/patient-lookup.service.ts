import { api } from '@/api/client';
import type { PatientRow } from './fetch-all-patients';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Format FR accepté pour le lookup (0XXXXXXXXX ou +33XXXXXXXXX). */
export function isFrenchPhoneLookup(phone: string): boolean {
  const cleaned = phone.replace(/[\s.\-]/g, '');
  return /^(\+33|0)[1-9]\d{8}$/.test(cleaned);
}

/** GET /patients/lookup?email= | ?phone= */
export async function lookupPatientByEmail(email: string) {
  return api.get<PatientRow>(`/patients/lookup?email=${encodeURIComponent(email.trim())}`);
}

export async function lookupPatientByPhone(phone: string) {
  return api.get<PatientRow>(`/patients/lookup?phone=${encodeURIComponent(phone.trim())}`);
}

/** Email d’abord, puis téléphone si aucun dossier trouvé par email. */
export async function lookupPatientByContact(email: string, phone: string) {
  const em = email.trim();
  const ph = phone.trim();
  const emailOk = EMAIL_RE.test(em);
  const phoneOk = isFrenchPhoneLookup(ph);
  if (!emailOk && !phoneOk) {
    return { success: true as const, data: null as PatientRow | null };
  }
  if (emailOk) {
    const byEmail = await lookupPatientByEmail(em);
    if (byEmail.success && byEmail.data?.id) return byEmail;
  }
  if (phoneOk) {
    return lookupPatientByPhone(ph);
  }
  return { success: true as const, data: null as PatientRow | null };
}
