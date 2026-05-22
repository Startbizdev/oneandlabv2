/** Aligné sur frontend/pages/profile/index.vue (NURSE_QUALIFICATIONS). */
export const NURSE_QUALIFICATIONS = [
  { code: 'DEI', label: "Diplôme d'État d'Infirmier" },
  { code: 'DE_IADE', label: "Diplôme d'État d'Infirmier Anesthésiste (IADE)" },
  { code: 'DE_IBODE', label: "Diplôme d'État d'Infirmier de Bloc Opératoire (IBODE)" },
  { code: 'DE_PUERICULTURE', label: "Diplôme d'État de Puéricultrice / Puériculteur" },
  { code: 'DU_PLAIES', label: 'DU Plaies et cicatrisation' },
  { code: 'DIU_DOULEUR', label: 'DU Prise en charge de la douleur' },
  { code: 'DIU_PALLIATIF', label: 'DU Soins palliatifs et accompagnement' },
  { code: 'DU_DIU_CARDIO', label: 'DU / DIU Cardiologie' },
  { code: 'DU_PEDIATRIE', label: 'DU Pédiatrie' },
  { code: 'DU_DIABETO', label: 'DU Diabétologie' },
  { code: 'DU_PIED_DIABETIQUE', label: 'DU Pied diabétique' },
  { code: 'DU_PRELEVEMENTS', label: 'DU Prélèvements et analyses' },
  { code: 'DIU_PSYCHIATRIE', label: 'DIU Soins en psychiatrie' },
  { code: 'DU_GERIATRIE', label: 'DU Gériatrie' },
  { code: 'DU_URGENCES', label: "DU Médecine d'urgence" },
  { code: 'DU_REANIMATION', label: 'DU Réanimation et soins intensifs' },
  { code: 'DU_ADDICTO', label: 'DU / DIU Addictologie' },
  { code: 'DU_DIU_CANCERO', label: 'DU / DIU Cancérologie' },
  { code: 'DU_ETP', label: 'DU Éducation thérapeutique du patient' },
  { code: 'DU_NUTRITION', label: 'DU Nutrition clinique / Nutrition du sujet âgé' },
  { code: 'FORMATION_PRADO', label: 'Formation PRADO (suivi patients à domicile)' },
  { code: 'AUTRE', label: 'Autre formation' },
] as const;

export function parseNurseQualificationsFromApi(raw: unknown): {
  codes: string[];
  otherFormations: string[];
} {
  const list = Array.isArray(raw) ? raw.map(String) : [];
  const codes: string[] = [];
  const otherFormations: string[] = [];
  for (const item of list) {
    if (item.startsWith('AUTRE:')) {
      const label = item.slice(6).trim();
      if (label) otherFormations.push(label);
      if (!codes.includes('AUTRE')) codes.push('AUTRE');
    } else if (item === 'AUTRE') {
      if (!codes.includes('AUTRE')) codes.push('AUTRE');
    } else {
      codes.push(item);
    }
  }
  return { codes, otherFormations };
}

export function buildNurseQualificationsPayload(
  selectedCodes: string[],
  otherFormations: string[],
): string[] | null {
  const baseCodes = selectedCodes.filter((c) => c !== 'AUTRE' && !c.startsWith('AUTRE:'));
  const customLabels = otherFormations.map((s) => s.trim()).filter(Boolean);
  const hasOtherChecked = selectedCodes.includes('AUTRE') || customLabels.length > 0;
  if (customLabels.length) {
    return [...baseCodes, ...customLabels.map((l) => `AUTRE:${l}`)];
  }
  if (hasOtherChecked) {
    return [...baseCodes, 'AUTRE'];
  }
  return baseCodes.length ? baseCodes : null;
}
