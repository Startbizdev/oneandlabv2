import { HelpCircle, LifeBuoy, Sparkles } from 'lucide-react-native';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { getOnboardingHref } from '@/features/onboarding/utils/onboarding-route';
import { isTutorialRole } from '@oneandlab/onboarding';
import { useAuthStore } from '@/store/auth-store';

export function buildHelpMoreItems(nav: (href: string) => void): SettingsRowProps[] {
  const role = useAuthStore.getState().user?.role;
  const items: SettingsRowProps[] = [];

  if (role && isTutorialRole(role)) {
    items.push({
      icon: Sparkles,
      label: 'Découvrir Cary',
      onPress: () => nav(String(getOnboardingHref(role, true))),
      iconAccent: 'teal',
    });
  }

  items.push(
    {
      icon: HelpCircle,
      label: "Centre d'aide",
      onPress: () => nav('/profile/help'),
      iconAccent: 'teal',
    },
    {
      icon: LifeBuoy,
      label: 'Contacter le support',
      onPress: () => nav('/profile/support'),
      iconAccent: 'teal',
    },
  );

  return items;
}
