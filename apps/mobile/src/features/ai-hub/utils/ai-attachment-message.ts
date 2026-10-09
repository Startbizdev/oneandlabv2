import type { AiAppointmentDraft } from '@oneandlab/shared-types';

export function inferDocTypeFromFileName(fileName?: string | null): string | null {
  const lower = String(fileName ?? '').toLowerCase();
  if (!lower) return null;
  if (/analyse|bilan|resultat|résultat|labo|hemogram|hémogram|sanguin|nfs\b|bio/i.test(lower)) {
    return 'resultats';
  }
  if (/ordonnance|prescription|prescri/i.test(lower)) return 'ordonnance';
  if (/vitale|s[ée]curit[ée]\s*sociale/i.test(lower)) return 'carte_vitale';
  if (/mutuelle|compl[ée]mentaire/i.test(lower)) return 'carte_mutuelle';
  if (/assurance/i.test(lower)) return 'autres_assurances';
  return null;
}

/** Type de document d'une pièce jointe : imposé, attendu par le brouillon, déduit du nom, sinon « autre ». */
export function inferAttachmentDocType(
  draft: AiAppointmentDraft | null,
  override?: string | null,
  fileName?: string | null,
): string {
  if (override) return override;
  if (draft) {
    const pending = draft.payload?.pending_upload_type;
    if (typeof pending === 'string' && pending.trim()) return pending;
    return 'ordonnance';
  }
  return inferDocTypeFromFileName(fileName) ?? 'other';
}

function attachmentConfirmMessage(docType: string): string {
  switch (docType) {
    case 'carte_vitale':
      return 'Voici ma carte Vitale mise à jour.';
    case 'carte_mutuelle':
      return 'Voici ma carte mutuelle mise à jour.';
    case 'autres_assurances':
      return 'Voici mon document autres assurances mis à jour.';
    case 'ordonnance':
      return 'Voici mon ordonnance.';
    default:
      return 'Voici le document joint.';
  }
}

/** Message envoyé à Cary quand l'utilisateur joint un document sans rien écrire. */
export function attachmentApiMessage(docType: string, fileName?: string): string {
  const label = fileName?.trim() ? ` « ${fileName.trim()} »` : '';
  if (docType === 'resultats') {
    return `Voici mes résultats d'analyse${label}. Résume les points importants et explique-les simplement.`;
  }
  if (docType === 'other') {
    return `Voici un document médical${label}. Analyse-le et explique-moi ce qui est important.`;
  }
  if (fileName?.trim()) {
    return `${attachmentConfirmMessage(docType)} (${fileName.trim()})`;
  }
  return attachmentConfirmMessage(docType);
}
