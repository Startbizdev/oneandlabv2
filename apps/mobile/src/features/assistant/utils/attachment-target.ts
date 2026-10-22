import type { MobileRole } from '@oneandlab/shared-constants';
import type { MedicalDocumentMeta } from '@/lib/uploads/upload-file';

function documentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (/analyse|bilan|r[ée]sultat|labo|bio/.test(lower)) return 'resultats';
  if (/ordonnance|prescri/.test(lower)) return 'ordonnance';
  return 'other';
}

/**
 * Dossier où déposer la pièce jointe (`/medical-documents`), ou message expliquant pourquoi c'est impossible.
 * Patient : son dossier. Soignant : le rendez-vous en contexte, sinon le patient choisi (ordonnance seulement,
 * seul type accepté hors rendez-vous). Préleveur : uniquement depuis un rendez-vous.
 */
export function attachmentUploadMeta(
  role: MobileRole,
  scope: { userId: string; appointmentId?: string; patientId?: string },
  fileName: string,
): MedicalDocumentMeta | string {
  if (role === 'patient') return { patient_id: scope.userId, document_type: documentType(fileName) };
  if (scope.appointmentId) return { appointment_id: scope.appointmentId, document_type: documentType(fileName) };
  if (role === 'preleveur') return 'Joignez un document depuis le rendez-vous concerné.';
  if (!scope.patientId) return "Choisissez d'abord le patient concerné par ce document.";
  return { patient_id: scope.patientId, document_type: 'ordonnance' };
}
