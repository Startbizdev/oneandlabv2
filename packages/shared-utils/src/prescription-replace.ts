/** Rôles autorisés par `POST /medical-documents/{id}/replace` (le serveur vérifie aussi l'accès au document). */
const PRESCRIPTION_REPLACE_ROLES = new Set(['pro', 'nurse', 'lab', 'subaccount', 'super_admin']);

export type ReplaceablePrescriptionDocument = {
  id?: string | null;
  document_type?: string | null;
  /** Liste RDV : les pièces issues du profil patient ne sont pas des `medical_documents`. */
  source?: string | null;
  replaced_by_document_id?: string | null;
};

export function medicalDocumentReplacePath(documentId: string): string {
  return `/medical-documents/${encodeURIComponent(documentId)}/replace`;
}

export function canReplacePrescriptionRole(role: string | null | undefined): boolean {
  return PRESCRIPTION_REPLACE_ROLES.has(String(role ?? ''));
}

/** « Remplacer » une ordonnance : rôle soignant, ordonnance du RDV, pas déjà remplacée. */
export function canReplacePrescriptionDocument(
  role: string | null | undefined,
  doc: ReplaceablePrescriptionDocument | null | undefined,
): boolean {
  if (!doc?.id || !canReplacePrescriptionRole(role)) return false;
  if (doc.document_type !== 'ordonnance') return false;
  if (doc.source && doc.source !== 'appointment') return false;
  return !doc.replaced_by_document_id;
}
