/** Profession pro de santé avec identifiant Adeli ou RPPS (comme les infirmiers). */
export const PRO_IPA_EMPLOI = 'Infirmier IPA' as const;

/** Valeur du select lorsque la profession est saisie librement. */
export const PRO_EMPLOI_OTHER = 'Autre' as const;

export const PRO_SANTE_EMPLOI_PRESETS = [
  'Médecin généraliste',
  'Médecin spécialiste',
  'Sage-femme',
  PRO_IPA_EMPLOI,
  'Pharmacien',
  'Chirurgien-dentiste',
] as const;

export type ProEmploiPreset = (typeof PRO_SANTE_EMPLOI_PRESETS)[number];

export const PRO_SANTE_EMPLOIS = [
  ...PRO_SANTE_EMPLOI_PRESETS.map((value) => ({ label: value, value })),
  { label: PRO_EMPLOI_OTHER, value: PRO_EMPLOI_OTHER },
] as const;

export type ProEmploiValue = (typeof PRO_SANTE_EMPLOIS)[number]['value'];

export function isProIpaEmploi(emploi: string | null | undefined): boolean {
  return (emploi?.trim() ?? '') === PRO_IPA_EMPLOI;
}

const PRESET_SET = new Set<string>(PRO_SANTE_EMPLOI_PRESETS);

export function isPresetProEmploi(emploi: string | null | undefined): boolean {
  const trimmed = emploi?.trim() ?? '';
  return trimmed !== '' && PRESET_SET.has(trimmed);
}

/** Valeur affichée dans le select (preset ou « Autre »). */
export function proEmploiSelectValue(emploi: string | null | undefined): string {
  const trimmed = emploi?.trim() ?? '';
  if (!trimmed) return '';
  if (PRESET_SET.has(trimmed) || trimmed === PRO_EMPLOI_OTHER) return trimmed;
  return PRO_EMPLOI_OTHER;
}

/** Texte libre lorsque la profession n'est pas un preset. */
export function proEmploiCustomValue(emploi: string | null | undefined): string {
  const trimmed = emploi?.trim() ?? '';
  if (!trimmed || PRESET_SET.has(trimmed) || trimmed === PRO_EMPLOI_OTHER) return '';
  return trimmed;
}

/** Valeur à enregistrer en base (120 car. max côté API). */
export function resolveProEmploiForSave(selectValue: string, customValue: string): string {
  const sel = selectValue.trim();
  if (!sel) return '';
  if (sel === PRO_EMPLOI_OTHER) {
    return customValue.trim().slice(0, 120);
  }
  return sel;
}

export function isProEmploiComplete(selectValue: string, customValue: string): boolean {
  const sel = selectValue.trim();
  if (!sel) return false;
  if (sel === PRO_EMPLOI_OTHER) return customValue.trim().length > 0;
  return true;
}
