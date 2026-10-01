import type { Href } from 'expo-router';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';

export function appointmentPrescriptionTitle(role: string): string {
  return role === 'nurse' ? 'Prescription' : 'Ordonnance';
}

/** État affiché sous l'entrée « Prescription / Ordonnance » de la fiche RDV, absent s'il n'y a rien à signaler. */
export function appointmentPrescriptionStatus(documents: MedicalDocumentRow[]): string | undefined {
  return documents.some((d) => d.document_type === 'ordonnance') ? 'Ordonnance enregistrée' : undefined;
}

export function appointmentPrescriptionHref(role: string, appointmentId: string): Href {
  const params = { id: appointmentId };
  return role === 'nurse'
    ? { pathname: '/(nurse)/appointment/[id]/prescription', params }
    : { pathname: '/(pro)/appointment/[id]/prescription', params };
}
