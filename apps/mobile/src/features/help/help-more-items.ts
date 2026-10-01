import { HelpCircle, LifeBuoy } from 'lucide-react-native';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';

export function buildHelpMoreItems(nav: (href: string) => void): SettingsRowProps[] {
  return [
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
  ];
}
