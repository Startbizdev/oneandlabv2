import type { TextInputProps } from 'react-native';

/**
 * Champs saisis pour une autre personne (patient du soignant, proche, infirmier invité) :
 * clavier et casse adaptés, mais pas de remplissage automatique iOS / Android, qui proposerait
 * les coordonnées du titulaire de l'appareil.
 */
const NO_AUTOFILL = {
  autoComplete: 'off',
  textContentType: 'none',
  autoCorrect: false,
} as const satisfies TextInputProps;

export const THIRD_PARTY_NAME_INPUT = {
  ...NO_AUTOFILL,
  autoCapitalize: 'words',
} as const satisfies TextInputProps;

export const THIRD_PARTY_EMAIL_INPUT = {
  ...NO_AUTOFILL,
  autoCapitalize: 'none',
  keyboardType: 'email-address',
} as const satisfies TextInputProps;

export const THIRD_PARTY_PHONE_INPUT = {
  ...NO_AUTOFILL,
  keyboardType: 'phone-pad',
} as const satisfies TextInputProps;
