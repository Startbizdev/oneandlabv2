/**
 * Formulations canoniques RDV (§4.6, §9.4) : une source pour listes, détail, équipe.
 */
export const RDV_COPY = {
  pendingProfessionalNotice:
    'Vous serez notifié dès qu’un professionnel aura accepté ou été attribué à votre demande.',
  pendingPreleveurLabNotice:
    'Un préleveur vous sera désigné par votre laboratoire. Vous serez notifié dès qu’il sera attribué à votre rendez-vous.',
  /** Détail patient : bloc Actions quand statut pending */
  pendingAppointmentDetailIntro:
    'Votre rendez-vous est en attente de confirmation. Vous serez notifié dès qu’un professionnel aura accepté ou été attribué à votre demande.',
} as const;

export function lotSoinsLabel(count: number): string {
  if (count <= 0) return '0 soin';
  if (count === 1) return '1 soin';
  return `${count} soins`;
}

/** Titre principal page publique p/rdv (invitation soins infirmiers). */
export function publicNursingInviteHeading(isBatch: boolean, careItemCount: number): string {
  if (isBatch && careItemCount > 1) return 'Lot de soins infirmiers disponible';
  return 'Rendez-vous soins infirmiers disponible';
}
