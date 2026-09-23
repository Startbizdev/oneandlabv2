/** Pièces jointes fiche rendez-vous (téléchargement / upload) — web. */

export type AppointmentDetailUploadType = {
  value: string
  label: string
  icon: string
  color?: string
  accept?: string
  hint?: string
}

export const APPOINTMENT_DETAIL_DOCUMENT_LABELS: Record<string, string> = {
  carte_vitale: 'Carte Vitale',
  carte_mutuelle: 'Carte Mutuelle',
  attestation_droits_ame: 'Attestation de droits / AME',
  ordonnance: 'Ordonnance',
  resultats: 'Résultats',
  autres_assurances: 'Autre prescription',
  other: 'Autre',
  care_photo: 'Photo de soin',
  cancellation_photo: 'Photo annulation',
}

export function getAppointmentDetailDocumentLabel(type: string): string {
  return APPOINTMENT_DETAIL_DOCUMENT_LABELS[type] || type?.replace(/_/g, ' ') || 'Document'
}

const ATTESTATION_UPLOAD: AppointmentDetailUploadType = {
  value: 'attestation_droits_ame',
  label: 'Attestation de droits / AME',
  icon: 'i-lucide-file-badge',
  color: 'teal',
}

export const LAB_RESULTATS_UPLOAD_TYPE: AppointmentDetailUploadType = {
  value: 'resultats',
  label: "Résultats d'analyses",
  icon: 'i-lucide-flask-conical',
  color: 'red',
  accept: 'application/pdf',
  hint: 'PDF uniquement • max 25 Mo',
}

export const PRO_RESULTATS_UPLOAD_TYPE: AppointmentDetailUploadType = {
  value: 'resultats',
  label: 'Résultats',
  icon: 'i-lucide-file-check',
  color: 'emerald',
}

/** Vitale, mutuelle, attestation, ordonnance (+ option résultats lab) — tous rôles fiche RDV. */
export function buildAppointmentDetailUploadTypes(options?: {
  resultats?: AppointmentDetailUploadType | null
}): AppointmentDetailUploadType[] {
  const list: AppointmentDetailUploadType[] = [
    { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
    { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
    ATTESTATION_UPLOAD,
    { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  ]
  if (options?.resultats) list.push(options.resultats)
  list.push(
    { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
    { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
  )
  return list
}
