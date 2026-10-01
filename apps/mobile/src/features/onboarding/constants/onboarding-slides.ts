import type { TutorialConfig, TutorialRole, TutorialSlide } from '@oneandlab/onboarding';

/** Trois slides au plus par rôle, choisies parmi celles du package (dans cet ordre). */
const SLIDE_IDS_BY_ROLE: Record<TutorialRole, readonly string[]> = {
  patient: ['welcome', 'appointments', 'book'],
  nurse: ['demandes', 'appointments', 'calendar'],
  pro: ['welcome', 'appointments', 'patients'],
  preleveur: ['appointments', 'tournee', 'calendar'],
};

export function selectOnboardingSlides(config: TutorialConfig): TutorialSlide[] {
  return SLIDE_IDS_BY_ROLE[config.role]
    .map((id) => config.slides.find((slide) => slide.id === id))
    .filter((slide): slide is TutorialSlide => slide !== undefined);
}
