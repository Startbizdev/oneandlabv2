/** Statuts où l’upload de pièces RDV est bloqué (aligné backend : pas de garde statut sur POST). */
const TERMINAL_UPLOAD_STATUSES = new Set(['canceled', 'cancelled', 'refused', 'expired']);

/**
 * Peut-on joindre des documents au RDV ? (hors « résultats » lab si règle métier séparée.)
 */
export function canUploadMedicalDocumentsForAppointmentStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s !== '' && !TERMINAL_UPLOAD_STATUSES.has(s);
}

/** Documents « résultats » (lab) : seulement après engagement de la prise en charge. */
export function canUploadLabResultatsForAppointmentStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'inprogress' || s === 'completed';
}
