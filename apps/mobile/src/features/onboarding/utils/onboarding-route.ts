import type { TutorialRole } from '@oneandlab/onboarding';
import type { Href } from 'expo-router';

export function getOnboardingHref(role: TutorialRole, replay = false): Href {
  const query = replay ? '?replay=1' : '';
  switch (role) {
    case 'nurse':
      return `/(nurse)/onboarding${query}` as Href;
    case 'pro':
      return `/(pro)/onboarding${query}` as Href;
    case 'preleveur':
      return `/(preleveur)/onboarding${query}` as Href;
    default:
      return `/(patient)/onboarding${query}` as Href;
  }
}

export function isOnboardingSegment(segments: readonly string[]): boolean {
  return segments.some((segment) => segment === 'onboarding');
}
