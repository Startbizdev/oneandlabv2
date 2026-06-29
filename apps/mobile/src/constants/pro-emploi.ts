/** Professions pro de santé — aligné `frontend/constants/proEmploi.ts` */
export const PRO_SANTE_EMPLOIS = [
  { label: 'Médecin généraliste', value: 'Médecin généraliste' },
  { label: 'Médecin spécialiste', value: 'Médecin spécialiste' },
  { label: 'Sage-femme', value: 'Sage-femme' },
  { label: 'Infirmier IPA', value: 'Infirmier IPA' },
  { label: 'Pharmacien', value: 'Pharmacien' },
  { label: 'Chirurgien-dentiste', value: 'Chirurgien-dentiste' },
] as const;

export const PRO_SANTE_EMPLOI_OPTIONS = PRO_SANTE_EMPLOIS.map((item) => ({ ...item }));

export type ProEmploiValue = (typeof PRO_SANTE_EMPLOIS)[number]['value'];

export const GENDER_OPTIONS = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
] as const;
