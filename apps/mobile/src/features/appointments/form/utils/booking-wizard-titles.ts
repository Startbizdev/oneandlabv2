export const BOOKING_CARE_SELECTION_TITLE = 'Quel type de soin avez vous besoin ?';

export const BOOKING_WIZARD_CTA_SUBTITLE_NEXT = 'PASSER À L’ÉTAPE SUIVANTE';
export const BOOKING_WIZARD_CTA_SUBTITLE_CONFIRM = 'FINALISER LA DEMANDE';

/** Titre étape 0 — accessibilité / fallback navigation. */
export function bookingCareSelectionTitle(): string {
  return BOOKING_CARE_SELECTION_TITLE;
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
