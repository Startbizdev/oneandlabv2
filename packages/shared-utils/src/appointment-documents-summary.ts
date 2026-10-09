export type AppointmentDocumentTypeOnly = { document_type?: string | null };

/** Ligne « Documents » d'une fiche RDV ou passage : affichée s'il y a des pièces, ou si l'on peut encore en ajouter. */
export function appointmentDocumentsRowVisible(count: number, canUpload: boolean): boolean {
  return count > 0 || canUpload;
}

/** État sous la ligne « Documents » : l'ordonnance, seule pièce non facultative d'un RDV, manque encore. */
export function appointmentDocumentsRowHint(
  documents: readonly AppointmentDocumentTypeOnly[],
  canUpload: boolean,
): string | undefined {
  if (!canUpload) return undefined;
  return documents.some((d) => d.document_type === 'ordonnance') ? undefined : 'Ordonnance à ajouter';
}
