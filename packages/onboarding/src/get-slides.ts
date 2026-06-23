import type { GetTutorialSlidesOptions, TutorialConfig, TutorialRole } from './types';
import { NURSE_TUTORIAL } from './slides/nurse';
import { PATIENT_TUTORIAL } from './slides/patient';
import { PRELEVEUR_TUTORIAL } from './slides/preleveur';
import { PRO_TUTORIAL } from './slides/pro';

const BY_ROLE: Record<TutorialRole, TutorialConfig> = {
  patient: PATIENT_TUTORIAL,
  nurse: NURSE_TUTORIAL,
  pro: PRO_TUTORIAL,
  preleveur: PRELEVEUR_TUTORIAL,
};

export function isTutorialRole(role: string | null | undefined): role is TutorialRole {
  return role === 'patient' || role === 'nurse' || role === 'pro' || role === 'preleveur';
}

export function getTutorialConfig(
  role: TutorialRole,
  options: GetTutorialSlidesOptions = {},
): TutorialConfig {
  const base = BY_ROLE[role];
  if (role !== 'pro' || options.showPrescriptions !== false) {
    return base;
  }
  return {
    ...base,
    slides: base.slides.filter((slide) => slide.id !== 'prescriptions'),
  };
}
