import { Platform } from 'react-native';
import type { BookingWizardMode, BookingWizardSection } from './booking-wizard-steps';

/** Titre étape 0 — aligné web (`selection-title` par rôle dashboard + défaut patient). */
export function bookingCareSelectionTitle(role?: string): string {
  switch (role) {
    case 'pro':
      return 'Quels soins pour ce rendez-vous ?';
    case 'nurse':
      return 'Soins infirmiers ou prises de sang pour le patient ?';
    case 'lab':
    case 'subaccount':
    case 'preleveur':
      return 'Quel prélèvement pour ce rendez-vous ?';
    case 'admin':
      return 'Quels actes pour ce rendez-vous ?';
    case 'patient':
    default:
      return 'Quels soins vous concernent ?';
  }
}

export function vipStoreLabel(): string {
  return Platform.OS === 'ios' ? 'l’App Store' : 'Google Play';
}

/**
 * Libellés du bouton fixe. `vipPriceLabel` est le prix renvoyé par le store
 * (déjà localisé) quand la demande déclenche un paiement, `null` sinon.
 */
export function bookingWizardFooterCtaCopy(opts: {
  section: BookingWizardSection;
  mode: BookingWizardMode;
  returnToReview: boolean;
  vipPriceLabel: string | null;
}): { title: string; subtitle: string } {
  const { section, mode, returnToReview, vipPriceLabel } = opts;
  if (section === 'review') {
    if (mode === 'dashboard') return { title: 'Créer le rendez-vous', subtitle: '' };
    if (vipPriceLabel) return { title: `Payer ${vipPriceLabel} et réserver`, subtitle: '' };
    return { title: 'Réserver', subtitle: '' };
  }
  if (returnToReview) return { title: 'Revenir au récapitulatif', subtitle: '' };
  if (section === 'personal') {
    return { title: mode === 'patient' ? 'Vérifier ma demande' : 'Vérifier la demande', subtitle: '' };
  }
  return { title: 'Continuer', subtitle: '' };
}
