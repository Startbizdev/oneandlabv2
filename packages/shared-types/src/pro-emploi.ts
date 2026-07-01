/** Profession pro de santé avec identifiant Adeli ou RPPS (comme les infirmiers). */
export const PRO_IPA_EMPLOI = 'Infirmier IPA' as const;

export function isProIpaEmploi(emploi: string | null | undefined): boolean {
  return (emploi?.trim() ?? '') === PRO_IPA_EMPLOI;
}
