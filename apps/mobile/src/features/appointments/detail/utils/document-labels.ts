import type { MedicalDocumentRow } from '../api/appointment-detail.service';

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  carte_vitale: 'Carte Vitale',
  carte_mutuelle: 'Carte mutuelle',
  ordonnance: 'Ordonnance',
  resultats: 'Résultats',
  autres_assurances: 'Autre prescription',
  care_photo: 'Photo de soin',
  cancellation_photo: 'Photo annulation',
  other: 'Autre',
};

export function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

/** Documents liste standard (hors photos de soin affichées à part). */
export function filterListDocuments(
  docs: MedicalDocumentRow[],
  opts: { omitCarePhotos?: boolean } = {},
): MedicalDocumentRow[] {
  return docs.filter((d) => {
    if (opts.omitCarePhotos && d.document_type === 'care_photo') return false;
    return true;
  });
}
