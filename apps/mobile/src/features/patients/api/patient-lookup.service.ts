import { lookupPatientByContact as lookupByContact, type PatientLookupMatch } from '@oneandlab/shared-api';
import { api } from '@/api/client';
import type { PatientRow } from './fetch-all-patients';

/** GET /patients/lookup : e-mail d’abord, puis téléphone. Renvoie aussi le contact qui a trouvé le dossier. */
export function lookupPatientByContact(email: string, phone: string) {
  return lookupByContact((path) => api.get(path), email, phone);
}

/** Ligne de sélection provisoire : le dossier complet est rechargé après adoption. */
export function patientRowFromLookup(match: PatientLookupMatch): PatientRow {
  return {
    id: match.id,
    first_name: match.first_name ?? undefined,
    last_name: match.last_name ?? undefined,
    birth_date: match.birth_date ?? undefined,
  };
}
