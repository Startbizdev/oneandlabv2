import {
  PRO_EMPLOI_OTHER,
  PRO_SANTE_EMPLOIS,
  type ProEmploiValue,
  isProEmploiComplete,
  isProIpaEmploi,
  proEmploiCustomValue,
  proEmploiSelectValue,
  resolveProEmploiForSave,
} from '@oneandlab/shared-types';

/** Professions pro de santé — aligné `frontend/constants/proEmploi.ts` */
export const PRO_SANTE_EMPLOI_OPTIONS = PRO_SANTE_EMPLOIS.map((item) => ({ ...item }));

export { PRO_EMPLOI_OTHER, type ProEmploiValue, isProEmploiComplete, isProIpaEmploi, proEmploiCustomValue, proEmploiSelectValue, resolveProEmploiForSave };

export const GENDER_OPTIONS = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
] as const;
