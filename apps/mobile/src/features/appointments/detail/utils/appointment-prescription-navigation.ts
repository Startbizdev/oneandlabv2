import type { MedicalDocumentRow } from '../api/appointment-detail.service';

export function appointmentPrescriptionTitle(role: string): string {
  return role === 'nurse' ? "Prescription d'actes infirmiers" : 'Créer une ordonnance';
}

export function appointmentPrescriptionSubtitle(role: string, documents: MedicalDocumentRow[]): string {
  const hasOrdonnance = documents.some((d) => d.document_type === 'ordonnance');
  if (hasOrdonnance) return 'Ordonnance enregistrée sur ce rendez-vous';
  return role === 'nurse'
    ? 'Rédiger, générer et enregistrer une ordonnance'
    : 'Rédiger et générer une ordonnance PDF';
}

export function appointmentPrescriptionHref(role: string, appointmentId: string): string {
  const prefix = role === 'nurse' ? '/(nurse)' : '/(pro)';
  return `${prefix}/appointment/${appointmentId}/prescription`;
}
