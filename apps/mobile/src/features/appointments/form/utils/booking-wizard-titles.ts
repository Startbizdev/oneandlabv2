export const BOOKING_WIZARD_CTA_SUBTITLE_NEXT = 'PASSER À L’ÉTAPE SUIVANTE';
export const BOOKING_WIZARD_CTA_SUBTITLE_CONFIRM = 'FINALISER LA DEMANDE';

/** Titre étape 0 — aligné web (`selection-title` par rôle dashboard + défaut patient). */
export function bookingCareSelectionTitle(role?: string): string {
  switch (role) {
    case 'pro':
      return 'Quels soins pour ce rendez-vous ?';
    case 'nurse':
      return 'Soins infirmiers ou prises de sang pour le patient ?';
    case 'lab':
    case 'subaccount':
      return 'Quel prélèvement pour ce rendez-vous ?';
    case 'admin':
      return 'Quels actes pour ce rendez-vous ?';
    case 'patient':
    default:
      return 'Quels soins vous concernent ?';
  }
}

export function bookingWizardFooterCtaCopy(isFinalStep: boolean): {
  title: string;
  subtitle: string;
} {
  if (isFinalStep) {
    return {
      title: 'Confirmer le rendez-vous',
      subtitle: BOOKING_WIZARD_CTA_SUBTITLE_CONFIRM,
    };
  }
  return {
    title: 'Continuer',
    subtitle: BOOKING_WIZARD_CTA_SUBTITLE_NEXT,
  };
}
