/**
 * Mobile français pour l'invitation SMS d'un infirmier externe : même règle que
 * `NurseInviteService::normalizeInvitePhone` (06 / 07 ou +33 6 / 7, espaces, points et tirets tolérés).
 */
export const FRENCH_MOBILE_PHONE_ERROR = 'Numéro de mobile invalide : 06 ou 07, ou +33 6 / +33 7.';

/** 10 chiffres `0XXXXXXXXX` d'un numéro français (national ou +33), ou null. */
function frenchNationalDigits(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s.-]/g, '');
  const international = /^\+33([1-9]\d{8})$/.exec(cleaned);
  if (international) return `0${international[1]}`;
  return /^0[1-9]\d{8}$/.test(cleaned) ? cleaned : null;
}

/** 10 chiffres `0[67]XXXXXXXX`, ou null si le numéro n'est pas un mobile français. */
export function normalizeFrenchMobilePhone(raw: string): string | null {
  const digits = frenchNationalDigits(raw);
  return digits !== null && /^0[67]\d{8}$/.test(digits) ? digits : null;
}

/** Numéro français affiché par paires (« 06 12 34 56 78 ») ; tout autre format est rendu tel quel. */
export function formatFrenchPhoneDisplay(raw: string): string {
  const digits = frenchNationalDigits(raw);
  return digits === null ? raw.trim() : digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}
